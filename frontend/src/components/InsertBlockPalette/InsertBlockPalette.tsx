import { useState } from "react";
import { SEMANTIC_TEMPLATES, type BlockTemplate } from "../../editor/blockTemplates";

interface Props {
  /** Components found in the open document — see discoverTemplates. Empty
   * for a document with no repeated components (or a brand-new one). */
  discovered: BlockTemplate[];
  onInsert: (html: string) => void;
  onClose: () => void;
  /** Where the new block will land, in words — "after the selected paragraph
   * on page 12". Inserting used to drop the block somewhere off-screen with
   * no indication of where, so the palette appeared to do nothing at all. */
  destination: string;
  /** True when nothing is selected, so the destination is a fallback rather
   * than a choice the user made. */
  isFallback: boolean;
  /** The chapter's own stylesheet, so a preview looks like the real thing. */
  previewCss: string;
}

const itemStyle = {
  textAlign: "left" as const,
  background: "transparent",
  border: "none",
  color: "var(--ink-300)",
  padding: "7px 9px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12.5,
  width: "100%",
  display: "flex" as const,
  alignItems: "center" as const,
  gap: 9,
};

/** A glyph per kind of block, so the list can be read at a glance rather than
 * word by word. Keyed on the label the manifest gives, falling back to a
 * neutral mark — a wrong icon would be worse than none. */
const ICONS: Record<string, string> = {
  "Paragraph": "¶",
  "Heading": "H",
  "Bullets": "•",
  "Bullet list": "•",
  "Numbered": "1.",
  "Numbered list": "1.",
  "Answer": "✓",
  "Callout line": "!",
  "Centred formula": "∑",
  "Formula panel (सूत्र)": "∑",
  "Definition": "≡",
  "Divider line": "—",
  "Figure": "▣",
  "Image": "▣",
  "Given": "→",
  "Options": "◇",
  "Table": "▦",
  "Quote": "❝",
  "Code block": "</>",
  "Divider": "—",
};

function iconFor(label: string): string {
  return ICONS[label] ?? "▪";
}

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

/**
 * A shrunken, non-interactive rendering of the block itself.
 *
 * A name alone does not say what a block IS — "Given" means nothing until you
 * have seen the pink box it produces. The example carries the document's own
 * markup, so rendering it inside the page's stylesheet shows exactly what will
 * be inserted.
 *
 * `srcdoc` rather than the parent document, so the chapter's CSS cannot leak
 * into the editor's own UI.
 */
function Preview({ html, css }: { html: string; css: string }) {
  return (
    <iframe
      title="preview"
      aria-hidden
      tabIndex={-1}
      sandbox=""
      srcDoc={`<style>${css}
        body{margin:0;padding:6px;background:#fdfcf7;transform:scale(0.42);
             transform-origin:0 0;width:238%;pointer-events:none;}</style>${html}`}
      style={{
        width: "100%", height: 62, border: "1px solid var(--shell-700)",
        borderRadius: 6, background: "#fdfcf7", pointerEvents: "none",
        display: "block",
      }}
    />
  );
}

export default function InsertBlockPalette({ discovered, onInsert, onClose, destination, isFallback, previewCss }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const render = (t: BlockTemplate) => (
    <button
      key={t.key}
      onClick={() => {
        onInsert(t.html);
        onClose();
      }}
      style={itemStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--shell-800)";
        setHovered(t.key);
      }}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span
        aria-hidden
        style={{
          width: 22, height: 22, flex: "none", borderRadius: 5,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--shell-800)", border: "1px solid var(--shell-700)",
          fontSize: 11, color: "var(--ink-400, #8a90a0)",
        }}
      >
        {iconFor(t.label)}
      </span>
      {t.label}
    </button>
  );

  const renderWithPreview = (t: BlockTemplate) => (
    <div key={t.key}>
      {render(t)}
      {/* Only the hovered one renders — a preview per row means one iframe per
          row, and a chapter's stylesheet is megabytes. */}
      {hovered === t.key && (
        <div style={{ padding: "0 9px 8px" }}>
          <Preview html={t.html} css={previewCss} />
        </div>
      )}
    </div>
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
        minWidth: 246,
        maxHeight: "68vh",
        overflowY: "auto",
      }}
      /* Closing on mouse-leave made the palette vanish while reaching for an
         item near its edge. It closes on choice, or on the button. */
    >
      {/* WHERE it will go, before anything is chosen. Without this the block
          was inserted somewhere off-screen and the palette looked broken. */}
      <div
        style={{
          padding: "8px 10px",
          margin: "0 0 6px",
          borderRadius: 7,
          background: isFallback ? "rgba(224,165,60,0.12)" : "var(--shell-800)",
          border: `1px solid ${isFallback ? "rgba(224,165,60,0.45)" : "var(--shell-700)"}`,
          fontSize: 11,
          lineHeight: 1.45,
          color: isFallback ? "#e0b877" : "var(--ink-300)",
        }}
      >
        {isFallback
          ? <>Nothing is selected, so this goes <b>{destination}</b>. Click a block
             first to place it exactly.</>
          : <>Will be added <b style={{ color: "var(--ink-100)" }}>{destination}</b>.</>}
      </div>

      {/* Components the document itself uses come FIRST — in a real chapter
          they're what the user actually wants, and they carry the document's
          own styling rather than an unstyled semantic element. */}
      {discovered.length > 0 && (
        <>
          <Section label="From this document" />
          {discovered.map(renderWithPreview)}
          <div style={{ borderTop: "1px solid var(--shell-700)", margin: "6px 0" }} />
        </>
      )}
      <Section label="Basic" />
      {SEMANTIC_TEMPLATES.map(renderWithPreview)}
    </div>
  );
}
