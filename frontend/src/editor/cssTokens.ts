/**
 * Discovers the CSS custom properties that actually apply to an element, by
 * reading the document's own stylesheets.
 *
 * The property panel used to offer type-specific controls only for the nine
 * element types hand-listed in propertyRegistry.ts. This repo's own element
 * library has forty, and an arbitrary uploaded document has whatever it has —
 * so in practice most blocks fell through to "edit text, spacing, remove"
 * and their real design tokens (`--fig-w`, `--sh-pad-y`, colours, radii)
 * were unreachable even though the CSS defined them right there.
 *
 * Reading them off the stylesheet means a document describes its own
 * adjustable knobs. A new element added to the library becomes editable with
 * no editor change at all, and a document this code has never seen gets the
 * same treatment.
 */

export type TokenKind = "length" | "color" | "number" | "other";

export interface DiscoveredToken {
  name: string;
  /** Currently-effective value for the element. */
  value: string;
  kind: TokenKind;
  /** Numeric part + unit, for `length`/`number` — so a slider can be shown. */
  numeric: number | null;
  unit: string;
  /** Human label: the trailing CSS comment on the declaration when the
   * stylesheet has one, else the variable name tidied up. */
  label: string;
}

const LENGTH_RE = /^(-?[\d.]+)(px|rem|em|%|vh|vw|pt)$/;
const COLOR_RE = /^(#[0-9a-f]{3,8}|rgb|hsl)/i;

function classify(value: string): { kind: TokenKind; numeric: number | null; unit: string } {
  const trimmed = value.trim();
  const lengthMatch = LENGTH_RE.exec(trimmed);
  if (lengthMatch) {
    return { kind: "length", numeric: parseFloat(lengthMatch[1]), unit: lengthMatch[2] };
  }
  if (COLOR_RE.test(trimmed)) return { kind: "color", numeric: null, unit: "" };
  if (/^-?[\d.]+$/.test(trimmed)) return { kind: "number", numeric: parseFloat(trimmed), unit: "" };
  return { kind: "other", numeric: null, unit: "" };
}

function humanize(name: string): string {
  return name
    .replace(/^--/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Every `--*` declared by a rule whose selector matches `el` (or `:root`,
 * which applies to everything).
 *
 * Rules are visited in stylesheet order so later declarations win, matching
 * the cascade closely enough for a control panel. Full specificity
 * resolution isn't attempted — the VALUE shown always comes from
 * getComputedStyle, which is authoritative; the stylesheet walk only decides
 * which knobs to OFFER.
 */
export function discoverTokens(el: HTMLElement, limit = 12): DiscoveredToken[] {
  const doc = el.ownerDocument;
  const win = doc.defaultView ?? window;
  const computed = win.getComputedStyle(el);
  const found = new Map<string, string>(); // name -> label

  for (const sheet of Array.from(doc.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = (sheet as CSSStyleSheet).cssRules;
    } catch {
      continue; // cross-origin, unreadable
    }
    for (const rule of Array.from(rules)) {
      const styleRule = rule as CSSStyleRule;
      const selector = styleRule.selectorText;
      if (!selector || !styleRule.style) continue;

      let applies = false;
      try {
        applies = selector.includes(":root") || selector.includes("html") || el.matches(selector);
      } catch {
        continue; // selector this browser can't parse (e.g. vendor pseudo)
      }
      if (!applies) continue;

      for (const prop of Array.from(styleRule.style)) {
        if (!prop.startsWith("--")) continue;
        if (!found.has(prop)) found.set(prop, humanize(prop));
      }
    }
  }

  const tokens: DiscoveredToken[] = [];
  for (const [name, label] of found) {
    const value = computed.getPropertyValue(name).trim();
    if (!value) continue;
    const { kind, numeric, unit } = classify(value);
    if (kind === "other") continue; // nothing sensible to render a control for
    tokens.push({ name, value, kind, numeric, unit, label });
  }

  // Element-specific tokens (--fig-w) are far more useful than global theme
  // ones (--ink-500), and a `:root` block can define dozens. Prefer variables
  // whose prefix matches one of the element's own class names.
  const classPrefixes = Array.from(el.classList).map((c) => c.split("--")[0].split("__")[0]);
  const affinity = (t: DiscoveredToken) =>
    classPrefixes.some((p) => t.name.startsWith(`--${p.slice(0, 3)}`)) ? 0 : 1;

  return tokens.sort((a, b) => affinity(a) - affinity(b) || a.name.localeCompare(b.name)).slice(0, limit);
}
