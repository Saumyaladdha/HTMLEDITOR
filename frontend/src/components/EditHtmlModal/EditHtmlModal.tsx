import { useState } from "react";

interface Props {
  initialHtml: string;
  onSave: (html: string) => void;
  onClose: () => void;
}

/** Raw-source escape hatch for anything the visual editor can't shape-edit
 * yet — formulas above all (nested fraction/exponent markup has no
 * structured mini-editor here), but works for any block. */
export default function EditHtmlModal({ initialHtml, onSave, onClose }: Props) {
  const [value, setValue] = useState(initialHtml);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 90vw)",
          maxHeight: "80vh",
          background: "var(--shell-850, #1c1c22)",
          border: "1px solid var(--shell-700, #33333c)",
          borderRadius: 10,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-100, #eee)" }}>
          Edit raw HTML
          <div style={{ fontSize: 11, fontWeight: 400, color: "var(--ink-500, #888)", marginTop: 4 }}>
            Power-user escape hatch — for formulas and anything else the visual editor doesn't shape-edit yet.
          </div>
        </div>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1,
            minHeight: 240,
            fontFamily: "ui-monospace, monospace",
            fontSize: 12.5,
            background: "#111114",
            color: "#d8d8e0",
            border: "1px solid var(--shell-700, #33333c)",
            borderRadius: 6,
            padding: 10,
            resize: "vertical",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onSave(value)}>Save</button>
        </div>
      </div>
    </div>
  );
}
