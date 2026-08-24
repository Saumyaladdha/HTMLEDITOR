import { SEMANTIC_TEMPLATES, type BlockTemplate } from "../../editor/blockTemplates";

interface Props {
  /** Components found in the open document — see discoverTemplates. Empty
   * for a document with no repeated components (or a brand-new one). */
  discovered: BlockTemplate[];
  onInsert: (html: string) => void;
  onClose: () => void;
}

const itemStyle = {
  textAlign: "left" as const,
  background: "transparent",
  border: "none",
  color: "var(--ink-300)",
  padding: "8px 10px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12.5,
  width: "100%",
};

function Section({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: "var(--ink-500)",
        padding: "8px 10px 4px",
      }}
    >
      {label}
    </div>
  );
}

export default function InsertBlockPalette({ discovered, onInsert, onClose }: Props) {
  const render = (t: BlockTemplate) => (
    <button
      key={t.key}
      onClick={() => {
        onInsert(t.html);
        onClose();
      }}
      style={itemStyle}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--shell-800)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      + {t.label}
    </button>
  );

  return (
    <div
      role="menu"
      aria-label="Insert block"
      style={{
        position: "absolute",
        right: 24,
        bottom: 82,
        background: "var(--shell-850)",
        border: "1px solid var(--shell-700)",
        borderRadius: 10,
        boxShadow: "0 20px 50px -12px rgba(0,0,0,0.6)",
        padding: 8,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        minWidth: 200,
        maxHeight: "60vh",
        overflowY: "auto",
      }}
      onMouseLeave={onClose}
    >
      {/* Components the document itself uses come FIRST — in a real chapter
          they're what the user actually wants, and they carry the document's
          own styling rather than an unstyled semantic element. */}
      {discovered.length > 0 && (
        <>
          <Section label="From this document" />
          {discovered.map(render)}
          <div style={{ borderTop: "1px solid var(--shell-700)", margin: "6px 0" }} />
        </>
      )}
      <Section label="Basic" />
      {SEMANTIC_TEMPLATES.map(render)}
    </div>
  );
}
