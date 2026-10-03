import { useEffect, useRef, useState, type CSSProperties } from "react";
import { TEXT_COLOR_PALETTE, HIGHLIGHT_PALETTE } from "../../editor/propertyRegistry";
import { MATH_SYMBOLS } from "../../editor/textEditing";
import { ScreenRect } from "../../editor/geometry";

interface Props {
  rect: ScreenRect;
  /** True for a bare caret with nothing highlighted — bold/italic/colour/
   *  link all need a real selection and are hidden in this state, since
   *  clicking them would silently do nothing. Insert-at-caret controls
   *  (symbols, vector) stay, because THOSE work from a caret alone — this
   *  is the toolbar's whole answer to "click empty space, cursor comes,
   *  now what". */
  collapsed?: boolean;
  /** Inserts one Greek letter/operator/mark at the caret, or in place of
   *  the current selection. */
  onInsertSymbol?: (symbol: string) => void;
  /** Marks the selection (or a one-letter placeholder at a bare caret) as
   *  a vector — the arrow the chapter's own CSS draws over it. */
  onInsertVector?: () => void;
  /** href of the link the selection is inside, or null. Drives whether the
   * link control reads "add" or "edit", and whether Remove is offered. */
  existingHref: string | null;
  /** Opened by Ctrl+K from anywhere, not just by clicking the toolbar. */
  linkEditorOpen: boolean;
  onLinkEditorOpenChange: (open: boolean) => void;
  onBold: () => void;
  /** Formats the selection as the book's inline maths — a stacked fraction,
   * proper sub/superscripts, digits kept upright. */
  onMath: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onFontStep: (deltaEm: number) => void;
  onColor: (hex: string) => void;
  onHighlight: (hex: string) => void;
  onClear: () => void;
  /** Box-and-bold the formula under the caret. Present only when there IS a
   *  formula there — bold and highlight cannot touch one without rebuilding
   *  it, so this is the way to mark a result. */
  onEmphasiseMath?: () => void;
  mathEmphasised?: boolean;
  onApplyLink: (href: string) => void;
  onRemoveLink: () => void;
}

const btnStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--ink-200, #ddd)",
  width: 28,
  height: 28,
  borderRadius: 5,
  cursor: "pointer",
  fontSize: 13,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export default function FloatingTextToolbar({
  rect,
  collapsed,
  onInsertSymbol,
  onInsertVector,
  existingHref,
  linkEditorOpen,
  onLinkEditorOpenChange,
  onBold,
  onMath,
  onItalic,
  onUnderline,
  onFontStep,
  onColor,
  onHighlight,
  onClear,
  onEmphasiseMath,
  mathEmphasised,
  onApplyLink,
  onRemoveLink,
}: Props) {
  const [href, setHref] = useState("");
  const [symbolsOpen, setSymbolsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Seed the field from the link already under the caret, and focus it, each
  // time the editor opens — so Ctrl+K on an existing link edits it rather
  // than starting from an empty box.
  /* eslint-disable react-hooks/set-state-in-effect --
   * Seeding a field from a prop when the editor OPENS is the intended
   * behaviour: without it, Ctrl+K on an existing link starts from an empty
   * box instead of that link. Gated on `linkEditorOpen`, so it runs once per
   * open rather than per render — there is no cascade to trigger. */
  useEffect(() => {
    if (!linkEditorOpen) return;
    setHref(existingHref ?? "");
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [linkEditorOpen, existingHref]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      style={{
        position: "fixed",
        left: rect.left + rect.width / 2,
        top: rect.top - 46,
        transform: "translateX(-50%)",
        background: "#1c1c22",
        border: "1px solid #33333c",
        borderRadius: 8,
        boxShadow: "0 12px 30px -10px rgba(0,0,0,0.6)",
        padding: "5px 6px",
        display: "flex",
        alignItems: "center",
        gap: 2,
        zIndex: 50,
      }}
      // Prevent the toolbar itself from stealing focus and collapsing the
      // iframe's live text selection before its onClick handler can run.
      onMouseDown={(e) => e.preventDefault()}
    >
      {!collapsed && (
        <>
          <button style={{ ...btnStyle, fontWeight: 700 }} title="Bold (Ctrl+B)" aria-label="Bold" onClick={onBold}>B</button>
          <button style={{ ...btnStyle, fontStyle: "italic" }} title="Italic (Ctrl+I)" aria-label="Italic" onClick={onItalic}>I</button>
          <button
            style={{ ...btnStyle, fontFamily: "Georgia, serif", fontStyle: "italic" }}
            title="Format as maths — P/Q becomes a stacked fraction"
            aria-label="Format as maths"
            onClick={onMath}
          >
            ½x
          </button>
          <button style={{ ...btnStyle, textDecoration: "underline" }} title="Underline (Ctrl+U)" aria-label="Underline" onClick={onUnderline}>U</button>
          <Divider />
          <button style={btnStyle} aria-label="Decrease font size" title="Smaller" onClick={() => onFontStep(-0.15)}>A-</button>
          <button style={btnStyle} aria-label="Increase font size" title="Bigger" onClick={() => onFontStep(0.15)}>A+</button>
          <Divider />
          <Swatches palette={TEXT_COLOR_PALETTE} onPick={onColor} ring />
          <Divider />
          <Swatches palette={HIGHLIGHT_PALETTE} onPick={onHighlight} />
          <Divider />
          <button
            style={{ ...btnStyle, color: existingHref ? "#6c8bff" : btnStyle.color }}
            aria-label={existingHref ? "Edit link" : "Add link"}
            title={existingHref ? `Edit link (${existingHref})` : "Add link (Ctrl+K)"}
            onClick={() => onLinkEditorOpenChange(!linkEditorOpen)}
          >
            🔗
          </button>
          {onEmphasiseMath && (
            <>
              <Divider />
              <button
                style={{ ...btnStyle, width: "auto", padding: "0 8px", fontSize: 11,
                         color: mathEmphasised ? "#f0c24b" : undefined }}
                aria-label="Emphasise formula"
                title={mathEmphasised
                  ? "Remove the box around this formula (Ctrl+Shift+H)"
                  : "Box and bold this formula (Ctrl+Shift+H) — bold and highlight would flatten it"}
                onClick={onEmphasiseMath}
              >
                ✨ formula
              </button>
            </>
          )}
          <Divider />
          <button style={{ ...btnStyle, fontSize: 11 }} aria-label="Clear formatting" title="Clear formatting" onClick={onClear}>✕</button>
        </>
      )}

      {/* SYMBOLS AND VECTOR — work from a bare caret, so shown in both
          states, always at the same spot so the toolbar is worth glancing
          at even when nothing is selected. This is the whole answer to
          "click into the text, a cursor appears, now insert a symbol". */}
      {(onInsertSymbol || onInsertVector) && (
        <>
          {!collapsed && <Divider />}
          {onInsertSymbol && (
            <div style={{ position: "relative" }}>
              <button
                style={{ ...btnStyle, fontFamily: "Georgia, serif", color: symbolsOpen ? "#6c8bff" : btnStyle.color }}
                aria-label="Insert Greek letter or symbol"
                title="Insert a Greek letter, operator or mark"
                onClick={() => setSymbolsOpen((s) => !s)}
              >
                Ω
              </button>
              {symbolsOpen && (
                <SymbolPicker
                  onPick={(sym) => { onInsertSymbol(sym); setSymbolsOpen(false); }}
                  onClose={() => setSymbolsOpen(false)}
                />
              )}
            </div>
          )}
          {onInsertVector && (
            <button
              style={{ ...btnStyle, width: "auto", padding: "0 6px", fontFamily: "Georgia, serif", fontStyle: "italic" }}
              aria-label="Mark as a vector"
              title="Mark the selection (or start typing here) as a vector — draws the arrow the book itself uses"
              onClick={onInsertVector}
            >
              a⃗
            </button>
          )}
        </>
      )}

      {linkEditorOpen && (
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 0,
            display: "flex",
            gap: 4,
            background: "#1c1c22",
            border: "1px solid #33333c",
            borderRadius: 8,
            padding: 6,
            boxShadow: "0 12px 30px -10px rgba(0,0,0,0.6)",
          }}
          // The toolbar as a whole suppresses mousedown to protect the
          // selection; the input must be exempt or it can never be focused.
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            value={href}
            onChange={(e) => setHref(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onApplyLink(href);
              } else if (e.key === "Escape") {
                e.preventDefault();
                onLinkEditorOpenChange(false);
              }
            }}
            placeholder="example.com or https://…"
            aria-label="Link address"
            style={{
              width: 220,
              background: "#111114",
              border: "1px solid #33333c",
              borderRadius: 5,
              padding: "5px 8px",
              color: "#d8d8e0",
              fontSize: 12,
            }}
          />
          <button style={{ ...btnStyle, width: "auto", padding: "0 8px" }} onClick={() => onApplyLink(href)}>
            Apply
          </button>
          {existingHref && (
            <button
              style={{ ...btnStyle, width: "auto", padding: "0 8px", color: "#e08a8a" }}
              onClick={onRemoveLink}
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SymbolPicker({ onPick, onClose }: { onPick: (symbol: string) => void; onClose: () => void }) {
  return (
    <div
      role="menu"
      aria-label="Insert a symbol"
      style={{
        position: "absolute",
        top: 34,
        left: 0,
        width: 220,
        background: "#1c1c22",
        border: "1px solid #33333c",
        borderRadius: 8,
        padding: 8,
        boxShadow: "0 12px 30px -10px rgba(0,0,0,0.6)",
        zIndex: 51,
      }}
      // Same reason as the toolbar itself: a mousedown here must not steal
      // focus from the iframe before onClick fires and reads its selection.
      onMouseDown={(e) => e.stopPropagation()}
    >
      {MATH_SYMBOLS.map((group) => (
        <div key={group.label} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase",
                        color: "var(--ink-500, #888)", marginBottom: 3 }}>
            {group.label}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {group.symbols.map((sym) => (
              <button
                key={sym}
                title={sym}
                aria-label={`Insert ${sym}`}
                onClick={() => onPick(sym)}
                style={{
                  ...btnStyle,
                  width: 24,
                  height: 24,
                  fontFamily: "Georgia, serif",
                  fontSize: 14,
                }}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button
        style={{ ...btnStyle, width: "100%", fontSize: 10.5, color: "var(--ink-500, #888)" }}
        onClick={onClose}
      >
        Close
      </button>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 18, background: "#33333c", margin: "0 3px" }} />;
}

function Swatches({ palette, onPick, ring }: { palette: { name: string; hex: string }[]; onPick: (hex: string) => void; ring?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {palette.slice(0, 6).map((c) => (
        <button
          key={c.name}
          title={c.name}
          aria-label={`${ring ? "Text colour" : "Highlight"}: ${c.name}`}
          onClick={() => onPick(c.hex)}
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: c.hex,
            border: ring ? "1px solid rgba(255,255,255,0.35)" : "none",
            cursor: "pointer",
            padding: 0,
          }}
        />
      ))}
    </div>
  );
}
