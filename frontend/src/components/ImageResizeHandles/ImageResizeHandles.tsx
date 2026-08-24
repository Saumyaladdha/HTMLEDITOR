import { useRef, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { ScreenRect } from "../../editor/geometry";

interface Props {
  rect: ScreenRect;
  scale: number;
  aspectRatio: number; // width / height, for the corner (proportional) handles
  onResizeWidth: (widthPx: number) => void; // called continuously while dragging (live DOM)
  onResizeHeight: (heightPx: number) => void; // called continuously while dragging (live DOM)
  onCommit: () => void; // called once on mouseup (pushes an undo checkpoint)
}

const HANDLE_SIZE = 10;

/** Drag-to-resize overlay for a selected figure image — positioned in
 * outer-page screen space (see geometry.ts) over an element that actually
 * lives inside the scaled iframe.
 *
 * Two kinds of handle, matching the original spec's "proportional by
 * default; a modifier/toggle allows free-form resize":
 *  - Corner handles: proportional — only width is driven directly, height
 *    follows automatically via the image's own CSS `height:auto` (or the
 *    figure's own aspect-preserving layout), so dragging a corner scales
 *    both dimensions together without ever fighting the image's own aspect
 *    ratio.
 *  - Edge handles (right / bottom): single-axis — width-only or
 *    height-only, for deliberately cropping/stretching independent of
 *    the original aspect ratio (e.g. filling a shorter box).
 */
export default function ImageResizeHandles({ rect, scale, aspectRatio, onResizeWidth, onResizeHeight, onCommit }: Props) {
  const startRef = useRef<{ pos: number; size: number } | null>(null);

  function startDrag(e: ReactMouseEvent, axis: "x" | "y", sign: 1 | -1, apply: (px: number) => void) {
    e.preventDefault();
    e.stopPropagation();
    const startPos = axis === "x" ? e.clientX : e.clientY;
    const startSize = axis === "x" ? rect.width / scale : rect.height / scale;
    startRef.current = { pos: startPos, size: startSize };

    function onMove(ev: MouseEvent) {
      if (!startRef.current) return;
      const current = axis === "x" ? ev.clientX : ev.clientY;
      const deltaOuter = (current - startRef.current.pos) * sign;
      const newSize = Math.max(30, startRef.current.size + deltaOuter / scale);
      apply(Math.round(newSize));
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      startRef.current = null;
      onCommit();
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const corners: Array<{ key: "nw" | "ne" | "sw" | "se"; left: number; top: number; cursor: string; sign: 1 | -1 }> = [
    { key: "nw", left: rect.left, top: rect.top, cursor: "nwse-resize", sign: -1 },
    { key: "ne", left: rect.left + rect.width, top: rect.top, cursor: "nesw-resize", sign: 1 },
    { key: "sw", left: rect.left, top: rect.top + rect.height, cursor: "nesw-resize", sign: -1 },
    { key: "se", left: rect.left + rect.width, top: rect.top + rect.height, cursor: "nwse-resize", sign: 1 },
  ];

  const handleStyle = (left: number, top: number, cursor: string, color: string): CSSProperties => ({
    position: "fixed",
    left: left - HANDLE_SIZE / 2,
    top: top - HANDLE_SIZE / 2,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    background: color,
    border: "1.5px solid #fff",
    borderRadius: 2,
    cursor,
    zIndex: 40,
  });

  return (
    <>
      <div
        style={{
          position: "fixed",
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          border: "2px solid var(--accent, #6c8bff)",
          pointerEvents: "none",
          zIndex: 39,
          boxSizing: "border-box",
        }}
      />
      {corners.map((c) => (
        <div
          key={c.key}
          onMouseDown={(e) => startDrag(e, "x", c.sign, onResizeWidth)}
          title={`Drag to scale (${aspectRatio.toFixed(2)}:1, keeps proportions)`}
          style={handleStyle(c.left, c.top, c.cursor, "var(--accent, #6c8bff)")}
        />
      ))}
      {/* Right edge — width only, independent of height. */}
      <div
        onMouseDown={(e) => startDrag(e, "x", 1, onResizeWidth)}
        title="Drag to change width only"
        style={handleStyle(rect.left + rect.width, rect.top + rect.height / 2, "ew-resize", "#3ec27f")}
      />
      {/* Bottom edge — height only, independent of width (overrides the
          image's own aspect ratio — a deliberate crop/stretch). */}
      <div
        onMouseDown={(e) => startDrag(e, "y", 1, onResizeHeight)}
        title="Drag to change height only"
        style={handleStyle(rect.left + rect.width / 2, rect.top + rect.height, "ns-resize", "#3ec27f")}
      />
    </>
  );
}
