/**
 * Drag-to-move mechanics for top-level blocks, including across columns
 * and pages — a block is just a normal DOM node, so moving it via
 * insertBefore/appendChild is a real, structurally-safe move (the exact
 * same markup relocates, nothing is regenerated or re-serialized), not a
 * delete+recreate that could corrupt or lose part of the block's HTML.
 *
 * Uses native HTML5 drag-and-drop, entirely within the iframe's own
 * document — source and drop target are always the same document, so
 * there's no cross-frame drag complexity to deal with.
 */

import { ED, setChromeClass } from "./chrome";
import { liftToPage, snapFree } from "./freeLayer";
import { describeRun, moveRun, questionRun } from "./questionRun";
import { manifestElementFor, PAINTED_SELECTOR } from "./manifest";
import type { DocumentStructure } from "./structure";

const DRAG_MIME = "application/x-block-id";

/**
 * Marks blocks as draggable, WITHOUT arming them all at once.
 *
 * Every block used to carry `draggable="true"` permanently — 2525 armed
 * elements on a real chapter — and that one fact made the editor feel broken
 * three separate ways:
 *
 *   - an armed element CANNOT have its text selected by dragging; the browser
 *     gives mousedown-and-move to the drag engine, so editing fought back
 *   - any twitch during a click became a drag
 *   - blocks and the rows inside them were both armed and overlapping, so
 *     which one moved depended on event order rather than on aim
 *
 * Everything is still draggable. What changed is WHERE you take hold: a grip
 * down the left edge, which is the only way a drag gesture and a text
 * selection can share the same element. See `attachGripArming`.
 */
export function makeBlocksDraggable(doc: Document) {
  doc.querySelectorAll<HTMLElement>("[data-block-id]").forEach((el) => {
    el.draggable = false;
    // A class, not `el.style.cursor = "grab"` — inline styles written onto
    // the user's own elements end up serialized into every save and export.
    // See chrome.ts.
    el.classList.add(ED.block);
  });
}

/** Dims the actual dragged element for the duration of the gesture — the
 * ONLY visual feedback previously was the drop-target indicator line;
 * the thing you'd actually grabbed gave no sign it was being moved at
 * all, which read as unresponsive/unclear rather than an active drag.
 * The opacity change is deferred a tick so the browser's native drag-ghost
 * snapshot (taken synchronously at dragstart) still shows the element at
 * full opacity — changing it immediately would make the ghost itself look
 * dim while dragging, which looks like a rendering glitch. */
function dimWhileDragging(el: HTMLElement) {
  setTimeout(() => {
    el.classList.add(ED.dragging);
  }, 0);
}
function undim(el: HTMLElement | null) {
  el?.classList.remove(ED.dragging);
}

/** A thin, glowing line inserted into the DOM to show where a dropped
 * block will land — a real sibling element you can see, not just a
 * CSS-only hover state, so the insertion point is unambiguous even when
 * dragging across a page/column boundary. */
/** Class of the wrapper that puts two blocks on one line — declared by the
 * element library as `sidebyside`, so the stylesheet already knows it. */
const SXS = "sxs";

/** How much of a block's right edge counts as "put it beside this". A third
 * is wide enough to hit deliberately and narrow enough that an ordinary
 * reorder drag down the middle never triggers it by accident. */
const SIDE_ZONE = 0.32;

/** Blocks that are already a pair. Three across is unreadable in a 944px
 * column, so a pair is the limit. */
function sxsCount(el: Element | null): number {
  return el?.classList.contains(SXS) ? el.children.length : 0;
}

/**
 * Puts `moving` beside `target`, sharing the line.
 *
 * A page is 944px wide and every block takes all of it, so a short box — a
 * definition, a triplet, a two-line list — leaves most of the line empty and
 * there was no way to use it. Dropping onto a block's right edge pairs them.
 */
/** Narrowest a half may be and still read. Below roughly this, a Hindi
 * paragraph sets one word per line. Matches the floor in the stylesheet. */
/** Narrowest a half may be. Sized so a pair fits the NARROWEST container it
 * can appear in — a Part-2 column at 450px. 220 needed 454px and refused
 * pairing on every two-column page in the book. Matches the stylesheet. */
export const MIN_PAIR_WIDTH = 150;

/** Containers whose direct children are laid out one under another — the
 * level at which two things can share a line. */
const LINE_CONTAINERS = ".flowwrap, .acol, .page__cols, .page__full";

/**
 * The element that actually occupies a line, which is not always the block.
 *
 * A chapter wraps every block in its own `.u` — `.flowwrap > .u > .poflat` —
 * so a block's `nextElementSibling` is null (its wrapper holds one child) and
 * a pair built around the block would sit INSIDE that wrapper, sharing a line
 * with nothing. Pairing has to happen one level up, between the wrappers.
 *
 * Falls back to the element itself in documents that have no such wrapper.
 */
export function pairUnit(el: HTMLElement): HTMLElement {
  let node: HTMLElement = el;
  for (let i = 0; i < 4 && node.parentElement; i++) {
    if (node.parentElement.matches(LINE_CONTAINERS)) return node;
    if (node.parentElement.classList.contains(SXS)) return node;
    node = node.parentElement;
  }
  return el;
}

/** True when this block currently shares a line with another.
 *
 * Checked at the wrapper level: a pair is `.sxs > .u > block`, so the block's
 * OWN parent is its `.u` and never `.sxs`. Testing the block's parent made
 * every paired block report itself as unpaired. */
export function isPaired(el: HTMLElement): boolean {
  return !!pairUnit(el).parentElement?.classList.contains(SXS);
}

/**
 * The column that owns the empty band under a page's content.
 *
 * `.acols` is `display:flex` with no height of its own, so it is exactly as
 * tall as its tallest column's CONTENT. The blank 800px between where the
 * columns stop and the foot of the sheet therefore belongs to `.page`, not to
 * any column — `closest(".acol")` returns null there.
 *
 * That is why dropping into the visible space at the bottom of a page kept
 * falling through to free placement and landing the block "at the corner"
 * as an absolutely-positioned box, instead of in the flow under the question.
 *
 * Resolved by geometry instead: whichever column's horizontal band the cursor
 * is in, or the nearest one.
 */
export function columnUnder(page: HTMLElement, x: number): HTMLElement | null {
  const cols = Array.from(page.querySelectorAll<HTMLElement>(
    ".acol, .flowwrap, .page__cols, .page__full"));
  if (!cols.length) return null;
  let best: HTMLElement | null = null;
  let bestDx = Infinity;
  for (const c of cols) {
    const r = c.getBoundingClientRect();
    if (r.width < 1) continue;
    if (x >= r.left && x <= r.right) return c;
    const dx = Math.min(Math.abs(x - r.left), Math.abs(x - r.right));
    if (dx < bestDx) { bestDx = dx; best = c; }
  }
  return best;
}

/** The last block in this container, ignoring the one being dragged. */
function lastBlockIn(container: HTMLElement, exceptId: string | null): HTMLElement | null {
  const all = Array.from(container.querySelectorAll<HTMLElement>("[data-block-id]"))
    .filter((b) => !exceptId || b.dataset.blockId !== exceptId);
  return all.length ? all[all.length - 1] : null;
}

/** Why a pair was refused, for telling the user instead of silently failing. */
export type PairRefusal = "already-paired" | "would-nest" | "too-narrow" | null;

