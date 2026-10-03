/* eslint-disable react-hooks/immutability --
 * The `block` this panel receives is a live DOM element inside the canvas
 * iframe, not a React-owned value, and every control here works by writing to
 * it: a colour well sets `style.color`, a slider sets a CSS variable, the
 * nudge buttons set `style.marginTop`. That IS the editing model — the
 * document is the state and React only draws controls over it (see model.ts:
 * "the canvas iframe is a RENDER of the model"). The rule is about mutating
 * props React owns and re-renders from; it cannot tell those apart from an
 * element handle, so it fires on all five. Re-enabling it would mean
 * rebuilding the editor around a virtual document — a much larger decision
 * than a lint fix.
 */
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
import { toggleSideBySide } from "../../editor/blockEditing";
import {
  MIN_FREE_WIDTH,
  bestFreeSpot,
  freeRegions,
  isFree,
  liftToPage,
  overlappingFlow,
  pageOf,
  resizeFree,
  returnToFlow,
} from "../../editor/freeLayer";
import {
  MIN_WRAP_STRIP,
  WRAP_BELOW,
  canWrapBeside,
  currentFloat,
  fitBesideNeighbour,
  lineShare,
} from "../../editor/autoWrap";
import { describeRun, moveRun, questionRun } from "../../editor/questionRun";
import {
  pairRefusal,
  pairUnit,
  isPaired,
  pairSplit,
  placeSideBySide,
  setPairSplit,
  unpairSideBySide,
} from "../../editor/dragDrop";
import { DECOR_CLASS, fitWidthFor, resizeDecorator } from "../../editor/decorators";
import {
  duplicateItem,
  itemGroupFor,
  moveItem,
  removeItem,
} from "../../editor/itemEditing";
import { ScreenRect } from "../../editor/geometry";
import {
  clipPanel, unclipPanel, clippedPartner, rowLabels, panelKind, panelRows,
  extractRow, rowContaining,
} from "../../editor/panelSplit";
import type { DocumentCapabilities } from "../../editor/capabilities";
import StyleInspector from "../StyleInspector/StyleInspector";
import TableControls from "../TableControls/TableControls";

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
  /** Tells the user why an action was refused, instead of nothing happening. */
  onNote?: (message: string) => void;
  /** The right edge of the canvas in window coordinates, so the panel can sit
   * beside the PAGE rather than against the window or on top of the sheet —
   * see floatingPanelStyle. */
  canvasRight?: number | null;
}


/** The colours the pipeline's own elements already use — pointer variants,
 * callout borders, formula panels. Offering an arbitrary colour wheel here
 * would let a teacher produce a box that looks nothing like the book; these
 * are the accents the design already ships, plus white. */
export const BOX_PALETTE = [
  { name: "red", hex: "#c81e1e" },
  { name: "pink", hex: "#ec9baa" },
  { name: "orange", hex: "#f0b96b" },
  { name: "amber", hex: "#e2b93b" },
  { name: "green", hex: "#3fae4e" },
  { name: "teal", hex: "#79c8d4" },
  { name: "blue", hex: "#8fb4e8" },
  { name: "indigo", hex: "#7ba7d4" },
  { name: "purple", hex: "#9b6fd8" },
  { name: "cream", hex: "#fdf3b4" },
  { name: "paper", hex: "#faf7fe" },
  { name: "white", hex: "#ffffff" },
];

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

