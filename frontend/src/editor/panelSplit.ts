/**
 * CLIPPING A LIST-SHAPED BLOCK IN TWO.
 *
 * A सूत्र panel is a list of formulas. So is a bullet list, and so is a set
 * of options. The build pipeline has always known this — `book/layout/split.py`
 * breaks one across a column boundary to use the dead space in front of it,
 * and `book/assemble/render.rebuild_split` rebuilds each half from a subset
 * of the rows.
 *
 * The EDITOR knew none of it. A panel was one atomic block: you could style
 * it, move it and delete it, but there was no way to say "these two formulas
 * stay here and the rest go down there". So when a panel sat at the top of a
 * column with several hundred pixels empty above it, the only options were to
 * move the whole panel or leave the hole — which is exactly the complaint
 * that the space cannot be used.
 *
 * This is that operation, by hand: choose a row to cut after, and the block
 * becomes two blocks that can then be moved independently.
 *
 * The halves are built to match what the pipeline produces, so a clipped
 * document rebuilds identically:
 *
 *   - the SECOND half of a सूत्र panel carries no heading and gets
 *     `fcard-cont` (two full headings cost about what the split reclaims);
 *   - `fcard-wide` is recomputed per half from its own row count, because it
 *     is a function of how many rows there are (WIDE_ROWS = 5 in
 *     `book/components/math.py`), not a property of the original;
 *   - a split option list is forced to one-per-line, since a two-column grid
 *     broken across a boundary leaves an option beside a gap and reads as a
 *     missing choice.
 */

import { insertLineAfter, lineOf, removeLine } from "./lineUnits";

/** How the pipeline decides a सूत्र card is wide enough for two columns —
 * `WIDE_ROWS` in book/components/math.py. Kept in step deliberately: a half
 * that keeps a class its row count no longer justifies lays out wrongly. */
export const WIDE_ROWS = 5;

export type PanelKind = "fcard" | "bullets" | "options" | "rows";

/** A block's own shape, for grouping its children by kind. */
function signature(el: Element): string {
  return el.tagName + "|" + Array.from(el.classList).sort().join(".");
}

/**
 * Is this block simply a stack of repeated rows?
 *
 * The three kinds above are named because each needs something done to its
 * halves — a heading dropped, a width class recomputed, a grid forced to one
 * column. Most boxes need none of that and were excluded for no better
 * reason than not being on the list: a reading-order card's steps, a `.trio`
 * fact strip, a callout's lines, a stat-tile row, a numbered procedure. Every
 * one is a list of rows sitting in a column that may not have space for all
 * of them, and every one could only be moved whole.
 *
 * Two children of the same shape is the same test the drag layer uses to
 * decide what may be picked up, so anything you can already grab a row of,
 * you can now cut between.
 */
/** Tags that are runs of text inside a line, never a row of their own. */
const INLINE_TAGS = new Set([
  "SPAN", "B", "I", "EM", "STRONG", "A", "CODE", "SUP", "SUB", "SMALL",
  "U", "S", "ABBR", "BR", "IMG", "LABEL", "CITE", "Q", "MARK", "TIME", "VAR",
]);

function repeatedRows(el: HTMLElement): HTMLElement[] {
  const kids = Array.from(el.children).filter(
    (c): c is HTMLElement => c instanceof HTMLElement,
  );
  if (kids.length < 2) return [];
  // A CUT MUST FALL BETWEEN LINES, NOT INSIDE ONE. A question paragraph is
  // `<p class="q">` holding a `<b>` and several `<span class="m">` maths
  // runs, all alike — uniform by the test below, and cutting between two of
  // them would tear a sentence in half and leave the remainder as a
  // paragraph of its own. Tag rather than computed display, because this is
  // asked in jsdom and in the browser alike, and the answer must not depend
  // on which.
  if (kids.some((k) => INLINE_TAGS.has(k.tagName))) return [];
  const counts = new Map<string, number>();
  for (const k of kids) counts.set(signature(k), (counts.get(signature(k)) ?? 0) + 1);
  // Uniform, or near enough: every child alike, so a cut anywhere is between
  // two things of the same kind. A box of mixed parts (a heading, a body, a
  // footnote) has no meaningful seam and stays atomic.
  const top = Math.max(...counts.values());
  return top === kids.length ? kids : [];
}