/** Can these two share a line? Returns the reason if not. */
export function pairRefusal(rawTarget: HTMLElement, rawMoving: HTMLElement): PairRefusal {
  const target = pairUnit(rawTarget);
  const moving = pairUnit(rawMoving);
  if (target === moving) return "would-nest";
  const parent = target.parentElement;
  if (parent?.classList.contains(SXS) && parent.children.length >= 2) return "already-paired";
  // One level only. A pair inside a pair is 25% of the line, and another
  // level is 12% — which is how a card came out as a vertical ribbon of one
  // word per line. `placeSideBySide` refused a THIRD block in a row but never
  // refused a NEW row created inside one.
  if (target.closest(`.${SXS}`) || moving.closest(`.${SXS}`)) return "would-nest";
  // Measured, not assumed: the halves have to fit the line they will share.
  const available = (target.parentElement?.clientWidth
    || target.getBoundingClientRect().width) - 14;   // minus the gap
  if (available > 0 && available / 2 < MIN_PAIR_WIDTH) return "too-narrow";
  return null;
}

export function placeSideBySide(doc: Document, rawTarget: HTMLElement, rawMoving: HTMLElement) {
  // Pair the WRAPPERS, not the blocks — see pairUnit.
  const target = pairUnit(rawTarget);
  const moving = pairUnit(rawMoving);
  if (target === moving) return false;
  const existing = target.parentElement;
  if (existing && existing.classList.contains(SXS)) {
    if (existing.children.length >= 2) return false;   // a pair, not a row
    existing.appendChild(moving);
    return true;
  }
  if (pairRefusal(target, moving)) return false;
  const row = doc.createElement("div");
  row.className = SXS;
  target.parentElement?.insertBefore(row, target);
  row.appendChild(target);
  row.appendChild(moving);
  return true;
}

/**
 * How wide the FIRST half of a pair is, 20–80% of the line.
 *
 * A pair starts even, but even is rarely right: a picture beside a paragraph
 * wants a third, a table beside a note wants two thirds. Written as
 * `flex-grow` on the two children so the pair still fills the line exactly and
 * still reflows — stretching one half shrinks the other rather than
 * overflowing the column.
 */
export function setPairSplit(rawBlock: HTMLElement, firstPercent: number): boolean {
  const block = pairUnit(rawBlock);
  const row = block.parentElement;
  if (!row || !row.classList.contains(SXS) || row.children.length < 2) return false;
  const pct = Math.min(80, Math.max(20, Math.round(firstPercent)));
  const a = row.children[0] as HTMLElement;
  const b = row.children[1] as HTMLElement;
  // Longhands, not the `flex` shorthand: setting the shorthand does not
  // populate `style.flexGrow` in every engine, so the value could not be read
  // back and the control always showed 50%.
  for (const [el, grow] of [[a, pct], [b, 100 - pct]] as const) {
    el.style.flexGrow = String(grow);
    el.style.flexShrink = "1";
    el.style.flexBasis = "0";
  }
  return true;
}

/** Current split, or 50 when it has never been set. */
export function pairSplit(rawBlock: HTMLElement): number | null {
  const block = pairUnit(rawBlock);
  const row = block.parentElement;
  if (!row || !row.classList.contains(SXS) || row.children.length < 2) return null;
  const grow = parseFloat((row.children[0] as HTMLElement).style.flexGrow || "");
  return Number.isFinite(grow) && grow > 0 ? Math.round(grow) : 50;
}

/**
 * Unwraps any pair left holding fewer than two blocks.
 *
 * Dragging a block OUT of a pair left the `.sxs` behind with a single child,
 * still claiming half the line and still refusing to be paired again ("that
 * pair is full"). The leftover half then sat in a narrow column that nothing
 * explained — and putting the block back was awkward because its old home was
 * now a strange half-width box.
 *
 * Called after every move, so a pair only exists while it actually has two
 * blocks in it.
 */
export function tidyPairs(doc: Document): number {
  let undone = 0;
  doc.querySelectorAll<HTMLElement>(`.${SXS}`).forEach((row) => {
    if (row.children.length >= 2) return;
    const parent = row.parentElement;
    if (!parent) return;
    Array.from(row.children).forEach((c) => {
      const el = c as HTMLElement;
      el.style.flexGrow = "";
      el.style.flexShrink = "";
      el.style.flexBasis = "";
      el.style.flex = "";
    });
    while (row.firstChild) parent.insertBefore(row.firstChild, row);
    parent.removeChild(row);
    undone += 1;
  });
  return undone;
}

/** Takes a pair apart, putting both blocks back on their own lines. */
export function unpairSideBySide(rawBlock: HTMLElement): boolean {
  const block = pairUnit(rawBlock);
  const row = block.parentElement;
  if (!row || !row.classList.contains(SXS)) return false;
  const parent = row.parentElement;
  if (!parent) return false;
  Array.from(row.children).forEach((c) => {
    const el = c as HTMLElement;
    el.style.flexGrow = "";
    el.style.flexShrink = "";
    el.style.flexBasis = "";
    el.style.flex = "";
  });
  while (row.firstChild) parent.insertBefore(row.firstChild, row);
  parent.removeChild(row);
  return true;
}

/** A thin vertical bar, for "this will go beside that" — the horizontal bar
 * means "between these two" and would be a lie here. */
/** How far the cursor must be from every block before blank space counts as
 * a place to PUT something rather than a gap between two blocks. Below this,
 * the drag is still a reorder. */
export const FREE_DROP_GAP = 44;

export const FREE_DROP_ID = "__free_drop_indicator__";

/** Shortest distance from a point to a rectangle's edge; 0 when inside. */
function distanceToRect(x: number, y: number, r: DOMRect): number {
  const dx = Math.max(r.left - x, 0, x - r.right);
  const dy = Math.max(r.top - y, 0, y - r.bottom);
  return Math.hypot(dx, dy);
}

/**
 * Is the cursor in genuinely open space, well clear of every block?
 *
 * Dropping into blank space used to mean "reorder next to whichever block is
 * nearest", so a block dragged into an obviously empty half-page was pushed
 * into the flow above or below something and every following block shifted to
 * make room. Reported as "there is so much space, but when I try to place
 * something the whole content shifts and readjusts".
 *
 * Far from everything, the honest reading of the gesture is "put it HERE" —
 * which is placement, not reordering.
 */
export function isOpenSpace(page: HTMLElement, x: number, y: number, exceptId: string | null): boolean {
  const blocks = Array.from(page.querySelectorAll<HTMLElement>("[data-block-id]"));
  for (const b of blocks) {
    if (exceptId && b.dataset.blockId === exceptId) continue;
    const r = b.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) continue;
    if (distanceToRect(x, y, r) < FREE_DROP_GAP) return false;
  }
  return blocks.length > 0;
}

/** The dashed outline showing where a free drop would land. */
function showFreeDropGhost(doc: Document, x: number, y: number, w: number, h: number) {
  let el = doc.getElementById(FREE_DROP_ID);
  if (!el) {
    el = doc.createElement("div");
    el.id = FREE_DROP_ID;
    el.style.cssText =
      "position:fixed;border:2px dashed #3ec27f;border-radius:8px;" +
      "background:rgba(62,194,127,0.10);z-index:2147483646;pointer-events:none;" +
      "font:700 11px/1.5 ui-sans-serif,system-ui,sans-serif;color:#12613a;" +
      "display:flex;align-items:flex-start;justify-content:center;padding-top:4px";
    el.textContent = "Place here — stays put";
    doc.body.appendChild(el);
  }
  if (el.parentElement !== doc.body) doc.body.appendChild(el);
  el.style.left = `${x - w / 2}px`;
  el.style.top = `${y - h / 2}px`;
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
}

function hideFreeDropGhost(doc: Document) {
  doc.getElementById(FREE_DROP_ID)?.remove();
}

