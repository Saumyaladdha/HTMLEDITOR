import { useMemo, useState } from "react";
import { BookVersion } from "../../api/books";

interface Props {
  versions: BookVersion[];
  currentVersionId: string | null;
  onClose: () => void;
  onPreview: (versionId: string) => void;
  onRevert: (versionId: string) => void;
}

/**
 * A run of consecutive autosaves, collapsed into one row.
 *
 * Autosave fires every 20 seconds while the document is dirty, so a two-hour
 * session produces something like 360 rows all labelled "Autosave". The
 * panel listed every one of them flat and newest-first, which buries the
 * handful of deliberate, named saves that are the only reason to open
 * history at all. Grouping keeps every version reachable (expand the run)
 * while making the meaningful ones visible without scrolling.
 */
interface AutosaveRun {
  kind: "autosave-run";
  versions: BookVersion[];
}
interface NamedSave {
  kind: "named";
  version: BookVersion;
}
type Row = AutosaveRun | NamedSave;

const AUTOSAVE_LABEL = "Autosave";

function groupVersions(versions: BookVersion[], currentVersionId: string | null): Row[] {
  const rows: Row[] = [];
  for (const v of versions) {
    const isAutosave = v.label === AUTOSAVE_LABEL && v.id !== currentVersionId;
    const previous = rows[rows.length - 1];
    if (isAutosave && previous?.kind === "autosave-run") {
      previous.versions.push(v);
    } else if (isAutosave) {
      rows.push({ kind: "autosave-run", versions: [v] });
    } else {
      // The current version is always shown on its own, even if it happens
      // to be an autosave — it's the one the user is actually editing.
      rows.push({ kind: "named", version: v });
    }
  }
  return rows;
}

function formatRange(versions: BookVersion[]): string {
  const times = versions.map((v) => new Date(v.created_at));
  const newest = times[0];
  const oldest = times[times.length - 1];
  const day = newest.toLocaleDateString();
  if (versions.length === 1) return `${day} ${newest.toLocaleTimeString()}`;
  return `${day} ${oldest.toLocaleTimeString()} – ${newest.toLocaleTimeString()}`;
}

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: 56,
  right: 16,
  width: 320,
  maxHeight: "70vh",
  overflowY: "auto",
  background: "var(--shell-850)",
  border: "1px solid var(--shell-700)",
  borderRadius: 10,
  boxShadow: "0 20px 50px -12px rgba(0,0,0,0.6)",
  padding: 14,
  zIndex: 20,
};

export default function VersionHistoryPanel({ versions, currentVersionId, onClose, onPreview, onRevert }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const rows = useMemo(() => groupVersions(versions, currentVersionId), [versions, currentVersionId]);

  const toggle = (i: number) =>
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const renderVersion = (v: BookVersion, compact = false) => (
    <div
      key={v.id}
      style={{
        padding: compact ? "6px 8px" : "9px 10px",
        borderRadius: 7,
        marginBottom: 6,
        marginLeft: compact ? 12 : 0,
        background: v.id === currentVersionId ? "var(--accent-soft)" : "var(--shell-800)",
        fontSize: compact ? 11.5 : 12,
      }}
    >
      <div style={{ fontWeight: 600, color: "var(--ink-100)" }}>
        {v.label ?? "Untitled save"}
        {v.id === currentVersionId && (
          <span style={{ color: "var(--good)", fontWeight: 500, marginLeft: 6 }}>· current</span>
        )}
      </div>
      <div style={{ color: "var(--ink-500)", margin: "3px 0 8px", fontVariantNumeric: "tabular-nums" }}>
        {new Date(v.created_at).toLocaleString()}
        {v.page_count ? ` · ${v.page_count} pages` : ""}
        {` · ${Math.max(1, Math.round(v.size_bytes / 1024))} KB`}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => onPreview(v.id)}>
          Preview
        </button>
        {v.id !== currentVersionId && (
          <button className="btn" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => onRevert(v.id)}>
            Restore
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={panelStyle} role="dialog" aria-label="Version history">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 13 }}>Version history</strong>
        <button className="btn icon-only" aria-label="Close version history" onClick={onClose}>✕</button>
      </div>

      {versions.length === 0 && <p style={{ fontSize: 12.5, color: "var(--ink-500)" }}>No versions yet.</p>}

      {rows.map((row, i) =>
        row.kind === "named" ? (
          renderVersion(row.version)
        ) : (
          <div key={`run-${i}`} style={{ marginBottom: 6 }}>
            <button
              onClick={() => toggle(i)}
              aria-expanded={expanded.has(i)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 7,
                background: "transparent",
                border: "1px dashed var(--shell-700)",
                color: "var(--ink-500)",
                fontSize: 11.5,
                cursor: "pointer",
              }}
            >
              {expanded.has(i) ? "▾" : "▸"} {row.versions.length} autosave
              {row.versions.length === 1 ? "" : "s"}
              <div style={{ fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{formatRange(row.versions)}</div>
            </button>
            {expanded.has(i) && <div style={{ marginTop: 6 }}>{row.versions.map((v) => renderVersion(v, true))}</div>}
          </div>
        ),
      )}
    </div>
  );
}
