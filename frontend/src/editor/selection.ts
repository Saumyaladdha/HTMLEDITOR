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

export function stampBlockIds(doc: Document) {
  let counter = 0;
  // .page__full is a full-width area some pages have ABOVE the two-column
  // body — page 1's chapter title (.title-1) and "भाग 1" heading
  // (.part-head) live there, not in .page__cols. Without stamping it too,
  // those elements have no data-block-id at all and are simply
  // unclickable — see model.ts's Page.fullBlocks doc comment for the
  // matching fix on the model side (it used to also get silently dropped
  // from the model on every undo/redo round-trip).
  doc.querySelectorAll(".page__cols, .page__full").forEach((container) => {
    Array.from(container.children).forEach((child) => {
      if (!(child as HTMLElement).dataset.blockId) {
        (child as HTMLElement).dataset.blockId = `b-${counter++}`;
      }
    });
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

/** Also treat inline text-color/highlight spans as always-selectable
 * sub-parts (they exist inside almost any text-bearing block, not just
 * ones with a registry entry naming them explicitly). */
export function findInlineSpan(target: Element, block: HTMLElement): HTMLElement | null {
  return findSubPart(target, block, ["text-color", "highlight"]);
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