/**
 * Put a dragged block down exactly where the cursor is, out of the flow.
 *
 * Nothing around it moves — that is the whole point. Returns false when the
 * block cannot be lifted (no page behind it).
 */
export function dropFreeAt(doc: Document, block: HTMLElement, clientX: number, clientY: number): boolean {
  // Whichever page is under the cursor — a block can be dragged onto a page
  // it did not come from. `elementFromPoint` is guarded because jsdom does
  // not implement it, and the block's own page is the right answer anyway
  // whenever it is missing.
  const page = (doc.elementFromPoint?.(clientX, clientY) as Element | null)
    ?.closest<HTMLElement>(".page")
    ?? block.closest<HTMLElement>(".page");
  if (!page) return false;
  const rect = block.getBoundingClientRect();
  if (!liftToPage(doc, block)) return false;
  if (block.parentElement !== page) page.appendChild(block);

  const pageRect = page.getBoundingClientRect();
  const scale = pageRect.width / page.offsetWidth || 1;
  const left = (clientX - pageRect.left) / scale - rect.width / scale / 2;
  const top = (clientY - pageRect.top) / scale - rect.height / scale / 2;
  const snapped = snapFree(block, page, left, top);
  block.style.left = `${Math.round(snapped.left)}px`;
  block.style.top = `${Math.round(snapped.top)}px`;
  return true;
}

function ensureSideIndicator(doc: Document): HTMLElement {
  let el = doc.getElementById("__side_drop_indicator__");
  if (!el) {
    el = doc.createElement("div");
    el.id = "__side_drop_indicator__";
    el.style.position = "absolute";
    el.style.width = "4px";
    el.style.background = "#3ec27f";
    el.style.borderRadius = "3px";
    el.style.boxShadow = "0 0 0 3px rgba(62,194,127,0.25), 0 0 10px 1px rgba(62,194,127,0.6)";
    el.style.pointerEvents = "none";
    el.style.zIndex = "9999";
  }
  return el;
}

/**
 * The "it will land here" bar.
 *
 * An OVERLAY, not a block in the flow. It used to be a real element —
 * `height:4px; margin:5px 0` — inserted with `insertBefore` on every single
 * `dragover`, which reflowed the page by 14px each time the mouse moved. The
 * content being aimed at slid away, the next mouse event landed on a
 * different element, and the block was dropped somewhere the user had never
 * chosen. That is the whole of "it goes to random places".
 *
 * Positioned absolutely against the document, so showing it changes nothing.
 */
function ensureDropIndicator(doc: Document): HTMLElement {
  let el = doc.getElementById("__drop_indicator__");
  if (!el) {
    el = doc.createElement("div");
    el.id = "__drop_indicator__";
    el.style.position = "absolute";
    el.style.height = "5px";
    el.style.background = "#137a4a";
    el.style.borderRadius = "3px";
    el.style.boxShadow = "0 0 0 3px rgba(19,122,74,0.28), 0 0 12px 2px rgba(19,122,74,0.6)";
    el.style.pointerEvents = "none";
    el.style.zIndex = "9998";
    el.style.transition = "top 60ms linear, left 60ms linear, width 60ms linear";
  }
  if (!el.isConnected) doc.body.appendChild(el);
  return el;
}

/** A label on the bar saying what the drop will do, so the outcome is never a
 * surprise. */
function ensureDropLabel(doc: Document, text: string, x: number, y: number): HTMLElement {
  let el = doc.getElementById("__drop_label__");
  if (!el) {
    el = doc.createElement("div");
    el.id = "__drop_label__";
    el.style.position = "absolute";
    el.style.padding = "2px 8px";
    el.style.borderRadius = "10px";
    el.style.background = "#137a4a";
    el.style.color = "#fff";
    el.style.font = "600 11px/1.6 system-ui, sans-serif";
    el.style.whiteSpace = "nowrap";
    el.style.pointerEvents = "none";
    el.style.zIndex = "9999";
  }
  el.textContent = text;
  el.style.left = `${Math.round(x)}px`;
  el.style.top = `${Math.round(y)}px`;
  if (!el.isConnected) doc.body.appendChild(el);
  return el;
}

/** A faint copy of the block being dragged, parked at the landing spot.
 *
 * A bar says WHERE; the ghost says WHAT, at the size it will actually be —
 * which is the difference between guessing and seeing. */
function showGhost(doc: Document, dragged: HTMLElement, target: HTMLElement, before: boolean) {
  // INSIDE THE TARGET'S OWN COLUMN, not on doc.body.
  //
  // Almost every rule that sizes text in this book is scoped to the column
  // it sits in — `.acol .q`, `.acol .fcard`, `.acol .dm`. A clone parked on
  // doc.body matches none of them, so it re-flowed at a different font size
  // and line height inside a width borrowed from the target: the preview came
  // out as a narrow ribbon of text overlapping the real paragraph at the
  // wrong scale, which is the mangled double-image in the report. Held in the
  // column, the clone is styled exactly like the block it is previewing.
  //
  // `.page` is the positioned ancestor, so coordinates are relative to it.
  const page = target.closest<HTMLElement>(".page");
  const host = target.closest<HTMLElement>(".acol, .flowwrap") ?? page ?? doc.body;
  let ghost = doc.getElementById("__drag_ghost__") as HTMLElement | null;
  if (!ghost || ghost.dataset.forId !== dragged.dataset.blockId) {
    ghost?.remove();
    ghost = dragged.cloneNode(true) as HTMLElement;
    ghost.id = "__drag_ghost__";
    ghost.dataset.forId = dragged.dataset.blockId ?? "";
    ghost.removeAttribute("data-block-id");
    ghost.classList.add(ED.ghost);
  }
  if (ghost.parentElement !== host) host.appendChild(ghost);
  const r = target.getBoundingClientRect();
  const base = (page ?? host).getBoundingClientRect();
  ghost.style.left = `${Math.round(r.left - base.left)}px`;
  ghost.style.top = `${Math.round((before ? r.top : r.bottom) - base.top)}px`;
  ghost.style.width = `${Math.round(r.width)}px`;
}

/** Where the drop would go, and what it would do — drawn over the page. */
function showDropBar(doc: Document, target: HTMLElement, before: boolean, label: string,
                     dragged?: HTMLElement | null) {
  if (dragged) showGhost(doc, dragged, target, before);
  const r = target.getBoundingClientRect();
  const sx = doc.defaultView?.scrollX ?? 0;
  const sy = doc.defaultView?.scrollY ?? 0;
  const bar = ensureDropIndicator(doc);
  bar.style.left = `${Math.round(r.left + sx)}px`;
  bar.style.width = `${Math.round(r.width)}px`;
  bar.style.top = `${Math.round((before ? r.top : r.bottom) + sy) - 2}px`;
  ensureDropLabel(doc, label, r.left + sx + 6, (before ? r.top : r.bottom) + sy - 22);
  // The block it will land next to, outlined — so "relative to WHAT" is never
  // in doubt either.
  doc.querySelectorAll(`.${ED.dropTarget}`).forEach((n) => n.classList.remove(ED.dropTarget));
  target.classList.add(ED.dropTarget);
}

/** Takes the overlay down. */
function hideDropBar(doc: Document) {
  doc.getElementById("__drop_indicator__")?.remove();
  doc.getElementById("__drop_label__")?.remove();
  doc.getElementById("__drag_ghost__")?.remove();
  doc.querySelectorAll(`.${ED.dropTarget}`).forEach((n) => n.classList.remove(ED.dropTarget));
}

