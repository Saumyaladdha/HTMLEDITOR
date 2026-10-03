/**
 * Lifting a block out of the text flow so it can be placed by hand.
 *
 * Everything in a chapter is flow content: a block takes the full column width
 * and the next one goes underneath it. That is right for a book, and wrong for
 * the moment you want a small note in the gap beside a short paragraph. There
 * was exactly one freely-placed thing in the editor — art — and the difference
 * between how art feels and how everything else feels is entirely this.
 *
 * A lifted block becomes `position:absolute` inside its page (`.page` is
 * already `position:relative`), so:
 *
 *   - it occupies no space in the flow, and the text closes up behind it
 *   - it can be dragged and resized like art
 *   - it CAN overlap other content, which is flagged rather than forbidden —
 *     deliberate overlap is sometimes the point, and a rule that prevents it
 *     would also prevent the layouts this exists for
 *
 * It is lifted AT ITS CURRENT POSITION, not dropped in a corner: the block
 * should not jump the moment you free it, or you lose your place on the page.
 *
 * Going back is exact. A hidden marker is left where the block was, so
 * "return to the flow" puts it back between the same two neighbours rather
 * than at the end.
 */

export const FREE_CLASS = "bookfree";
const HOME_CLASS = "bookfree-home";

/** Narrowest a lifted block may be dragged. Below this a paragraph sets one
 * word per line — the same reason the paired-block floor exists. */
export const MIN_FREE_WIDTH = 120;

export function isFree(el: Element | null): boolean {
  return !!el?.classList.contains(FREE_CLASS);
}

/** The page an element sits on, if any. */
export function pageOf(el: Element): HTMLElement | null {
  return el.closest<HTMLElement>(".page");
}

/**
 * Lifts `block` onto its page at exactly the spot it currently occupies.
 *
 * Returns false when there is nowhere to lift it to — a flow document with no
 * `.page`, or a block already lifted.
 */
export function liftToPage(doc: Document, block: HTMLElement): boolean {
  if (isFree(block)) return false;
  const page = pageOf(block);
  if (!page) return false;

  const pageRect = page.getBoundingClientRect();
  const rect = block.getBoundingClientRect();
  // The page is rendered inside a scaled iframe, so on-screen pixels are not
  // page pixels. Everything written below is in the page's own units.
  const scale = pageRect.width / page.offsetWidth || 1;

  const home = doc.createElement("span");
  home.className = HOME_CLASS;
  block.replaceWith(home);

  block.classList.add(FREE_CLASS);
  block.style.position = "absolute";
  block.style.left = `${Math.round((rect.left - pageRect.left) / scale)}px`;
  block.style.top = `${Math.round((rect.top - pageRect.top) / scale)}px`;
  block.style.width = `${Math.round(rect.width / scale)}px`;
  // Its own margins would offset it from the coordinates just measured.
  block.style.margin = "0";
  page.appendChild(block);
  // Lifting a block out of a pair leaves the pair with one child, still
  // claiming half the line. The home marker stays where it is, so returning
  // the block later still puts it back in the right place.
  const row = home.parentElement;
  if (row?.classList.contains("sxs") && row.children.length < 2 && row.parentElement) {
    while (row.firstChild) row.parentElement.insertBefore(row.firstChild, row);
    row.parentElement.removeChild(row);
  }
  return true;
}

/** Puts a lifted block back where it came from. */
export function returnToFlow(block: HTMLElement): boolean {
  if (!isFree(block)) return false;
  const page = pageOf(block);
  const home = page?.querySelector<HTMLElement>(`.${HOME_CLASS}`);

  block.classList.remove(FREE_CLASS);
  for (const prop of ["position", "left", "top", "width", "height", "margin", "zIndex"]) {
    block.style.removeProperty(prop.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()));
  }
  if (home?.parentElement) {
    home.replaceWith(block);
  }
  return true;
}

/** Moves a lifted block, clamped inside its page.
 *
 * A page is `overflow:hidden`, so a block dragged past the edge does not hang
 * over it — it is cut off and simply disappears. */
export function moveFree(block: HTMLElement, dx: number, dy: number): boolean {
  if (!isFree(block)) return false;
  const page = pageOf(block);
  if (!page) return false;
  const { w, h } = freeSize(block, page);
  const left = (parseFloat(block.style.left) || 0) + dx;
  const top = (parseFloat(block.style.top) || 0) + dy;
  block.style.left = `${Math.round(clamp(left, page.offsetWidth - w))}px`;
  block.style.top = `${Math.round(clamp(top, page.offsetHeight - h))}px`;
  return true;
}

