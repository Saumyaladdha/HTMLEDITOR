import { useState, type CSSProperties } from "react";

interface Props {
  x: number;
  y: number;
  label: string;
  pageCount: number;
  currentPageIndex: number;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveToPage: (pageIndex: number) => void;
  onEditHtml: () => void;
  onClose: () => void;
}

/** A familiar right-click menu consolidating the same actions the floating
 * block toolbar already exposes — duplicate/delete/move-to-page/edit-HTML
 * — in the one place people actually expect to find them (Canva, Docs,
 * every desktop app), rather than only as small icons on a toolbar that
 * has to be spotted first. */
export default function ContextMenu({ x, y, label, pageCount, currentPageIndex, onDuplicate, onDelete, onMoveToPage, onEditHtml, onClose }: Props) {
  const [movePickerOpen, setMovePickerOpen] = useState(false);

  // Clamp so the menu never renders off the right/bottom edge of the
  // viewport when right-clicking near the edge of the canvas.
  const width = 190;
  const estHeight = 190;
  const left = Math.min(x, window.innerWidth - width - 8);
  const top = Math.min(y, window.innerHeight - estHeight - 8);

  const itemStyle: CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "8px 12px",
    background: "transparent",
    border: "none",
    color: "var(--ink-200, #ddd)",
    fontSize: 12.5,
    cursor: "pointer",
  };

  return (
    <>
      {/* Full-screen invisible backdrop — clicking anywhere outside the
          menu closes it, matching standard context-menu behavior. */}
      <div style={{ position: "fixed", inset: 0, zIndex: 60 }} onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        role="menu"
        aria-label={`${label} actions`}
        style={{
          position: "fixed",
          left,
          top,
          width,
          background: "#1c1c22",
          border: "1px solid #33333c",
          borderRadius: 8,
          boxShadow: "0 20px 50px -12px rgba(0,0,0,0.7)",
          padding: "6px 0",
          zIndex: 61,
        }}
      >
        <div style={{ padding: "4px 12px 8px", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#7a7a86" }}>
          {label}
        </div>
        <button style={itemStyle} onClick={() => { onDuplicate(); onClose(); }} onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a33")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
          ⧉ Duplicate
        </button>
        <div style={{ position: "relative" }}>
          <button
            style={itemStyle}
            onClick={() => setMovePickerOpen((o) => !o)}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a33")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            ⇥ Move to page… {movePickerOpen ? "▾" : "▸"}
          </button>
          {movePickerOpen && (
            <div
              style={{
                position: "absolute",
                left: width,
                top: 0,
                background: "#22222a",
                border: "1px solid #33333c",
                borderRadius: 6,
                boxShadow: "0 10px 24px -6px rgba(0,0,0,0.5)",
                maxHeight: 220,
                overflowY: "auto",
                minWidth: 100,
              }}
            >
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  disabled={i === currentPageIndex}
                  onClick={() => { onMoveToPage(i); onClose(); }}
                  style={{
                    ...itemStyle,
                    padding: "6px 10px",
                    color: i === currentPageIndex ? "#5a5a66" : "var(--ink-200, #ddd)",
                    cursor: i === currentPageIndex ? "default" : "pointer",
                  }}
                >
                  Page {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
        <button style={itemStyle} onClick={() => { onEditHtml(); onClose(); }} onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a33")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
          {"</>"} Edit raw HTML
        </button>
        <div style={{ borderTop: "1px solid #33333c", margin: "4px 0" }} />
        <button
          style={{ ...itemStyle, color: "#e08a8a" }}
          onClick={() => { onDelete(); onClose(); }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a33")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          🗑 Delete
        </button>
      </div>
    </>
  );
}
