import React, { useEffect, useRef, useState } from "react";
import {
  ALL_LAYOUT_TOGGLE_CLASSES,
  HIGHLIGHT_PALETTE,
  TEXT_COLOR_PALETTE,
  applyFigureWidth,
  isImageSubPart,
  registryEntryFor,
} from "../../editor/propertyRegistry";
import { applyImageToFigureSlot } from "../../editor/selection";
import { fileToDataUrl, listenForPastedImage } from "../../editor/imageSwap";
import { setContentEditable, unwrapAncestor, wrapSelection } from "../../editor/textEditing";
import { ScreenRect } from "../../editor/geometry";
import type { DocumentCapabilities } from "../../editor/capabilities";
import StyleInspector from "../StyleInspector/StyleInspector";

/** Unwraps a span the editor created via the inline-style fallback (no class
 * to match on) — replaces it with its own children. The class-based path uses
 * unwrapAncestor instead. */
function unwrapElement(el: HTMLElement) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

interface Props {
  doc: Document | null;
  block: HTMLElement | null;
  subPart: HTMLElement | null;
  /** Which inline-formatting mechanism this document supports — see
   * capabilities.ts. Colouring a word wrote a `.text-color` span
   * unconditionally, which is invisible in any document lacking that CSS. */
  capabilities: DocumentCapabilities;
  onRemoveBlock: () => void;
  onChanged: () => void; // call after any DOM mutation so parent can mark "unsaved"
  /** Image replacement can swap the sub-part's actual DOM node (a raw
   * placeholder <div> becomes a real <img> — see applyImageToFigureSlot).
   * The parent tracks `subPart` as state, so it needs to be told the new
   * node explicitly, not just "something changed". */
  onImageReplaced: (newEl: HTMLElement) => void;
  /** Screen position to anchor the panel next to — null while nothing is
   * selected, in which case the panel renders nothing (no permanent
   * always-visible sidebar; see §2 of the editor spec). */
  anchorRect: ScreenRect | null;
}

function Swatches({
  palette,
  activeHex,
  onPick,
}: {
  palette: { name: string; hex: string }[];
  activeHex: string | null;
  onPick: (hex: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
      {palette.map((c) => (
        <button
          key={c.name}
          title={c.name}
          onClick={() => onPick(c.hex)}
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: c.hex,
            border: activeHex === c.hex ? "2px solid var(--ink-100)" : "2px solid transparent",
            cursor: "pointer",
          }}
        />
      ))}
    </div>
  );
}

