/**
 * Works out how to edit a document by LOOKING at it, rather than requiring
 * it to be one this repo's chapter pipeline produced.
 *
 * Everything here used to be hardcoded to that pipeline's vocabulary: pages
 * were `.page`, blocks were "direct children of `.page__cols`", the canvas
 * was a fixed 1240px, and a file without those divs was rejected at upload
 * and, if it somehow got through, reported as corrupted at load. So the
 * editor could only ever open its own output.
 *
 * The structure is now DETECTED and drives two modes:
 *
 *   paginated — the document has real fixed-size pages (a packaged chapter,
 *               a pdf2htmlEX export, anything with @page-style layout).
 *               Page rail, overflow detection and page operations apply.
 *
 *   flow      — ordinary continuous HTML: an article, a Word export, an
 *               EPUB chapter, a blog post. There are no pages, so page
 *               features switch off and the canvas is a readable column.
 *
 * Everything else — selection, the inspector, drag, find/replace, images,
 * undo, versioning — is identical across both modes.
 */

/** Class names used, in practice, by tools that emit real paginated HTML.
 * `.page` is this repo's pipeline; `.pf` is pdf2htmlEX. Detection never
 * depends on any single one of these — a document that has none but does
 * have `@page` CSS with repeated fixed-height siblings is still recognised. */
const KNOWN_PAGE_SELECTORS = [".page", "[data-page]", ".pf"];

/** Containers whose DIRECT CHILDREN are the editable blocks, when the
 * document declares its own block structure this way. Anything not listed
 * falls back to structural inference (see collectBlocks). */
const KNOWN_BLOCK_CONTAINERS = [
  ".page__cols", ".page__full",          // the older BEM chapters
  // Current pipeline: `.flowwrap` is a Part-1 page body, `.acol` one of the
  // two Part-2 columns. Their direct children are the blocks. `.u` is a
  // margin-collapse guard wrapping each one — see unit/spec.json — so blocks
  // are found one level inside it, which collectBlocks already handles by
  // descending through single-child wrappers.
  ".flowwrap", ".acol",
  // THE COVER IS NOT IN A COLUMN, and was therefore unreachable.
  //
  // The reference edition lays page 1 out linearly — a `.source-front-title`
  // masthead, then one `.source-front-section` per analytics heading —
  // rather than in the two `.acol` columns the body uses. Listing only the
  // column containers meant `collectBlocks` returned nothing for that page:
  // 665 blocks stamped across the chapter and ZERO on the cover, so clicking
  // the chapter title, a section, or a row of the topic table selected
  // nothing at all and the page looked broken rather than unsupported.
  ".source-front-title", ".source-front-section",
];

/** Treated as single editable units even though they contain block-level
 * children — splitting a table into its rows, or a figure into image and
 * caption, would be worse than useless as a "block". */
const ATOMIC_TAGS = new Set([
  "FIGURE", "TABLE", "UL", "OL", "DL", "BLOCKQUOTE", "PRE",
  "HR", "IMG", "VIDEO", "AUDIO", "SVG", "IFRAME", "CANVAS", "FORM",
]);

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "LINK", "META", "TITLE", "HEAD", "NOSCRIPT", "TEMPLATE"]);

import { documentUsesManifest, manifestElementFor } from "./manifest";

export type DocumentMode = "paginated" | "flow";

export interface DocumentStructure {
  mode: DocumentMode;
  /** The element containing the document's actual content — `.book`, or
   * <main>/<article>, or whatever holds the bulk of the text. */
  root: HTMLElement;
  /** Selector matching one page, or null in flow mode. */
  pageSelector: string | null;
  /** Selectors whose direct children are blocks. Empty means "infer". */
  blockContainerSelectors: string[];
  /** Natural layout width to render the canvas at, in CSS px. */
  contentWidthPx: number;
  /** Fixed page height, when the document has one — powers overflow
   * detection, which is meaningless without it. */
  pageHeightPx: number | null;
}

/**
 * The narrowest viewport this document still lays out as designed in.
 *
 * THE CANVAS IS NOT A PHONE. A chapter's stylesheet carries responsive rules
 * — this pipeline's has `@media (max-width:1100px)`, which shrinks `.page`
 * padding from 56/68/58 to 26/22/34 and collapses `.opts` from a two-column
 * grid to one. The editor sizes its iframe to the page width, 1080px, and
 * 1080 is under 1100: so simply OPENING a chapter fired its own mobile
 * layout. Every line re-wrapped against a different content box, every set
 * of MCQ options doubled in height, and four of twenty-six pages spilled
 * past the sheet — on a file the pipeline had just measured as fitting
 * exactly. It looked like the editor corrupting the book, and it was the
 * book's own CSS answering a question the canvas never meant to ask.
 *
 * Read rather than hardcoded: the document declares its own breakpoints, so
 * a chapter that moves its breakpoint moves this with it. Sheets that cannot
 * be read (none here — everything is inline) are skipped rather than fatal.
 */