/**
 * Fine-grained reordering WITHIN a container that is itself a single block
 * (one data-block-id) — an individual `<figure>` inside a `.figure-grid`
 * pair, or an individual `<li>` inside a `.bullet-list`/numbered list.
 * These elements have no data-block-id of their own (only their parent
 * block does), so the top-level makeBlocksDraggable/attachDragReorder
 * mechanism can't address them individually — without this, dragging
 * anywhere inside a figure pair or a list always moved/reordered the
 * WHOLE pair or WHOLE list, never just the one image or one line the user
 * actually grabbed.
 *
 * MUST be wired up (both make*Draggable and attach*Reorder) BEFORE
 * makeBlocksDraggable/attachDragReorder in onIframeLoad: listeners for the
 * same event type on the same target fire in registration order, and
 * these call stopPropagation() once they've handled a drag that started
 * inside one of their items — registering first is what lets that actually
 * stop the top-level handler (registered after) from also reacting to the
 * same event and moving the whole parent block instead.
 */
/** Items are MARKED at stamp time rather than matched by a fixed selector.
 *
 * This used to be `.figure-grid > .figure, .bullet-list__items > li,
 * .list--number > li` — all from the older BEM element library, none of which
 * the current pipeline emits. So nested-item dragging was dead on every real
 * chapter: the exam stamps in a section head, the rows of a सूत्र panel, the
 * lines of a sticky note and the bullets of a list could none of them be
 * moved, and dragging one always moved the whole parent block.
 *
 * The legacy selectors stay so documents from that era keep working. */
const ITEM_ATTR = "data-nested-item";
const ITEM_SELECTOR =
  `[${ITEM_ATTR}], .figure-grid > .figure, .bullet-list__items > li, .list--number > li`;

/** Displays that mean "a run of text", never "a thing you can reorder". */
const TEXT_DISPLAYS = new Set(["inline", "contents", "none"]);

/** What shape an element is, for spotting repeated siblings. Tag plus classes:
 * two `.examchip` spans match, a `.examchip` and a `.basetag` do not. */
function signature(el: Element): string {
  return el.tagName + "|" + Array.from(el.classList).sort().join(".");
}

/**
 * Finds the repeated units inside every block and makes each one draggable.
 *
 * A nested item is a child that (a) has at least one same-shaped sibling, and
 * (b) is not an inline run of text. That second test is what keeps this
 * sane: a chapter has 5077 `.up` spans and 1197 `.m` spans, and marking
 * those would make every digit in the book independently draggable. They are
 * `display:inline`; an exam chip inside a `display:flex` heading computes to
 * `block`, a `<li>` to `list-item`, a सूत्र row to `block`. Being layout-level
 * is precisely what makes something a unit rather than a fragment.
 */
export function makeNestedItemsDraggable(doc: Document) {
  const win = doc.defaultView ?? window;

  // Scanned from the STAMPED BLOCKS outward, two levels deep, rather than
  // over every element in the document. A chapter is 69 pages and ~3MB, and
  // `getComputedStyle` on all of it takes seconds — long enough to stall the
  // canvas on load. Two levels is enough for every real case: a heading's
  // chips and a सूत्र panel's rows are one level in, stat tiles two.
  const scan = (parent: Element, depth: number) => {
    const kids = Array.from(parent.children) as HTMLElement[];
    {
      const counts = new Map<string, number>();
      for (const k of kids) counts.set(signature(k), (counts.get(signature(k)) ?? 0) + 1);

      for (const el of kids) {
        // Already a top-level block (stamped earlier in onIframeLoad), or art
        // with its own free-drag — neither wants flow-reorder drag on top.
        if (el.hasAttribute("data-block-id") || el.classList.contains("bookdecor")) continue;
        // A declared element that DRAWS ITS OWN BOX is an object regardless of
        // how it happens to be laid out. Exam chips are `<span>`s that only
        // become block-level because their heading is a flex container, so a
        // display test alone missed all four of them on every heading — they
        // could not be reordered, moved or deleted one at a time. `paints`
        // comes from the element's own stylesheet, so it does not depend on
        // flex blockification having been computed.
        const declared = manifestElementFor(el);
        // …AND IT IS AN OBJECT EVEN WHEN IT IS THE ONLY ONE OF ITS KIND.
        //
        // The repeat test — two siblings of the same shape — is what keeps
        // the chapter's 1197 inline maths runs from each growing a selection
        // box, and for undeclared markup it is the only signal there is. But
        // applied to declared elements it hid exactly the things a teacher
        // reaches for most: a `.topic-frequency` seal sits beside an `<h2>`,
        // which is a DIFFERENT shape, so no heading's seal was ever movable;
        // a question with one `.paper-ref` tag had no movable tag at all,
        // while the question below it with three did. Being declared, with
        // its own box, is already the stronger statement — so it stands on
        // its own here, and the repeat test is left to cover everything the
        // manifest does not describe.
        const repeated = (counts.get(signature(el)) ?? 0) >= 2;
        if (!declared?.paints) {
          if (!repeated) continue;
          // Display alone cannot tell a `.paper-ref` tag from one of the
          // chapter's 1197 inline `.m` maths runs — both are inline spans —
          // so what settles it is the `paints` test above, and the element
          // library is where that question gets answered. See
          // `elements/paper-ref/spec.json`: the tag is declared together
          // with the yellow band it sits in, because the band is what draws
          // the box. Inline maths declares no box and stays text.
          if (TEXT_DISPLAYS.has(win.getComputedStyle(el).display)) continue;
        }
        el.setAttribute(ITEM_ATTR, "");
        el.draggable = false;   // armed on demand — see attachGripArming
        el.classList.add(ED.nestedItem);
      }
    }
    if (depth > 0) {
      for (const k of kids) scan(k, depth - 1);
    }
  };

  doc.querySelectorAll<HTMLElement>("[data-block-id]").forEach((block) => scan(block, 1));

  // THEN EVERY DECLARED BOX, HOWEVER DEEP IT SITS.
  //
  // The scan above stops two levels in because each candidate costs a
  // `getComputedStyle`, and on a 3MB chapter walking all of it stalls the
  // canvas on load. That budget is what kept a `.paper-ref` tag unmovable:
  // it lives at `.qhead > .question-meta > .paper-refs > .paper-ref`, one
  // level past the cap, so a question's exam tags could be read but never
  // rearranged. Anything the element library says paints its own box is an
  // object by declaration — no measurement needed — so one selector finds
  // them all and asks the browser for nothing.
  const mark = (el: HTMLElement) => {
    if (el.hasAttribute("data-block-id") || el.classList.contains("bookdecor")) return;
    if (!el.closest("[data-block-id]")) return;     // outside the editable body
    el.setAttribute(ITEM_ATTR, "");
    el.draggable = false;
    el.classList.add(ED.nestedItem);
  };
  if (PAINTED_SELECTOR) doc.querySelectorAll<HTMLElement>(PAINTED_SELECTOR).forEach(mark);

  // A LIST ITEM IS AN ITEM even when it is the only one.
  //
  // Everything above needs a reason to believe an element is an object —
  // two siblings alike, or a declared box. A `<li>` needs neither: being one
  // IS the statement. It mattered here because a सूत्र panel holds a
  // `.formula-list`, and a topic with a single formula has a single `<li>` —
  // so 10 of the book's 18 formula rows could not be moved while the other 8
  // could, which reads as the editor working intermittently.
  doc.querySelectorAll<HTMLElement>("li").forEach(mark);

  // Legacy BEM documents, which the rule above would also catch but only if
  // their CSS happens to be present — these are matched outright.
  doc.querySelectorAll<HTMLElement>(
    ".figure-grid > .figure, .bullet-list__items > li, .list--number > li",
  ).forEach((el) => {
    el.draggable = false;
    el.classList.add(ED.nestedItem);
  });
}


