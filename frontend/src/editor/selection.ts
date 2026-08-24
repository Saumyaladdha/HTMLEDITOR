/**
 * Selection mechanics, operating directly on the loaded book's iframe
 * document. Two levels: a block (direct child of .page__cols OR
 * .page__full) and, within it, a registered sub-part (e.g. a .text-color
 * span, a figure's image).
 *
 * The generated HTML has zero data-* attributes today — this module is the
 * sole place that stamps data-block-id, fresh every time a version loads.
 * IDs are only stable for the current editing session.
 */

import { collectBlocks, type DocumentStructure } from "./structure";

/**
 * Marks every editable block with a data-block-id.
 *
 * Which elements those ARE is decided by structure.ts, not by this module:
 * a packaged chapter uses the direct children of `.page__cols`/`.page__full`
 * (preserving the granularity those chapters were authored with), while any
 * other document gets structurally inferred blocks. Hardcoding the two
 * pipeline selectors here — the previous behaviour — meant that in any other
 * document precisely nothing was stamped, so nothing was clickable and the
 * editor was inert.
 */
export function stampBlockIds(doc: Document, structure: DocumentStructure) {
  let counter = 0;
  collectBlocks(doc, structure).forEach((el) => {
    if (!el.dataset.blockId) el.dataset.blockId = `b-${counter++}`;
  });
}

export function allBlocks(doc: Document): HTMLElement[] {
  return Array.from(doc.querySelectorAll<HTMLElement>("[data-block-id]"));
}

export function blockById(doc: Document, id: string): HTMLElement | null {
  return doc.querySelector<HTMLElement>(`[data-block-id="${id}"]`);
}

/** Levels 1: the click target's nearest [data-block-id] ancestor. */
export function findBlockAncestor(target: Element): HTMLElement | null {
  return target.closest<HTMLElement>("[data-block-id]");
}

/**
 * Level 2: within a selected block, find the nearest ancestor of `target`
 * (bounded by `block`) matching a class in the given registry sub-part map.
 * Sub-part selectability is entirely driven by the caller's registry
 * lookup — this function has no hardcoded knowledge of element types.
 */
export function findSubPart(
  target: Element,
  block: HTMLElement,
  subPartClassNames: string[],
): HTMLElement | null {
  let node: Element | null = target;
  while (node && node !== block.parentElement) {
    for (const cls of subPartClassNames) {
      if (node.classList.contains(cls)) return node as HTMLElement;
    }
    if (node === block) break;
    node = node.parentElement;
  }
  return null;
}

/** Also treat inline coloured/highlighted spans as always-selectable
 * sub-parts (they exist inside almost any text-bearing block, not just
 * ones with a registry entry naming them explicitly).
 *
 * Matches BOTH formatting mechanisms: the pipeline's semantic classes, and
 * the plain inline-styled <span> the editor emits in documents that don't
 * define those classes (see capabilities.ts). Class-only matching meant that
 * in any non-pipeline document, a span the editor had just created could
 * never be re-selected to change or remove its colour. */
export function findInlineSpan(target: Element, block: HTMLElement): HTMLElement | null {
  const classed = findSubPart(target, block, ["text-color", "highlight"]);
  if (classed) return classed;

  let node: Element | null = target;
  while (node && node !== block.parentElement) {
    const el = node as HTMLElement;
    if (el.tagName === "SPAN" && (el.style?.color || el.style?.backgroundColor)) return el;
    if (node === block) break;
    node = node.parentElement;
  }
  return null;
}

/**
 * A figure's image slot, found structurally rather than by class — the
 * pipeline does NOT always emit `.figure__img` on it. A placeholder like
 * `<div style="border:2px dashed ...">चित्र यहाँ आएगा</div>` is common
 * (see build_chapter.py's own figure emitter) and carries no class at all.
 * Since every `.figure` this pipeline produces is structurally
 * {image-or-placeholder, then <figcaption>}, the first child that ISN'T
 * the caption is always the image slot, class or no class. Matching by
 * class alone (the old behavior) fell through to treating the whole
 * `<figure>` as the drop target on placeholders like this — which then
 * wiped the caption via `textContent = ""` on drop. Never do that again.
 */
export function findFigureImageSlot(block: Element): HTMLElement | null {
  const classed = block.querySelector<HTMLElement>(".figure__img, img");
  if (classed) return classed;
  const first = block.firstElementChild as HTMLElement | null;
  if (first && first.tagName !== "FIGCAPTION" && !first.classList.contains("fig-cap")) return first;
  return null;
}

/** True if a figure's image slot currently holds no real image yet — a
 * placeholder still showing its hint text/dashed box, not a filled-in
 * photo. Used to decide whether a single click should jump straight to a
 * file picker (empty slot) or just select for resize/replace (filled). */
export function isEmptyImageSlot(el: HTMLElement): boolean {
  if (el.tagName === "IMG") return !(el as HTMLImageElement).getAttribute("src");
  return !el.style.backgroundImage;
}

/**
 * Places `dataUrl` into a figure's image slot, returning the element that
 * now actually holds it (which is NOT always `slot` — see below).
 *
 * If `slot` is already an <img>, this just sets its src.
 *
 * If `slot` is a raw placeholder <div> (the pipeline's dashed-border
 * "चित्र यहाँ आएगा" box — see findFigureImageSlot), setting a
 * background-image on it directly used to leave the placeholder's own
 * fixed height:150px / dashed border / tan background sitting AROUND the
 * photo, since those are baked into that div's inline style and have
 * nothing to do with displaying an image nicely. Real figures elsewhere in
 * this same pipeline use a plain `<img class="figure__img">`, and
 * figure.css already gives that class a proper frame (width:100%,
 * height:auto, rounded border, padding, shadow) — so once a real photo is
 * placed, the placeholder div is replaced outright with a fresh
 * `.figure__img` <img>, rather than dressing the old placeholder up.
 */
export function applyImageToFigureSlot(slot: HTMLElement, dataUrl: string): HTMLElement {
  if (slot.tagName === "IMG") {
    (slot as HTMLImageElement).src = dataUrl;
    return slot;
  }
  const doc = slot.ownerDocument;
  const img = doc.createElement("img");
  img.className = "figure__img";
  img.src = dataUrl;
  img.alt = "";
  slot.replaceWith(img);
  return img;
}