function clamp(v: number, max: number): number {
  return Math.min(Math.max(v, 0), Math.max(max, 0));
}

/**
 * A lifted block's size in PAGE pixels.
 *
 * The canvas is a scaled iframe, so `getBoundingClientRect` returns screen
 * pixels while `left`/`top`/`offsetWidth` are page pixels. `moveFree` clamped
 * a screen-pixel width against a page-pixel page width — the height was
 * divided by the scale, the width was not — so on a zoomed-out canvas the
 * right-hand limit came out too generous and a block dragged rightwards ran
 * off the edge. `.page` is `overflow:hidden`, so it was simply cut in half.
 */
export function freeSize(block: HTMLElement, page: HTMLElement) {
  const scale = page.getBoundingClientRect().width / page.offsetWidth || 1;
  const rect = block.getBoundingClientRect();
  return {
    scale,
    w: parseFloat(block.style.width) || rect.width / scale,
    h: rect.height / scale,
  };
}

/** How close an edge has to come before it snaps to a neighbour's. */
export const SNAP_PX = 7;

export interface Snapped {
  left: number;
  top: number;
  /** Page-x of the vertical guide that matched, if one did. */
  guideX: number | null;
  /** Page-y of the horizontal guide that matched, if one did. */
  guideY: number | null;
}

/**
 * Pull a dragged block's edges onto its neighbours' edges.
 *
 * "I want to place it beside the सूत्र box" is an alignment task, and by hand
 * on a scaled canvas it is a pixel hunt: the block lands two pixels below the
 * box it should line up with, which reads as sloppy rather than placed. Every
 * other block's edges — and the page's own content margins — become magnets,
 * so dropping something roughly beside a box lands it exactly beside it.
 *
 * Both of the moving block's own edges are candidates, so it snaps whether
 * you are lining up its left with a box's left or its right with a box's
 * right.
 */
export function snapFree(block: HTMLElement, page: HTMLElement, left: number, top: number): Snapped {
  const { w, h, scale } = freeSize(block, page);
  const pageRect = page.getBoundingClientRect();
  const xs: number[] = [];
  const ys: number[] = [];

  for (const other of Array.from(page.querySelectorAll<HTMLElement>("[data-block-id]"))) {
    if (other === block || block.contains(other) || other.contains(block)) continue;
    const r = other.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    xs.push((r.left - pageRect.left) / scale, (r.right - pageRect.left) / scale);
    ys.push((r.top - pageRect.top) / scale, (r.bottom - pageRect.top) / scale);
  }

  const best = (edges: number[], size: number, v: number) => {
    let out = { v, guide: null as number | null, d: SNAP_PX + 1 };
    for (const e of edges) {
      // Leading edge onto the candidate, then trailing edge onto it.
      for (const [cand, guide] of [[e, e], [e - size, e]] as const) {
        const d = Math.abs(cand - v);
        if (d < out.d) out = { v: cand, guide, d };
      }
    }
    return out;
  };

  const x = best(xs, w, left);
  const y = best(ys, h, top);
  return {
    left: clamp(x.v, page.offsetWidth - w),
    top: clamp(y.v, page.offsetHeight - h),
    guideX: x.guide,
    guideY: y.guide,
  };
}

/** Resizes a lifted block by width; height follows its content. */
export function resizeFree(block: HTMLElement, widthPx: number): boolean {
  if (!isFree(block)) return false;
  block.style.width = `${Math.max(MIN_FREE_WIDTH, Math.round(widthPx))}px`;
  return true;
}

/**
 * Flow blocks a lifted block is sitting on top of.
 *
 * Reported rather than prevented. The editor warns so that "free" never
 * quietly means "broken in print", but a deliberate overlap — a note tucked
 * over a wide margin, a label on a diagram — is a legitimate thing to want.
 */
export function overlappingFlow(block: HTMLElement): HTMLElement[] {
  const page = pageOf(block);
  if (!page || !isFree(block)) return [];
  const r = block.getBoundingClientRect();
  const hits: HTMLElement[] = [];
  page.querySelectorAll<HTMLElement>(".flowwrap > *, .acol > *").forEach((other) => {
    if (other === block || other.contains(block) || isFree(other)) return;
    const o = other.getBoundingClientRect();
    if (o.width === 0 || o.height === 0) return;
    const overlapW = Math.min(r.right, o.right) - Math.max(r.left, o.left);
    const overlapH = Math.min(r.bottom, o.bottom) - Math.max(r.top, o.top);
    // A few pixels of touching is not an overlap worth reporting; a real one
    // covers a meaningful part of the other block.
    if (overlapW > 8 && overlapH > 8) hits.push(other);
  });
  return hits;
}

