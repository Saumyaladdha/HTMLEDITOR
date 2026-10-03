import { useMemo, useState } from "react";
import {
  DECORATOR_CATEGORIES,
  DECORATOR_ITEMS,
  type DecoratorItem,
  searchDecorators,
} from "../../editor/decorators";

/**
 * The art shelf.
 *
 * 130 decorators in six categories that, until now, nothing could reach — see
 * `editor/decorators.ts` for why they were stranded. Browsing is deliberately
 * visual: a teacher looking for "the boy who is confused" recognises the
 * picture instantly and would never guess the filename
 * `students/boy-scratching-head`.
 *
 * Clicking places art on the page currently in view. It cannot disturb the
 * layout — placement is absolute, out of the flow — so a click is safe to be
 * the whole interaction, with dragging afterwards to fine-tune.
 */
export default function DecoratorPanel({
  onPlace,
  onDragItem,
  pageLabel,
  busy,
}: {
  onPlace: (item: DecoratorItem) => void;
  /** Called when a drag STARTS, so the canvas knows what is being dragged.
   * The art is carried in a ref rather than in `dataTransfer` because the
   * drop lands inside the canvas IFRAME — a different document — and reading
   * custom dataTransfer types across that boundary is unreliable. */
  onDragItem: (item: DecoratorItem | null) => void;
  /** Which page a click would drop art on, so the button is never a mystery. */
  pageLabel: string | null;
  busy: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const results = useMemo(() => searchDecorators(query, category), [query, category]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ padding: "12px 12px 8px" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search art — “exam”, “confused”, “beaker”…"
          style={{
            width: "100%", padding: "7px 9px", borderRadius: 7, fontSize: 12.5,
            background: "var(--shell-800)", border: "1px solid var(--shell-700)",
            color: "var(--ink-100)", outline: "none",
          }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 9 }}>
          <Chip label={`All (${DECORATOR_ITEMS.length})`} active={category === null}
                onClick={() => setCategory(null)} />
          {DECORATOR_CATEGORIES.map((c) => (
            <Chip key={c.id} label={`${c.label} (${c.count})`} title={c.blurb}
                  active={category === c.id} onClick={() => setCategory(c.id)} />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 12px 12px", minHeight: 0 }}>
        {results.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--ink-400, #8a90a0)", padding: "10px 2px" }}>
            Nothing matches “{query}”.
          </p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
          {results.map((it) => (
            <button
              key={it.id}
              title={`${it.name} · ${it.categoryLabel} — click to place, or drag onto the page`}
              disabled={busy}
              draggable
              onDragStart={(e) => {
                onDragItem(it);
                // Some browsers refuse to start a drag with no payload at all.
                e.dataTransfer.setData("text/plain", it.id);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onDragEnd={() => onDragItem(null)}
              onClick={() => onPlace(it)}
              style={{
                aspectRatio: "1 / 1", display: "flex", alignItems: "center",
                justifyContent: "center", padding: 5, borderRadius: 9,
                background: "var(--shell-800)", border: "1px solid var(--shell-700)",
                cursor: busy ? "wait" : "pointer",
              }}
            >
              <img
                src={it.thumb}
                alt={it.name}
                loading="lazy"
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            </button>
          ))}
        </div>
      </div>

      <div style={{
        padding: "9px 12px", borderTop: "1px solid var(--shell-700)",
        fontSize: 11.5, color: "var(--ink-400, #8a90a0)", lineHeight: 1.45,
      }}>
        {pageLabel
          ? <>Drag a picture onto any page, or click to drop it on <b style={{ color: "var(--ink-200)" }}>{pageLabel}</b>. Once placed, drag to move it and use the corner handles to resize. It sits on top of the page, so it never moves your text.</>
          : <>Scroll to a page first — art is placed on whichever page you are looking at.</>}
      </div>
    </div>
  );
}

function Chip({ label, title, active, onClick }: {
  label: string; title?: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: "4px 8px", borderRadius: 999, fontSize: 11, cursor: "pointer",
        background: active ? "var(--accent-soft, #2a3a66)" : "var(--shell-800)",
        border: active ? "1px solid var(--accent, #6c8bff)" : "1px solid var(--shell-700)",
        color: active ? "var(--ink-100)" : "var(--ink-300)",
        fontWeight: active ? 700 : 500,
      }}
    >
      {label}
    </button>
  );
}