export function attachNestedItemReorder(doc: Document, onMoved: () => void) {
  let draggedEl: HTMLElement | null = null;
  let nestedSideTarget: HTMLElement | null = null;  // block whose right edge a row is over
  let nestedPlan: { target: HTMLElement; before: boolean } | null = null;
  let suspendedEditableHost: HTMLElement | null = null;

  // A bullet/numbered list's directText block becomes contenteditable="true"
  // on the WHOLE block the moment it's selected — and a native HTML5
  // dragstart on an element that lives inside a contenteditable ancestor is
  // notoriously unreliable across browsers (Chrome in particular prioritizes
  // starting a TEXT SELECTION drag over honoring that child element's own
  // `draggable="true"`), so a mousedown on an <li> there was never reliably
  // producing a real element dragstart at all — the browser's native
  // text-drag took over instead, which then falls through to acting on the
  // whole editable block. Temporarily turning contenteditable off for the
  // duration of the gesture (grab through drop/cancel) sidesteps that
  // entirely; it's restored immediately after regardless of outcome.
  doc.addEventListener("mousedown", (e) => {
    const item = (e.target as Element).closest<HTMLElement>(ITEM_SELECTOR);
    if (!item) return;
    const editableHost = item.closest<HTMLElement>('[contenteditable="true"]');
    if (editableHost) {
      editableHost.contentEditable = "false";
      suspendedEditableHost = editableHost;
    }
  });
  function restoreEditableHost() {
    if (suspendedEditableHost) {
      suspendedEditableHost.contentEditable = "true";
      suspendedEditableHost = null;
    }
  }
  doc.addEventListener("mouseup", restoreEditableHost);

  doc.addEventListener("dragstart", (e) => {
    const item = (e.target as Element).closest<HTMLElement>(ITEM_SELECTOR);
    if (!item) return;
    draggedEl = item;
    dimWhileDragging(item);
    e.dataTransfer?.setData(DRAG_MIME + "-nested", "1");
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    // stopImmediatePropagation, NOT stopPropagation: both this listener
    // and attachDragReorder's block-level one are registered on the SAME
    // `doc` target for the same event type. stopPropagation only stops
    // the event reaching OTHER elements/ancestors — it does nothing to
    // stop a second listener attached to this exact same node, so without
    // this the block-level handler still ran right after and treated the
    // whole `.figure-grid`/list block as being dragged too (resolved via
    // its own closest('[data-block-id]') lookup), moving both figures
    // together instead of just the one actually grabbed.
    e.stopImmediatePropagation();
  });

  doc.addEventListener("dragover", (e) => {
    if (!draggedEl) return;

    // A single line dragged onto the RIGHT EDGE of a block leaves its list and
    // goes beside that block. Without this a row could only ever be reordered
    // inside its own parent, so a bullet or a step could never be moved into
    // the empty half of a line elsewhere on the page.
    const outer = (e.target as Element).closest<HTMLElement>("[data-block-id]");
    if (outer && !outer.contains(draggedEl) && sxsCount(outer.parentElement) < 2
        && pairRefusal(outer, draggedEl) === null) {
      const r = outer.getBoundingClientRect();
      if (e.clientX > r.right - r.width * SIDE_ZONE) {
        e.preventDefault();
        e.stopImmediatePropagation();
        nestedSideTarget = outer;
        doc.getElementById("__nested_drop_indicator__")?.remove();
        const bar = ensureSideIndicator(doc);
        const hostRect = doc.body.getBoundingClientRect();
        bar.style.left = `${r.right - hostRect.left - 2}px`;
        bar.style.top = `${r.top - hostRect.top}px`;
        bar.style.height = `${r.height}px`;
        doc.body.appendChild(bar);
        return;
      }
    }
    nestedSideTarget = null;
    doc.getElementById("__side_drop_indicator__")?.remove();

    const target = (e.target as Element).closest<HTMLElement>(ITEM_SELECTOR);
    if (!target || target.parentElement !== draggedEl.parentElement || target === draggedEl) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const horizontal = target.parentElement!.classList.contains("figure-grid")
      || getComputedStyle(target.parentElement!).flexDirection === "row";
    const rect = target.getBoundingClientRect();
    const before = horizontal ? e.clientX < rect.left + rect.width / 2 : e.clientY < rect.top + rect.height / 2;
    // Same overlay as the block level, for the same reason: an in-flow marker
    // moved the very row being aimed at.
    nestedPlan = { target, before };
    showDropBar(doc, target, before,
                before ? "Move before this" : "Move after this", draggedEl);
  });

  doc.addEventListener("drop", (e) => {
    if (!draggedEl) return;
    if (dragCancelled) {
      dragCancelled = false;
      nestedPlan = null; nestedSideTarget = null;
      hideDropBar(doc);
      undim(draggedEl);
      draggedEl = null;
      return;
    }

    if (nestedSideTarget) {
      e.preventDefault();
      e.stopImmediatePropagation();
      // The row is lifted out of its list and becomes a block in its own
      // right — it is no longer one of a repeated set, so it must stop
      // carrying the marks that say it is.
      draggedEl.removeAttribute("data-nested-item");
      draggedEl.classList.remove(ED.nestedItem);
      draggedEl.draggable = false;
      const moved = draggedEl;
      const host = nestedSideTarget;
      nestedSideTarget = null;
      doc.getElementById("__side_drop_indicator__")?.remove();
      if (placeSideBySide(doc, host, moved)) onMoved();
      undim(moved);
      draggedEl = null;
      return;
    }

    const target = (e.target as Element).closest<HTMLElement>(ITEM_SELECTOR);
    if (target && nestedPlan && target.parentElement === draggedEl.parentElement) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const { target: t, before } = nestedPlan;
      t.parentElement?.insertBefore(draggedEl, before ? t : t.nextSibling);
      tidyPairs(doc);
      onMoved();
    }
    nestedPlan = null;
    hideDropBar(doc);
    // Must undim HERE, not (only) in the dragend handler below: "drop"
    // always fires before "dragend" on a successful drop, and this line
    // nulls draggedEl right after — dragend's own undim(draggedEl) would
    // then be undimming `null` and silently do nothing, permanently
    // leaving the moved item faded. dragend's call stays in place too,
    // since it's still needed for a CANCELLED drag (dropped somewhere
    // invalid), where "drop" never fires and draggedEl is still set.
    undim(draggedEl);
    draggedEl = null;
  });

  doc.addEventListener("dragend", () => {
    nestedPlan = null;
    hideDropBar(doc);
    doc.getElementById("__nested_drop_indicator__")?.remove();
    undim(draggedEl);
    draggedEl = null;
    restoreEditableHost(); // belt-and-suspenders alongside the mouseup listener above
  });
}

