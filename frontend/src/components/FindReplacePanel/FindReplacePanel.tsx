interface Props {
  query: string;
  replacement: string;
  matchCount: number;
  currentIndex: number; // -1 when no matches
  onQueryChange: (q: string) => void;
  onReplacementChange: (r: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

export default function FindReplacePanel({
  query,
  replacement,
  matchCount,
  currentIndex,
  onQueryChange,
  onReplacementChange,
  onNext,
  onPrev,
  onReplace,
  onReplaceAll,
  onClose,
}: Props) {
  return (
    <div
      style={{
        position: "absolute",
        top: 56,
        right: 16,
        width: 300,
        background: "var(--shell-850)",
        border: "1px solid var(--shell-700)",
        borderRadius: 10,
        boxShadow: "0 20px 50px -12px rgba(0,0,0,0.6)",
        padding: 14,
        zIndex: 46, // above the property panel
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 13 }}>Find & replace</strong>
        <button className="btn icon-only" onClick={onClose}>✕</button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.shiftKey ? onPrev : onNext)();
          }}
          placeholder="Find…"
          style={{
            flex: 1,
            background: "var(--shell-800)",
            border: "1px solid var(--shell-700)",
            borderRadius: 6,
            padding: "7px 9px",
            color: "var(--ink-100)",
            fontSize: 12.5,
          }}
        />
        <span style={{ fontSize: 11, color: "var(--ink-500)", alignSelf: "center", minWidth: 42, textAlign: "right" }}>
          {matchCount > 0 ? `${currentIndex + 1}/${matchCount}` : query ? "0/0" : ""}
        </span>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <button className="btn" style={{ flex: 1, fontSize: 11.5 }} onClick={onPrev} disabled={matchCount === 0}>↑ Prev</button>
        <button className="btn" style={{ flex: 1, fontSize: 11.5 }} onClick={onNext} disabled={matchCount === 0}>↓ Next</button>
      </div>

      <input
        value={replacement}
        onChange={(e) => onReplacementChange(e.target.value)}
        placeholder="Replace with…"
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "var(--shell-800)",
          border: "1px solid var(--shell-700)",
          borderRadius: 6,
          padding: "7px 9px",
          color: "var(--ink-100)",
          fontSize: 12.5,
          marginBottom: 10,
        }}
      />

      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn" style={{ flex: 1, fontSize: 11.5 }} onClick={onReplace} disabled={matchCount === 0}>
          Replace
        </button>
        <button className="btn primary" style={{ flex: 1, fontSize: 11.5 }} onClick={onReplaceAll} disabled={matchCount === 0}>
          Replace all
        </button>
      </div>
    </div>
  );
}
