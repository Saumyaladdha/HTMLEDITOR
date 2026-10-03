/**
 * The decorator library, and the rules for placing a piece of it.
 *
 * `HTML_Automation/decorators/cropped/` has 130 pieces of art in six
 * categories and `book/decorators/policy.py` has a real policy for using
 * them — but nothing ever did. `slots.py` says so itself ("nothing calls this
 * in the default build"), `assets/manifest.json` does not exist, and every
 * reserved slot resolves to nothing. Choosing art for a page is a judgement
 * call, so the editor is the right place for it.
 *
 * TWO RULES GOVERN PLACEMENT, and both come from the pipeline.
 *
 * 1. A decorator NEVER enters the content flow.
 *
 *    `.page` is `width:1080px; height:1527px; overflow:hidden`. Anything
 *    inserted between two blocks pushes everything after it down, and
 *    whatever crosses the page boundary is CLIPPED — not moved to the next
 *    page, not reported, just gone. Pagination was measured in a headless
 *    browser and is not re-run when someone drops in a picture.
 *
 *    So a decorator is absolutely positioned inside the page (which is
 *    already `position:relative`). It cannot move a single line of text, and
 *    it can be dragged anywhere without consequence.
 *
 * 2. Density is inversely proportional to content density.
 *
 *    Quoting policy.py: in the reference book the 23 full Q&A pages carry
 *    ZERO doodles and ZERO characters. Art earns its place by making a
 *    deliberate piece of whitespace read as deliberate — not by filling
 *    every hole. `advisePlacement` reports whether a page has the room,
 *    using the same thresholds, so the editor can warn rather than forbid.
 */
import libraryJson from "./decoratorLibrary.json";
import { snapFree } from "./freeLayer";

export interface DecoratorItem {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  url: string;
  thumb: string;
  width: number;
  height: number;
  role: "character" | "doodle";
}

export interface DecoratorCategory {
  id: string;
  label: string;
  blurb: string;
  count: number;
}

interface DecoratorLibrary {
  version: number;
  categories: DecoratorCategory[];
  items: DecoratorItem[];
}

const LIB = libraryJson as unknown as DecoratorLibrary;

export const DECORATOR_CATEGORIES: DecoratorCategory[] = LIB.categories ?? [];
export const DECORATOR_ITEMS: DecoratorItem[] = (LIB.items ?? []) as DecoratorItem[];

/** Marks art the editor placed. Deliberately NOT in the `__ed-` namespace:
 * that prefix is stripped on save (see sanitize.ts), and a decorator is real
 * content that must survive into the exported chapter. */
export const DECOR_CLASS = "bookdecor";

/** Thresholds from book/decorators/policy.py, kept in step with it. */
export const MIN_SLACK_FOR_DOODLE = 260;
export const MIN_SLACK_FOR_CHARACTER = 520;
export const MAX_DOODLES_PER_PAGE = 2;
export const MAX_CHARACTERS_PER_PAGE = 1;

/** Ids so sanitize.ts can strip a guide that a crash left behind. */
export const GUIDE_X_ID = "__ed_guide_x__";
export const GUIDE_Y_ID = "__ed_guide_y__";

/**
 * The thin lines that show WHY a block just jumped.
 *
 * A snap without a guide feels like the editor fighting you; with one it
 * reads as the block lining up with the box beside it, which is what was
 * wanted.
 */
function showGuides(page: HTMLElement, x: number | null, y: number | null) {
  const line = (id: string, on: boolean, css: Partial<CSSStyleDeclaration>) => {
    let el = page.ownerDocument.getElementById(id) as HTMLElement | null;
    if (!on) { el?.remove(); return; }
    if (!el) {
      el = page.ownerDocument.createElement("div");
      el.id = id;
      el.style.cssText =
        "position:absolute;background:#3ec27f;z-index:9999;pointer-events:none;opacity:0.9";
      page.appendChild(el);
    }
    if (el.parentElement !== page) page.appendChild(el);
    Object.assign(el.style, css);
  };
  line(GUIDE_X_ID, x !== null, { left: `${x}px`, top: "0", width: "1px", height: "100%" });
  line(GUIDE_Y_ID, y !== null, { top: `${y}px`, left: "0", height: "1px", width: "100%" });
}

function clearGuides(page: HTMLElement) {
  const doc = page.ownerDocument;
  doc.getElementById(GUIDE_X_ID)?.remove();
  doc.getElementById(GUIDE_Y_ID)?.remove();
}

