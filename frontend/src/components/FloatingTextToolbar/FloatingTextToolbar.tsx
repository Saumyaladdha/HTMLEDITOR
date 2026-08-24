import type { CSSProperties } from "react";
import { TEXT_COLOR_PALETTE, HIGHLIGHT_PALETTE } from "../../editor/propertyRegistry";
import { ScreenRect } from "../../editor/geometry";

interface Props {
  rect: ScreenRect;
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onFontStep: (deltaEm: number) => void;
  onColor: (hex: string) => void;
  onHighlight: (hex: string) => void;
  onClear: () => void;
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

export default function FloatingTextToolbar({ rect, onBold, onItalic, onUnderline, onFontStep, onColor, onHighlight, onClear }: Props) {
  return (
    <div
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
      <button style={{ ...btnStyle, fontWeight: 700 }} title="Bold" onClick={onBold}>B</button>
      <button style={{ ...btnStyle, fontStyle: "italic" }} title="Italic" onClick={onItalic}>I</button>
      <button style={{ ...btnStyle, textDecoration: "underline" }} title="Underline" onClick={onUnderline}>U</button>
      <Divider />
      <button style={btnStyle} title="Smaller" onClick={() => onFontStep(-0.15)}>A-</button>
      <button style={btnStyle} title="Bigger" onClick={() => onFontStep(0.15)}>A+</button>
      <Divider />
      <Swatches palette={TEXT_COLOR_PALETTE} onPick={onColor} ring />
      <Divider />
      <Swatches palette={HIGHLIGHT_PALETTE} onPick={onHighlight} />
      <Divider />
      <button style={{ ...btnStyle, fontSize: 11 }} title="Clear formatting" onClick={onClear}>✕</button>
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
