/**
 * Editor-only visual state, kept strictly separable from the document.
 *
 * Previously the editor communicated its state by writing INLINE STYLES onto
 * the user's own elements — `cursor:grab` on every block, a red `outline` on
 * overflowing pages, a dashed one on multi-selected blocks, a pile of
 * placeholder styling on broken images. Saving serializes the live DOM, so
 * all of it was written into the stored version and into every export: a
 * finished chapter could ship with a red overflow border baked into the page,
 * and every block carried `draggable="true"` and `cursor:grab` forever.
 *
 * Stripping that back out after the fact can't be done reliably, because
 * there's no way to tell an outline the EDITOR added from one the document's
 * own author wrote. So the editor no longer writes any: every piece of
 * editor state is a `__ed-*` CLASS, and their appearance lives in a single
 * injected <style id="__editor_chrome__"> element. Removing that one element
 * and every `__ed-*` class returns the document exactly to its own markup —
 * see sanitize.ts, which is now an exact operation rather than a guess.
 */

export const CHROME_STYLE_ID = "__editor_chrome__";
export const CHROME_CLASS_PREFIX = "__ed-";

export const ED = {
  block: "__ed-block",
  dragging: "__ed-dragging",
  overflow: "__ed-overflow",
  multiSelected: "__ed-multiselect",
  brokenImage: "__ed-broken-img",
  dropTarget: "__ed-drop-target",
  nestedItem: "__ed-nested-item",
  selectedArt: "__ed-selected-art",
  gripReady: "__ed-grip-ready",
  ghost: "__ed-ghost",
  justAdded: "__ed-just-added",
  freshBlock: "__ed-fresh",
  /** The empty foot of a column, highlighted while a drag hovers it. */
  tailZone: "__ed-tail",
  /** The sheet currently being edited, so it is obvious which one that is. */
  activePage: "__ed-active-page",
  /** A just-inserted block, floating on the page until it is settled. */
  placedFree: "__ed-placed-free",
} as const;

