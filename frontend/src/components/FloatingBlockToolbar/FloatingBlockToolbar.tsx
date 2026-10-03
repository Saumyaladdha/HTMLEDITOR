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
  /** Ctrl+C/X/V worked from the keyboard alone from day one, with nothing
   *  on screen to say so. These three make the same actions reachable by
   *  clicking, next to Duplicate. */
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  hasClipboard?: boolean;

  // --- context actions -------------------------------------------------
  // The frequent, obvious things, put ON the thing they act on rather than
  // in the side panel. The panel had grown to a dozen control groups and a
  // user had to hunt it for "add a row" — the single most common edit in a
  // book made of boxes. Rarer, finer controls (exact colours, sliders,
  // variant palettes) stay in the panel.

  /** What one row of this block is called — "step", "line", "row" — or null
   * when the block has no repeated rows. */
  itemNoun?: string | null;
  onAddItem?: () => void;
  /** Move the SELECTED row up or down inside its box. Dragging already does
   *  this, and inside a 449px column it is fiddly: the rows of a सूत्र panel
   *  are two lines tall and the drop targets are each other. Two buttons are
   *  the same edit without the aim. Absent when nothing inside is selected,
   *  or when the row is already at that end. */
  canMoveItemUp?: boolean;
  canMoveItemDown?: boolean;
  onMoveItem?: (delta: -1 | 1) => void;
  /** Break the box in two at the selected row, so the halves can sit on
   *  different columns or pages. Absent on the first row, where there is
   *  nothing above to split from. */
  onSplitItems?: () => void;
  /** Put a split box back together with the one after it. */
  onJoinItems?: () => void;
  /** Nudge the whole block (or the whole question) one place along the
   *  reading order — across columns and pages, not just among siblings. */
  onStepBlock?: (dir: -1 | 1) => void;
  /** Placed art: nudge its size without opening anything. */
  isPicture?: boolean;
  onResizePicture?: (deltaPx: number) => void;
  /** Figures whose CSS defines a float variant. */
  /** True when this block has been lifted out of the text flow. */
  isFreeBlock?: boolean;
  onToggleFree?: () => void;
  canWrap?: boolean;
  wrapping?: boolean;
  onToggleWrap?: () => void;
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
  onCopy,
  onCut,
  onPaste,
  hasClipboard,
  itemNoun,
  onAddItem,
  canMoveItemUp,
  canMoveItemDown,
  onMoveItem,
  onSplitItems,
  onJoinItems,
  onStepBlock,
  isPicture,
  onResizePicture,
  isFreeBlock,
  onToggleFree,
  canWrap,
  wrapping,
  onToggleWrap,
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
      {multiCount <= 1 && itemNoun && onAddItem && (
        <button
          style={{ ...iconBtn, width: "auto", padding: "0 8px", gap: 4, color: "#8fd8a4" }}
          title={`Add another ${itemNoun}`}
          onClick={onAddItem}
        >
          ＋ {itemNoun}
        </button>
      )}

      {multiCount <= 1 && onMoveItem && (canMoveItemUp || canMoveItemDown) && (
        <>
          <button
            style={{ ...iconBtn, opacity: canMoveItemUp ? 1 : 0.3 }}
            title={`Move this ${itemNoun ?? "row"} up`}
            disabled={!canMoveItemUp}
            onClick={() => onMoveItem(-1)}
          >
            ↑
          </button>
          <button
            style={{ ...iconBtn, opacity: canMoveItemDown ? 1 : 0.3 }}
            title={`Move this ${itemNoun ?? "row"} down`}
            disabled={!canMoveItemDown}
            onClick={() => onMoveItem(1)}
          >
            ↓
          </button>
        </>
      )}

      {multiCount <= 1 && onStepBlock && (
        <>
          <button style={iconBtn} title="Move up (across columns and pages)"
                  onClick={() => onStepBlock(-1)}>↑</button>
          <button style={iconBtn} title="Move down (across columns and pages)"
                  onClick={() => onStepBlock(1)}>↓</button>
        </>
      )}

      {multiCount <= 1 && onJoinItems && (
        <button
          style={{ ...iconBtn, width: "auto", padding: "0 7px" }}
          title="Join with the box below — puts a split back together"
          onClick={onJoinItems}
        >
          ⇵ join
        </button>
      )}

      {multiCount <= 1 && onSplitItems && (
        <button
          style={{ ...iconBtn, width: "auto", padding: "0 7px" }}
          title={`Split here — this ${itemNoun ?? "row"} and the ones below it become a box of their own`}
          onClick={onSplitItems}
        >
          ⇅ split
        </button>
      )}

      {multiCount <= 1 && isPicture && onResizePicture && (
        <>
          <button style={iconBtn} title="Smaller" onClick={() => onResizePicture(-20)}>−</button>
          <button style={iconBtn} title="Bigger" onClick={() => onResizePicture(20)}>+</button>
        </>
      )}

      {multiCount <= 1 && onToggleFree && (
        <button
          style={{ ...iconBtn, width: "auto", padding: "0 7px",
                   color: isFreeBlock ? "#8fd8a4" : "#c9c9d4" }}
          title={isFreeBlock
            ? "Put this back in the text"
            : "Lift onto the page — place it anywhere"}
          onClick={onToggleFree}
        >
          {isFreeBlock ? "⇱ free" : "⇱ lift"}
        </button>
      )}

      {multiCount <= 1 && canWrap && onToggleWrap && (
        <button
          style={{ ...iconBtn, width: "auto", padding: "0 7px", color: wrapping ? "#8fd8a4" : "#c9c9d4" }}
          title={wrapping ? "Put back on its own line" : "Let text wrap around this"}
          onClick={onToggleWrap}
        >
          {wrapping ? "⇥ wrapped" : "⇥ wrap"}
        </button>
      )}

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
      {onCopy && (
        <button style={{ ...iconBtn, width: "auto", padding: "0 7px" }}
                aria-label="Copy block" title="Copy (Ctrl+C)" onClick={onCopy}>
          copy
        </button>
      )}
      {onCut && (
        <button style={{ ...iconBtn, width: "auto", padding: "0 7px" }}
                aria-label="Cut block"
                title="Cut (Ctrl+X) — select where it should go, then Paste"
                onClick={onCut}>
          cut
        </button>
      )}
      {onPaste && (
        <button
          style={{ ...iconBtn, width: "auto", padding: "0 7px",
                   opacity: hasClipboard ? 1 : 0.35,
                   cursor: hasClipboard ? "pointer" : "default",
                   color: hasClipboard ? "#8fd8a4" : iconBtn.color }}
          aria-label="Paste block"
          title={hasClipboard ? "Paste after this block (Ctrl+V)" : "Nothing copied yet"}
          disabled={!hasClipboard}
          onClick={onPaste}
        >
          paste
        </button>
      )}
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
