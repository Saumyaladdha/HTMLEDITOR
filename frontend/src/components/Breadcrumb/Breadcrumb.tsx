interface Props {
  /** Innermost selected element, or null. */
  selected: HTMLElement | null;
  /** Stop climbing here — the document's content root. */
  root: HTMLElement | null;
  onSelect: (el: HTMLElement) => void;
}

/**
 * The ancestor chain of the current selection, `body › article › aside.tip-box › p`.
 *
 * Selection is innermost-first: clicking lands on the smallest editable
 * thing under the cursor. That's right for typing, but it left no way to
 * select a CONTAINER — to move a whole tip-box you had to know to click
 * exactly on its padding. In an unfamiliar document, where a user has no
 * idea what the nesting even is, that made most structure unreachable.
 *
 * Showing the chain solves both: it reveals the structure, and every level
 * is clickable.
 */
function describe(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  // First non-editor class only — a BEM chain like
  // "tip-box tip-box--green" reads better as just "tip-box".
  const cls = Array.from(el.classList).find((c) => !c.startsWith("__ed-"));
  return cls ? `${tag}.${cls}` : tag;
}

export default function Breadcrumb({ selected, root, onSelect }: Props) {
  if (!selected) return null;

  const chain: HTMLElement[] = [];
  let node: HTMLElement | null = selected;
  while (node) {
    chain.unshift(node);
    if (root && node === root) break;
    if (node.tagName === "BODY") break;
    node = node.parentElement;
  }
  // Deep documents produce a chain too long to read; the innermost levels
  // are the ones that matter.
  const visible = chain.slice(-5);

  return (
    <nav
      aria-label="Element path"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "5px 12px",
        background: "var(--shell-850)",
        borderTop: "1px solid var(--shell-700)",
        fontSize: 11,
        color: "var(--ink-500)",
        zIndex: 30,
        overflowX: "auto",
        whiteSpace: "nowrap",
      }}
    >
      {chain.length > visible.length && <span style={{ marginRight: 4 }}>…</span>}
      {visible.map((el, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {i > 0 && <span style={{ color: "var(--shell-600)" }}>›</span>}
          <button
            onClick={() => onSelect(el)}
            title={`Select ${describe(el)}`}
            style={{
              background: el === selected ? "var(--accent-soft)" : "transparent",
              border: "none",
              borderRadius: 4,
              padding: "2px 6px",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "ui-monospace, monospace",
              color: el === selected ? "var(--ink-100)" : "var(--ink-500)",
            }}
          >
            {describe(el)}
          </button>
        </span>
      ))}
    </nav>
  );
}
