/**
 * The real Document -> Page -> Block model everything else in the editor
 * renders from and mutates. Structural operations (reorder, move-to-page,
 * add/delete page or block, undo/redo) all operate on this model, never on
 * live DOM directly — the canvas iframe is a RENDER of the model
 * (serializeDocument), not the model itself. Inline text edits are the one
 * exception: contenteditable stays DOM-native while the user is actively
 * typing (a model round-trip per keystroke would fight the caret), and the
 * edited block's outerHTML is written back into its Block.html on commit
 * (blur/Escape/toolbar action) via updateBlockHtml() — see syncBlockFromDom.
 */

import { registryEntryFor, PROPERTY_REGISTRY } from "./propertyRegistry";

// Populated from propertyRegistry's own keys so blockTypeFor can tell "the
// registry actually named this type" apart from "registryEntryFor fell
// back to the element's first class name anyway".
const KNOWN_TYPES: Record<string, true> = Object.fromEntries(
  Object.keys(PROPERTY_REGISTRY).map((k) => [k, true as const]),
);

export interface Block {
  id: string;
  /** Registry key if recognized, else a generic BEM-inferred label — never
   * blocks editing, just used for reporting/the insert palette. */
  type: string;
  /** This block's own outerHTML — the single source of truth. Any change
   * (text edit, style override, image swap) is applied by parsing this
   * into a detached element, mutating it, and re-reading outerHTML. */
  html: string;
}

export interface Page {
  id: string;
  /** Direct children of `.page__cols` — the normal two-column body. */
  blocks: Block[];
  /** Direct children of `.page__full`, when the page has one — a
   * full-width area used e.g. for page 1's chapter title (`.title-1`) and
   * "भाग 1" heading (`.part-head`), which sit ABOVE the two-column body,
   * not inside it. Empty (not present) on every ordinary page. Without
   * this, parseDocument/renderPage only ever round-tripped `.page__cols`
   * — anything in `.page__full` was silently dropped the moment a
   * snapshot got serialized back to HTML (undo/redo, page duplicate,
   * thumbnails), permanently deleting the chapter title on the first
   * such round-trip. */
  fullBlocks: Block[];
  /** Every attribute the original `.page` div carried (class, and crucially
   * `style="--fs-base: ...px"` — every real page sets its own base font
   * size this way). renderPage used to hardcode a fresh
   * `<div class="page" data-page-id="...">` with none of this, so the
   * page-level font size (and any other page-specific style/class) was
   * silently reset to the CSS default on every undo/redo, page duplicate,
   * or thumbnail render — a page that had been made deliberately smaller/
   * larger, or used a layout variant class, would visibly change (or, if
   * that variant controlled something structural, could make content look
   * like it vanished) the moment the model got serialized back to HTML. */
  attrs: Record<string, string>;
  /** Raw markup that sits AFTER this page's own closing tag but BEFORE the
   * next page (or, on the last page, before the document's trailing
   * suffix) — e.g. a stray `<style>` block some packaged chapters place
   * in the BODY between two pages, rather than only in `<head>`. Real
   * packaged HTML from this pipeline has been observed with a ~3MB such
   * block sitting between page 0 and page 1; the old prefix/pages/suffix
   * model had no concept of "content between pages" at all and silently
   * discarded it on every single round-trip (undo/redo, page duplicate,
   * thumbnails) — turning the canvas blank the moment content that
   * `.page__cols`/`.page__full` depended on (shared CSS) went missing.
   * Defaults to "" for any page that never had one, and for newly
   * created/duplicated pages (a duplicated page must NOT also duplicate
   * a shared stylesheet that happened to trail the original). */
  trailingGap: string;
}

/** Element/Text/Comment -> its own markup, matching what re-parsing it
 * later would reproduce. innerHTML-safe (each node's OWN outerHTML/text),
 * not a full-document serialize. */
function serializeNode(node: ChildNode): string {
  if (node.nodeType === 1) return (node as Element).outerHTML;
  if (node.nodeType === 3) return node.textContent ?? "";
  if (node.nodeType === 8) return `<!--${node.textContent ?? ""}-->`;
  return "";
}

/** Every attribute of `el` except the ones the model manages itself
 * (data-page-id is regenerated from `page.id`, data-block-id belongs to
 * child blocks not the page element). */
