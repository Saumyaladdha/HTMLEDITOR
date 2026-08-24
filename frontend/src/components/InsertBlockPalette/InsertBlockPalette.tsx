import { BLOCK_TEMPLATES } from "../../editor/blockTemplates";

interface Props {
  onInsert: (html: string) => void;
  onClose: () => void;
}

export default function InsertBlockPalette({ onInsert, onClose }: Props) {
  return (
    <div
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
        gap: 3,
        minWidth: 190,
      }}
      onMouseLeave={onClose}
    >
      {BLOCK_TEMPLATES.map((t) => (
        <button
          key={t.key}
          onClick={() => { onInsert(t.html); onClose(); }}
          style={{
            textAlign: "left",
            background: "transparent",
            border: "none",
            color: "var(--ink-300)",
            padding: "8px 10px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 12.5,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--shell-800)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          + {t.label}
        </button>
      ))}
    </div>
  );
}