/** The kind of splittable block this is, or null if it is atomic. */
export function panelKind(el: HTMLElement | null): PanelKind | null {
  if (!el) return null;
  if (el.classList.contains("fcard")) return "fcard";
  if (el.matches("ul.bl")) return "bullets";
  if (el.classList.contains("opts")) return "options";
  if (el.matches("ul, ol")) return "bullets";
  return repeatedRows(el).length >= 2 ? "rows" : null;
}

/** The rows of a splittable block, in order. Empty for anything else. */
export function panelRows(el: HTMLElement | null): HTMLElement[] {
  const kind = panelKind(el);
  if (!kind || !el) return [];
  if (kind === "fcard") {
    // TWO SHAPES, AGAIN. Part 2 sets each result in its own boxed `.frow`;
    // Part 1's crib sheet sets a flat bulleted `.formula-list` instead, one
    // `<li>` per formula (see `elements/formula-card/spec.json`). Asking only
    // for `.frow` returned nothing at all for the second shape, so a सूत्र
    // panel in Part 1 reported zero rows: no row list, no cut line, no way to
    // break a six-formula panel over a column boundary — the panel was atomic
    // again, which is exactly what clipping exists to undo.
    const rows = Array.from(el.querySelectorAll<HTMLElement>(":scope > .frow"));
    if (rows.length) return rows;
    return Array.from(el.querySelectorAll<HTMLElement>(":scope > .formula-list > li"));
  }
  if (kind === "bullets") {
    return Array.from(el.querySelectorAll<HTMLElement>(":scope > li"));
  }
  if (kind === "rows") return repeatedRows(el);
  return Array.from(el.children).filter(
    (c): c is HTMLElement => c instanceof HTMLElement,
  );
}

/** A short label for each row, for listing them in a panel. */
export function rowLabels(el: HTMLElement | null): string[] {
  return panelRows(el).map((r) => {
    // The boxed formula is the identifying part of a सूत्र row; its caption
    // and condition are description. For a bullet or an option the whole
    // text is all there is.
    const fx = r.querySelector<HTMLElement>(".fx") ?? r.querySelector<HTMLElement>(".formula-body");
    const text = ((fx ?? r).textContent ?? "").replace(/\s+/g, " ").trim();
    return text.length > 44 ? `${text.slice(0, 43)}…` : text || "(empty)";
  });
}

/** Can this block be cut after row `after` (0-based)?
 *
 * Both halves must keep at least one row, so a block of n rows has n-1
 * possible cuts. A one-row block cannot be cut at all.
 */
export function canClipAfter(el: HTMLElement | null, after: number): boolean {
  const rows = panelRows(el);
  return rows.length >= 2 && after >= 0 && after < rows.length - 1;
}

/** True if this block can be cut anywhere. */
export function canClip(el: HTMLElement | null): boolean {
  return panelRows(el).length >= 2;
}

function setWide(el: HTMLElement, rowCount: number) {
  el.classList.toggle("fcard-wide", rowCount >= WIDE_ROWS);
}

/**
 * Cuts `el` in two after row `after` (0-based), in place.
 *
 * Returns `[head, tail]`, or null if the cut is not legal. The tail is
 * inserted as the block's next sibling, so it lands immediately after the
 * head in the flow and can then be dragged wherever it is wanted.
 *
 * Neither half is given a `data-block-id`: `stampBlockIds` assigns ids to
 * anything lacking one, so both get fresh ones on the next pass and no two
 * blocks ever share an id.
 */