/** Every lifted block on a page, for reporting and for re-arming drag. */
export function freeBlocksOn(page: HTMLElement): HTMLElement[] {
  return Array.from(page.querySelectorAll<HTMLElement>(`.${FREE_CLASS}`));
}

/* ------------------------------------------------------------------ *
 * Where a page is ACTUALLY empty.
 *
 * Free space used to be "everything below the last block", measured from
 * element boxes. Every block in a chapter spans the full 944px column, so a
 * page whose lines stop after 200px reported ZERO space while plainly having
 * most of its width free — which is what made the editor insist there was
 * nowhere to put anything.
 *
 * What matters is where the INK is, not where the boxes are. A text node's
 * real extent comes from its line boxes (`Range.getClientRects`), which end
 * where the words end rather than where the column does.
 * ------------------------------------------------------------------ */

/** Page-space rectangle. */
export interface Region { left: number; top: number; width: number; height: number }

/** Resolution of the occupancy scan. Small enough to find a usable gap, coarse
 * enough that a whole page is a few thousand cells rather than a million. */
const CELL = 16;

/** Every rectangle the page's content actually paints, in page coordinates. */
function inkRects(page: HTMLElement): Region[] {
  const pr = page.getBoundingClientRect();
  const scale = pr.width / page.offsetWidth || 1;
  const out: Region[] = [];
  const push = (r: DOMRect) => {
    if (r.width <= 0 || r.height <= 0) return;
    out.push({
      left: (r.left - pr.left) / scale,
      top: (r.top - pr.top) / scale,
      width: r.width / scale,
      height: r.height / scale,
    });
  };

  page.querySelectorAll<HTMLElement>(".flowwrap > *, .acol > *, .stickycol, .bookfree, .bookdecor")
    .forEach((el) => {
      const style = el.ownerDocument.defaultView?.getComputedStyle(el);
      // A box that paints a border or a background occupies its whole extent —
      // a bordered card is "full" even where its text stops early.
      const paints =
        !!style &&
        ((style.backgroundColor && !/rgba\(0,\s*0,\s*0,\s*0\)/.test(style.backgroundColor) &&
          style.backgroundColor !== "transparent") ||
          parseFloat(style.borderTopWidth || "0") > 0);
      if (paints || el.querySelector("img")) {
        push(el.getBoundingClientRect());
        return;
      }
      // Plain text: the line boxes, which stop where the words do.
      // `Range.getClientRects` is what makes this ink-based rather than
      // box-based — it returns the line boxes, which stop where the words do.
      // Not every environment implements it, and a missing method here would
      // take down the whole panel, so the element's own box is the fallback.
      const range = el.ownerDocument.createRange();
      range.selectNodeContents(el);
      const rects =
        typeof range.getClientRects === "function" ? range.getClientRects() : null;
      if (!rects || rects.length === 0) {
        push(el.getBoundingClientRect());
        return;
      }
      for (let i = 0; i < rects.length; i++) push(rects[i]);
    });
  return out;
}

/**
 * The largest genuinely empty rectangles on a page, biggest first.
 *
 * Occupancy is rasterised and then the largest empty rectangle is taken
 * repeatedly, marking each one used, so the results do not all describe the
 * same piece of whitespace.
 */