export default function PropertyPanel({ doc, block, subPart, capabilities, onRemoveBlock, onChanged, onImageReplaced, anchorRect, onNote, canvasRight }: Props) {
  const [, bump] = useState(0);
  const [picker, setPicker] = useState<"color" | "highlight" | null>(null);
  useEffect(() => setPicker(null), [block, subPart]);
  const rerender = () => bump((n) => n + 1);

  if (!block || !doc || !anchorRect) return null;

  const { entry } = registryEntryFor(block);
  // The selected sub-part may itself be a declared element with its own
  // palette (`.hdu` inside a `.sechead`). Looked up separately so its
  // controls appear alongside the block's rather than replacing them.
  const subPartEntry = subPart ? registryEntryFor(subPart).entry : null;
  // Repeated rows inside the selection — the steps of a card, the lines of a
  // sticky note, the rows of a सूत्र panel. Found from whichever of the two
  // the user actually clicked.
  const isDecorator = block.classList.contains(DECOR_CLASS);
  const isStickyNote = !!block.closest(".stickycol") && !block.classList.contains("stickycol");
  // Where the page is ACTUALLY empty, measured from the ink rather than from
  // element boxes — every block spans the full column, so a box-based measure
  // reports no space on a page whose lines all stop early.
  const pageOfBlock = pageOf(block);
  const freeSpots = pageOfBlock ? freeRegions(pageOfBlock, 160, 60, 3) : [];
  // A picture that is leaving a usable strip of its line blank, with the text
  // still stacked below it. Offered, not applied: on load the pipeline's own
  // layout is deliberate, and rearranging a chapter the moment it opens is
  // not the editor's call to make.
  const wrapOffer = (() => {
    const floats = entry.floats;
    if (!floats?.length || currentFloat(block, floats)) return null;
    if (!canWrapBeside(block, floats)) return null;
    const container = block.closest<HTMLElement>(".flowwrap, .page__cols, .page__full");
    const full = container?.getBoundingClientRect().width ?? 0;
    const gap = Math.round(full - block.getBoundingClientRect().width);
    if (full <= 0 || lineShare(block) > WRAP_BELOW || gap < MIN_WRAP_STRIP) return null;
    return { gap };
  })();

  // Every unit of the question this block belongs to. Empty outside Part 2.
  const qRun = questionRun(block);

  const nudgeNote = (dy: number) => {
    // Clamped at the top: a negative offset lifts the note off a page that is
    // `overflow:hidden`, so it would vanish rather than overhang.
    const current = parseFloat(block.style.marginTop) || 0;
    block.style.marginTop = `${Math.max(0, Math.round(current + dy))}px`;
  };
  const decorRect = isDecorator ? block.getBoundingClientRect() : null;
  const decorWidth = Math.round(
    parseFloat(block.style.width) || decorRect?.width || 0,
  );
  const decorHeight = Math.round(decorRect?.height ?? 0);
  const itemGroup = itemGroupFor((subPart ?? block) as HTMLElement);
  // Clipping — see panelSplit.ts. `rerender` is already bumped after every
  // structural edit in this panel, so the row list re-reads the live DOM and
  // a cut immediately shows the shorter half.
  const clipRows = rowLabels(block);
  // Which row the user actually clicked, so a single row can be lifted out
  // rather than the panel being cut in two around it.
  const clipSelectedRow = rowContaining(block, subPart ?? null)
    ?? rowContaining(block, block.querySelector("[data-nested-item]:focus"));
  const clipSelectedIndex = clipSelectedRow
    ? panelRows(block).indexOf(clipSelectedRow) : -1;
  // Either half finds the other, across a column or page boundary — which is
  // where the build pipeline puts a split in the first place. See
  // clippedPartner.
  const clipPair = clippedPartner(block);
  // "rows" is every other box that turned out to be a stack of like rows —
  // steps, tiles, facts, callout lines. `itemGroup` already has the word a
  // teacher would use for one of them, so borrow it rather than saying "box".
  const clipNoun = panelKind(block) === "rows"
    ? (itemGroup?.noun ? `${itemGroup.noun} list` : "box")
    : ({ fcard: "panel", bullets: "list", options: "list", rows: "box" } as const)[
        panelKind(block) ?? "fcard"
      ];
  const selectedItem = itemGroup
    ? (subPart ?? block).closest<HTMLElement>("[data-nested-item]")
    : null;

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
      <aside style={floatingPanelStyle(canvasRight)}>
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
      <aside style={floatingPanelStyle(canvasRight)}>
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

  // The table to operate on: the block itself when it IS a table, otherwise
  // one nested inside it (this pipeline wraps its eight table elements in a
  // styled container, so the block is the wrapper, not the <table>).
  const tableEl =
    block.tagName === "TABLE"
      ? (block as HTMLTableElement)
      : block.querySelector<HTMLTableElement>("table");

  return (
    <aside style={floatingPanelStyle(canvasRight)}>
      <PanelHeader title={entry.label} sub={Array.from(block.classList).join(" ")} />
      {entry.hint && (
        <div style={{ fontSize: 11.5, lineHeight: 1.45, color: "var(--ink-400, #8a90a0)", margin: "-2px 0 10px" }}>
          {entry.hint}
        </div>
      )}

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
          <Group key={cv.cssVar} label={cv.label} defaultOpen={false}>
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

      {/* Manifest-driven controls. These are what let a teacher recolour a
          sticky note or resize a picture box on the CURRENT pipeline output —
          none of its 145 classes matched the old BEM registry, so before this
          the panel offered nothing but "edit text" and "delete". */}
      {/* Controls belonging to the SUB-PART, when the thing selected is
          itself a declared element. A section heading is coloured by the
          accent on its underline (`.hd-pink` … six of them) — that lives on
          `.hdu` inside `.sechead`, so without this a heading offered no
          colour control at all even though the design is built around one. */}
      {subPartEntry?.variantGroup && (
        <Group label={`${subPartEntry.label} colour`}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {subPartEntry.variantGroup.options.map((opt) => {
              const active = subPart!.classList.contains(opt.className);
              return (
                <button
                  key={opt.className}
                  onClick={() => {
                    subPartEntry.variantGroup!.options.forEach((o) =>
                      subPart!.classList.remove(o.className),
                    );
                    subPart!.classList.add(opt.className);
                    onChanged();
                    rerender();
                  }}
                  style={{
                    padding: "5px 9px", borderRadius: 6, fontSize: 11.5, cursor: "pointer",
                    background: active ? "var(--accent-soft, #2a3a66)" : "var(--shell-800)",
                    border: active ? "1px solid var(--accent, #6c8bff)" : "1px solid var(--shell-700)",
                    color: active ? "var(--ink-100)" : "var(--ink-300)",
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Group>
      )}

      {entry.variantGroup && (
        <Group label={entry.variantGroup.label}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {entry.variantGroup.options.map((opt) => {
              const active = block.classList.contains(opt.className);
              return (
                <button
                  key={opt.className}
                  onClick={() => {
                    // Clear whichever sibling variant is on before adding the
                    // picked one — these are mutually exclusive by design, and
                    // two at once gives whichever the stylesheet happens to
                    // define later, not what was clicked.
                    entry.variantGroup!.options.forEach((o) =>
                      block.classList.remove(o.className),
                    );
                    block.classList.add(opt.className);
                    onChanged();
                    rerender();
                  }}
                  style={{
                    padding: "5px 9px",
                    borderRadius: 6,
                    fontSize: 11.5,
                    cursor: "pointer",
                    background: active ? "var(--accent-soft, #2a3a66)" : "var(--shell-800)",
                    border: active ? "1px solid var(--accent, #6c8bff)" : "1px solid var(--shell-700)",
                    color: active ? "var(--ink-100)" : "var(--ink-300)",
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Group>
      )}

      {/* A question is a RUN of eight-odd sibling units, not a block, so
          nothing in the panel could act on "the question". Moving one down a
          page meant eight separate drags — and getting one wrong is how a
          question ends up holding the next question's answer. */}
      {qRun.length > 1 && (
        <Group label="This whole question">
          <div style={{ fontSize: 11.5, color: "var(--ink-300)", marginBottom: 8, lineHeight: 1.45 }}>
            <b style={{ color: "var(--ink-100)" }}>{describeRun(qRun)}</b> — {qRun.length} blocks
            move together.
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {([["up", "↑ before the one above"], ["down", "↓ after the one below"]] as const)
              .map(([dir, label]) => {
                const first = qRun[0];
                const last = qRun[qRun.length - 1];
                const other = dir === "up"
                  ? (first.previousElementSibling as HTMLElement | null)
                  : (last.nextElementSibling as HTMLElement | null);
                const ok = !!other;
                return (
                  <ItemButton
                    key={dir}
                    label={label}
                    title={ok ? `Move the whole question ${dir}`
                              : `There is nothing ${dir === "up" ? "above" : "below"} it on this page`}
                    onClick={() => {
                      if (!other) {
                        onNote?.(`There is nothing ${dir === "up" ? "above" : "below"} this question on this page.`);
                        return;
                      }
                      moveRun(qRun, other, dir === "up");
                      onChanged();
                      rerender();
                    }}
                  />
                );
              })}
          </div>
          <Hint>
            Dragging the question&apos;s <b style={{ color: "var(--ink-200)" }}>heading</b> moves
            all of it too. Dragging any other part moves just that part, so a
            single working line can still be repositioned on its own.
          </Hint>
        </Group>
      )}

      {/* A picture narrow enough to leave a usable strip beside it, with the
          text still stacked underneath. The control for this already existed,
          but under a collapsed section called "Text around this picture" —
          which is not a thing anyone finds while wondering why half the line
          is blank. Offered here, with the empty width named, so the question
          and its answer are in the same place. */}
      {wrapOffer && (
        <div style={{
          marginBottom: 18, padding: "10px 11px", borderRadius: 8,
          background: "var(--accent-soft, #2a3a66)", border: "1px solid var(--accent, #6c8bff)",
        }}>
          <p style={{ margin: "0 0 8px", fontSize: 11.5, color: "var(--ink-200)", lineHeight: 1.45 }}>
            <b style={{ color: "var(--ink-100)" }}>{wrapOffer.gap}px</b> of this
            line is empty beside the picture.
          </p>
          <button
            onClick={() => {
              const change = fitBesideNeighbour(block, entry.floats!);
              if (change && "applied" in change) {
                onNote?.("Text now runs beside it, and closes up underneath.");
              }
              onChanged();
              rerender();
            }}
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12,
              cursor: "pointer", fontWeight: 700, textAlign: "left",
              background: "var(--shell-800)", border: "1px solid var(--shell-700)",
              color: "var(--ink-100)",
            }}
          >
            ⇤ Move the text up beside it
          </button>
        </div>
      )}

      {entry.styleControls?.map((sc) => {
        // `target` aims the control at a descendant: a picture's height lives
        // on `.figspace`, not on the `.figcard` around it, and writing it on
        // the card would resize the border and leave the plate unchanged.
        // FIRST SHAPE THAT IS ACTUALLY THERE. A figure declares both the
        // dashed plate it reserves before it has art and the box a real
        // photograph lives in; only one exists in any given block, so aiming
        // at a single name left "Picture height" doing nothing at all on a
        // chapter built from photographs — the control was there, it moved,
        // and it changed nothing.
        const aims = sc.targets ?? (sc.target ? [sc.target] : []);
        const el = aims.reduce<HTMLElement | null>(
          (found, sel) => found ?? block.querySelector<HTMLElement>(sel), null) ?? block;
        if (sc.kind === "color") {
          const current = el.style.getPropertyValue(sc.property) || null;
          return (
            <Group key={sc.property + (sc.target ?? "")} label={sc.label} defaultOpen={false}>
              <Swatches
                palette={BOX_PALETTE}
                activeHex={current}
                onPick={(hex) => {
                  el.style.setProperty(sc.property, hex);
                  onChanged();
                  rerender();
                }}
              />
              <button
                onClick={() => {
                  // Back to the stylesheet's own colour, which is not the
                  // same as "no colour" — clearing the inline property lets
                  // the element's designed look show through again.
                  el.style.removeProperty(sc.property);
                  onChanged();
                  rerender();
                }}
                style={{
                  marginTop: 7, padding: "4px 8px", borderRadius: 6, fontSize: 11,
                  cursor: "pointer", background: "var(--shell-800)",
                  border: "1px solid var(--shell-700)", color: "var(--ink-300)",
                }}
              >
                Reset to default
              </button>
            </Group>
          );
        }
        const raw = parseFloat(el.style.getPropertyValue(sc.property))
          || el.getBoundingClientRect()[sc.property === "height" ? "height" : "width"]
          || sc.min || 0;
        const current = Math.min(sc.max ?? raw, Math.max(sc.min ?? raw, Math.round(raw)));
        return (
          <Group key={sc.property + (sc.target ?? "")} label={sc.label} defaultOpen={false}>
            <SliderRow
              unit={sc.unit ?? "px"}
              min={sc.min ?? 0}
              max={sc.max ?? 1000}
              value={current}
              onChange={(v) => {
                el.style.setProperty(sc.property, `${v}${sc.unit ?? "px"}`);
                rerender();
              }}
              onCommit={() => {
                // Narrowing a figure used to leave the rest of its line blank
                // for good and push everything below it further down the
                // page. The text now moves in beside it — and moves back out
                // when it is widened again. Said out loud, because a layout
                // that rearranges itself in silence reads as a bug.
                if (sc.property === "width" && entry.floats?.length) {
                  const change = fitBesideNeighbour(block, entry.floats);
                  if (change && "applied" in change) {
                    onNote?.(`Text now runs beside it (${change.applied.label.toLowerCase()}). Undo, or change it under "Text around this picture".`);
                  } else if (change && "removed" in change) {
                    onNote?.("Wide enough again — it has the line back to itself.");
                  }
                }
                onChanged();
                rerender();
              }}
            />
          </Group>
        );
      })}

      {/* Placed art. It is not a pipeline element, so none of the registry
          controls apply to it — without this the panel offered a decorator
          nothing but "delete". */}
      {isDecorator && (
        <Group label="Picture size">
          <div style={{
            textAlign: "center", fontSize: 12, color: "var(--ink-200)",
            fontVariantNumeric: "tabular-nums", marginBottom: 8,
          }}>
            {decorWidth} × {decorHeight} px
          </div>
          <SliderRow
            unit="px"
            min={16}
            max={700}
            value={Math.min(700, Math.max(16, decorWidth))}
            onChange={(v) => { resizeDecorator(block, v); rerender(); }}
            onCommit={onChanged}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {[
              { label: "Small", w: 110 },
              { label: "Medium", w: 180 },
              { label: "Large", w: 260 },
            ].map((p) => (
              <ItemButton key={p.label} label={p.label}
                title={`${p.w}px wide`}
                onClick={() => { resizeDecorator(block, p.w); onChanged(); rerender(); }} />
            ))}
            <ItemButton
              label="Fit to space"
              title="Resize to the free space left on this page"
              onClick={() => {
                // Sized against the page's real free space, using the same
                // measurement the placement advice uses — art that overhangs
                // the content is the usual reason it looks wrong.
                const page = block.parentElement;
                if (!page) return;
                const free = fitWidthFor(page, block);
                if (free) { resizeDecorator(block, free); onChanged(); rerender(); }
              }}
            />
          </div>
          <Hint>
            Drag the picture to move it, or the corner handles to resize. It sits on
            top of the page and never moves your text.
          </Hint>
        </Group>
      )}

      {/* Growing a box. The reading-order card ships five steps; a teacher
          who wanted a sixth previously had to hand-edit HTML, because the
          only tools were "edit this text" and "delete the whole block". */}
      {itemGroup && (
        <Group label={`${itemGroup.items.length} ${itemGroup.noun}${itemGroup.items.length === 1 ? "" : "s"}`}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {/* "Add" lives on the block's own toolbar now — it is the most
                common edit in a book made of boxes, and hunting a side panel
                for it was the clearest thing wrong with the old layout. What
                stays here is everything that needs a SPECIFIC row picked. */}
            {selectedItem && (
              <>
                <ItemButton label="Duplicate" onClick={() => {
                  duplicateItem(selectedItem);
                  onChanged(); rerender();
                }} />
                <ItemButton label="↑" title={`Move this ${itemGroup.noun} up`}
                  onClick={() => {
                    moveItem(selectedItem, -1);
                    onChanged(); rerender();
                  }} />
                <ItemButton label="↓" title={`Move this ${itemGroup.noun} down`}
                  onClick={() => {
                    moveItem(selectedItem, 1);
                    onChanged(); rerender();
                  }} />
                <ItemButton
                  label="Remove"
                  danger
                  title={itemGroup.items.length <= 1
                    ? `The last ${itemGroup.noun} cannot be removed — delete the whole block instead`
                    : `Remove this ${itemGroup.noun}`}
                  disabled={itemGroup.items.length <= 1}
                  onClick={() => {
                    if (removeItem(itemGroup, selectedItem)) {
                      onChanged(); rerender();
                    }
                  }}
                />
              </>
            )}
          </div>
          {!selectedItem && (
            <Hint>
              Use <b style={{ color: "var(--ink-200)" }}>＋ {itemGroup.noun}</b> on the
              toolbar to add one, or click a single {itemGroup.noun} to duplicate,
              reorder or remove it.
            </Hint>
          )}
        </Group>
      )}

      {/* CLIPPING A LIST-SHAPED BLOCK IN TWO.
          A सूत्र panel, a bullet list and a set of options are all lists of
          rows, and the build pipeline has always been able to break one over
          a column boundary to use the dead space in front of it. In the
          editor there was no such operation at all: a panel was atomic, so a
          panel sitting under several hundred pixels of empty column could
          only be moved whole or left alone. This is that cut, by hand. */}
      {/* Shown when there is something to DO: a cut to make, or a half to
          join back on. Gating the whole section on "two or more rows" hid the
          join control on any single-row half — and a one-row continuation is
          precisely what a split leaves behind, so the halves the pipeline
          made were the ones that could not be put back together. */}
      {(clipRows.length >= 2 || clipPair) && (
        <Group label={clipRows.length >= 2
          ? `Clip this ${clipNoun} · ${clipRows.length} rows`
          : `This ${clipNoun} is half of a pair`}>
          {clipRows.length >= 2 && (
            <Hint>
              Choose where to cut. The rows below the cut become a second
              {" "}{clipNoun} you can drag somewhere else — into the empty
              space above, for instance.
            </Hint>
          )}
          {/* ONE ROW, OUT. Cutting is for "top half stays, bottom half
              travels". For "this one formula belongs elsewhere" it is the
              wrong tool — the row you wanted ends up mid-way down whichever
              half it fell into — and dragging the row itself is awkward,
              since it is a small target holding a formula, a caption and
              sometimes a शर्त. This lifts it out as an ordinary block. */}
          {clipSelectedRow && (
            <div style={{ marginTop: 8 }}>
              <ItemButton
                label={`↥ Take row ${clipSelectedIndex + 1} out on its own`}
                onClick={() => {
                  if (!block || !clipSelectedRow) return;
                  const solo = extractRow(block, clipSelectedRow);
                  if (!solo) {
                    onNote?.("A panel of one row is already on its own.");
                    return;
                  }
                  onChanged();
                  rerender();
                  onNote?.("Lifted out — it is a block of its own now, so you can drag it anywhere.");
                }}
              />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 8 }}>
            {clipRows.map((label, i) => (
              <div key={i}>
                <div style={{
                  fontSize: 11.5, color: "var(--ink-300)", padding: "5px 8px",
                  background: "var(--shell-800)", borderRadius: 5,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {i + 1}. {label}
                </div>
                {i < clipRows.length - 1 && (
                  <button
                    title={`Cut after row ${i + 1}`}
                    onClick={() => {
                      if (!block) return;
                      const pair = clipPanel(block, i);
                      if (!pair) {
                        onNote?.("That cut would leave one half empty.");
                        return;
                      }
                      onChanged();
                      rerender();
                      onNote?.(`Clipped — rows ${i + 2}–${clipRows.length} are now a separate ${clipNoun}. Drag it where you want it.`);
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      width: "100%", margin: "3px 0", padding: "2px 0",
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--ink-500)", fontSize: 10,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ink-100)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ink-500)"; }}
                  >
                    <span style={{ flex: 1, borderTop: "1px dashed currentColor" }} />
                    <span style={{ letterSpacing: "0.06em" }}>✂ CUT HERE</span>
                    <span style={{ flex: 1, borderTop: "1px dashed currentColor" }} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {clipPair && (
            <div style={{ marginTop: 10 }}>
              <ItemButton
                label={clipPair.head === block
                  ? "↩ Join the half below back on"
                  : "↩ Join this back onto the half above"}
                onClick={() => {
                  if (!clipPair) return;
                  if (unclipPanel(clipPair.head, clipPair.tail)) {
                    onChanged(); rerender();
                    onNote?.("Joined back into one panel.");
                  }
                }}
              />
            </div>
          )}
        </Group>
      )}

      {entry.floats && entry.floats.length > 0 && (
        <Group label="Text around this picture" defaultOpen={false}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[{ className: "", label: "On its own line" }, ...entry.floats.map((f) => ({
              className: f.class, label: f.label,
            }))].map((opt) => {
              const active = opt.className
                ? block.classList.contains(opt.className)
                : !entry.floats!.some((f) => block.classList.contains(f.class));
              return (
                <button
                  key={opt.label}
                  onClick={() => {
                    entry.floats!.forEach((f) => block.classList.remove(f.class));
                    if (opt.className) block.classList.add(opt.className);
                    onChanged();
                    rerender();
                  }}
                  style={{
                    textAlign: "left", padding: "8px 10px", borderRadius: 6,
                    fontSize: 12, cursor: "pointer",
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
          <Hint>
            Wrapping lets a long paragraph run down the side of the picture and
            carry on underneath it. The toolbar&apos;s <b style={{ color: "var(--ink-200)" }}>⇥ wrap</b> toggles
            it; these choose which side.
          </Hint>
        </Group>
      )}

      {/* Lifting a block onto the page. Everything else in a chapter is flow
          content — full column width, stacked — so this is the only way to put
          something in a gap. */}
      {!isDecorator && (
        <Group label="Placement" defaultOpen={false}>
          <button
            onClick={() => {
              if (isFree(block)) {
                returnToFlow(block);
                onNote?.("Back in the text — it flows with everything else again.");
              } else if (liftToPage(doc, block)) {
                const hit = overlappingFlow(block);
                onNote?.(hit.length
                  ? `Lifted onto the page — it is covering ${hit.length} block(s). Drag it clear, or leave it if that is what you want.`
                  : "Lifted onto the page. Drag its edge to move it, corners to resize.");
              } else {
                onNote?.("This block cannot be lifted — there is no page behind it.");
              }
              onChanged();
              rerender();
            }}
            style={{
              width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 6,
              fontSize: 12, cursor: "pointer",
              background: isFree(block) ? "var(--accent-soft, #2a3a66)" : "var(--shell-800)",
              border: "1px solid var(--shell-700)", color: "var(--ink-200)",
            }}
          >
            {isFree(block)
              ? "⇱ Free on the page — click to put it back in the text"
              : "⇱ Lift onto the page (place it anywhere)"}
          </button>

          {freeSpots.length > 0 && (
            <div style={{ marginTop: 9, fontSize: 11.5, color: "var(--ink-300)", lineHeight: 1.5 }}>
              Free space on this page:{" "}
              {freeSpots.slice(0, 2).map((r, i) => (
                <span key={i}>
                  {i > 0 && ", "}
                  <b style={{ color: "var(--ink-100)" }}>{r.width}×{r.height}</b>
                  {r.left > 400 ? " on the right" : r.top > 800 ? " at the foot" : ""}
                </span>
              ))}
              {isFree(block) && (
                <button
                  onClick={() => {
                    // Snap into the biggest gap this block actually fits.
                    const spot = bestFreeSpot(
                      pageOfBlock!, parseFloat(block.style.width) || 300,
                      block.getBoundingClientRect().height,
                    ) ?? freeSpots[0];
                    block.style.left = `${spot.left}px`;
                    block.style.top = `${spot.top}px`;
                    onChanged();
                    rerender();
                  }}
                  style={{
                    display: "block", marginTop: 7, padding: "5px 9px", borderRadius: 6,
                    fontSize: 11.5, cursor: "pointer", background: "var(--shell-800)",
                    border: "1px solid var(--shell-700)", color: "var(--ink-200)",
                  }}
                >
                  ⤢ Move it into the gap
                </button>
              )}
            </div>
          )}

          {isFree(block) && (
            <>
              <div style={{ marginTop: 9 }}>
                <div style={{ fontSize: 11, color: "var(--ink-400, #8a90a0)", marginBottom: 4 }}>
                  {Math.round(parseFloat(block.style.width) || 0)} px wide
                </div>
                <SliderRow
                  unit="px"
                  min={MIN_FREE_WIDTH}
                  max={944}
                  value={Math.max(MIN_FREE_WIDTH,
                    Math.min(944, Math.round(parseFloat(block.style.width) || 300)))}
                  onChange={(v) => { resizeFree(block, v); rerender(); }}
                  onCommit={onChanged}
                />
              </div>
              {overlappingFlow(block).length > 0 && (
                <p style={{
                  fontSize: 11, lineHeight: 1.45, margin: "9px 0 0", padding: "7px 9px",
                  borderRadius: 6, background: "rgba(224,90,90,0.12)",
                  border: "1px solid rgba(224,90,90,0.4)", color: "#e0a0a0",
                }}>
                  Covering {overlappingFlow(block).length} block(s) of text. That may be
                  deliberate — but it will print exactly like this.
                </p>
              )}
              <Hint>
                Drag its <b style={{ color: "var(--ink-200)" }}>edge</b> to move it — the middle
                still selects text. Arrow keys nudge it.
              </Hint>
            </>
          )}
        </Group>
      )}

      {/* A sticky note floats in the margin column on its own, so ordinary
          block drag has nothing to move it against — this is the only way to
          shift one down the page. */}
      {isStickyNote && (
        <Group label="Position in the margin">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ItemButton label="↑" title="Move up (or press ↑)"
              onClick={() => { nudgeNote(-8); onChanged(); rerender(); }} />
            <div style={{
              flex: 1, textAlign: "center", fontSize: 12, color: "var(--ink-200)",
              fontVariantNumeric: "tabular-nums",
            }}>
              {Math.round(parseFloat(block.style.marginTop) || 0)} px down
            </div>
            <ItemButton label="↓" title="Move down (or press ↓)"
              onClick={() => { nudgeNote(8); onChanged(); rerender(); }} />
          </div>
          <Hint>
            Arrow keys move it too — hold Shift for bigger steps. The text
            beside it re-wraps to match.
          </Hint>
        </Group>
      )}

      {/* Any block can share a line, not just a figure. A page is 944px wide
          and every block takes all of it, so a short box leaves most of the
          line empty with no way to use it. */}
      {!isDecorator && (
        <Group label="Share the line">
          {isPaired(block) ? (
            <button
              onClick={() => { unpairSideBySide(block); onChanged(); rerender(); }}
              style={pairBtn(true)}
            >
              ◧ Sharing a line — click to stack again
            </button>
          ) : (
            // Two directions, not one. The single "put the NEXT block beside
            // this one" could only ever reach downwards, so a panel that
            // wanted to sit beside the box ABOVE it — the सूत्र card under its
            // definition — had no control at all and read as broken.
            <div style={{ display: "flex", gap: 6 }}>
              {([["above", "◨ beside the one above"], ["below", "◧ beside the one below"]] as const)
                .map(([dir, label]) => {
                  const unit = pairUnit(block);
                  const other = (dir === "above"
                    ? unit.previousElementSibling
                    : unit.nextElementSibling) as HTMLElement | null;
                  const why = other ? pairRefusal(block, other) : null;
                  const ok = !!other && !why;
                  return (
                    <button
                      key={dir}
                      disabled={!ok}
                      title={
                        !other ? `There is no block ${dir} this one on this page.`
                        : why === "already-paired" ? "That one already shares its line."
                        : why === "would-nest" ? "One of these already shares a line."
                        : why === "too-narrow" ? "Not enough width — a half would be too narrow to read."
                        : `Put this block beside the one ${dir}`
                      }
                      onClick={() => {
                        if (!other) { onNote?.(`There is no block ${dir} this one on this page.`); return; }
                        if (why) {
                          // Saying why beats doing nothing. Silently refusing
                          // is how a control teaches a user it is unreliable.
                          onNote?.(
                            why === "would-nest"
                              ? "One of these already shares a line — take that pair apart first."
                              : why === "already-paired"
                              ? "That pair is full. Two to a line is the limit."
                              : "There is not enough width here — a half would be too narrow to read.",
                          );
                          return;
                        }
                        // Order on the page is kept: the upper one goes left.
                        if (dir === "above") placeSideBySide(doc, other, block);
                        else placeSideBySide(doc, block, other);
                        onChanged();
                        rerender();
                      }}
                      style={{ ...pairBtn(false), flex: 1, opacity: ok ? 1 : 0.4, cursor: ok ? "pointer" : "not-allowed" }}
                    >
                      {label}
                    </button>
                  );
                })}
            </div>
          )}
          {pairSplit(block) !== null && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: "var(--ink-400, #8a90a0)", marginBottom: 4 }}>
                This half takes {pairSplit(block)}% of the line
              </div>
              <SliderRow
                unit="%"
                min={20}
                max={80}
                value={pairSplit(block) ?? 50}
                onChange={(v) => { setPairSplit(block, v); rerender(); }}
                onCommit={onChanged}
              />
            </div>
          )}
          <Hint>
            You can also drag a block — or a single line out of a list — onto
            the <b style={{ color: "var(--ink-200)" }}>right edge</b> of another to pair them.
          </Hint>
        </Group>
      )}

      {entry.sideBySide && (
        <Group label="Layout" defaultOpen={false}>
          <button
            onClick={() => {
              toggleSideBySide(doc, block, entry.sideBySide!.wrapper, () => {
                // Matches what the pipeline emits for a plain Part-1
                // paragraph, so the new box is styled like the book rather
                // than like an unstyled div.
                const p = doc.createElement("p");
                p.className = "para";
                p.textContent = "Type here…";
                return p;
              });
              onChanged();
              rerender();
            }}
            style={{
              width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 6,
              fontSize: 12, cursor: "pointer",
              background: block.parentElement?.classList.contains(entry.sideBySide.wrapper)
                ? "var(--accent-soft, #2a3a66)" : "var(--shell-800)",
              border: "1px solid var(--shell-700)", color: "var(--ink-200)",
            }}
          >
            {block.parentElement?.classList.contains(entry.sideBySide.wrapper)
              ? "◧ Side by side — click to stack"
              : "▭ Place content beside this"}
          </button>
        </Group>
      )}

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

      {/* Row/column editing whenever the selection is (or contains) a table —
          previously a table could only be moved, deleted, or hand-edited as
          raw HTML. */}
      {tableEl && <TableControls doc={doc} table={tableEl} onChanged={onChanged} />}

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

function ItemButton({ label, title, onClick, primary, danger, disabled }: {
  label: string; title?: string; onClick: () => void;
  primary?: boolean; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        padding: "5px 10px", borderRadius: 6, fontSize: 11.5,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        background: primary ? "var(--accent-soft, #2a3a66)" : "var(--shell-800)",
        border: primary ? "1px solid var(--accent, #6c8bff)" : "1px solid var(--shell-700)",
        color: danger ? "#e08a8a" : primary ? "var(--ink-100)" : "var(--ink-300)",
        fontWeight: primary ? 700 : 500,
      }}
    >
      {label}
    </button>
  );
}

/**
 * A hint you can ask for, rather than one that is always on screen.
 *
 * Six of these stood permanently open in a 280px panel, so the buttons they
 * described were pushed below the fold and the panel read as a wall of prose.
 * Collapsed, the whole panel fits without scrolling; the explanation is still
 * one click away where it was written.
 */
/** Shared look for the pair controls — active when the block already shares
 * a line, plain otherwise. */
function pairBtn(active: boolean): React.CSSProperties {
  return {
    width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 6,
    fontSize: 11.5, cursor: "pointer", lineHeight: 1.3,
    background: active ? "var(--accent-soft, #2a3a66)" : "var(--shell-800)",
    border: "1px solid var(--shell-700)", color: "var(--ink-200)",
  };
}

function Hint({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 7 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: "none", border: "none", padding: 0, cursor: "pointer",
          fontSize: 10.5, fontWeight: 600, color: "var(--ink-500)",
        }}
      >
        {open ? "▾ hide" : "▸ how"}
      </button>
      {open && (
        <p style={{ fontSize: 11, color: "var(--ink-400, #8a90a0)", margin: "5px 0 0", lineHeight: 1.4 }}>
          {children}
        </p>
      )}
    </div>
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

/**
 * A collapsible section.
 *
 * The panel had grown to a dozen sections in one scroll, so the control you
 * wanted was usually below the fold — and several of them did not apply to
 * what was selected at all. Sections remember whether they were open, per
 * label, so the shape you arrange stays put as you move between blocks.
 */
function Group({ label, children, defaultOpen = true }: {
  label: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(() => {
    try {
      const saved = window.localStorage.getItem(`panel-group:${label}`);
      return saved === null ? defaultOpen : saved === "1";
    } catch {
      // Private windows and blocked site data both throw here; the section
      // simply opens as normal rather than the panel failing to render.
      return defaultOpen;
    }
  });
  const toggle = () => {
    setOpen((o) => {
      try { window.localStorage.setItem(`panel-group:${label}`, o ? "0" : "1"); } catch { /* not fatal */ }
      return !o;
    });
  };
  return (
    <div style={{ marginBottom: open ? 20 : 8 }}>
      <button
        onClick={toggle}
        style={{
          display: "flex", alignItems: "center", gap: 6, width: "100%",
          background: "none", border: "none", padding: 0, cursor: "pointer",
          fontSize: 10.5, fontWeight: 700, letterSpacing: "0.07em",
          textTransform: "uppercase", color: "var(--ink-500)",
          marginBottom: open ? 9 : 0, textAlign: "left",
        }}
      >
        <span style={{ fontSize: 8, opacity: 0.8 }}>{open ? "▼" : "▶"}</span>
        {label}
      </button>
      {open && children}
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
const PANEL_W = 336;
const PANEL_GAP = 18;

/**
 * JUST RIGHT OF THE PAGE.
 *
 * Two wrong answers preceded this one, and they were wrong in opposite
 * directions:
 *
 *   right: 16          — pinned to the WINDOW. The canvas is centred, so on a
 *                        wide screen the paper sits well to the left and the
 *                        panel ends up across a field of empty background
 *                        from the block it is editing.
 *   anchor.right + gap — pinned to the SELECTED BLOCK. A block in the left
 *                        column of a two-column page puts its right edge in
 *                        the middle of the sheet, so the panel opened on top
 *                        of the page and covered the right column.
 *
 * The thing to sit beside is the PAGE, which is neither of those. `canvasRight`
 * is the right edge of the canvas in window coordinates; the panel goes just
 * past it, clamped so it cannot run off the window on a narrow screen. It is
 * horizontal only — the vertical position stays fixed, so the panel does not
 * jump about as the selection moves.
 */
function floatingPanelStyle(canvasRight?: number | null): React.CSSProperties {
  const viewport = typeof window === "undefined" ? 1440 : window.innerWidth;
  const rightLimit = viewport - PANEL_W - 16;
  const left = canvasRight != null
    ? Math.max(16, Math.min(canvasRight + PANEL_GAP, rightLimit))
    : rightLimit;
  return {
    position: "fixed",
    top: 68,
    left,
    // 280px made a tall narrow ribbon: every row of formula text wrapped, and
    // a panel with a dozen groups became a very long scroll. The colour and
    // size groups now open closed as well (see defaultOpen={false} above), so
    // what is visible is the handful of controls that act on the block.
    width: PANEL_W,
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