export function clipPanel(
  el: HTMLElement, after: number,
): [HTMLElement, HTMLElement] | null {
  const kind = panelKind(el);
  if (!kind || !canClipAfter(el, after)) return null;
  const rows = panelRows(el);
  const keep = rows.slice(0, after + 1);
  const move = rows.slice(after + 1);

  const tail = el.cloneNode(false) as HTMLElement;
  delete tail.dataset.blockId;
  // Editor state belongs to the block that was selected, not to a new one.
  tail.classList.remove("__ed-block", "__ed-multiselect", "__ed-fresh");

  if (kind === "fcard") {
    // No repeated heading on the continuation — see the note above.
    tail.classList.add("fcard-cont");
    setWide(tail, move.length);
    setWide(el, keep.length);
  } else if (kind === "options") {
    tail.classList.add("one");
    el.classList.add("one");
  }

  // THE ROWS KEEP THEIR OWN WRAPPER. A `.frow` hangs directly off the panel,
  // but a bulleted सूत्र list is `.fcard > ul.formula-list > li` — appending
  // those `<li>`s straight into the shallow-cloned `.fcard` would leave them
  // outside any list, unstyled and unbulleted. Rebuilding the one level
  // between the panel and its rows costs nothing and is correct for both.
  const rowParent = rows[0].parentElement as HTMLElement;
  let dest = tail;
  if (rowParent && rowParent !== el) {
    const wrap = rowParent.cloneNode(false) as HTMLElement;
    delete wrap.dataset.blockId;
    tail.appendChild(wrap);
    dest = wrap;
  }
  move.forEach((r) => dest.appendChild(r));
  insertLineAfter(el, tail);
  return [el, tail];
}


/**
 * Puts a clipped pair back together: `tail` is absorbed into `head`.
 *
 * The inverse of `clipPanel`, so a cut in the wrong place can be corrected
 * without an undo — and so that two halves dragged back together do not stay
 * two blocks with a stray `fcard-cont` between them.
 */
export function unclipPanel(head: HTMLElement, tail: HTMLElement): boolean {
  const kind = panelKind(head);
  if (!kind || panelKind(tail) !== kind) return false;
  const rows = panelRows(tail);
  if (!rows.length) return false;
  // Back into the head's own row wrapper, for the same reason clipPanel
  // creates one: a bulleted list's `<li>`s belong in a `<ul>`, not loose in
  // the panel.
  const headRows = panelRows(head);
  const dest = (headRows[0]?.parentElement as HTMLElement | null) ?? head;
  rows.forEach((r) => dest.appendChild(r));
  if (kind === "fcard") setWide(head, panelRows(head).length);
  // The tail's own wrapper goes with it. Left behind, an empty `.u` still
  // occupies a line and still carries its margin guard, so joining two halves
  // would leave a blank gap exactly where the seam had been.
  removeLine(tail);
  return true;
}

/** Every line in the document, in content order.
 *
 * A `.u` guard per block, across every column of every page —
 * `querySelectorAll` returns document order, and for these layouts document
 * order IS content order (page 1 column 0, page 1 column 1, page 2 …).
 */
function allLines(doc: Document): HTMLElement[] {
  // EVERY direct child of a line container, wrapped or not. Selecting only
  // `.u` assumed the document was uniform, and it need not be: a block the
  // editor inserted, or a hand-edited chapter, can sit in a column without a
  // guard beside blocks that have one. Anything that misses a line shifts
  // every index after it and the partner search silently finds nothing.
  return Array.from(doc.querySelectorAll<HTMLElement>(
    ".flowwrap > *, .acol > *, .page__cols > *, .page__full > *"));
}

function blockOfLine(line: HTMLElement): HTMLElement | null {
  return line.classList.contains("u")
    ? (line.firstElementChild as HTMLElement | null)
    : line;
}

