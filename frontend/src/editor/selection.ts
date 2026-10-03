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

import { manifestElementFor, manifestImagePart, manifestImageParts } from "./manifest";

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
  // Placed art sits directly on the `.page`, deliberately outside the block
  // containers so it stays out of the content flow — which meant
  // `collectBlocks` never returned it, it was never stamped, and clicking it
  // selected nothing at all. It could be placed and dragged, but never
  // re-selected afterwards to resize or delete.
  doc.querySelectorAll<HTMLElement>(".bookdecor").forEach((el) => {
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

/**
 * The table cell under `target`, when nothing else has already matched.
 *
 * A table's own text lives in ordinary `<td>`/`<th>` elements a generic
 * pipe-table conversion gives no class at all — so `findSubPart`'s
 * class-name lookup, correctly, never matches one. The table's `role` is
 * `"content"` with named `parts` (so a click does not turn the WHOLE table
 * into one editable blob — a policy that is right for `.priority-table`'s
 * declared regions), and the effect on an ordinary table with no declared
 * parts was that no region ever matched at all: not the table, not a cell.
 * "Can't we edit this segment" was accurate — there was no path to a caret
 * anywhere inside it, by single click OR by double click, since both go
 * through this same lookup.
 *
 * Structural, like `findFigureImageSlot`'s fallback for an unclassed
 * placeholder: a `<td>`/`<th>` is unambiguous regardless of what class (if
 * any) the source happened to put on it.
 */
export function nearestTableCell(target: Element, block: HTMLElement): HTMLElement | null {
  let node: Element | null = target;
  while (node && node !== block.parentElement) {
    if (node.tagName === "TD" || node.tagName === "TH") return node as HTMLElement;
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
  // The element's OWN declared picture region wins. `.figcard` puts its
  // caption (`.fh`) first and the reserved plate (`.figspace`) second, so the
  // "first child that isn't a caption" rule below picked the caption and
  // uploading an image overwrote the words instead of filling the box.
  // ALL declared picture regions, not just the first. A figure declares
  // both shapes it can take — the reserved `.figspace` plate and the
  // `.figure-image` box a real photo lives in — and only one is present
  // in any given block. Taking the first declared one found `.figspace`,
  // which a chapter of real photographs does not have, and the lookup
  // fell through to a structural guess.
  for (const part of manifestImageParts(manifestElementFor(block))) {
    const slot = block.querySelector<HTMLElement>(part.selector);
    if (slot) return slot;
  }
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
  // A declared plate holds its picture as a CHILD <img> (see
  // applyImageToFigureSlot), so a filled one has no background-image and
  // would otherwise keep reporting empty — every click would reopen the file
  // picker and there would be no way to just select a figure to resize it.
  if (el.querySelector("img")) return false;
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

  // A plate the element library DECLARED (`.figspace`) is filled in place,
  // never replaced.
  //
  // The whole point of that plate is that it is at its final size from the
  // first build, so dropping artwork in cannot move the page — the pipeline
  // measures pages in a headless browser and `.page` is overflow:hidden, so
  // a figure that changes height after layout silently clips whatever it
  // pushes off the sheet. Swapping the plate for a bare `<img>` (as the BEM
  // path below does, where `figure.css` gave `.figure__img` its own frame)
  // would do exactly that, and `.figure__img` has no rule at all in the
  // current stylesheet, so the image would come out unstyled as well.
  // Same reason as `findFigureImageSlot`: ask for every declared picture
  // region and match the one this block actually has, or a real-photo
  // figure (`.figure-image`) falls through to the BEM path below and is
  // REPLACED rather than filled.
  const declared = manifestImageParts(manifestElementFor(slot.parentElement ?? slot))
    .find((p) => slot.matches(p.selector));
  if (declared) {
    const existing = slot.querySelector("img");
    const img = existing ?? doc.createElement("img");
    img.alt = "";
    // Fill the plate exactly; `contain` so artwork of any aspect ratio fits
    // inside it rather than being cropped or stretched.
    img.style.cssText = "width:100%;height:100%;object-fit:contain;display:block;";
    // The plate is reserved at a WIDE aspect (a column's width by a modest
    // height), because it is sized for a diagram before anyone knows what
    // will go in it. A squarish picture inside that leaves a broad band of
    // empty dashed box either side and reads as a mistake, so the plate is
    // shrunk to hug whatever actually arrives.
    img.addEventListener("load", () => fitSlotToImage(slot), { once: true });
    img.src = dataUrl;
    if (!existing) slot.appendChild(img);
    markSlotFilled(slot);
    flattenFigureFrame(slot);
    return img;
  }

  const img = doc.createElement("img");
  img.className = "figure__img";
  img.src = dataUrl;
  img.alt = "";
  // The frame is flattened while the plate is still in the tree, so the
  // caption can be moved relative to it.
  flattenFigureFrame(slot);
  slot.replaceWith(img);
  return img;
}


/**
 * Shrinks a figure plate to the picture it now holds.
 *
 * ONLY EVER SHRINKS. The plate's reserved height is what lets art be dropped
 * in without moving the page — the pipeline measured pagination against it,
 * and `.page` is `overflow:hidden`, so a plate that grew would push content
 * off the sheet and it would be silently clipped. Fitting within the reserved
 * box removes dead space and can never cost content.
 *
 * Returns false when the image has not loaded yet (no natural size to fit to).
 */
/**
 * A FILLED PLATE STOPS LOOKING LIKE AN EMPTY ONE.
 *
 * `.figspace` gets its dashed blue border and white fill from a stylesheet
 * rule (figcard/a4.rules.json), not from an inline style — so filling the
 * plate in place left the placeholder box drawn AROUND the picture. Every
 * figure with real art in it still read as a figure waiting for art, which
 * is exactly the complaint: the चित्र box should disappear and leave the
 * image sitting on the page.
 *
 * The neutralising styles go on inline, so they survive the save and the
 * export rather than being editor chrome that gets stripped. `is-filled` is
 * set alongside them so the pipeline's own stylesheet can carry the same
 * rule for a rebuilt book — see book/elements/figcard.
 */
/**
 * THE WHOLE PLACEHOLDER FRAME GOES, AND THE CAPTION MOVES UNDER THE PICTURE.
 *
 * A figure ships as a frame (.figbox, tinted and padded) holding a caption
 * ABOVE a reserved plate — the shape of a space waiting for art. Once art
 * arrives that reading is wrong twice over: the tinted frame draws a box
 * round a picture that does not need one, and a caption above the picture it
 * describes is not how a figure is set. A book puts the picture first and
 * names it underneath.
 *
 * Both are content changes rather than editor chrome, so they are written as
 * inline styles and a real DOM move, and they survive the save.
 */
export function flattenFigureFrame(slot: HTMLElement) {
  const box = slot.closest<HTMLElement>(".figbox");
  if (!box) return;
  box.style.background = "none";
  box.style.borderStyle = "none";
  box.style.borderWidth = "0";
  box.style.padding = "0";
  // Caption after the picture. `.fh` carries a bottom margin for the gap it
  // used to leave ABOVE the plate; below it that margin belongs on top.
  const caption = box.querySelector<HTMLElement>(":scope > .fh");
  if (caption && caption.compareDocumentPosition(slot)
      & Node.DOCUMENT_POSITION_FOLLOWING) {
    slot.after(caption);
    caption.style.marginBottom = "0";
    caption.style.marginTop = "8px";
  }
}

export function markSlotFilled(slot: HTMLElement) {
  slot.classList.add("is-filled");
  // `border-style`, not the `border` shorthand. Setting `border: none`
  // round-trips as `border: medium` — the shorthand resets the width to its
  // initial value and drops the style, so what is stored no longer says
  // "no border" and a reader of the saved HTML cannot tell what was meant.
  // `border-style: none` forces the computed width to 0 on its own.
  slot.style.borderStyle = "none";
  slot.style.borderWidth = "0";
  slot.style.background = "none";
  slot.style.borderRadius = "0";
  // THE RESERVED HEIGHT IS LEFT ALONE HERE.
  //
  // Clearing it to `auto` looked right — surplus plate height is dead space
  // between the picture and the text under it — but `fitSlotToImage` reads
  // that height to work out how far the picture may be scaled, and it runs
  // LATER, on the image's load event. Wiping it first left nothing to scale
  // against, so the plate was never fitted at all and the image kept the
  // full reserved box: the exact dead space this was meant to remove.
  //
  // `fitSlotToImage` shrinks the plate to the picture, which is the same
  // outcome by the only route that has the numbers to do it. If the image
  // never loads, the reservation stands — which is the safe fallback, since
  // the pipeline measured pagination against it.
}

export function fitSlotToImage(slot: HTMLElement): boolean {
  const img = slot.querySelector("img");
  if (!img || !img.naturalWidth || !img.naturalHeight) return false;

  const reservedH = parseFloat(slot.style.height) || slot.getBoundingClientRect().height;
  const availW = slot.parentElement?.clientWidth || slot.getBoundingClientRect().width;
  if (!reservedH || !availW) return false;

  const scale = Math.min(availW / img.naturalWidth, reservedH / img.naturalHeight);
  slot.style.width = `${Math.round(img.naturalWidth * scale)}px`;
  slot.style.height = `${Math.round(img.naturalHeight * scale)}px`;
  // Centred in the space it gave back, so the figure still reads as centred
  // under its caption rather than hugging the left edge.
  slot.style.marginLeft = "auto";
  slot.style.marginRight = "auto";
  return true;
}