export function attachDragReorder(
  doc: Document,
  structure: DocumentStructure,
  onMoved: () => void,
  /** The ids currently multi-selected, if the host tracks a selection.
   *
   * Multi-select could already delete, duplicate and move-to-page in bulk,
   * but it had no presence here at all — so selecting six blocks and dragging
   * one moved that one and left the other five behind. Dragging a member of
   * the selection now moves the whole selection.
   */
  selectedIds: () => string[] = () => [],
) {
  let draggedId: string | null = null;
  let sideTarget: HTMLElement | null = null;   // set while hovering a block's right edge
  let dropPlan: { target: HTMLElement; before: boolean } | null = null;

  // Which element counts as "somewhere a block can be dropped".
  //
  // This used to be hardcoded to `.page__cols`, with two consequences: no
  // drag worked at all in a document that has no such container (i.e. any
  // document not from this repo's pipeline), and blocks living in
  // `.page__full` — the chapter title, the "भाग 1" heading — were draggable
  // but could never be dropped anywhere, because their own container didn't
  // match the selector the drop handler required.
  const containerSelector = structure.blockContainerSelectors.join(", ");
  const containerFrom = (el: Element | null): HTMLElement | null => {
    if (!el) return null;
    if (containerSelector) return el.closest<HTMLElement>(containerSelector);
    // Flow mode: a block's own parent is its container, whatever it is.
    const block = el.closest<HTMLElement>("[data-block-id]");
    return (block?.parentElement as HTMLElement | null) ?? null;
  };

  /** Set while the cursor is out in open space: the drop places the block
   * there instead of reordering the flow around it. */
  let freeDropAt: { x: number; y: number } | null = null;
  /** The column whose empty foot is currently lit up as a drop zone.
   *
   * The "end of this column" drop existed before but was invisible: the
   * only feedback was a thin bar against the last block, several hundred
   * pixels above where the cursor actually was, so the empty space still
   * read as somewhere a drop would be refused. Lighting the whole tail says
   * plainly that the space is a target. */
  let tailHost: HTMLElement | null = null;
  const litTail = (host: HTMLElement | null) => {
    if (tailHost === host) return;
    if (tailHost) setChromeClass(tailHost, ED.tailZone, false);
    tailHost = host;
    if (tailHost) setChromeClass(tailHost, ED.tailZone, true);
  };
  /** Every unit of the question being dragged, when the grab was on its
   * heading. Empty for an ordinary single-block drag. */
  let draggedRun: HTMLElement[] = [];

  doc.addEventListener("dragstart", (e) => {
    const block = (e.target as Element).closest<HTMLElement>("[data-block-id]");
    if (!block) return;
    // Grabbing the question's HEADING takes the whole question — its text,
    // its answer, its working and its callouts, which the pipeline emits as
    // eight separate sibling units. Grabbing any other part still moves just
    // that part, so a single working line can be repositioned as before.
    // A multi-selection wins over the question run: if the user has picked
    // blocks explicitly, that is what they mean to move.
    const picked = selectedIds();
    if (picked.length > 1 && block.dataset.blockId
        && picked.includes(block.dataset.blockId)) {
      draggedRun = picked
        .map((id) => doc.querySelector<HTMLElement>(`[data-block-id="${id}"]`))
        .filter((el): el is HTMLElement => !!el)
        .map((el) => pairUnit(el))
        // Page order, not click order — moving them in the order they were
        // clicked would shuffle the content.
        .filter((u, i, all) => all.indexOf(u) === i)
        .sort((a, b) => (a.compareDocumentPosition(b) & 4) ? -1 : 1);
    } else {
      draggedRun = block.closest(".qhead") ? questionRun(block) : [];
    }
    draggedId = block.dataset.blockId ?? null;
    dimWhileDragging(block);
    e.dataTransfer?.setData(DRAG_MIME, draggedId ?? "");
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  });

  doc.addEventListener("dragover", (e) => {
    if (!draggedId) return;
    const target = (e.target as Element).closest<HTMLElement>("[data-block-id]");
    const container = containerFrom(e.target as Element);
    const page = (e.target as Element).closest<HTMLElement>(".page");
    // A page's blank lower half is usually OUTSIDE `.flowwrap` — the flow
    // container ends where the content does. Gating on the container alone
    // ignored the drag over precisely the empty space a user aims at, so the
    // block snapped back and nothing happened.
    if (!target && !container && !page) return;
    e.preventDefault();

    const indicator = ensureDropIndicator(doc);
    if (target) { freeDropAt = null; hideFreeDropGhost(doc); }
    if (target && target.dataset.blockId !== draggedId) {
      const rect = target.getBoundingClientRect();
      // The right edge of a block means "put it BESIDE this", which is the
      // only way to use the empty half of a line a short box leaves behind.
      const dragged = doc.querySelector<HTMLElement>(`[data-block-id="${draggedId}"]`);
      const overSide =
        e.clientX > rect.right - rect.width * SIDE_ZONE &&
        sxsCount(target.parentElement) < 2 &&
        // Do not show a drop target for a pair that would then be refused —
        // an indicator that leads nowhere is worse than none.
        !!dragged && pairRefusal(target, dragged) === null;
      litTail(null);
      if (overSide) {
        sideTarget = target;
        indicator.remove();
        const bar = ensureSideIndicator(doc);
        const host = doc.body;
        const hostRect = host.getBoundingClientRect();
        bar.style.left = `${rect.right - hostRect.left - 2}px`;
        bar.style.top = `${rect.top - hostRect.top}px`;
        bar.style.height = `${rect.height}px`;
        host.appendChild(bar);
        return;
      }
      litTail(null);
      sideTarget = null;
      doc.getElementById("__side_drop_indicator__")?.remove();
      const before = e.clientY < rect.top + rect.height / 2;
      dropPlan = { target, before };
      const what = draggedRun.length > 1 ? describeRun(draggedRun) : "Move";
      showDropBar(doc, target, before,
                  `${what} ${before ? "above this" : "below this"}`, dragged);
    } else if (!target) {
      const dragged = doc.querySelector<HTMLElement>(`[data-block-id="${draggedId}"]`);

      // BELOW THE LAST BLOCK OF A COLUMN — the commonest aim there is, and
      // until now the one thing that space could not do.
      //
      // A page's columns often end high, leaving 500px of visible emptiness
      // underneath. Dropping into it fell through to the free-placement
      // branch below, which LIFTS the block out of the text: it stopped
      // reflowing, and moving a question "down into the space" quietly turned
      // it into a floating box instead. Inside a column, past its last block,
      // the honest reading of the gesture is "put it at the end here" — which
      // is an ordinary flow move that keeps everything reflowing.
      // `container` is null in the blank band under the columns — see
      // columnUnder for why — so the column is resolved by position too.
      const host = container ?? (page ? columnUnder(page, e.clientX) : null);
      if (host && dragged) {
        const last = lastBlockIn(host, draggedId);
        if (last && e.clientY > last.getBoundingClientRect().bottom) {
          freeDropAt = null;
          hideFreeDropGhost(doc);
          sideTarget = null;
          doc.getElementById("__side_drop_indicator__")?.remove();
          dropPlan = { target: last, before: false };
          litTail(host);
          showDropBar(doc, last, false,
                      draggedRun.length > 1
                        ? `${describeRun(draggedRun)} to the end of this column`
                        : "Move to the end of this column", dragged);
          return;
        }
      }

      // Well clear of everything AND not inside a column: this is a
      // placement, not a reorder.
      litTail(null);
      if (page && dragged && isOpenSpace(page, e.clientX, e.clientY, draggedId)) {
        freeDropAt = { x: e.clientX, y: e.clientY };
        dropPlan = null;
        sideTarget = null;
        hideDropBar(doc);
    litTail(null);
        doc.getElementById("__side_drop_indicator__")?.remove();
        const r = dragged.getBoundingClientRect();
        showFreeDropGhost(doc, e.clientX, e.clientY, r.width, r.height);
        return;
      }
      freeDropAt = null;
      hideFreeDropGhost(doc);
      // No flow container here — the cursor is over page furniture rather
      // than the column, and there is nothing to reorder against.
      if (!container) { dropPlan = null; hideDropBar(doc);
    litTail(null); return; }
      // The cursor is over blank space inside the column area — NOT
      // "the end of the content", despite that being the old fallback
      // (container.appendChild). CSS multi-column layout means visual
      // position and DOM order diverge: a page's content can run out
      // partway down column 1 (e.g. because a big block got pushed whole
      // into column 2 to avoid splitting it), leaving a visually-empty
      // gap at the bottom of column 1 that is NOT anywhere near "the end"
      // in document order — that's still wherever the actual last block
      // sits, which could visually be in a completely different column.
      // Blindly appending there silently dropped new content in the
      // wrong place. Finding whichever real block's center is physically
      // NEAREST the cursor instead — plain Euclidean distance — naturally
      // resolves to "the block actually above/below this empty space",
      // since a same-column neighbor is almost always far closer than
      // anything in the other column.
      const blocks = Array.from(container.querySelectorAll<HTMLElement>("[data-block-id]")).filter(
        (b) => b.dataset.blockId !== draggedId,
      );
      let nearest: HTMLElement | null = null;
      let nearestDistSq = Infinity;
      for (const b of blocks) {
        const r = b.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const distSq = dx * dx + dy * dy;
        if (distSq < nearestDistSq) {
          nearestDistSq = distSq;
          nearest = b;
        }
      }
      if (nearest) {
        const rect = nearest.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        dropPlan = { target: nearest, before };
        showDropBar(doc, nearest, before,
                    before ? "Move above this" : "Move below this",
                    doc.querySelector<HTMLElement>(`[data-block-id="${draggedId}"]`));
      } else {
        dropPlan = null;
        hideDropBar(doc);
    litTail(null);
      }
    }
  });

  doc.addEventListener("drop", (e) => {
    const container = containerFrom(e.target as Element);
    // A drop in the blank band under a column also lands outside every flow
    // container — `.acols` is content-height, so that band belongs to
    // `.page`. Requiring a container here threw the drop away AFTER the drop
    // bar had already promised where it would land: the block sprang back
    // and nothing moved, which is "I drag and drop and it simply does not".
    // A plan or a free-drop point is enough on its own.
    if (!draggedId || (!container && !freeDropAt && !dropPlan)) return;
    e.preventDefault();

    if (dragCancelled) {
      dragCancelled = false;
      dropPlan = null; sideTarget = null;
      hideDropBar(doc);
    litTail(null);
      undim(doc.querySelector<HTMLElement>(`[data-block-id="${draggedId}"]`));
      draggedId = null;
      return;
    }
    const draggedEl = doc.querySelector<HTMLElement>(`[data-block-id="${draggedId}"]`);
    if (draggedEl && freeDropAt) {
      // Placed, not inserted: nothing around it moves.
      if (dropFreeAt(doc, draggedEl, freeDropAt.x, freeDropAt.y)) onMoved();
    } else if (draggedEl && sideTarget && sideTarget !== draggedEl && !draggedEl.contains(sideTarget)) {
      if (placeSideBySide(doc, sideTarget, draggedEl)) onMoved();
    } else if (draggedEl && dropPlan && dropPlan.target !== draggedEl
               && !draggedEl.contains(dropPlan.target)) {
      // Insert exactly where the bar was drawn. The bar no longer lives in the
      // DOM, so the plan it represented is carried here explicitly.
      //
      // Move the WRAPPERS. A page is `.acol > .u > block`, so
      // `target.parentElement` is the target's OWN `.u` — inserting the
      // dragged block there nested two blocks inside one wrapper instead of
      // placing it as a sibling. The block landed in the right general area
      // but the wrong slot, and the wrapper's margin guard then applied to
      // both at once, so the page shifted in a way that looked nothing like
      // where the drop bar had been drawn. That is the "it goes to random
      // places instead of the place I selected".
      const tUnit = pairUnit(dropPlan.target);
      const mUnit = pairUnit(draggedEl);
      const { before } = dropPlan;
      if (draggedRun.length > 1) {
        moveRun(draggedRun, tUnit, before);
      } else if (tUnit !== mUnit && !mUnit.contains(tUnit)) {
        tUnit.parentElement?.insertBefore(mUnit, before ? tUnit : tUnit.nextSibling);
      }
      tidyPairs(doc);
      onMoved();
    }
    sideTarget = null;
    dropPlan = null;
    draggedRun = [];
    freeDropAt = null;
    hideFreeDropGhost(doc);
    doc.getElementById("__side_drop_indicator__")?.remove();
    hideDropBar(doc);
    litTail(null);
    // Same fix as attachNestedItemReorder's drop handler: undim HERE,
    // before nulling draggedId — dragend's own undim lookup keys off
    // draggedId too, so once this clears it dragend can no longer find
    // the element at all on a successful drop, permanently leaving it
    // faded (exactly what was happening).
    undim(draggedEl);
    draggedId = null;
  });

  doc.addEventListener("dragend", () => {
    sideTarget = null;
    dropPlan = null;
    draggedRun = [];
    freeDropAt = null;
    hideFreeDropGhost(doc);
    doc.getElementById("__side_drop_indicator__")?.remove();
    hideDropBar(doc);
    litTail(null);
    if (draggedId) undim(doc.querySelector<HTMLElement>(`[data-block-id="${draggedId}"]`));
    draggedId = null;
  });
}