/**
 * The two halves of a clipped panel, given either one of them.
 *
 * ACROSS A BOUNDARY, and in BOTH directions — the two things the first
 * version could not do, and both of them are the normal case:
 *
 *  - The build pipeline splits a panel precisely IN ORDER to cross a column
 *    or page boundary, so the head is usually the last line of one column and
 *    the continuation the first line of the next. Looking only at
 *    `nextElementSibling` found nothing at all for exactly the splits the
 *    automation made, which are the ones a reader is most likely to want
 *    joined back up.
 *  - The join was offered only when the HEAD was selected. Selecting the
 *    continuation — the more natural thing to click when you are looking at
 *    the piece you want moved — offered nothing, with no hint that selecting
 *    the other half would.
 *
 * A `fcard` pair must consist of a head and a `fcard-cont`: two panels that
 * each carry their own heading are two panels the author wrote, and joining
 * them would silently delete a heading.
 */
export function clippedPartner(
  el: HTMLElement | null,
): { head: HTMLElement; tail: HTMLElement } | null {
  const kind = panelKind(el);
  if (!kind || !el) return null;
  const doc = el.ownerDocument;
  const lines = allLines(doc);
  const line = lineOf(el);
  const at = lines.indexOf(line);
  if (at < 0) return null;

  const isCont = (c: HTMLElement | null) =>
    !!c && panelKind(c) === kind
    && (kind !== "fcard" || c.classList.contains("fcard-cont"));
  const isHead = (c: HTMLElement | null) =>
    !!c && panelKind(c) === kind
    && (kind !== "fcard" || !c.classList.contains("fcard-cont"));

  // Am I the head, with a continuation on the next line?
  if (isHead(el)) {
    const next = at + 1 < lines.length ? blockOfLine(lines[at + 1]) : null;
    if (isCont(next)) return { head: el, tail: next! };
  }
  // Or am I the continuation, with a head on the line before?
  if (isCont(el)) {
    const prev = at > 0 ? blockOfLine(lines[at - 1]) : null;
    if (isHead(prev)) return { head: prev!, tail: el };
  }
  return null;
}

/** Kept for the head-side call sites: the continuation belonging to `el`. */
export function clippedTailOf(el: HTMLElement | null): HTMLElement | null {
  const pair = clippedPartner(el);
  return pair && pair.head === el ? pair.tail : null;
}


/**
 * TAKES ONE ROW OUT AS A BLOCK OF ITS OWN.
 *
 * `clipPanel` divides a panel in two, which is right when the top half stays
 * and the bottom half travels. It is the wrong tool for "this one formula
 * belongs somewhere else": that needs two cuts, and the row you wanted ends
 * up in the middle of whichever half it fell into.
 *
 * Dragging the row itself is the other option and it is genuinely awkward. A
 * row is a nested item inside a block, so it can be reordered within its own
 * panel but has nowhere to go outside it — and it is a small target holding a
 * formula, a caption and sometimes a शर्त condition, any of which can take
 * the click instead.
 *
 * So: one call lifts the row into its own single-row panel, on the line
 * straight after this one, and from then on it is an ordinary block that
 * drags like any other. The rows left behind keep their order.
 *
 * Returns the new block, or null if the row is not in this panel or is the
 * only one in it (a panel of one row extracted is the panel it came from).
 */
export function extractRow(el: HTMLElement, row: HTMLElement): HTMLElement | null {
  const kind = panelKind(el);
  if (!kind) return null;
  const rows = panelRows(el);
  if (rows.length < 2 || !rows.includes(row)) return null;

  const solo = el.cloneNode(false) as HTMLElement;
  delete solo.dataset.blockId;
  solo.classList.remove("__ed-block", "__ed-multiselect", "__ed-fresh");
  if (kind === "fcard") {
    // No repeated heading — one formula does not need telling it is a सूत्र
    // when the panel above it just said so.
    solo.classList.add("fcard-cont");
    setWide(solo, 1);
  } else if (kind === "options") {
    solo.classList.add("one");
  }
  solo.appendChild(row);
  if (kind === "fcard") setWide(el, panelRows(el).length);
  insertLineAfter(el, solo);
  return solo;
}

/** The row of `el` that contains `node`, if any — for turning a click inside
 * a panel into the row it landed in. */
export function rowContaining(el: HTMLElement, node: Node | null): HTMLElement | null {
  if (!node) return null;
  return panelRows(el).find((r) => r === node || r.contains(node)) ?? null;
}
