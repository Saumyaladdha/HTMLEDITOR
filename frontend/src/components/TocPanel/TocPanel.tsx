import { TocEntry } from "../../editor/toc";

interface Props {
  entries: TocEntry[];
  onClose: () => void;
  onJump: (entry: TocEntry) => void;
}

/** Depth 1–4, matching TocEntry.level. Driven by nesting depth rather than by
 * a fixed set of named heading types, so an ordinary <h1>/<h2> document
 * renders exactly as well as a pipeline chapter. */
const LEVEL_STYLE: Record<number, { indent: number; size: number; weight: number; color: string }> = {
  1: { indent: 0, size: 13, weight: 800, color: "var(--ink-100)" },
  2: { indent: 6, size: 12.5, weight: 700, color: "var(--accent, #6c8bff)" },
  3: { indent: 14, size: 12, weight: 600, color: "var(--ink-200)" },
  4: { indent: 22, size: 11.5, weight: 500, color: "var(--ink-400)" },
};

export default function TocPanel({ entries, onClose, onJump }: Props) {
  return (
    <div
      style={{
        position: "absolute",
        top: 56,
        left: 92,
        width: 300,
        maxHeight: "70vh",
        overflowY: "auto",
        background: "var(--shell-850)",
        border: "1px solid var(--shell-700)",
        borderRadius: 10,
        boxShadow: "0 20px 50px -12px rgba(0,0,0,0.6)",
        padding: 14,
        zIndex: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 13 }}>Outline</strong>
        <button className="btn icon-only" onClick={onClose}>✕</button>
      </div>
      {entries.length === 0 && (
        <p style={{ fontSize: 12.5, color: "var(--ink-500)" }}>No headings found in this document.</p>
      )}
      {entries.map((entry, i) => {
        const style = LEVEL_STYLE[entry.level] ?? LEVEL_STYLE[4];
        return (
          <button
            key={i}
            onClick={() => onJump(entry)}
            title={entry.text}
            style={{
              display: "block",
              textAlign: "left",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "6px 8px",
              marginLeft: style.indent,
              width: `calc(100% - ${style.indent}px)`,
              borderRadius: 6,
              fontSize: style.size,
              fontWeight: style.weight,
              color: style.color,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--shell-800)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {entry.pageIndex !== null && (
              <span style={{ color: "var(--ink-500)", fontWeight: 400, marginRight: 6 }}>
                p{entry.pageIndex + 1}
              </span>
            )}
            {entry.text}
          </button>
        );
      })}
    </div>
  );
}
