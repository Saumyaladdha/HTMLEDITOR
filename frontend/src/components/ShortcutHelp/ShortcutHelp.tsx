interface Props {
  onClose: () => void;
}

/**
 * Keyboard reference, opened with "?".
 *
 * The editor gained a real keyboard layer — split/merge, block type, links,
 * copy/paste of whole blocks — and none of it is discoverable by looking at
 * the screen. A shortcut sheet is the cheapest possible fix and the one
 * users go looking for first.
 */
const GROUPS: { title: string; items: [keys: string, description: string][] }[] = [
  {
    title: "Writing",
    items: [
      ["Enter", "Split into a new block"],
      ["Shift + Enter", "Line break inside the block"],
      ["Backspace at start", "Merge into the block above"],
      ["Delete at end", "Pull the next block up"],
      ["Tab / Shift + Tab", "Indent / outdent a list item"],
      ["Enter on empty list item", "Leave the list"],
    ],
  },
  {
    title: "Formatting",
    items: [
      ["Ctrl/⌘ + B / I / U", "Bold, italic, underline"],
      ["Ctrl/⌘ + K", "Add or edit a link"],
      ["Ctrl/⌘ + Alt + 0…4", "Paragraph, Heading 1–4"],
      ["Ctrl/⌘ + Shift + V", "Paste without formatting"],
      ["/", "Insert or convert a block"],
    ],
  },
  {
    title: "Blocks",
    items: [
      ["Click", "Select a block"],
      ["Shift + Click", "Add to the selection"],
      ["Right click", "Block actions menu"],
      ["Ctrl/⌘ + D", "Duplicate"],
      ["Ctrl/⌘ + C / X / V", "Copy, cut, paste whole blocks"],
      ["Delete", "Remove the selected block"],
      ["Escape", "Step out / deselect"],
    ],
  },
  {
    title: "Document",
    items: [
      ["Ctrl/⌘ + S", "Save a version"],
      ["Ctrl/⌘ + Z", "Undo"],
      ["Ctrl/⌘ + Shift + Z", "Redo"],
      ["Ctrl/⌘ + F", "Find and replace"],
      ["?", "This help"],
    ],
  },
];

export default function ShortcutHelp({ onClose }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 150,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(760px, 92vw)",
          maxHeight: "82vh",
          overflowY: "auto",
          background: "var(--shell-850)",
          border: "1px solid var(--shell-700)",
          borderRadius: 12,
          padding: 22,
          boxShadow: "0 30px 70px -20px rgba(0,0,0,0.7)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <strong style={{ fontSize: 15 }}>Keyboard shortcuts</strong>
          <button className="btn icon-only" aria-label="Close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 22 }}>
          {GROUPS.map((group) => (
            <div key={group.title}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--ink-500)",
                  marginBottom: 8,
                }}
              >
                {group.title}
              </div>
              {group.items.map(([keys, description]) => (
                <div
                  key={keys}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "5px 0",
                    fontSize: 12.5,
                    color: "var(--ink-300)",
                  }}
                >
                  <span>{description}</span>
                  <kbd
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 11,
                      color: "var(--ink-100)",
                      background: "var(--shell-800)",
                      border: "1px solid var(--shell-700)",
                      borderRadius: 4,
                      padding: "1px 6px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