// NO BACKTICKS ANYWHERE INSIDE CHROME_CSS.
//
// It is a template literal, so a backtick in one of its CSS comments closes
// the string early and every rule after that point silently disappears. It
// surfaces as a pile of syntax errors on an unrelated line, which has cost
// three separate debugging sessions on this file. Write class and property
// names in comments bare: .page, counter-reset, not quoted with backticks.
const CHROME_CSS = `
/* Injected by the editor. Removed on save — see sanitize.ts.
   Reminder: no backticks in this string, not even inside a comment. */
.${ED.block} { cursor: grab; }
.${ED.block}:hover { outline: 1px solid rgba(108,139,255,0.35); outline-offset: 2px; }
.${ED.nestedItem} { cursor: grab; }
.${ED.dragging} { opacity: 0.35 !important; cursor: grabbing !important; }
.${ED.overflow} { outline: 4px solid #e05a5a !important; outline-offset: -4px; }

/* A SHEET IS A SHEET. THE EDITOR DOES NOT TOUCH THE PAGE BOX.
 *
 * This used to force height:auto and overflow:visible onto every .page, so
 * that an edit pushing past 1527px stayed visible instead of being clipped.
 * The intent was right and the method was wrong: it changed the geometry of
 * the book the moment a file was opened, before any edit at all. The
 * pipeline packs each page to exactly 1413px of sheet-body and measures it
 * in a headless browser; unclipping it let every page render its true
 * content height instead, so text appeared below the page footer, below the
 * page number, past the bottom of the paper — on all 26 pages of a file the
 * pipeline had just reported as having zero overflow. A chapter opened for
 * a one-word correction did not look like the chapter.
 *
 * Content that does not fit is not hidden either. It is MOVED: overflow is
 * still detected — scrollHeight sees clipped content perfectly well — and
 * the reflow pass pushes the tail of a full page onto the next one, exactly
 * as the pipeline would. A page that still cannot fit keeps the red
 * __ed-overflow outline, so "this will not print" is stated rather than
 * quietly swallowed.
 *
 * The result is the one thing this has to get right: an opened chapter is
 * page-for-page the chapter that was built, and editing moves the breaks
 * rather than the paper.
 */

/* THE PAGE'S LAYOUT MODE IS LEFT ALONE.
 *
 * Two attempts at giving the columns the page's leftover height have now
 * been reverted, and the second was worse than the first:
 *
 *   min-height: 1432px  — a number, so any page with a running head grew
 *                         past its sheet and the editor's pagination stopped
 *                         matching the built HTML's.
 *   display: flex       — changed the page from a block container to a flex
 *                         one, which re-sizes every child. The paper
 *                         collapsed to a narrow strip.
 *
 * Neither was needed. Dropping into the blank band below a short column
 * already works without any of it: the drag handler resolves the column by
 * CURSOR POSITION when the cursor is outside every flow container, which is
 * exactly what that band is. See columnUnder() and the tail branch in
 * dragDrop.ts. The space did not need to be made real in CSS; it only needed
 * the drop handler to know which column it belongs to, and it does. */

/* NO FIXED COLUMN HEIGHT.
 *
 * The first attempt gave .acol a min-height of 1432px, the page's content
 * box. That was a number, and a number is wrong: a page that also carries a
 * running head, or any block above its columns, then measures 1432 PLUS that
 * — so the sheet grew past 1527px, the cut line fell in the middle of a
 * paragraph, and the editor's pagination stopped matching the built HTML's.
 * Content appeared to have been shifted about, which the editor has no
 * business doing on its own.
 *
 * Filling the leftover space says the same thing without asserting how much
 * there is: flex:1 on the column row takes whatever the page has left after
 * its other children, and can never demand more. Where the original page is
 * exactly full the columns are exactly full and nothing moves; where it ends
 * early they reach the foot and that space becomes a real drop target. */

/* CLICKING THE EMPTY FOOT OF A COLUMN PUTS THE CARET AT THE END OF IT.
 *
 * The min-height above makes the space real, and this makes it useful: the
 * tail of a column reads as somewhere you can aim at, rather than as inert
 * paper. */
.flowwrap, .acol { cursor: text; }

/* WHICH SHEET AM I ON, AND WHERE DOES IT END?
 *
 * Letting pages grow rather than clip is what made editing workable, but it
 * cost the one thing the fixed sheet gave for free: a visible boundary. The
 * document became one continuous scroll with no way to tell page 1 from
 * page 2, and no way to see where a printed sheet actually stops.
 *
 * Both are restored WITHOUT touching the document. A CSS counter numbers the
 * sheets — neither .page::before/::after nor counter-reset appears
 * anywhere in the book's own stylesheet, so nothing is being overridden —
 * and the whole thing lives in the editor's own <style>, which means there
 * is no markup to strip on save and no chance of a page label being
 * exported. */
.pages, body { counter-reset: ed-page; }
.page {
  counter-increment: ed-page;
  position: relative;
  /* Sheets were flush against each other, so two pages read as one long
     column of paper. */
  margin-bottom: 46px !important;
}
/* INSIDE the sheet, not above it.
 *
 * A label at top:-22px sits in the gap between sheets, where the dark canvas
 * background is — and the gap is exactly what scrolls past, so the number was
 * off-screen most of the time and read as missing. Put on the paper itself it
 * is always in view while that page is. */
.page::before {
  content: "PAGE " counter(ed-page);
  position: absolute;
  top: 10px;
  right: 12px;
  padding: 3px 9px;
  border-radius: 999px;
  background: #24304d;
  color: #cfd9ff;
  font: 700 10.5px/1.5 ui-sans-serif, system-ui, -apple-system, sans-serif;
  letter-spacing: 0.14em;
  pointer-events: none;
  z-index: 5;
  opacity: 0.85;
}

/* THE PAGE YOU ARE EDITING.
 *
 * Numbering every sheet says which is which; this says which one is yours
 * right now, which is the other half of the question. Applied from the
 * activePage the canvas already tracks on scroll. */
.${ED.activePage}::before {
  background: #6c8bff;
  color: #fff;
  opacity: 1;
}
.${ED.activePage} {
  box-shadow: 0 0 0 3px rgba(108,139,255,0.55), 0 18px 44px -14px rgba(0,0,0,0.55) !important;
}
/* The dashed cut line that used to be drawn at top:1527px is gone with the
 * override above: the sheet's own edge is the cut line again, because the
 * sheet is once more the size it prints at. */

.${ED.tailZone} {
  outline: 2px dashed rgba(108,139,255,0.75) !important;
  outline-offset: -6px;
  background: rgba(108,139,255,0.06) !important;
}
.${ED.multiSelected} { outline: 2px dashed #6c8bff !important; outline-offset: 2px; }
/* The block the drop is measured against, in the same green as the
   preview so the pair read as one answer to "where will this land". */
.${ED.dropTarget} { outline: 3px dashed #137a4a !important; }
.${ED.brokenImage} {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  min-width: 48px;
  border: 2px dashed #9a8f7d !important;
  border-radius: 8px;
  background: #faf8f4 !important;
  color: #9a8f7d !important;
  font-size: 11px;
  cursor: pointer;
}
/* A nested row — an exam chip, a step, a note line — reads as a thing you
   can pick up, rather than as part of the text around it. */
.${ED.nestedItem}:hover { outline: 1px dashed rgba(108,139,255,0.55); outline-offset: 1px; }

/* Placed art. Transparent PNGs on cream paper have no visible edges, so
   without a ring there is no way to tell what is selected or how big it is —
   which is most of why moving and resizing it felt like guesswork. */
.bookdecor { cursor: move; }
.bookdecor:hover { outline: 1.5px solid rgba(108,139,255,0.5); outline-offset: 3px; }
.${ED.selectedArt} {
  outline: 2px solid #6c8bff !important;
  outline-offset: 3px;
  box-shadow: 0 0 0 6px rgba(108,139,255,0.14);
}

/* The grab gutter. Everything is still draggable — this marks WHERE to take
   hold, so the rest of the block keeps behaving like text you can select.
   An inset shadow, so it costs no layout and cannot shift a line of the page. */
/* A HANDLE FOR A CLIPPED CONTINUATION.
 *
 * Grip arming gives the BLOCK to the pointer normally, but once a block is
 * selected it gives the ROW under the pointer instead — so a formula line can
 * be picked out of a panel deliberately, as a second step. See
 * attachGripArming.
 *
 * The head half of a clipped panel is unaffected: its सूत्र heading bar is not
 * a row, so there is always somewhere on it that takes hold of the whole box.
 * The continuation has no heading — by design, since two headings cost about
 * what the split reclaims — which leaves it made ENTIRELY of rows. Once
 * selected, there was nowhere on it that grabbed the box at all. Reported as
 * "upper box i can easily drag through सूत्र but how lower box".
 *
 * This chip is a pseudo-element of the continuation, so pointing at it
 * targets the continuation and not a row — which is exactly the missing
 * non-row real estate. It is positioned absolutely and so costs NO layout:
 * the editor's pagination stays identical to the built HTML's, which padding
 * would have broken. Top-right, where formula rows leave space; captions in
 * this panel are left-aligned.
 */
.fcard-cont { position: relative; }
.fcard-cont::before {
  content: "⋮⋮ जारी";
  position: absolute;
  top: 3px;
  right: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #6c8bff;
  color: #fff;
  font: 700 9.5px/1.6 ui-sans-serif, system-ui, -apple-system, sans-serif;
  letter-spacing: 0.08em;
  cursor: grab;
  opacity: 0.7;
  z-index: 6;
}
.fcard-cont:hover::before { opacity: 1; }

/* A BLOCK YOU HAVE JUST PLACED, STILL FLOATING.
 *
 * Amber, and nothing else in the editor is amber: blue is selection, green is
 * a drop target, red is overflow. So the one box on the page in this colour
 * is unambiguously the one you just added and have not yet settled into the
 * text — which was the whole difficulty, since a fresh block otherwise looks
 * exactly like the hundred around it.
 *
 * It overlaps the content on purpose. The alternative is inserting into the
 * flow, which shifts everything below the insertion point down and carries
 * the new block off the bottom of what you were reading. */
.${ED.placedFree} {
  outline: 3px solid #d98324 !important;
  outline-offset: 2px;
  border-radius: 8px;
  box-shadow: 0 14px 34px -10px rgba(217,131,36,0.55);
  cursor: move;
  z-index: 40;
}
/* THE BOX YOU ARE PLACING IS THE BOX YOU WILL GET.
 *
 * This used to paint background: rgba(255,247,235,.97) !important — a
 * cream wash, so the floating block stayed readable over the content it
 * overlaps. It also repainted every block that has a background of its own:
 * a सूत्र panel is lavender in the book and arrived cream, so the thing being
 * placed did not look like the thing that would land, and the obvious read
 * was that inserted boxes are styled differently from the chapter's.
 *
 * :where() has zero specificity, so this is only a FALLBACK: any element
 * whose own stylesheet gives it a background keeps it — and the ones that
 * need an opaque backdrop are exactly the ones that have none. */
:where(.${ED.placedFree}) { background: #fdfcf7; }
.${ED.placedFree}::after {
  content: "NEW — drag me, then press Enter to fit into the text";
  position: absolute;
  left: 0;
  top: -19px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #d98324;
  color: #fff;
  font: 700 9.5px/1.6 ui-sans-serif, system-ui, -apple-system, sans-serif;
  letter-spacing: 0.06em;
  white-space: nowrap;
  pointer-events: none;
}

.${ED.gripReady} {
  cursor: grab;
  box-shadow: inset 4px 0 0 0 var(--accent, #6c8bff), inset 0 0 0 1px rgba(108,139,255,0.22);
}
/* …but not while the block is being edited: there the caret matters, and the
   element is not a drag source anyway. */
.${ED.gripReady}[contenteditable="true"] { cursor: text; box-shadow: none; }

/* The block being dragged, shown faintly where it will land. */
/* THE LANDING PREVIEW — the block, where it is about to go, in green.
 *
 * It deliberately OVERLAPS the content it will sit next to: seeing it against
 * its neighbours is the whole point, and a preview tucked into a gap says
 * nothing about how it will read. Dark green so it cannot be mistaken for
 * the document's own colours, none of which are green. */
.${ED.ghost} {
  position: absolute !important;
  margin: 0 !important;
  opacity: 0.92;
  pointer-events: none;
  z-index: 9997;
  background: rgba(212,241,225,0.97) !important;
  outline: 2px solid #137a4a;
  outline-offset: -1px;
  border-radius: 6px;
  box-shadow: 0 10px 26px -8px rgba(19,122,74,0.55);
}

/* A moment of highlight on a block that was just inserted. Scrolling to it is
   not enough on a page where every block looks alike. */
@keyframes __ed_just_added {
  from { box-shadow: 0 0 0 3px rgba(62,194,127,0.75), 0 0 18px 4px rgba(62,194,127,0.45); }
  to   { box-shadow: 0 0 0 3px rgba(62,194,127,0); }
}
.${ED.justAdded} { animation: __ed_just_added 1.4s ease-out; border-radius: 6px; }

/* The flash lasts 1.4s; "which box did I just add?" outlasts it. A newly
   inserted block keeps a standing marker until it is typed into or clicked
   away from, so it stays findable on a page of near-identical boxes. */
.${ED.freshBlock} {
  outline: 2px solid rgba(62,194,127,0.9) !important;
  outline-offset: 3px;
  border-radius: 6px;
}
/* Floated, not absolutely positioned: a position:relative on the block
   would break a free-placed one, which is absolute by definition. */
.${ED.freshBlock}::before {
  content: "new";
  float: right;
  margin: 0 0 2px 8px;
  font: 700 10px/1.4 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgba(62,194,127,0.95);
  color: #08240f;
  padding: 1px 6px;
  border-radius: 4px 4px 0 0;
  pointer-events: none;
}

/* Ghost text for an emptied slot — see blankToPlaceholders. The wording is
   the example's own, so the empty box still reads as a labelled form rather
   than an anonymous shell. */
[data-ph]:empty::before {
  content: attr(data-ph);
  opacity: 0.32;
  font-style: italic;
  pointer-events: none;
}

#__drop_indicator__, #__nested_drop_indicator__ { pointer-events: none; }
`;

/** Injects (once per document) the stylesheet backing every `__ed-*` class.
 * Safe to call repeatedly — re-running on each iframe load is expected. */
export function injectChromeStyles(doc: Document) {
  if (doc.getElementById(CHROME_STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = CHROME_STYLE_ID;
  style.textContent = CHROME_CSS;
  (doc.head ?? doc.documentElement).appendChild(style);
}

/** Toggles an editor class without disturbing any class the document itself
 * carries — the whole point of the `__ed-` namespace. */
export function setChromeClass(el: Element, className: string, on: boolean) {
  el.classList.toggle(className, on);
}