/* ------------------------------------------------------------------ *
 * GRIP — one armed drag source, taken hold of at the edge.
 * ------------------------------------------------------------------ */

/** Width of the grab gutter down a block's left edge, in screen px. */
export const GRIP_WIDTH = 20;

/**
 * Is `el` the thing the user is actually typing in?
 *
 * `isContentEditable` is the wrong question, and asking it is why dragging
 * kept dying. It is true for a block still carrying a `contenteditable`
 * attribute from an edit that has since ended, and — because the property is
 * INHERITED — it is true for every descendant of such a block. One stale
 * attribute anywhere up the tree therefore disarmed dragging for everything
 * underneath it, and the block a user had just been editing became the one
 * block they could no longer pick up.
 *
 * The conflict between `draggable` and `contenteditable` is real, but only
 * while the element has FOCUS: that is when the browser has to choose between
 * "select these words" and "pick this up". Unfocused, it can safely be
 * dragged.
 */
export function beingEdited(el: HTMLElement): boolean {
  const active = el.ownerDocument.activeElement as HTMLElement | null;
  if (!active || !active.isContentEditable) return false;
  return active === el || el.contains(active) || active.contains(el);
}

/** Arms `el` as the only draggable element in the document, or nothing.
 *
 * `contenteditable` and `draggable` on one element is the classic conflict —
 * the browser cannot tell "select these words" from "pick this up", and
 * picking up always wins — so an element being edited is never armed. */
export function armDragSource(doc: Document, el: HTMLElement | null, force = false) {
  doc.querySelectorAll<HTMLElement>('[draggable="true"]').forEach((n) => {
    if (n !== el) n.draggable = false;
  });
  // `force` is for a row taken hold of at its own edge, where the caret is in
  // an ancestor rather than in the grip itself — see attachGripArming.
  if (el && (force || !beingEdited(el))) el.draggable = true;
}

/** Arms whatever the pointer is over, when it is over that thing's grip. */
/**
 * Escape abandons a drag, and the pointer near a page edge scrolls the canvas.
 *
 * Without the first, a drag begun by accident could only be ended by dropping
 * it somewhere — so a mistake had to be made before it could be undone. HTML5
 * drag has no cancel of its own; clearing the plan means the drop does nothing.
 *
 * Without the second, moving a block more than one screen meant dropping it
 * halfway, scrolling, and picking it up again.
 */
/** The band of the document that is actually on screen, in the same
 * coordinates as a drag event's `clientY` inside the canvas. */
export type VisibleBand = { top: number; bottom: number } | null;

