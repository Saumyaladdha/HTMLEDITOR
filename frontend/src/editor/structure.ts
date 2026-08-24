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
const KNOWN_BLOCK_CONTAINERS = [".page__cols", ".page__full"];

/** Treated as single editable units even though they contain block-level
 * children — splitting a table into its rows, or a figure into image and
 * caption, would be worse than useless as a "block". */
const ATOMIC_TAGS = new Set([
  "FIGURE", "TABLE", "UL", "OL", "DL", "BLOCKQUOTE", "PRE",
  "HR", "IMG", "VIDEO", "AUDIO", "SVG", "IFRAME", "CANVAS", "FORM",
]);

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "LINK", "META", "TITLE", "HEAD", "NOSCRIPT", "TEMPLATE"]);

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

function isSkippable(el: Element): boolean {
  return SKIP_TAGS.has(el.tagName);
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
    const candidates = Array.from(root.children).filter(
      (c): c is HTMLElement => c instanceof HTMLElement && !isSkippable(c),
    );
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
  const children = Array.from(root.children).filter(
    (c): c is HTMLElement => c instanceof HTMLElement && !isSkippable(c),
  );
  if (looksLikeRepeatedPages(children)) {
    const cls = children[0].classList[0];
    if (cls) {
      const els = Array.from(doc.querySelectorAll<HTMLElement>(`.${CSS.escape(cls)}`));
      if (els.length === children.length) return { selector: `.${CSS.escape(cls)}`, els };
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
export function collectBlocks(doc: Document, structure: DocumentStructure): HTMLElement[] {
  const win = doc.defaultView ?? window;

  if (structure.blockContainerSelectors.length > 0) {
    const blocks: HTMLElement[] = [];
    doc.querySelectorAll(structure.blockContainerSelectors.join(", ")).forEach((container) => {
      Array.from(container.children).forEach((child) => {
        if (child instanceof HTMLElement && !isSkippable(child)) blocks.push(child);
      });
    });
    if (blocks.length > 0) return blocks;
    // Fall through to inference: a document can declare containers and still
    // leave them empty, and an editor with nothing selectable is useless.
  }

  const blocks: HTMLElement[] = [];
  const visit = (el: Element) => {
    for (const child of Array.from(el.children)) {
      if (!(child instanceof HTMLElement) || isSkippable(child)) continue;
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