export function searchDecorators(query: string, category: string | null): DecoratorItem[] {
  const q = query.trim().toLowerCase();
  return DECORATOR_ITEMS.filter((it) => {
    if (category && it.category !== category) return false;
    if (!q) return true;
    // Match the readable name and the folder, so "exam" finds
    // `teacher-callouts/asked-in-exam` and "science" finds the whole shelf.
    return (
      it.name.toLowerCase().includes(q) ||
      it.id.toLowerCase().includes(q) ||
      it.categoryLabel.toLowerCase().includes(q)
    );
  });
}

/** Every decorator already on a page. */
export function decoratorsOn(page: HTMLElement): HTMLElement[] {
  return Array.from(page.querySelectorAll<HTMLElement>(`.${DECOR_CLASS}`));
}

export interface PlacementAdvice {
  /** Free vertical px below the last block on the page. */
  slackPx: number;
  /** Where a new decorator would land. */
  suggested: { left: number; top: number; width: number } | null;
  ok: boolean;
  /** Empty when ok; otherwise why this is a poor place for art. */
  warnings: string[];
}

/**
 * How much room this page really has, and where art would sit.
 *
 * Measured from the page's own blocks rather than assumed: the free space on
 * a Part-1 page is whatever is left under the last block, and on a two-column
 * Part-2 page it is under the shorter column. Both are found the same way,
 * by taking the lowest content bottom on the page.
 */
export function advisePlacement(
  page: HTMLElement,
  item: DecoratorItem,
): PlacementAdvice {
  const pageRect = page.getBoundingClientRect();
  // `defaultView` is null for any document not attached to a window — a
  // detached clone, a DOMParser result. The advice degrades to zero padding
  // rather than throwing, because failing to advise must never be what stops
  // someone placing a picture.
  const view = page.ownerDocument.defaultView;
  const cs = view ? view.getComputedStyle(page) : null;
  const px = (v: string | undefined) => (v ? parseFloat(v) || 0 : 0);
  const padTop = px(cs?.paddingTop);
  const padBottom = px(cs?.paddingBottom);
  const padLeft = px(cs?.paddingLeft);
  const padRight = px(cs?.paddingRight);

  let contentBottom = padTop;
  page.querySelectorAll<HTMLElement>("*").forEach((el) => {
    if (el.classList.contains(DECOR_CLASS)) return;   // ignore art already placed
    if (!el.textContent?.trim() && !el.querySelector("img")) return;
    const r = el.getBoundingClientRect();
    if (r.height === 0) return;
    contentBottom = Math.max(contentBottom, r.bottom - pageRect.top);
  });

  const usableW = pageRect.width - padLeft - padRight;
  const slack = Math.max(0, pageRect.height - padBottom - contentBottom);

  const warnings: string[] = [];
  const need = item.role === "character" ? MIN_SLACK_FOR_CHARACTER : MIN_SLACK_FOR_DOODLE;
  if (slack < need) {
    warnings.push(
      `This page has ${Math.round(slack)}px of free space; ${
        item.role === "character" ? "a character" : "a doodle"
      } wants at least ${need}px. It will still go in — nothing moves — but the page may look crowded.`,
    );
  }
  const existing = decoratorsOn(page);
  const chars = existing.filter((e) => e.dataset.decorRole === "character").length;
  const doodles = existing.length - chars;
  if (item.role === "character" && chars >= MAX_CHARACTERS_PER_PAGE) {
    warnings.push(`This page already has ${chars} character. One is the limit.`);
  }
  if (item.role === "doodle" && doodles >= MAX_DOODLES_PER_PAGE) {
    warnings.push(`This page already has ${doodles} doodles. Two is the limit.`);
  }

  // Art at its native size — these are already near display size (~200-260px)
  // — but never wider than the space it has to sit in.
  const width = Math.min(item.width, Math.round(usableW * 0.32));
  const height = Math.round((width / item.width) * item.height);
  const suggested =
    slack > 40
      ? {
          // Centred in the leftover strip, sitting just under the content
          // with a little breathing room.
          left: Math.round(padLeft + (usableW - width) / 2),
          top: Math.round(Math.min(contentBottom + 16, pageRect.height - padBottom - height)),
          width,
        }
      : null;

  return { slackPx: Math.round(slack), suggested, ok: warnings.length === 0, warnings };
}