export function attachDragAssist(
  doc: Document,
  scroller: () => HTMLElement | null,
  cancel: () => void,
  /**
   * WHAT IS ON SCREEN, AND HOW FAR A SCROLL MOVES IT.
   *
   * Without this the edge test used `doc.defaultView.innerHeight` — the
   * height of the CANVAS, not of the window. The canvas is sized to the whole
   * document (that is what lets pages grow instead of clipping), so
   * `innerHeight` is the height of the entire book: sixty thousand pixels.
   * The test `clientY > innerHeight - 90` was therefore never true, so
   * dragging downwards never scrolled, and anything below the fold could not
   * be reached at all.
   *
   * Meanwhile the scroller it was given was the canvas document, which has no
   * overflow for the same reason — its scrollTop is always 0. Both halves of
   * the mechanism were pointed at the wrong element, which is the whole of
   * "I can move a block upwards but not downwards": upward targets were
   * already visible, downward ones were off-screen and unreachable.
   */
  visible: () => VisibleBand = () => null,
  /** Canvas px per outer px, so a scroll step is the distance it looks. */
  scale: () => number = () => 1,
): () => void {
  const EDGE = 90;        // px from the edge where scrolling starts
  const SPEED = 18;       // px per frame at the very edge
  let raf = 0;
  let dy = 0;

  const step = () => {
    const el = scroller();
    if (el && dy) el.scrollTop += dy * (scale() || 1);
    raf = dy ? requestAnimationFrame(step) : 0;
  };

  const onOver = (e: DragEvent) => {
    const band = visible();
    let top: number;
    let bottom: number;
    if (band) {
      top = band.top;
      bottom = band.bottom;
    } else {
      const view = doc.defaultView;
      if (!view) return;
      top = 0;
      bottom = view.innerHeight;
    }
    const fromTop = e.clientY - top;
    const fromBottom = bottom - e.clientY;
    dy = fromTop < EDGE ? -SPEED * (1 - Math.max(0, fromTop) / EDGE)
       : fromBottom < EDGE ? SPEED * (1 - Math.max(0, fromBottom) / EDGE)
       : 0;
    if (dy && !raf) raf = requestAnimationFrame(step);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    dy = 0;
    cancel();
    hideDropBar(doc);
  };

  const stop = () => { dy = 0; };

  doc.addEventListener("dragover", onOver);
  doc.addEventListener("keydown", onKey);
  doc.addEventListener("dragend", stop);
  doc.addEventListener("drop", stop);
  return () => {
    doc.removeEventListener("dragover", onOver);
    doc.removeEventListener("keydown", onKey);
    doc.removeEventListener("dragend", stop);
    doc.removeEventListener("drop", stop);
    if (raf) cancelAnimationFrame(raf);
  };
}

/** Abandons whatever drag is in flight — nothing moves. */
export function cancelDrag(doc: Document) {
  dragCancelled = true;
  hideDropBar(doc);
  doc.getElementById("__side_drop_indicator__")?.remove();
}

/** Set by `cancelDrag`, read by both drop handlers. */
let dragCancelled = false;

/** How much of a block's own edge is reserved for grabbing the block.
 *
 * Matches the padding the pipeline gives a panel in a column — 10px top and
 * bottom, 14px sides (see `.acol .fcard` in book/elements/figcard) — so the
 * reserved frame is the padding, and no row loses any of itself to it. */
export const BLOCK_FRAME = 10;

/** Is the pointer on the block's own frame rather than inside its contents? */
function onFrame(el: HTMLElement, e: MouseEvent, margin: number): boolean {
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return false;
  return e.clientX - r.left < margin
    || r.right - e.clientX < margin
    || e.clientY - r.top < margin
    || r.bottom - e.clientY < margin;
}

function onBlockFrame(block: HTMLElement, e: MouseEvent): boolean {
  return onFrame(block, e, BLOCK_FRAME);
}

/** A row's own grip. Narrower than a block's: a row is a line or two tall,
 *  and half of it must stay available for putting the caret in. */
const ROW_FRAME = 7;

export function attachGripArming(
  doc: Document,
  selectedBlock: () => HTMLElement | null = () => null,
): () => void {
  const onMove = (e: MouseEvent) => {
    const target = e.target as Element | null;
    const clear = () => {
      armDragSource(doc, null);
      doc.querySelectorAll(`.${ED.gripReady}`).forEach((n) => n.classList.remove(ED.gripReady));
    };
    if (!target) return clear();
    // THE BLOCK COMES FIRST. A row only wins once its own block is already
    // selected.
    //
    // Rows used to win outright, being the more specific thing under the
    // pointer. But every row of a सूत्र panel is a nested item, so pointing
    // anywhere at the panel's contents armed a formula LINE and dragging
    // moved that instead of the panel — leaving only the title strip as a way
    // to take hold of the box at all. The block is what a user reaches for
    // first; its rows are a second, deliberate step.
    const block = target.closest<HTMLElement>("[data-block-id]");
    const row = target.closest<HTMLElement>(`[${ITEM_ATTR}]`);
    const blockIsSelected = !!block && block === selectedBlock();
    // THE BLOCK'S OWN FRAME ALWAYS TAKES THE BLOCK.
    //
    // "Selected block hands the pointer to the row under it" left blocks made
    // ENTIRELY of rows with nowhere to grab. A सूत्र panel's heading bar is
    // not a row, so the head half of a clipped panel could always be picked
    // up by its title — but the continuation carries no heading, so every
    // pixel of it was a row and the box itself became unreachable once
    // selected.
    //
    // A margin inside the block's own edges is reserved for the block. It
    // costs the rows nothing: this is the container's padding, which is not
    // part of any row to begin with, and it gives every block a frame to take
    // hold of whatever it is made of.
    const el = blockIsSelected && row && !onBlockFrame(block, e)
      ? row : block ?? row;
    if (!el) return clear();
    // Never while it is being edited — that, and only that, is the conflict.
    // See beingEdited: the test is FOCUS, not the attribute.
    //
    // EXCEPT AT A ROW'S OWN EDGE, and without that exception rows could not
    // be moved at all. A row only becomes grabbable once its block is
    // selected (see above), and selecting a block whose text is edited
    // directly puts the caret INSIDE it — so by the time a row was eligible,
    // this test was always true and always cleared it. Every option in an
    // MCQ, every bullet, every formula line: markable, selectable, and
    // impossible to drag.
    //
    // The row's frame resolves it the same way the block's frame above does.
    // Its middle still belongs to the caret, so click-and-drag still selects
    // words; its edge is the grip. Arming is safe there because the drop
    // handler suspends the ancestor's contenteditable for the duration of
    // the gesture — see attachNestedItemReorder's mousedown.
    const rowGrip = el === row && onFrame(el, e, ROW_FRAME);
    if (beingEdited(el) && !rowGrip) return clear();

    // ANYWHERE on the element, not just at its left edge.
    //
    // The first version armed only a 20px gutter. It did stop text selection
    // fighting the drag engine, but it also turned starting a drag into
    // something you had to aim for, and dragging went from easy to fiddly.
    // That trade was never necessary: the conflict was `draggable` and
    // `contenteditable` on the SAME element at the SAME time, not dragging as
    // such. Arming the whole block while merely pointing at it, and disarming
    // it the moment it becomes editable, gets both.
    armDragSource(doc, el, rowGrip);
    doc.querySelectorAll(`.${ED.gripReady}`).forEach((n) => n.classList.remove(ED.gripReady));
    el.classList.add(ED.gripReady);
  };
  doc.addEventListener("mousemove", onMove);
  return () => doc.removeEventListener("mousemove", onMove);
}