export function minSafeViewportWidth(doc: Document): number {
  let widest = 0;
  for (const sheet of Array.from(doc.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;                                   // cross-origin, unreadable
    }
    for (const rule of Array.from(rules)) {
      const media = (rule as CSSMediaRule).media;
      if (!media) continue;
      const m = /max-width\s*:\s*(\d+(?:\.\d+)?)px/.exec(media.mediaText ?? "");
      if (m) widest = Math.max(widest, parseFloat(m[1]));
    }
  }
  // One pixel clear of the widest "this is a narrow screen" claim.
  return widest ? Math.ceil(widest) + 1 : 0;
}

function isSkippable(el: Element): boolean {
  return SKIP_TAGS.has(el.tagName);
}

/**
 * Element children, realm-safely.
 *
 * This used to filter with `c instanceof HTMLElement`, which is ALWAYS FALSE
 * here. The document being edited lives inside an iframe, so its elements are
 * instances of the IFRAME window's HTMLElement — a different constructor from
 * the parent page's, which is the one `instanceof` resolves against in this
 * module. Every child was therefore discarded: findContentRoot could never
 * descend past <body>, and collectBlocks returned an empty list, so nothing
 * was ever stamped and nothing in the document could be clicked or edited.
 *
 * It went unnoticed because the unit tests build documents with DOMParser,
 * which produces elements in the SAME realm as the test — so `instanceof`
 * held there and the tests passed while the real editor was inert.
 *
 * `children` yields only Elements by definition, so a nodeType check is both
 * sufficient and realm-independent.
 */
function elementChildren(el: Element): HTMLElement[] {
  return Array.from(el.children).filter(
    (c): c is HTMLElement => c.nodeType === 1 && !isSkippable(c),
  );
}

function displayOf(el: Element, win: Window): string {
  return win.getComputedStyle(el).display;
}

function isBlockLevel(el: Element, win: Window): boolean {
  const d = displayOf(el, win);
  if (d === "none" || d === "contents") return false;
  return (
    d.startsWith("block") ||
    d.startsWith("flex") ||
    d.startsWith("grid") ||
    d === "list-item" ||
    d.startsWith("table") ||
    d === "flow-root"
  );
}

function isAtomic(el: Element, win: Window): boolean {
  if (ATOMIC_TAGS.has(el.tagName)) return true;
  // An element that establishes its own layout context and holds no
  // block-level children of its own is a leaf regardless of tag name.
  return isBlockLevel(el, win) && !hasBlockLevelChild(el, win);
}

function hasBlockLevelChild(el: Element, win: Window): boolean {
  for (const child of Array.from(el.children)) {
    if (isSkippable(child)) continue;
    if (isBlockLevel(child, win)) return true;
  }
  return false;
}

/**
 * Finds the element holding the document's real content.
 *
 * Prefers explicit semantics (`<main>`, `<article>`, `.book`) and otherwise
 * descends while a single child still holds essentially all of the text —
 * which peels off the chain of full-width wrapper divs that site exports and
 * word processors love to emit, without ever descending INTO the content
 * itself (the moment text is split across siblings, this is the root).
 */
export function findContentRoot(doc: Document): HTMLElement {
  const explicit = doc.querySelector<HTMLElement>("main, article, .book, [role='main']");
  if (explicit) return explicit;

  let root: HTMLElement = doc.body ?? doc.documentElement;
  const totalText = (root.textContent ?? "").trim().length;
  if (totalText === 0) return root;

  for (let depth = 0; depth < 10; depth++) {
    const candidates = elementChildren(root);
    const dominant = candidates.find(
      (c) => (c.textContent ?? "").trim().length >= totalText * 0.9,
    );
    // Only descend through a pure wrapper — if the dominant child is itself
    // an atomic unit or the only content, stop rather than unwrapping it.
    if (!dominant || dominant.children.length === 0 || ATOMIC_TAGS.has(dominant.tagName)) break;
    root = dominant;
  }
  return root;
}

/** True when several same-shaped siblings all have the same non-auto height —
 * the signature of real pagination even with class names this code has never
 * seen. */
function looksLikeRepeatedPages(candidates: HTMLElement[]): boolean {
  if (candidates.length < 2) return false;
  const heights = candidates.slice(0, 5).map((el) => Math.round(el.getBoundingClientRect().height));
  return heights.every((h) => h > 200 && Math.abs(h - heights[0]) <= 2);
}

