import { useEffect, useRef, useState, type CSSProperties } from "react";
import { TEXT_COLOR_PALETTE, HIGHLIGHT_PALETTE } from "../../editor/propertyRegistry";
import { ScreenRect } from "../../editor/geometry";

interface Props {
  rect: ScreenRect;
  /** href of the link the selection is inside, or null. Drives whether the
   * link control reads "add" or "edit", and whether Remove is offered. */
  existingHref: string | null;
  /** Opened by Ctrl+K from anywhere, not just by clicking the toolbar. */
  linkEditorOpen: boolean;
  onLinkEditorOpenChange: (open: boolean) => void;
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onFontStep: (deltaEm: number) => void;
  onColor: (hex: string) => void;
  onHighlight: (hex: string) => void;
  onClear: () => void;
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
  existingHref,
  linkEditorOpen,
  onLinkEditorOpenChange,
  onBold,
  onItalic,
  onUnderline,
  onFontStep,
  onColor,
  onHighlight,
  onClear,
  onApplyLink,
  onRemoveLink,
}: Props) {
  const [href, setHref] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Seed the field from the link already under the caret, and focus it, each
  // time the editor opens — so Ctrl+K on an existing link edits it rather
  // than starting from an empty box.
  useEffect(() => {
    if (!linkEditorOpen) return;
    setHref(existingHref ?? "");
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [linkEditorOpen, existingHref]);

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
      <button style={{ ...btnStyle, fontWeight: 700 }} title="Bold (Ctrl+B)" aria-label="Bold" onClick={onBold}>B</button>
      <button style={{ ...btnStyle, fontStyle: "italic" }} title="Italic (Ctrl+I)" aria-label="Italic" onClick={onItalic}>I</button>
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
      <Divider />
      <button style={{ ...btnStyle, fontSize: 11 }} aria-label="Clear formatting" title="Clear formatting" onClick={onClear}>✕</button>

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