function capturePageAttrs(el: Element): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (attr.name === "data-page-id") continue;
    attrs[attr.name] = attr.value;
  }
  return attrs;
}

function serializeAttrs(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([name, value]) => `${name}="${value.replace(/"/g, "&quot;")}"`)
    .join(" ");
}

export interface BookDocument {
  pages: Page[];
  /** Everything before the first .page div, verbatim — doctype, <html>,
   * the full inlined <style> block, opening <body>/.book wrapper tags.
   * Never regenerated, so export fidelity (identical CSS/head) is
   * automatic rather than something the serializer has to reconstruct. */
  prefix: string;
  /** Everything after the last .page div's closing tag, to end of file. */
  suffix: string;
}

let _idCounter = 0;
function nextId(): string {
  return `blk-${_idCounter++}`;
}

/** Infers a readable type label for a block the registry doesn't know —
 * strips BEM __part/--variant suffixes down to the base block name (e.g.
 * "table-sutra--wide" -> "table-sutra") so an unrecognized component still
 * reports something meaningful instead of just "generic". */
function inferGenericType(el: Element): string {
  for (const cls of Array.from(el.classList)) {
    const base = cls.split("--")[0].split("__")[0];
    if (base) return base;
  }
  return "generic";
}

function blockTypeFor(el: Element): string {
  const { key } = registryEntryFor(el);
  return key in KNOWN_TYPES ? key : inferGenericType(el);
}

/** Captures a container's direct children as Blocks (assigning/reusing a
 * data-block-id on each) — the same logic applies whether the container
 * is `.page__cols` or `.page__full`, so both share it. */
function blocksFromContainer(container: Element | null): Block[] {
  if (!container) return [];
  return Array.from(container.children).map((el) => {
    const id = (el as HTMLElement).dataset.blockId || nextId();
    (el as HTMLElement).dataset.blockId = id;
    return { id, type: blockTypeFor(el), html: (el as HTMLElement).outerHTML };
  });
}

/** Parses a full packaged chapter HTML string into the model. Boundaries
 * (prefix/suffix/gaps between pages) are found via DOM structure — never
 * by searching the raw string for literal markers like `<div class="page"`.
 * That used to be exactly this fragile: a real packaged chapter's inlined
 * CSS can contain a build-documentation COMMENT that literally quotes
 * `<div class="page">` as example markup, which a plain indexOf/lastIndexOf
 * scan can't tell apart from a REAL page — and separately, this pipeline
 * has been observed placing a huge shared `<style>` block as a body-level
 * sibling BETWEEN two `.page` divs rather than only in `<head>`, which a
 * prefix/pages/suffix-only model has no way to represent at all and would
 * silently drop on every round-trip. Operating on the parsed tree sidesteps
 * both problems: `.page` elements are unambiguous regardless of what text
 * happens to appear in a comment or CSS string elsewhere, and DOM-order
 * iteration naturally captures whatever sits between them. */