function detectPageSelector(doc: Document): { selector: string; els: HTMLElement[] } | null {
  for (const selector of KNOWN_PAGE_SELECTORS) {
    const els = Array.from(doc.querySelectorAll<HTMLElement>(selector));
    if (els.length > 0) return { selector, els };
  }

  // Nothing recognised by name — look for the structural signature instead,
  // so a paginated document from a tool this code has never heard of still
  // gets page features.
  const root = findContentRoot(doc);
  const children = elementChildren(root);
  if (looksLikeRepeatedPages(children)) {
    const cls = children[0].classList[0];
    // An attribute selector avoids depending on CSS.escape (absent in some
    // environments) while still handling class names containing characters
    // that would need escaping in `.class` form.
    if (cls) {
      const selector = `[class~="${cls.replace(/"/g, '\\"')}"]`;
      const els = Array.from(doc.querySelectorAll<HTMLElement>(selector));
      if (els.length === children.length) return { selector, els };
    }
  }
  return null;
}

/** Comfortable measure for continuous text when the document doesn't dictate
 * its own width. Wide enough for figures and tables, narrow enough to read. */
const DEFAULT_FLOW_WIDTH = 820;

export function detectStructure(doc: Document): DocumentStructure {
  const win = doc.defaultView ?? window;
  const root = findContentRoot(doc);
  const page = detectPageSelector(doc);

  if (page && page.els.length > 0) {
    const first = page.els[0];
    const rect = first.getBoundingClientRect();
    const containers = KNOWN_BLOCK_CONTAINERS.filter((sel) => doc.querySelector(sel) !== null);
    return {
      mode: "paginated",
      root,
      pageSelector: page.selector,
      blockContainerSelectors: containers,
      // offsetWidth over getBoundingClientRect: the latter reflects any
      // transform applied to an ancestor, and the canvas scales the iframe.
      contentWidthPx: first.offsetWidth || Math.round(rect.width) || DEFAULT_FLOW_WIDTH,
      pageHeightPx: first.offsetHeight || null,
    };
  }

  const rootWidth = root.getBoundingClientRect().width;
  return {
    mode: "flow",
    root,
    pageSelector: null,
    blockContainerSelectors: [],
    contentWidthPx: Math.round(rootWidth) || DEFAULT_FLOW_WIDTH,
    pageHeightPx: null,
  };
}

/**
 * The editable blocks of a document.
 *
 * When the document declares its own block containers (a packaged chapter's
 * `.page__cols`/`.page__full`), their direct children are the blocks — that
 * preserves the granularity those chapters were authored with, where a
 * `.tip-box` is deliberately ONE block rather than the paragraphs inside it.
 *
 * Otherwise blocks are inferred: walk the content root and take every
 * innermost block-level element, plus anything atomic. That's the rule that
 * makes arbitrary HTML editable — a Word export, an EPUB chapter and a blog
 * post all yield exactly the paragraphs, lists, figures and tables a person
 * would point at and call "a block".
 */

/** Displays that exist to arrange OTHER elements rather than to render
 * anything themselves. */
const LAYOUT_DISPLAYS = new Set(["flex", "grid", "inline-flex", "inline-grid"]);

/**
 * True if this element is scaffolding whose CHILDREN are the real blocks.
 *
 * The cover is the case that forced this. Its markup is
 * `.flowwrap > .cvgrid > .cvcol > .cvcard`, and "direct children of a block
 * container" made the whole `.cvgrid` — both columns, all four cards — a
 * single block. Selecting any card selected the lot, and dragging moved them
 * as one slab.
 *
 * The test is what the element DOES, not what it is called: `.cvgrid` and
 * `.cvcol` are `display:flex` with no box of their own, while `.cvcard` is an
 * ordinary bordered block. A declared component is never treated as a wrapper
 * however it lays its own insides out — `.po` and `.sechead` are both flex,
 * and both are single blocks a user edits as one thing.
 */
