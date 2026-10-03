import { useState, type CSSProperties } from "react";
import { discoverTokens, type DiscoveredToken } from "../../editor/cssTokens";

interface Props {
  el: HTMLElement;
  /** Live update while dragging (no undo checkpoint). */
  onChange: () => void;
  /** Interaction finished — push one undo checkpoint. */
  onCommit: () => void;
}

/**
 * Universal style controls for ANY element.
 *
 * The property panel could previously only offer meaningful controls for the
 * nine element types hand-listed in propertyRegistry.ts. Everything else —
 * thirty-one of this repo's own forty library elements, plus the entirety of
 * any document the editor didn't generate — got "edit text, spacing, remove"
 * and nothing more, so most of a document was effectively read-only for
 * anything beyond its words.
 *
 * These controls read from getComputedStyle (so they show what's actually in
 * effect, whatever produced it) and write inline styles (which win over any
 * stylesheet, so the change always takes). That makes every element in every
 * document adjustable without the editor needing to recognise it.
 *
 * Deliberately curated, not exhaustive: exposing all ~340 CSS properties
 * would be devtools, not an editor. Anything not here is still reachable
 * through the raw-HTML escape hatch.
 */

type Prop =
  | { kind: "slider"; label: string; css: string; min: number; max: number; unit: string;
      step?: number;
      /** Longhands to set alongside `css`, so one control still drives all
       * four sides — the shorthand cannot be READ back, only written. */
      alsoSet?: string[] }
  | { kind: "color"; label: string; css: string }
  | { kind: "choice"; label: string; css: string; options: { label: string; value: string }[] };

const TEXT_PROPS: Prop[] = [
  { kind: "slider", label: "Font size", css: "font-size", min: 8, max: 72, unit: "px" },
  {
    kind: "choice",
    label: "Weight",
    css: "font-weight",
    options: [
      { label: "Normal", value: "400" },
      { label: "Medium", value: "500" },
      { label: "Bold", value: "700" },
      { label: "Black", value: "900" },
    ],
  },
  { kind: "color", label: "Text colour", css: "color" },
  {
    kind: "choice",
    label: "Align",
    css: "text-align",
    options: [
      { label: "Left", value: "left" },
      { label: "Centre", value: "center" },
      { label: "Right", value: "right" },
      { label: "Justify", value: "justify" },
    ],
  },
  { kind: "slider", label: "Line height", css: "line-height", min: 0.8, max: 3, unit: "", step: 0.05 },
];

const BOX_PROPS: Prop[] = [
  { kind: "slider", label: "Space above", css: "margin-top", min: 0, max: 80, unit: "px" },
  { kind: "slider", label: "Space below", css: "margin-bottom", min: 0, max: 80, unit: "px" },
  // `padding` and `margin` are SHORTHANDS. `getComputedStyle` returns "" for
  // them in most engines, which parsed to NaN and displayed as 0 — so the
  // panel reported no padding on a card that plainly has some, and moving the
  // slider from that false 0 jumped the real value. Longhands compute.
  { kind: "slider", label: "Inner padding", css: "padding-top", min: 0, max: 60,
    unit: "px", alsoSet: ["padding-right", "padding-bottom", "padding-left"] },
  { kind: "color", label: "Background", css: "background-color" },
  { kind: "slider", label: "Corner radius", css: "border-top-left-radius", min: 0, max: 40,
    unit: "px", alsoSet: ["border-top-right-radius", "border-bottom-right-radius",
                          "border-bottom-left-radius"] },
];

/** True when a computed colour is fully transparent — i.e. the element paints
 * no colour of its own. Shown as "none" rather than as a black swatch, which
 * is what it looked like before and made every unstyled block appear to have
 * a solid black background. */
export function isTransparent(computed: string): boolean {
  const m = /rgba\(([^)]+)\)/.exec(computed);
  if (!m) return false;
  const parts = m[1].split(",").map((n) => parseFloat(n.trim()));
  return parts.length === 4 && parts[3] === 0;
}

