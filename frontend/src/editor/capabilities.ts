/**
 * What formatting vocabulary does THIS document actually support?
 *
 * Colouring a word used to always emit
 * `<span class="text-color" style="--tc-c: #d64545">`, which is exactly right
 * for a packaged chapter — `text-color.css` turns that variable into a
 * visible colour, and it round-trips through the pipeline perfectly. In any
 * other document that stylesheet doesn't exist, so the span had NO VISUAL
 * EFFECT AT ALL: the user picked red, nothing happened, and there was no
 * error to explain why.
 *
 * So the class is used only when the document proves it understands it, by
 * actually defining a matching rule. Otherwise the same action emits a
 * self-contained inline style that works anywhere. Detect capability; never
 * assume it.
 */

export interface InlineStyleRecipe {
  /** Class to apply, when the document defines styling for it. */
  className: string | null;
  /** Custom property carrying the colour, when class-based. */
  cssVar: string | null;
  /** Plain CSS property to set when there's no class support. */
  fallbackProperty: string;
}

export interface DocumentCapabilities {
  textColor: InlineStyleRecipe;
  highlight: InlineStyleRecipe;
}

/**
 * True if any stylesheet in the document defines a rule for `.className`.
 *
 * Cross-origin stylesheets throw on `.cssRules` access; those are skipped
 * rather than treated as absent, since a same-origin sheet later in the list
 * may still define the class.
 */
function definesClass(doc: Document, className: string): boolean {
  const needle = `.${className}`;
  for (const sheet of Array.from(doc.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = (sheet as CSSStyleSheet).cssRules;
    } catch {
      continue; // cross-origin — unreadable, not evidence either way
    }
    for (const rule of Array.from(rules)) {
      const selector = (rule as CSSStyleRule).selectorText;
      if (selector && selector.includes(needle)) return true;
    }
  }
  return false;
}

export function detectCapabilities(doc: Document): DocumentCapabilities {
  return {
    textColor: definesClass(doc, "text-color")
      ? { className: "text-color", cssVar: "--tc-c", fallbackProperty: "color" }
      : { className: null, cssVar: null, fallbackProperty: "color" },
    highlight: definesClass(doc, "highlight")
      ? { className: "highlight", cssVar: "--hl-c", fallbackProperty: "background-color" }
      : { className: null, cssVar: null, fallbackProperty: "background-color" },
  };
}

/** Neutral defaults for use before a document has loaded. */
export const NO_CAPABILITIES: DocumentCapabilities = {
  textColor: { className: null, cssVar: null, fallbackProperty: "color" },
  highlight: { className: null, cssVar: null, fallbackProperty: "background-color" },
};