function isLayoutWrapper(el: Element, win: Window, ours: boolean): boolean {
  // AN ATOMIC ELEMENT IS NEVER A WRAPPER, whatever it computes to.
  //
  // `ATOMIC_TAGS` was consulted only on the inference path, not here — and
  // a `<table>` computes `display:table`, a `<tbody>` `table-row-group`,
  // neither of which `paintsNothing` rules out. So a table holding other
  // blocks was descended into and the cover's topic table arrived as
  // twelve separate `<tr>` blocks: each selectable, none nameable, none
  // offering anything to edit. Splitting a table into rows is exactly what
  // `ATOMIC_TAGS` exists to prevent; it simply was not asked.
  if (ATOMIC_TAGS.has(el.tagName)) return false;
  const m = manifestElementFor(el);
  if (m && m.role === "content") return false;
  if (elementChildren(el).length === 0) return false;
  // Anything the element library itself calls scaffolding. `.u` is a
  // margin-collapse guard and `.stickycol` a float column: both are direct
  // children of `.flowwrap`, so both were being treated as blocks. Selecting
  // the PART banner actually selected the full-width `.u` around it, whose
  // outline swallowed the sticky note floating over its right-hand side —
  // which is why the banner and the note appeared to be one thing.
  if (m && m.role === "shell") return true;

  const cs = win.getComputedStyle(el);
  if (LAYOUT_DISPLAYS.has(cs.display)) return true;

  // An element that PAINTS NOTHING and only holds other blocks is grouping,
  // not content. `.sec` and `.exp` wrap a chapter section and have no CSS
  // rule of their own at all, so a section heading arrived welded to them and
  // clicking it selected the wrapper instead.
  //
  // ONLY in our own documents. The test asks what an element renders, which
  // means it depends on the stylesheet actually being applied — in a document
  // whose CSS has not loaded, or one built by a tool we know nothing about,
  // every container looks unpainted and the whole document would shatter into
  // its leaves. A `.tip-box` in a foreign file must stay one block.
  if (!ours) return false;
  return paintsNothing(cs) && hasBlockChildren(el, win);
}

/** No border, no background, no meaningful padding — nothing a reader sees. */
function paintsNothing(cs: CSSStyleDeclaration): boolean {
  const bg = cs.backgroundColor;
  const hasBg = !!bg && bg !== "transparent" && !/rgba\(0,\s*0,\s*0,\s*0\)/.test(bg);
  // An UNSET property reads back as "" in some engines and as "none" in
  // others; both mean "paints nothing", and testing only for "none" made
  // every element look like it had a background image.
  const bgImg = cs.backgroundImage;
  if (hasBg || (bgImg && bgImg !== "none")) return false;
  const border = ["borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"]
    .some((k) => parseFloat((cs as unknown as Record<string, string>)[k] || "0") > 0);
  if (border) return false;
  // `.u` carries 0.02px of padding purely to stop margins collapsing through
  // it — that is not a visual box.
  const pad = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]
    .some((k) => parseFloat((cs as unknown as Record<string, string>)[k] || "0") >= 2);
  return !pad;
}

/** True if the element's children are block-level — i.e. it is holding other
 * blocks rather than wrapping a run of text. */
function hasBlockChildren(el: Element, win: Window): boolean {
  const kids = elementChildren(el);
  if (kids.length === 0) return false;
  return kids.every((k) => !TEXT_LEVEL.has(win.getComputedStyle(k).display));
}

const TEXT_LEVEL = new Set(["inline", "inline-block", "inline-flex", "contents"]);

/** Adds `el` as a block, or — if it only arranges other blocks — whatever it
 * arranges. Depth-capped so a pathological nest cannot recurse far. */
function pushBlock(
  el: HTMLElement, out: HTMLElement[], win: Window, depth: number, ours: boolean,
) {
  if (depth < 3 && isLayoutWrapper(el, win, ours)) {
    elementChildren(el).forEach((child) => pushBlock(child, out, win, depth + 1, ours));
    return;
  }
  out.push(el);
}

export function collectBlocks(doc: Document, structure: DocumentStructure): HTMLElement[] {
  const win = doc.defaultView ?? window;

  const ours = documentUsesManifest(doc);
  if (structure.blockContainerSelectors.length > 0) {
    const blocks: HTMLElement[] = [];
    doc.querySelectorAll(structure.blockContainerSelectors.join(", ")).forEach((container) => {
      elementChildren(container).forEach((child) => pushBlock(child, blocks, win, 0, ours));
    });
    if (blocks.length > 0) return blocks;
    // Fall through to inference: a document can declare containers and still
    // leave them empty, and an editor with nothing selectable is useless.
  }

  const blocks: HTMLElement[] = [];
  const visit = (el: Element) => {
    for (const child of elementChildren(el)) {
      if (isAtomic(child, win)) {
        blocks.push(child);
      } else if (isBlockLevel(child, win)) {
        visit(child);
      }
      // Inline-level children are part of their parent's text, never blocks.
    }
  };
  visit(structure.root);
  return blocks;
}

/** Pages, or a single synthetic "page" spanning the whole document in flow
 * mode — lets callers treat both modes uniformly instead of null-checking. */
export function collectPages(doc: Document, structure: DocumentStructure): HTMLElement[] {
  if (structure.pageSelector) {
    return Array.from(doc.querySelectorAll<HTMLElement>(structure.pageSelector));
  }
  return [];
}