/** getComputedStyle always returns rgb()/rgba(); <input type="color"> only
 * accepts #rrggbb. */
function toHexColor(computed: string): string {
  const m = /rgba?\(([^)]+)\)/.exec(computed);
  if (!m) return /^#[0-9a-f]{6}$/i.test(computed) ? computed : "#000000";
  const [r, g, b, a] = m[1].split(",").map((n) => parseFloat(n.trim()));
  if (a === 0) return "#000000";
  const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** A computed value that carries no number of its own — `normal`, `auto`, or
 * the empty string a shorthand returns. These are NOT zero, and showing them
 * as zero is what made line-height read 0.8 (the slider's own minimum) on
 * text set in the stylesheet. */
export function isUnset(computed: string): boolean {
  const t = (computed || "").trim();
  return t === "" || t === "normal" || t === "auto" || t === "none";
}

function numericValue(computed: string, fallback: number): number {
  const n = parseFloat(computed);
  return Number.isFinite(n) ? n : fallback;
}

/** Line height computes to px against the font size; the control is a
 * multiplier, so it is converted rather than shown as a raw pixel count. */
function lineHeightMultiple(computed: string, fontSizePx: number): number | null {
  if (isUnset(computed)) return null;
  const n = parseFloat(computed);
  if (!Number.isFinite(n)) return null;
  return computed.includes("px") && fontSizePx > 0 ? n / fontSizePx : n;
}

export default function StyleInspector({ el, onChange, onCommit }: Props) {
  const [, bump] = useState(0);
  const rerender = () => bump((n) => n + 1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const win = el.ownerDocument.defaultView ?? window;
  const computed = win.getComputedStyle(el);
  const tokens = discoverTokens(el);

  const set = (css: string, value: string, alsoSet?: string[]) => {
    el.style.setProperty(css, value);
    (alsoSet ?? []).forEach((p) => el.style.setProperty(p, value));
    onChange();
    rerender();
  };

  /** Back to whatever the stylesheet says, for one property or all of them. */
  const clear = (css: string, alsoSet?: string[]) => {
    el.style.removeProperty(css);
    (alsoSet ?? []).forEach((p) => el.style.removeProperty(p));
    onChange();
    rerender();
  };

  /** True when the value comes from the stylesheet rather than from an
   * override made here — worth showing, because it is the difference between
   * "this block is set to 18.5px" and "everything on the page is". */
  const isInherited = (css: string) => !el.style.getPropertyValue(css);

  const renderProp = (p: Prop) => {
    const current = computed.getPropertyValue(p.css);
    if (p.kind === "color") {
      const none = isTransparent(current);
      return (
        <Row
          key={p.css}
          label={p.label}
          value={none ? "none" : undefined}
          onReset={isInherited(p.css) ? undefined : () => { clear(p.css); onCommit(); }}
        >
          <input
            type="color"
            value={toHexColor(current)}
            onChange={(e) => set(p.css, e.target.value)}
            onBlur={onCommit}
            // A transparent element has no colour of its own; the swatch is
            // dimmed rather than showing a solid black it does not have.
            style={{
              width: 44, height: 26, background: "none", border: "none",
              cursor: "pointer", opacity: none ? 0.35 : 1,
            }}
          />
        </Row>
      );
    }
    if (p.kind === "choice") {
      return (
        <Row key={p.css} label={p.label}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {p.options.map((o) => {
              const active = current.trim() === o.value;
              return (
                <button
                  key={o.value}
                  onClick={() => {
                    set(p.css, o.value);
                    onCommit();
                  }}
                  style={{
                    padding: "4px 8px",
                    fontSize: 11,
                    borderRadius: 5,
                    cursor: "pointer",
                    background: active ? "var(--accent-soft)" : "var(--shell-800)",
                    border: `1px solid ${active ? "var(--accent)" : "var(--shell-700)"}`,
                    color: active ? "var(--ink-100)" : "var(--ink-300)",
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </Row>
      );
    }
    // Line height computes to px; the control is a multiplier.
    const asMultiple = p.css === "line-height"
      ? lineHeightMultiple(current, parseFloat(computed.fontSize) || 0)
      : null;
    const unset = isUnset(current) && asMultiple === null;
    const raw = asMultiple ?? numericValue(current, p.min);
    const value = Math.min(p.max, Math.max(p.min, raw));
    const inherited = isInherited(p.css);
    return (
      <Row
        key={p.css}
        label={p.label}
        // An unset value is reported as such rather than as the slider's own
        // minimum, and an inherited one says where it comes from — the panel
        // used to present both as if the block had been set that way.
        value={unset
          ? "default"
          : `${Math.round(value * 100) / 100}${p.unit}${inherited ? " · from the page" : ""}`}
        onReset={inherited ? undefined : () => { clear(p.css, p.alsoSet); onCommit(); }}
      >
        <input
          type="range"
          min={p.min}
          max={p.max}
          step={p.step ?? 1}
          value={value}
          onChange={(e) => set(p.css, `${e.target.value}${p.unit}`, p.alsoSet)}
          onMouseUp={onCommit}
          onTouchEnd={onCommit}
          onKeyUp={onCommit}
          style={{ width: "100%" }}
        />
      </Row>
    );
  };

  const renderToken = (t: DiscoveredToken) => {
    if (t.kind === "color") {
      return (
        <Row key={t.name} label={t.label}>
          <input
            type="color"
            value={toHexColor(t.value)}
            onChange={(e) => set(t.name, e.target.value)}
            onBlur={onCommit}
            style={{ width: 44, height: 26, background: "none", border: "none", cursor: "pointer" }}
          />
        </Row>
      );
    }
    const current = t.numeric ?? 0;
    // Range is inferred from the value itself — a token has no declared
    // bounds, so bracket generously around where it currently sits.
    const max = Math.max(current * 3, current + 20);
    return (
      <Row key={t.name} label={t.label} value={`${current}${t.unit}`}>
        <input
          type="range"
          min={0}
          max={Math.round(max)}
          step={t.unit === "" ? 0.1 : 1}
          value={current}
          onChange={(e) => set(t.name, `${e.target.value}${t.unit}`)}
          onMouseUp={onCommit}
          onTouchEnd={onCommit}
          onKeyUp={onCommit}
          style={{ width: "100%" }}
        />
      </Row>
    );
  };

  return (
    <div>
      <SectionLabel>Text</SectionLabel>
      {TEXT_PROPS.map(renderProp)}

      <SectionLabel>Box</SectionLabel>
      {BOX_PROPS.map(renderProp)}

      {tokens.length > 0 && (
        <>
          <SectionLabel>
            <button
              onClick={() => setShowAdvanced((s) => !s)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: "inherit",
                font: "inherit",
                letterSpacing: "inherit",
                textTransform: "inherit",
              }}
            >
              {showAdvanced ? "▾" : "▸"} Design tokens ({tokens.length})
            </button>
          </SectionLabel>
          {showAdvanced && tokens.map(renderToken)}
        </>
      )}
    </div>
  );
}

const sectionStyle: CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "var(--ink-500)",
  margin: "16px 0 9px",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={sectionStyle}>{children}</div>;
}

function Row({ label, value, onReset, children }: {
  label: string; value?: string; onReset?: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          color: "var(--ink-500)",
          marginBottom: 4,
          gap: 6,
        }}
      >
        <span>{label}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {value && <span style={{ color: "var(--ink-300)" }}>{value}</span>}
          {/* Only shown once this block actually overrides the stylesheet, so
              there is always a way back from an experiment. */}
          {onReset && (
            <button
              onClick={onReset}
              title="Back to the stylesheet's value"
              style={{
                background: "none", border: "none", cursor: "pointer", padding: 0,
                color: "var(--ink-500)", fontSize: 12, lineHeight: 1,
              }}
            >
              ↺
            </button>
          )}
        </span>
      </div>
      {children}
    </div>
  );
}