export default function PropertyPanel({ doc, block, subPart, capabilities, onRemoveBlock, onChanged, onImageReplaced, anchorRect }: Props) {
  const [, bump] = useState(0);
  const [picker, setPicker] = useState<"color" | "highlight" | null>(null);
  useEffect(() => setPicker(null), [block, subPart]);
  const rerender = () => bump((n) => n + 1);

  if (!block || !doc || !anchorRect) return null;

  const { entry } = registryEntryFor(block);

  // Sub-part: a coloured or highlighted inline span selected inside the
  // block. Recognised through EITHER mechanism — the pipeline's semantic
  // class, or the plain inline-styled span the editor emits in documents
  // that don't define those classes. Matching on class alone meant a span
  // the editor had just created in an ordinary document could never be
  // re-selected to change or remove its colour.
  const isColorSpan =
    !!subPart && (subPart.classList.contains("text-color") || !!subPart.style.color);
  const isHighlightSpan =
    !!subPart && (subPart.classList.contains("highlight") || !!subPart.style.backgroundColor);

  if (subPart && isColorSpan) {
    const activeHex = subPart.style.getPropertyValue("--tc-c") || subPart.style.color || null;
    const classed = subPart.classList.contains("text-color");
    return (
      <aside style={floatingPanelStyle()}>
        <PanelHeader title="Coloured text" sub={classed ? "text-color span" : "inline colour"} />
        <Group label="Colour">
          <Swatches
            palette={TEXT_COLOR_PALETTE}
            activeHex={activeHex}
            onPick={(hex) => {
              if (classed && capabilities.textColor.cssVar) {
                subPart.style.setProperty(capabilities.textColor.cssVar, hex);
              } else {
                subPart.style.color = hex;
              }
              onChanged();
              rerender();
            }}
          />
        </Group>
        <FieldBtn
          danger
          label="Remove colour"
          onClick={() => {
            if (classed) unwrapAncestor(block, subPart, "text-color");
            else unwrapElement(subPart);
            onChanged();
          }}
        />
      </aside>
    );
  }
  if (subPart && isHighlightSpan) {
    const activeHex =
      subPart.style.getPropertyValue("--hl-c") || subPart.style.backgroundColor || null;
    const classed = subPart.classList.contains("highlight");
    return (
      <aside style={floatingPanelStyle()}>
        <PanelHeader title="Highlighted text" sub={classed ? "highlight span" : "inline highlight"} />
        <Group label="Highlight colour">
          <Swatches
            palette={HIGHLIGHT_PALETTE}
            activeHex={activeHex}
            onPick={(hex) => {
              if (classed && capabilities.highlight.cssVar) {
                subPart.style.setProperty(capabilities.highlight.cssVar, hex);
              } else {
                subPart.style.backgroundColor = hex;
              }
              onChanged();
              rerender();
            }}
          />
        </Group>
        <FieldBtn
          danger
          label="Remove highlight"
          onClick={() => {
            if (classed) unwrapAncestor(block, subPart, "highlight");
            else unwrapElement(subPart);
            onChanged();
          }}
        />
      </aside>
    );
  }

  // Any registry- or generically-discovered sub-part typed "image", or a
  // structurally-recognized figure placeholder that never got a
  // `figure__img` class at all (see isImageSubPart) — either way, the same
  // replace/paste controls apply.
  const imageTarget = isImageSubPart(block, subPart, entry) ? subPart : null;

  return (
    <aside style={floatingPanelStyle()}>
      <PanelHeader title={entry.label} sub={Array.from(block.classList).join(" ")} />

      {(entry.directText || (subPart && !imageTarget)) && (
        <Group label="Text">
          <FieldBtn
            label="✎  Edit text"
            onClick={() => {
              const target = subPart ?? block;
              setContentEditable(target, true);
              onChanged();
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <FieldBtn
              label="🎨  Colour word"
              small
              onClick={() => setPicker((p) => (p === "color" ? null : "color"))}
            />
            <FieldBtn
              label="✏️  Highlight word"
              small
              onClick={() => setPicker((p) => (p === "highlight" ? null : "highlight"))}
            />
          </div>
          {picker === "color" && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: "var(--ink-500)", marginBottom: 6 }}>
                Select the word/phrase first, then pick a colour:
              </div>
              <Swatches
                palette={TEXT_COLOR_PALETTE}
                activeHex={null}
                onPick={(hex) => {
                  wrapSelection(doc, block, capabilities.textColor, hex);
                  setPicker(null);
                  onChanged();
                  rerender();
                }}
              />
            </div>
          )}
          {picker === "highlight" && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: "var(--ink-500)", marginBottom: 6 }}>
                Select the word/phrase first, then pick a highlight:
              </div>
              <Swatches
                palette={HIGHLIGHT_PALETTE}
                activeHex={null}
                onPick={(hex) => {
                  wrapSelection(doc, block, capabilities.highlight, hex);
                  setPicker(null);
                  onChanged();
                  rerender();
                }}
              />
            </div>
          )}
        </Group>
      )}

      {imageTarget && (
        <ImageControls
          doc={doc}
          targetEl={imageTarget}
          onImageReplaced={(newEl) => { onImageReplaced(newEl); rerender(); }}
          onChanged={onChanged}
          rerender={rerender}
        />
      )}

      {entry.cssVars?.map((cv) => {
        const isFigWidth = cv.cssVar === "--fig-w";
        // For width specifically, the plain inline `width` style (set by
        // applyFigureWidth) is the real source of truth, not the CSS var —
        // see applyFigureWidth's doc comment for why the var alone can be
        // completely ineffective depending on the figure's variant class.
        const raw = (isFigWidth && parseFloat(block.style.width)) || parseFloat(block.style.getPropertyValue(cv.cssVar)) || cv.min || 0;
        // Clamp into [min, max]: a value written by something else (an old
        // bug, a hand-edited HTML source) that falls outside this range
        // would otherwise get silently clamped by the native <input
        // type="range"> itself while React keeps re-asserting the
        // out-of-range value — the slider looks stuck/unresponsive. This
        // makes the panel self-heal back into range on the next render
        // instead of staying wedged.
        const current = Math.min(cv.max ?? raw, Math.max(cv.min ?? raw, raw));
        return (
          <Group key={cv.cssVar} label={cv.label}>
            <SliderRow
              unit={cv.unit ?? ""}
              min={cv.min ?? 0}
              max={cv.max ?? 100}
              value={current}
              // Live visual feedback on every tick — but the undo
              // checkpoint (onChanged, i.e. markDirty) only fires once the
              // drag actually ends (onCommit), not per tick. Dozens of
              // intermediate commits during one drag used to mean a single
              // Ctrl+Z only undid the last pixel of the drag, not the
              // whole gesture — and could evict older history entirely
              // past the 50-snapshot cap.
              onChange={(v) => {
                if (isFigWidth) applyFigureWidth(block, v);
                else block.style.setProperty(cv.cssVar, `${v}${cv.unit ?? ""}`);
                rerender();
              }}
              onCommit={onChanged}
            />
          </Group>
        );
      })}

      {entry.layoutToggle && !(entry.layoutToggle.hiddenInsideParentClass && block.parentElement?.classList.contains(entry.layoutToggle.hiddenInsideParentClass)) && (
        <Group label={entry.layoutToggle.label}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {entry.layoutToggle.options.map((opt) => {
              const active = opt.addClass ? block.classList.contains(opt.addClass) : !ALL_LAYOUT_TOGGLE_CLASSES.some((c) => block.classList.contains(c));
              return (
                <button
                  key={opt.label}
                  onClick={() => {
                    ALL_LAYOUT_TOGGLE_CLASSES.forEach((c) => block.classList.remove(c));
                    if (opt.addClass) block.classList.add(opt.addClass);
                    onChanged();
                    rerender();
                  }}
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                    background: active ? "var(--accent-soft, #2a3a66)" : "var(--shell-800)",
                    border: active ? "1px solid var(--accent, #6c8bff)" : "1px solid var(--shell-700)",
                    color: active ? "var(--ink-100)" : "var(--ink-300)",
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {active ? "● " : "○ "}{opt.label}
                </button>
              );
            })}
          </div>
        </Group>
      )}

      {/* Universal controls, available on EVERY element regardless of whether
          the registry recognises its type. Without these, the thirty-one
          library elements with no registry entry — and the whole of any
          document the editor didn't generate — offered nothing beyond "edit
          text / remove". */}
      <StyleInspector el={block} onChange={rerender} onCommit={onChanged} />

      <div style={{ borderTop: "1px solid var(--shell-700)", paddingTop: 16, marginTop: 24 }}>
        <FieldBtn danger label="🗑  Remove block" onClick={onRemoveBlock} />
      </div>
    </aside>
  );
}

