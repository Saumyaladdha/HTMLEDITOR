import { useEffect, useRef, useState } from "react";

export interface PageEntry {
  id: string;
  index: number;
}

interface Props {
  pages: PageEntry[];
  /** Builds the standalone single-page HTML for one page, on demand.
   *
   * The rail used to receive every page's fully-rendered HTML up front. Each
   * of those strings carries the document's entire inlined stylesheet, so a
   * 39-page chapter rebuilt ~120MB of strings on every edit to feed
   * thumbnails that are lazily mounted anyway and mostly never visible.
   * Passing a callback means a page is only ever serialized at the moment
   * its thumbnail scrolls into view. */
  renderHtml: (index: number) => string;
  activePage: number; // 1-indexed
  onSelect: (pageIndex: number) => void; // 1-indexed
  onReorder: (fromIndex: number, toIndex: number) => void; // 0-indexed
  onAdd: (afterIndex: number) => void; // 0-indexed, -1 = at start
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
}

const THUMB_WIDTH = 210 * 0.28; // scale factor applied below matches this

function Thumbnail({ entry, renderHtml }: { entry: PageEntry; renderHtml: (index: number) => string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { root: el.closest("aside"), rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    // Serialized here, at the moment this thumbnail is actually on screen —
    // not up front for all pages at once. See the renderHtml prop.
    doc.open();
    doc.write(renderHtml(entry.index));
    doc.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, entry.index, renderHtml]);

  return (
    <div ref={containerRef} style={{ width: "100%", aspectRatio: "210 / 297", overflow: "hidden", position: "relative", background: "var(--paper)" }}>
      {visible ? (
        <iframe
          ref={iframeRef}
          title="page-thumb"
          style={{
            width: 900,
            height: 900 * (297 / 210),
            border: "none",
            transform: `scale(${THUMB_WIDTH / 900})`,
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
        />
      ) : null}
    </div>
  );
}

export default function PageThumbnailRail({ pages, renderHtml, activePage, onSelect, onReorder, onAdd, onDuplicate, onDelete }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [menuFor, setMenuFor] = useState<number | null>(null);

  return (
    <aside
      style={{
        width: 92,
        background: "var(--shell-850)",
        borderRight: "1px solid var(--shell-700)",
        overflowY: "auto",
        padding: "12px 10px",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: "var(--ink-500)", marginBottom: 10, textTransform: "uppercase" }}>
        पेज · {pages.length}
      </div>

      <button
        onClick={() => onAdd(-1)}
        title="Add page at start"
        style={{ width: "100%", marginBottom: 8, background: "transparent", border: "1px dashed var(--shell-600)", borderRadius: 5, color: "var(--ink-500)", fontSize: 16, padding: "3px 0", cursor: "pointer" }}
      >
        +
      </button>

      {pages.map((entry, i) => {
        const n = i + 1;
        return (
          <div key={entry.id} style={{ position: "relative", marginBottom: 8 }}>
            {dropIndex === i && dragIndex !== null && dragIndex !== i && (
              <div style={{ height: 3, background: "var(--accent)", borderRadius: 2, marginBottom: 4 }} />
            )}
            <div
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => {
                e.preventDefault();
                setDropIndex(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null && dragIndex !== i) onReorder(dragIndex, i);
                setDragIndex(null);
                setDropIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setDropIndex(null);
              }}
              onClick={() => onSelect(n)}
              onMouseLeave={() => setMenuFor((m) => (m === i ? null : m))}
              style={{
                position: "relative",
                cursor: "grab",
                border: n === activePage ? "2px solid var(--accent)" : "2px solid transparent",
                boxShadow: n === activePage ? "0 0 0 3px var(--accent-soft)" : "none",
                borderRadius: 5,
                opacity: dragIndex === i ? 0.4 : 1,
              }}
            >
              <Thumbnail entry={entry} renderHtml={renderHtml} />
              <div
                style={{
                  position: "absolute",
                  bottom: 3,
                  right: 5,
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--paper-ink-soft)",
                  background: "rgba(255,255,255,0.7)",
                  borderRadius: 3,
                  padding: "0 3px",
                }}
              >
                {n}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuFor((m) => (m === i ? null : i));
                }}
                title="Page options"
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  width: 16,
                  height: 16,
                  fontSize: 10,
                  lineHeight: 1,
                  background: "rgba(20,20,26,0.75)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 3,
                  cursor: "pointer",
                }}
              >
                ⋯
              </button>
            </div>

            {menuFor === i && (
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  right: -4,
                  zIndex: 10,
                  background: "var(--shell-800)",
                  border: "1px solid var(--shell-700)",
                  borderRadius: 6,
                  boxShadow: "0 10px 24px -6px rgba(0,0,0,0.5)",
                  minWidth: 120,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => { onDuplicate(i); setMenuFor(null); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", background: "transparent", border: "none", color: "var(--ink-300)", fontSize: 11, cursor: "pointer" }}
                >
                  Duplicate
                </button>
                <button
                  onClick={() => { onAdd(i); setMenuFor(null); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", background: "transparent", border: "none", color: "var(--ink-300)", fontSize: 11, cursor: "pointer" }}
                >
                  Insert page after
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete page ${n}? This cannot be undone from here (use Ctrl+Z right after).`)) {
                      onDelete(i);
                    }
                    setMenuFor(null);
                  }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", background: "transparent", border: "none", color: "var(--bad)", fontSize: 11, cursor: "pointer" }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