export function parseDocument(html: string): BookDocument {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const pageEls = Array.from(doc.querySelectorAll(".page"));
  const pageElSet = new Set<Element>(pageEls);

  const pages: Page[] = pageEls.map((pageEl) => {
    const blocks = blocksFromContainer(pageEl.querySelector(".page__cols"));
    const fullBlocks = blocksFromContainer(pageEl.querySelector(".page__full"));
    const attrs = capturePageAttrs(pageEl);
    return { id: (pageEl as HTMLElement).dataset.pageId || nextId(), blocks, fullBlocks, attrs, trailingGap: "" };
  });

  // Any page's non-page siblings (within whatever actually contains the
  // pages — normally `.book`, but not assumed by class name below) get
  // folded into that page's trailingGap, so they're re-emitted right after
  // it on serialize. Siblings before the FIRST page are handled separately
  // by the prefix computation below (removing all of .book's children
  // already accounts for them).
  const container = pageEls[0]?.parentElement ?? null;
  if (container) {
    let currentPageIdx = -1;
    Array.from(container.childNodes).forEach((node) => {
      if (node.nodeType === 1 && pageElSet.has(node as Element)) {
        currentPageIdx++;
        return;
      }
      if (currentPageIdx >= 0 && pages[currentPageIdx]) {
        pages[currentPageIdx].trailingGap += serializeNode(node);
      }
    });
  }

  // prefix/suffix via DOM removal on a clone: blank out the pages'
  // container, serialize, then split on that now-empty container's own
  // (unique) markup — reliable regardless of what text appears anywhere
  // else in the document, unlike a literal-string search.
  let prefix = "<!doctype html>\n" + doc.documentElement.outerHTML;
  let suffix = "";
  if (container) {
    const clone = doc.cloneNode(true) as Document;
    const clonedPageEls = Array.from(clone.querySelectorAll(".page"));
    const clonedContainer = clonedPageEls[0]?.parentElement;
    if (clonedContainer) {
      while (clonedContainer.firstChild) clonedContainer.removeChild(clonedContainer.firstChild);
      const shell = "<!doctype html>\n" + clone.documentElement.outerHTML;
      const emptyContainerHtml = clonedContainer.outerHTML; // e.g. '<div class="book"></div>'
      const closeTagLen = `</${clonedContainer.tagName.toLowerCase()}>`.length;
      const openTagHtml = emptyContainerHtml.slice(0, emptyContainerHtml.length - closeTagLen);
      const splitIdx = shell.indexOf(emptyContainerHtml);
      if (splitIdx >= 0) {
        prefix = shell.slice(0, splitIdx + openTagHtml.length);
        suffix = shell.slice(splitIdx + openTagHtml.length);
      }
    }
  }

  return { pages, prefix, suffix };
}

/** Rebuilds the full HTML string from the model — prefix + each page's
 * `.page` wrapper (re-derived from the first parsed page's own markup
 * shape isn't re-derived at all; pages carry their own wrapper as part of
 * block-less passthrough) ... see renderPage below. */
export function serializeDocument(doc: BookDocument): string {
  const pagesHtml = doc.pages.map(renderPage).join("\n");
  return doc.prefix + pagesHtml + doc.suffix;
}

function renderPage(page: Page): string {
  const blocksHtml = page.blocks.map((b) => b.html).join("\n");
  // .page__full comes BEFORE .page__cols in the real markup (a full-width
  // area above the two-column body — see the Page.fullBlocks doc comment)
  // and is only emitted at all when the page actually had one, so an
  // ordinary page's re-rendered HTML doesn't grow an empty wrapper it
  // never had.
  const fullHtml = page.fullBlocks.length
    ? `<div class="page__full">${page.fullBlocks.map((b) => b.html).join("\n")}</div>`
    : "";
  // Reconstruct the page div's ORIGINAL attributes (class, and crucially
  // style="--fs-base: ...px") instead of a hardcoded `class="page"` —
  // otherwise every page-level style/class set by the pipeline (or by the
  // page font-size slider) gets silently reset on this round-trip. attrs
  // is captured from the live element in parseDocument, so data-page-id
  // is added back on top rather than assumed present in it.
  const attrs = { ...page.attrs, "data-page-id": page.id };
  // trailingGap re-emits whatever non-page content (a stray in-body
  // <style> block, comments, etc.) originally followed this page — see
  // the Page.trailingGap doc comment.
  return `<div ${serializeAttrs(attrs)}>${fullHtml}<div class="page__cols">${blocksHtml}</div></div>${page.trailingGap}`;
}

/** A standalone single-page document — same prefix/suffix (so identical
 * CSS/fonts) but only one page's markup, for the page-navigator thumbnails
 * to render in their own mini-iframe without needing the whole chapter. */
export function renderSinglePageHtml(doc: BookDocument, pageIndex: number): string {
  const page = doc.pages[pageIndex];
  if (!page) return "";
  return doc.prefix + renderPage(page) + doc.suffix;
}

let _pageIdCounter = 0;
function nextPageId(): string {
  return `page-${Date.now()}-${_pageIdCounter++}`;
}

export function addBlankPage(doc: BookDocument, afterIndex: number): BookDocument {
  const pages = [...doc.pages];
  pages.splice(afterIndex + 1, 0, { id: nextPageId(), blocks: [], fullBlocks: [], attrs: { class: "page" }, trailingGap: "" });
  return { ...doc, pages };
}

