import { useEffect, useMemo, useState } from "react";
import { SEMANTIC_TEMPLATES, type BlockTemplate } from "../../editor/blockTemplates";
import { BLOCK_TYPES } from "../../editor/blockEditing";
import { ScreenRect } from "../../editor/geometry";

export interface SlashAction {
  key: string;
  label: string;
  hint: string;
  run: () => void;
}

interface Props {
  /** Where the caret is, in outer-page coordinates. */
  rect: ScreenRect;
  /** Text typed after the "/", used to filter. */
  query: string;
  discovered: BlockTemplate[];
  onInsert: (html: string) => void;
  onConvert: (tag: string) => void;
  onClose: () => void;
}

/**
 * Type "/" in a block to insert or convert, without leaving the keyboard.
 *
 * The only way to add a block was a floating "+" button in the bottom-right
 * corner of the screen — far from where you are typing, and easy to never
 * notice at all. A slash menu is the convention people now expect, and it
 * pairs with the self-populating palette: in a chapter that uses tip-boxes,
 * typing "/tip" offers that chapter's OWN tip-box, not a generic one.
 */
export default function SlashMenu({ rect, query, discovered, onInsert, onConvert, onClose }: Props) {
  const [index, setIndex] = useState(0);

  const actions = useMemo<SlashAction[]>(() => {
    const all: SlashAction[] = [
      ...BLOCK_TYPES.map((t) => ({
        key: `type:${t.tag}`,
        label: t.label,
        hint: "Turn into",
        run: () => onConvert(t.tag),
      })),
      ...discovered.map((t) => ({
        key: t.key,
        label: t.label,
        hint: "From this document",
        run: () => onInsert(t.html),
      })),
      ...SEMANTIC_TEMPLATES.map((t) => ({
        key: `new:${t.key}`,
        label: t.label,
        hint: "Insert",
        run: () => onInsert(t.html),
      })),
    ];
    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 10);
    return all.filter((a) => a.label.toLowerCase().includes(q)).slice(0, 10);
  }, [query, discovered, onInsert, onConvert]);

  // Typing narrows the list; the highlighted row must stay in range or Enter
  // would run whatever happened to be at a stale index.
  useEffect(() => setIndex(0), [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => (i + 1) % Math.max(1, actions.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => (i - 1 + actions.length) % Math.max(1, actions.length));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        actions[index]?.run();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    // Capture phase, and on BOTH documents: the caret is inside the canvas
    // iframe, whose keydown never reaches the parent window.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [actions, index, onClose]);

  if (actions.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Insert or convert block"
      style={{
        position: "fixed",
        left: rect.left,
        top: rect.top + rect.height + 6,
        width: 260,
        maxHeight: 280,
        overflowY: "auto",
        background: "#1c1c22",
        border: "1px solid #33333c",
        borderRadius: 8,
        boxShadow: "0 20px 50px -12px rgba(0,0,0,0.7)",
        padding: 4,
        zIndex: 60,
      }}
    >
      {actions.map((a, i) => (
        <button
          key={a.key}
          role="option"
          aria-selected={i === index}
          onMouseEnter={() => setIndex(i)}
          onMouseDown={(e) => {
            e.preventDefault();
            a.run();
          }}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            width: "100%",
            textAlign: "left",
            padding: "7px 9px",
            borderRadius: 5,
            border: "none",
            cursor: "pointer",
            background: i === index ? "#2f3550" : "transparent",
            color: "#c9c9d4",
            fontSize: 12.5,
          }}
        >
          <span>{a.label}</span>
          <span style={{ fontSize: 10, color: "#7a7a86" }}>{a.hint}</span>
        </button>
      ))}
    </div>
  );
}