function ImageControls({
  doc,
  targetEl,
  onImageReplaced,
  onChanged,
  rerender,
}: {
  doc: Document;
  targetEl: HTMLElement;
  onImageReplaced: (newEl: HTMLElement) => void;
  onChanged: () => void;
  rerender: () => void;
}) {
  // The <input> below is rendered by React into the OUTER app document, not
  // the iframe — `doc` here is the iframe's contentDocument, so looking the
  // input up via `doc.getElementById(...)` could never find it (that id
  // simply doesn't exist in that document at all). A ref to the actual
  // rendered node is the only correct way to trigger it.
  const fileInputRef = useRef<HTMLInputElement>(null);

  function applyDataUrl(url: string) {
    // May replace a raw placeholder <div> with a real <img class="figure__img">
    // so it actually fills its box nicely instead of showing a
    // background-image inside the old dashed-border placeholder chrome —
    // see applyImageToFigureSlot's own doc comment.
    onImageReplaced(applyImageToFigureSlot(targetEl, url));
  }

  return (
    <Group label="Image">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) applyDataUrl(await fileToDataUrl(file));
          e.target.value = "";
        }}
      />
      <FieldBtn label="🖼  Replace image" onClick={() => fileInputRef.current?.click()} />
      <div style={{ marginTop: 8 }}>
        <FieldBtn
          label="📋  Paste from clipboard"
          onClick={() => {
            const stop = listenForPastedImage(doc, (url) => { applyDataUrl(url); stop(); });
            window.setTimeout(stop, 15000);
          }}
        />
      </div>
      <div style={{ marginTop: 14 }}>
        <SliderRow
          label="Height (independent of width)"
          unit="px"
          min={60}
          max={700}
          value={Math.round(parseFloat(targetEl.style.height) || targetEl.getBoundingClientRect().height || 200)}
          onChange={(v) => {
            // A deliberate override of figure.css's height:auto (see
            // BookEditor's onResizeSelectedImageHeight for why this has no
            // shared CSS-var equivalent to --fig-w) — object-fit:cover
            // keeps it looking like a clean crop instead of a squished
            // image once height no longer matches the natural ratio.
            targetEl.style.height = `${v}px`;
            targetEl.style.objectFit = "cover";
            rerender();
          }}
          onCommit={onChanged}
        />
      </div>
    </Group>
  );
}

function PanelHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ fontSize: 13.5, fontWeight: 700, margin: "0 0 3px", color: "var(--ink-100)" }}>{title}</p>
      <p style={{ fontSize: 11.5, color: "var(--ink-500)", margin: 0 }}>{sub}</p>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--ink-500)", marginBottom: 9 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function SliderRow({
  label,
  unit,
  min,
  max,
  value,
  onChange,
  onCommit,
}: {
  label?: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  /** Fires once when the drag/interaction actually ends (mouseup, touchend,
   * or blur for a keyboard-driven change) — this is the ONLY place that
   * should push an undo checkpoint. `onChange` alone fires continuously
   * while dragging, which would otherwise turn one gesture into dozens of
   * undo steps. */
  onCommit?: () => void;
}) {
  return (
    <div>
      {label && (
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--ink-500)", marginBottom: 9, display: "flex", justifyContent: "space-between" }}>
          <span>{label}</span>
          <span style={{ color: "var(--ink-300)", fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>{value}{unit}</span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseUp={onCommit}
          onTouchEnd={onCommit}
          onKeyUp={onCommit}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 11, color: "var(--ink-500)", minWidth: 34, textAlign: "right" }}>{value}{unit}</span>
      </div>
    </div>
  );
}

function FieldBtn({ label, onClick, danger, small }: { label: string; onClick: () => void; danger?: boolean; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: small ? "auto" : "100%",
        flex: small ? 1 : undefined,
        textAlign: "left",
        background: "var(--shell-800)",
        border: "1px solid var(--shell-700)",
        color: danger ? "var(--bad)" : "var(--ink-300)",
        padding: "9px 11px",
        borderRadius: 6,
        fontSize: 12.5,
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  );
}

/** Anchored just right of the selected block, clamped to stay on-screen —
 * a floating card that only exists while something is selected, not a
 * permanent sidebar reserving layout space at all times. */
/** Docked to a fixed top-right corner (below the 56px header, same corner
 * VersionHistoryPanel already uses) rather than following the selected
 * block around the canvas. Anchoring dynamically near whatever's selected
 * used to mean the panel jumped to a different screen position for every
 * selection and could land overlapping the very content it was editing —
 * a fixed, predictable corner is easier to keep track of and never covers
 * the canvas near the selection. */
function floatingPanelStyle(): React.CSSProperties {
  return {
    position: "fixed",
    top: 68,
    right: 16,
    width: 280,
    maxHeight: "calc(100vh - 84px)",
    background: "var(--shell-850)",
    border: "1px solid var(--shell-700)",
    borderRadius: 12,
    boxShadow: "0 20px 50px -12px rgba(0,0,0,0.6)",
    padding: "18px 18px 22px",
    overflowY: "auto",
    zIndex: 45,
  };
}
