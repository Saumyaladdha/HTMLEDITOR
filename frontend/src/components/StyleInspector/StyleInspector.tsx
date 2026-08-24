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
  | { kind: "slider"; label: string; css: string; min: number; max: number; unit: string; step?: number }
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
  { kind: "slider", label: "Inner padding", css: "padding", min: 0, max: 60, unit: "px" },
  { kind: "color", label: "Background", css: "background-color" },
  { kind: "slider", label: "Corner radius", css: "border-radius", min: 0, max: 40, unit: "px" },
];

/** getComputedStyle always returns rgb()/rgba(); <input type="color"> only
 * accepts #rrggbb. Fully transparent reads as black so the swatch shows
 * something predictable rather than an empty control. */
function toHexColor(computed: string): string {
  const m = /rgba?\(([^)]+)\)/.exec(computed);
  if (!m) return /^#[0-9a-f]{6}$/i.test(computed) ? computed : "#000000";
  const [r, g, b, a] = m[1].split(",").map((n) => parseFloat(n.trim()));
  if (a === 0) return "#000000";
  const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function numericValue(computed: string, fallback: number): number {
  const n = parseFloat(computed);
  return Number.isFinite(n) ? n : fallback;
}

export default function StyleInspector({ el, onChange, onCommit }: Props) {
  const [, bump] = useState(0);
  const rerender = () => bump((n) => n + 1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const win = el.ownerDocument.defaultView ?? window;
  const computed = win.getComputedStyle(el);
  const tokens = discoverTokens(el);

  const set = (css: string, value: string) => {
    el.style.setProperty(css, value);
    onChange();
    rerender();
  };

  const renderProp = (p: Prop) => {
    const current = computed.getPropertyValue(p.css);
    if (p.kind === "color") {
      return (
        <Row key={p.css} label={p.label}>
          <input
            type="color"
            value={toHexColor(current)}
            onChange={(e) => set(p.css, e.target.value)}
            onBlur={onCommit}
            style={{ width: 44, height: 26, background: "none", border: "none", cursor: "pointer" }}
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
    const value = numericValue(current, p.min);
    return (
      <Row key={p.css} label={p.label} value={`${Math.round(value * 100) / 100}${p.unit}`}>
        <input
          type="range"
          min={p.min}
          max={p.max}
          step={p.step ?? 1}
          value={value}
          onChange={(e) => set(p.css, `${e.target.value}${p.unit}`)}
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

function Row({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--ink-500)",
          marginBottom: 4,
        }}
      >
        <span>{label}</span>
        {value && <span style={{ color: "var(--ink-300)" }}>{value}</span>}
      </div>
      {children}
    </div>
  );
}
