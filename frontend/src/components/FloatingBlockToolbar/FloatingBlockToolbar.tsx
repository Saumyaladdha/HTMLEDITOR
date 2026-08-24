import { useState } from "react";
import { ScreenRect } from "../../editor/geometry";
import { BLOCK_TYPES } from "../../editor/blockEditing";

interface Props {
  rect: ScreenRect;
  label: string;
  pageCount: number;
  currentPageIndex: number;
  multiCount: number; // 1 when a single block is selected
  /** Current tag, lowercased — drives the type picker's active state. */
  currentTag: string;
  /** Whether pagination applies; hides "move to page" in a flow document. */
  paginated: boolean;
  onConvertType: (tag: string) => void;
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
  currentTag,
  paginated,
  onConvertType,
  onDuplicate,
  onDelete,
  onMoveToPage,
  onEditHtml,
  onInsertAfter,
}: Props) {
  const [movePickerOpen, setMovePickerOpen] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const activeType = BLOCK_TYPES.find((t) => t.tag === currentTag);

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
      {/* Block type — turning a paragraph into a heading is the most common
          operation in any document editor and had no control at all. */}
      {multiCount <= 1 && (
        <div style={{ position: "relative" }}>
          <button
            style={{ ...iconBtn, width: "auto", padding: "0 7px", gap: 3 }}
            aria-label="Change block type"
            aria-expanded={typePickerOpen}
            title="Change block type"
            onClick={() => setTypePickerOpen((o) => !o)}
          >
            {activeType ? activeType.label.replace("Heading ", "H") : currentTag.toUpperCase()} ▾
          </button>
          {typePickerOpen && (
            <div
              role="menu"
              style={{
                position: "absolute",
                top: 28,
                left: 0,
                background: "#22222a",
                border: "1px solid #33333c",
                borderRadius: 6,
                boxShadow: "0 10px 24px -6px rgba(0,0,0,0.5)",
                minWidth: 150,
                zIndex: 41,
                overflow: "hidden",
              }}
            >
              {BLOCK_TYPES.map((t) => (
                <button
                  key={t.tag}
                  onClick={() => {
                    onConvertType(t.tag);
                    setTypePickerOpen(false);
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 10px",
                    background: t.tag === currentTag ? "#2f3550" : "transparent",
                    border: "none",
                    color: "#c9c9d4",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  <span>{t.label}</span>
                  {t.shortcut && <span style={{ color: "#6a6a78" }}>{t.shortcut.replace("Ctrl+Alt+", "⌥")}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <button style={iconBtn} aria-label="Insert block after" title="Insert block after" onClick={onInsertAfter}>+</button>
      <button style={iconBtn} aria-label="Duplicate block" title="Duplicate (Ctrl+D)" onClick={onDuplicate}>⧉</button>
      {/* Only meaningful in a paginated document — a flow document has no
          pages to move a block to. */}
      <div style={{ position: "relative", display: paginated ? undefined : "none" }}>
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