export function duplicatePage(doc: BookDocument, index: number): BookDocument {
  const source = doc.pages[index];
  if (!source) return doc;
  const clone: Page = {
    id: nextPageId(),
    blocks: source.blocks.map((b) => ({ ...b, id: nextId() })),
    fullBlocks: source.fullBlocks.map((b) => ({ ...b, id: nextId() })),
    attrs: { ...source.attrs },
    // Deliberately NOT source.trailingGap — that's shared/incidental
    // content (e.g. a stray stylesheet) that happened to trail the
    // ORIGINAL page, not something duplicating a page should also clone.
    trailingGap: "",
  };
  const pages = [...doc.pages];
  pages.splice(index + 1, 0, clone);
  return { ...doc, pages };
}

export function deletePage(doc: BookDocument, index: number): BookDocument {
  return { ...doc, pages: doc.pages.filter((_, i) => i !== index) };
}

export function reorderPages(doc: BookDocument, fromIndex: number, toIndex: number): BookDocument {
  const pages = [...doc.pages];
  const [moved] = pages.splice(fromIndex, 1);
  pages.splice(toIndex, 0, moved);
  return { ...doc, pages };
}

/** Immutable update: replaces one block's html by id, for undo-snapshot-
 * friendly state updates (never mutate a Block/Page/BookDocument in place). */
export function updateBlockHtml(doc: BookDocument, blockId: string, newHtml: string): BookDocument {
  return {
    ...doc,
    pages: doc.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((b) => (b.id === blockId ? { ...b, html: newHtml } : b)),
    })),
  };
}

export function removeBlock(doc: BookDocument, blockId: string): BookDocument {
  return {
    ...doc,
    pages: doc.pages.map((page) => ({
      ...page,
      blocks: page.blocks.filter((b) => b.id !== blockId),
    })),
  };
}

export function findBlock(doc: BookDocument, blockId: string): Block | null {
  for (const page of doc.pages) {
    const b = page.blocks.find((x) => x.id === blockId);
    if (b) return b;
  }
  return null;
}

/** Inserts `html` as a new block immediately after `afterBlockId` (or at
 * the end of the first page if afterBlockId is null), returning the new
 * block's id alongside the updated document. */
export function insertBlockAfter(
  doc: BookDocument,
  afterBlockId: string | null,
  html: string,
): { doc: BookDocument; newId: string } {
  const newId = nextId();
  const newBlock: Block = { id: newId, type: inferGenericTypeFromHtml(html), html };

  if (!afterBlockId) {
    const pages = doc.pages.map((p, i) =>
      i === 0 ? { ...p, blocks: [...p.blocks, newBlock] } : p,
    );
    return { doc: { ...doc, pages }, newId };
  }

  const pages = doc.pages.map((page) => {
    const idx = page.blocks.findIndex((b) => b.id === afterBlockId);
    if (idx === -1) return page;
    const blocks = [...page.blocks];
    blocks.splice(idx + 1, 0, newBlock);
    return { ...page, blocks };
  });
  return { doc: { ...doc, pages }, newId };
}

function inferGenericTypeFromHtml(html: string): string {
  const el = new DOMParser().parseFromString(html, "text/html").body.firstElementChild;
  return el ? blockTypeFor(el) : "generic";
}

/** Moves a block (by id) to a new position: before `beforeBlockId` in
 * whichever page currently contains it, or to the end of `targetPageId`
 * if beforeBlockId is null — the single primitive both same-page reorder
 * and cross-page move share. */
export function moveBlock(
  doc: BookDocument,
  blockId: string,
  targetPageId: string,
  beforeBlockId: string | null,
): BookDocument {
  let moving: Block | null = null;
  const withoutMoved = doc.pages.map((page) => {
    const idx = page.blocks.findIndex((b) => b.id === blockId);
    if (idx === -1) return page;
    moving = page.blocks[idx];
    return { ...page, blocks: page.blocks.filter((b) => b.id !== blockId) };
  });
  if (!moving) return doc;

  const pages = withoutMoved.map((page) => {
    if (page.id !== targetPageId) return page;
    const blocks = [...page.blocks];
    const insertIdx = beforeBlockId ? blocks.findIndex((b) => b.id === beforeBlockId) : blocks.length;
    blocks.splice(insertIdx === -1 ? blocks.length : insertIdx, 0, moving as Block);
    return { ...page, blocks };
  });
  return { ...doc, pages };
}
