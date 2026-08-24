import { useState } from "react";
import { ScreenRect } from "../../editor/geometry";

interface Props {
  rect: ScreenRect;
  label: string;
  pageCount: number;
  currentPageIndex: number;
  multiCount: number; // 1 when a single block is selected
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveToPage: (pageIndex: number) => void;
  onEditHtml: () => void;
  onInsertAfter: () => void;
}

const iconBtn = {
  background: "transparent",
  border: "none",
  color: "#c9c9d4",
  width: 26,
  height: 26,
  borderRadius: 5,
  cursor: "pointer",
  fontSize: 13,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export default function FloatingBlockToolbar({
  rect,
  label,
  pageCount,
  currentPageIndex,
  multiCount,
  onDuplicate,
  onDelete,
  onMoveToPage,
  onEditHtml,
  onInsertAfter,
}: Props) {
  const [movePickerOpen, setMovePickerOpen] = useState(false);

  return (
    <div
      role="toolbar"
      aria-label="Block actions"
      style={{
        position: "fixed",
        left: rect.left,
        top: Math.max(4, rect.top - 34),
        background: "#1c1c22",
        border: "1px solid #33333c",
        borderRadius: 7,
        boxShadow: "0 12px 30px -10px rgba(0,0,0,0.6)",
        padding: "3px 5px",
        display: "flex",
        alignItems: "center",
        gap: 1,
        zIndex: 40,
        fontSize: 11,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <span style={{ cursor: "grab", padding: "0 5px", color: "#7a7a86" }} title="Drag to reorder">⋮⋮</span>
      <span style={{ padding: "0 6px 0 0", color: "#8f8fa0", whiteSpace: "nowrap", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>
        {multiCount > 1 ? `${multiCount} blocks` : label}
      </span>
      <button style={iconBtn} aria-label="Insert block after" title="Insert block after" onClick={onInsertAfter}>+</button>
      <button style={iconBtn} aria-label="Duplicate block" title="Duplicate (Ctrl+D)" onClick={onDuplicate}>⧉</button>
      <div style={{ position: "relative" }}>
        <button style={iconBtn} aria-label="Move to page" title="Move to page…" onClick={() => setMovePickerOpen((o) => !o)}>⇥</button>
        {movePickerOpen && (
          <div
            style={{
              position: "absolute",
              top: 28,
              left: 0,
              background: "#22222a",
              border: "1px solid #33333c",
              borderRadius: 6,
              boxShadow: "0 10px 24px -6px rgba(0,0,0,0.5)",
              maxHeight: 180,
              overflowY: "auto",
              minWidth: 90,
              zIndex: 41,
            }}
          >
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i}
                onClick={() => {
                  onMoveToPage(i);
                  setMovePickerOpen(false);
                }}
                disabled={i === currentPageIndex}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 10px",
                  background: "transparent",
                  border: "none",
                  color: i === currentPageIndex ? "#5a5a66" : "#c9c9d4",
                  cursor: i === currentPageIndex ? "default" : "pointer",
                  fontSize: 11,
                }}
              >
                Page {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
      {multiCount <= 1 && (
        <button style={iconBtn} aria-label="Edit raw HTML" title="Edit raw HTML" onClick={onEditHtml}>{"</>"}</button>
      )}
      <button style={{ ...iconBtn, color: "#e08a8a" }} aria-label="Delete block" title="Delete (Del)" onClick={onDelete}>🗑</button>
    </div>
  );
}
