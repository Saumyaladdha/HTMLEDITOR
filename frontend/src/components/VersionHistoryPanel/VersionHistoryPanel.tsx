import { BookVersion } from "../../api/books";

interface Props {
  versions: BookVersion[];
  currentVersionId: string | null;
  onClose: () => void;
  onPreview: (versionId: string) => void;
  onRevert: (versionId: string) => void;
}

export default function VersionHistoryPanel({ versions, currentVersionId, onClose, onPreview, onRevert }: Props) {
  return (
    <div
      style={{
        position: "absolute",
        top: 56,
        right: 16,
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
        <strong style={{ fontSize: 13 }}>Version history</strong>
        <button className="btn icon-only" onClick={onClose}>✕</button>
      </div>
      {versions.length === 0 && <p style={{ fontSize: 12.5, color: "var(--ink-500)" }}>No versions yet.</p>}
      {versions.map((v) => (
        <div
          key={v.id}
          style={{
            padding: "9px 10px",
            borderRadius: 7,
            marginBottom: 6,
            background: v.id === currentVersionId ? "var(--accent-soft)" : "var(--shell-800)",
            fontSize: 12,
          }}
        >
          <div style={{ fontWeight: 600, color: "var(--ink-100)" }}>{v.label ?? "Untitled save"}</div>
          <div style={{ color: "var(--ink-500)", margin: "3px 0 8px", fontVariantNumeric: "tabular-nums" }}>
            {new Date(v.created_at).toLocaleString()} · {v.page_count ?? "?"} pages
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => onPreview(v.id)}>Preview</button>
            {v.id !== currentVersionId && (
              <button className="btn" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => onRevert(v.id)}>Revert to this</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