export function freeRegions(
  page: HTMLElement,
  minWidth = 160,
  minHeight = 60,
  limit = 4,
): Region[] {
  const view = page.ownerDocument.defaultView;
  const cs = view ? view.getComputedStyle(page) : null;
  const px = (v: string | undefined) => (v ? parseFloat(v) || 0 : 0);
  const padL = px(cs?.paddingLeft), padR = px(cs?.paddingRight);
  const padT = px(cs?.paddingTop), padB = px(cs?.paddingBottom);

  const x0 = padL, y0 = padT;
  const W = page.offsetWidth - padL - padR;
  const H = page.offsetHeight - padT - padB;
  if (W <= 0 || H <= 0) return [];

  const cols = Math.max(1, Math.floor(W / CELL));
  const rows = Math.max(1, Math.floor(H / CELL));
  const used: boolean[][] = Array.from({ length: rows }, () => new Array(cols).fill(false));

  for (const r of inkRects(page)) {
    const c1 = Math.max(0, Math.floor((r.left - x0) / CELL));
    const c2 = Math.min(cols - 1, Math.ceil((r.left + r.width - x0) / CELL) - 1);
    const r1 = Math.max(0, Math.floor((r.top - y0) / CELL));
    const r2 = Math.min(rows - 1, Math.ceil((r.top + r.height - y0) / CELL) - 1);
    for (let y = r1; y <= r2; y++) for (let x = c1; x <= c2; x++) used[y][x] = true;
  }

  const found: Region[] = [];
  for (let n = 0; n < limit; n++) {
    const rect = largestEmpty(used, cols, rows);
    if (!rect) break;
    const region: Region = {
      left: Math.round(x0 + rect.x * CELL),
      top: Math.round(y0 + rect.y * CELL),
      width: Math.round(rect.w * CELL),
      height: Math.round(rect.h * CELL),
    };
    if (region.width < minWidth || region.height < minHeight) break;
    found.push(region);
    for (let y = rect.y; y < rect.y + rect.h; y++)
      for (let x = rect.x; x < rect.x + rect.w; x++) used[y][x] = true;
  }
  return found;
}

/** Largest all-empty rectangle in the grid — the classic
 * largest-rectangle-in-a-histogram scan, run row by row. */
function largestEmpty(used: boolean[][], cols: number, rows: number) {
  const heights = new Array(cols).fill(0);
  let best: { x: number; y: number; w: number; h: number } | null = null;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) heights[x] = used[y][x] ? 0 : heights[x] + 1;

    const stack: number[] = [];
    for (let x = 0; x <= cols; x++) {
      const h = x === cols ? 0 : heights[x];
      while (stack.length && heights[stack[stack.length - 1]] >= h) {
        const height = heights[stack.pop()!];
        const left = stack.length ? stack[stack.length - 1] + 1 : 0;
        const area = height * (x - left);
        if (height > 0 && (!best || area > best.w * best.h)) {
          best = { x: left, y: y - height + 1, w: x - left, h: height };
        }
      }
      stack.push(x);
    }
  }
  return best;
}

/** The best free spot for something of this size, or null. */
export function bestFreeSpot(page: HTMLElement, width: number, height: number): Region | null {
  return freeRegions(page, width, height, 6)[0] ?? null;
}


/** The narrowest a newly placed block may be, in page px.
 *
 * A fresh block is usually empty — placeholder ghost text and nothing else —
 * so its natural width can collapse to a few characters. At that size it is
 * neither visible on a 1080px sheet nor a target you can aim a mouse at.
 * A column is 449.5px; half of one is a box you can see and grab. */
export const MIN_PLACED_WIDTH = 220;

/**
 * Puts a freshly inserted block on the page as a FLOATING box.
 *
 * Inserting into the flow is correct for the document and wrong for the
 * moment of insertion: every block below the insertion point shifts down, the
 * page reflows, and the thing you just added is somewhere off the bottom of
 * what you were looking at. What is wanted instead is what placing a picture
 * already does — the new box appears ON the page you are reading, over the
 * top of it, and you drag it where it belongs before it joins the text.
 *
 * So the block is lifted straight out of the flow (leaving the tiny home
 * marker, so the page does not move) and dropped into the largest piece of
 * genuinely empty space on that page — measured from the INK, not from
 * element boxes, since every block spans its whole column and a box-based
 * measure reports no space on a page whose lines all stop early.
 *
 * With no empty space to be had it still floats, near the top of the page,
 * overlapping the text. That is deliberate: overlapping and visible beats
 * tucked away and lost.
 */
export function placeFreshlyInserted(doc: Document, block: HTMLElement): boolean {
  const page = pageOf(block);
  if (!page || !liftToPage(doc, block)) return false;

  const width = Math.max(
    MIN_PLACED_WIDTH, Math.round(parseFloat(block.style.width) || 0));
  block.style.width = `${width}px`;
  const height = Math.max(48, Math.round(block.offsetHeight || 48));

  const spot = bestFreeSpot(page, width, height);
  if (spot) {
    block.style.left = `${Math.round(spot.left)}px`;
    block.style.top = `${Math.round(spot.top)}px`;
  } else {
    // Nowhere empty. Sit it over the content rather than hiding it.
    block.style.left = `${Math.round((page.offsetWidth - width) / 2)}px`;
    block.style.top = "120px";
  }
  return true;
}