/** Fetches a decorator and inlines it as a data URI.
 *
 * The chapter has to stay self-contained — the pipeline embeds every asset as
 * base64 for exactly that reason — so a placed decorator cannot be left
 * pointing at the editor's own `/decorators/...` URL, which would resolve to
 * nothing the moment the file is opened anywhere else. */
export async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load decorator (${res.status})`);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => resolve(fr.result as string);
    fr.readAsDataURL(blob);
  });
}

/** Puts a decorator on a page, out of the flow. Returns the placed element. */
export function placeDecorator(
  doc: Document,
  page: HTMLElement,
  item: DecoratorItem,
  dataUrl: string,
  at: { left: number; top: number; width: number },
): HTMLElement {
  const img = doc.createElement("img");
  img.className = DECOR_CLASS;
  img.src = dataUrl;
  img.alt = "";
  img.dataset.decorId = item.id;
  img.dataset.decorRole = item.role;
  // `position:absolute` is the whole safety story — see this module's header.
  // `height:auto` keeps the aspect ratio when the width is later dragged.
  img.style.cssText =
    `position:absolute;left:${at.left}px;top:${at.top}px;` +
    `width:${at.width}px;height:auto;z-index:3;`;
  page.appendChild(img);
  return img;
}

/**
 * Free-drag and resize for placed art.
 *
 * The editor's existing drag is REORDER drag: HTML5 drag-and-drop that moves
 * a block to a new position in the flow with `insertBefore`. That is exactly
 * wrong here — a decorator has no place in the flow, and reparenting it would
 * either do nothing visible or drop it into a block where it would push text
 * off the page. What it needs is the other kind of drag: change `left`/`top`,
 * touch nothing else.
 *
 * Pointer events rather than mouse events, so a pen or touch works too, and
 * `setPointerCapture` so a fast drag that outruns the cursor doesn't drop the
 * gesture. Movement is clamped to the page: art that wandered outside would
 * be invisible in print, since `.page` is `overflow:hidden`.
 */
export function enableDecoratorDragging(
  doc: Document,
  onCommit: () => void,
): () => void {
  const cleanups: (() => void)[] = [];

  // Placed art AND blocks lifted onto the page. Both are absolutely
  // positioned children of `.page` and want the same free x/y drag; only what
  // they contain differs.
  doc.querySelectorAll<HTMLElement>(`.${DECOR_CLASS}, .bookfree`).forEach((art) => {
    if (art.dataset.decorArmed === "1") return;   // already wired this pass
    art.dataset.decorArmed = "1";
    // A lifted block still has text to select and edit, so only its EDGE is a
    // drag handle — grabbing the middle of a paragraph should place a caret,
    // not move the block. Art has no text, so all of it drags.
    const isBlock = art.classList.contains("bookfree");
    art.style.cursor = isBlock ? "default" : "move";
    // Native image dragging would hijack the gesture and start an HTML5 drag.
    art.setAttribute("draggable", "false");

    const onDown = (e: PointerEvent) => {
      // Left button / primary contact only, and never while the user is
      // trying to select text elsewhere.
      if (e.button !== 0) return;
      const page = art.parentElement;
      if (!page) return;
      // A lifted block used to be draggable only within 14px of its edge —
      // "the frame, not the words" — which on a scaled-down canvas is a
      // target about eight screen pixels wide. That is the whole of "why am I
      // not able to move it comfortably": you were hunting for a hairline.
      //
      // It now drags from ANYWHERE on the block, and text editing still
      // works, because the two are told apart by MOVEMENT rather than by
      // where you pressed. Nothing is prevented on pointerdown; a click that
      // never travels stays a click and places the caret as before, and only
      // once the pointer has travelled past the threshold does the gesture
      // become a drag. (Art has no text, so it never needed the distinction.)
      if (!isBlock) e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;
      const left0 = parseFloat(art.style.left) || 0;
      const top0 = parseFloat(art.style.top) || 0;
      const pageRect = page.getBoundingClientRect();
      const artRect = art.getBoundingClientRect();
      // The page is rendered inside a scaled iframe; a pointer delta measured
      // on screen must be divided by that scale to become a document delta,
      // or the art moves faster than the cursor.
      const scale = pageRect.width / page.offsetWidth || 1;
      let moved = false;

      // Past this, the gesture is a drag rather than a click. Higher for a
      // block than for art: a block carries text, and a few pixels of tremor
      // while clicking into a word must not drag the box out from under it.
      const THRESHOLD = isBlock ? 4 : 2;

      const onMove = (ev: PointerEvent) => {
        const dx = (ev.clientX - startX) / scale;
        const dy = (ev.clientY - startY) / scale;
        if (!moved && Math.abs(dx) + Math.abs(dy) < THRESHOLD) return;
        if (!moved) {
          moved = true;
          // Only now is it a drag: kill the text selection the press started
          // and take the pointer, so the block follows the cursor instead of
          // sweeping a highlight across the page.
          if (isBlock) {
            ev.preventDefault();
            art.ownerDocument.getSelection()?.removeAllRanges();
            art.setPointerCapture?.(e.pointerId);
          }
        }
        const maxLeft = page.offsetWidth - artRect.width / scale;
        const maxTop = page.offsetHeight - artRect.height / scale;
        let left = Math.min(Math.max(left0 + dx, 0), Math.max(maxLeft, 0));
        let top = Math.min(Math.max(top0 + dy, 0), Math.max(maxTop, 0));
        // Edges snap to the neighbours' edges, unless Alt is held — the usual
        // escape hatch for placing something deliberately off-grid.
        if (isBlock && !ev.altKey) {
          const snapped = snapFree(art, page, left, top);
          left = snapped.left;
          top = snapped.top;
          showGuides(page, snapped.guideX, snapped.guideY);
        }
        art.style.left = `${Math.round(left)}px`;
        art.style.top = `${Math.round(top)}px`;
      };

      const onUp = () => {
        clearGuides(page);
        art.releasePointerCapture?.(e.pointerId);
        art.removeEventListener("pointermove", onMove);
        art.removeEventListener("pointerup", onUp);
        art.removeEventListener("pointercancel", onUp);
        // One undo checkpoint per gesture, not per pixel — dozens of
        // intermediate commits would make a single Ctrl+Z undo only the last
        // few pixels of a drag.
        if (moved) onCommit();
      };

      if (!isBlock) art.setPointerCapture?.(e.pointerId);
      art.addEventListener("pointermove", onMove);
      art.addEventListener("pointerup", onUp);
      art.addEventListener("pointercancel", onUp);
    };

    art.addEventListener("pointerdown", onDown);
    cleanups.push(() => {
      art.removeEventListener("pointerdown", onDown);
      delete art.dataset.decorArmed;
    });
  });

  return () => cleanups.forEach((fn) => fn());
}

/** Scales a placed decorator about its top-left. Width alone is enough —
 * `height:auto` keeps the ratio (see placeDecorator). */
export function resizeDecorator(art: HTMLElement, widthPx: number) {
  art.style.width = `${Math.max(16, Math.round(widthPx))}px`;
  art.style.height = "auto";
}

/** A width that makes art fit the free space left on its page.
 *
 * "Make it fit" is the request behind most manual resizing, and doing it by
 * eye on a scaled canvas is guesswork. This measures the same slack
 * `advisePlacement` does — the room under the page's real content — and
 * returns the width at which the art's own aspect ratio fills it, capped so a
 * tall picture cannot grow wider than the page.
 *
 * Returns null when the page has no usable room, so the caller can leave the
 * art alone rather than shrink it to nothing.
 */
export function fitWidthFor(page: HTMLElement, art: HTMLElement): number | null {
  const rect = art.getBoundingClientRect();
  const ratio = rect.width && rect.height ? rect.width / rect.height : 1;
  const view = page.ownerDocument.defaultView;
  const cs = view ? view.getComputedStyle(page) : null;
  const px = (v: string | undefined) => (v ? parseFloat(v) || 0 : 0);
  const padLeft = px(cs?.paddingLeft);
  const padRight = px(cs?.paddingRight);
  const padBottom = px(cs?.paddingBottom);

  const pageRect = page.getBoundingClientRect();
  const scale = pageRect.width / page.offsetWidth || 1;

  let contentBottom = 0;
  page.querySelectorAll<HTMLElement>("*").forEach((el) => {
    if (el === art || el.classList.contains(DECOR_CLASS)) return;
    if (!el.textContent?.trim() && !el.querySelector("img")) return;
    const r = el.getBoundingClientRect();
    if (r.height === 0) return;
    contentBottom = Math.max(contentBottom, (r.bottom - pageRect.top) / scale);
  });

  const freeH = page.offsetHeight - padBottom - contentBottom - 16;
  const freeW = page.offsetWidth - padLeft - padRight;
  if (freeH < 40) return null;
  return Math.round(Math.min(freeH * ratio, freeW));
}
