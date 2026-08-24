/**
 * Text editing + inline color/highlight spans. Hand-rolled Range surgery,
 * not a general rich-text framework — the formatting vocabulary is small
 * and fixed (bold, 11 text-colors, 5 highlights), matching how ix() in
 * engine.py already renders `{color|word}` / `~word~` as
 * `<span class="text-color text-color--red">` / `<span class="highlight highlight--yellow">`.
 */

import type { InlineStyleRecipe } from "./capabilities";

export function setContentEditable(el: HTMLElement, on: boolean) {
  if (on) {
    el.contentEditable = "true";
    el.focus();
  } else {
    // Removing the attribute (not setting contenteditable="false") keeps
    // the saved/exported HTML clean — every block that had EVER been
    // edited once was otherwise permanently marked contenteditable="false"
    // in the output, forever, which is meaningless outside this editor.
    el.removeAttribute("contenteditable");
  }
}

/** Wraps the current selection (must be fully inside `container`) in a new
 * span carrying `colour`, applied via whichever mechanism THIS document
 * actually supports (see capabilities.ts): the pipeline's semantic class +
 * CSS variable when its stylesheet defines one, otherwise a self-contained
 * inline style that renders in any document. Uses surroundContents for the
 * common single-parent-range case, falling back to extractContents + manual
 * re-insertion for a range spanning multiple sibling nodes (the known
 * contenteditable edge case where surroundContents throws). */
export function wrapSelection(
  doc: Document,
  container: HTMLElement,
  recipe: InlineStyleRecipe,
  colour: string,
) {
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return;

  const span = doc.createElement("span");
  if (recipe.className && recipe.cssVar) {
    span.className = recipe.className;
    span.style.setProperty(recipe.cssVar, colour);
  } else {
    span.style.setProperty(recipe.fallbackProperty, colour);
  }

  try {
    range.surroundContents(span);
  } catch {
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
  }
  sel.removeAllRanges();
}

/** Unwraps the nearest ancestor span matching `className` within `container`,
 * replacing it with its own children (unwrap, not delete). */
export function unwrapAncestor(container: HTMLElement, node: Node, className: string) {
  let el: Element | null = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  while (el && el !== container.parentElement) {
    if (el.classList.contains(className)) {
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      return;
    }
    if (el === container) return;
    el = el.parentElement;
  }
}

/** Toggles a native inline formatting tag (b/i/u) around the current
 * selection. Uses document.execCommand — deprecated but still the only
 * cross-browser way to toggle bold/italic/underline on an arbitrary
 * mid-text range without hand-rolling DOM-splitting for every case
 * (nested tags, partial overlaps, collapsed selections mid-word). */
export function toggleInlineTag(doc: Document, tagName: "bold" | "italic" | "underline") {
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  doc.execCommand(tagName, false);
}

/** Bumps the selected text's font size up/down a step, independent of the
 * block's own --fs-base — wraps the selection in a span with an inline
 * font-size style (relative em, so it still scales with the page's own
 * base size instead of freezing an absolute px value). */
export function stepSelectionFontSize(doc: Document, container: HTMLElement, deltaEm: number) {
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return;

  const node = range.commonAncestorContainer;
  const startEl = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  const existing = startEl?.closest<HTMLElement>(".fs-step");
  if (existing && container.contains(existing) && existing.textContent === sel.toString()) {
    const current = parseFloat(existing.style.fontSize || "1") || 1;
    existing.style.fontSize = `${Math.max(0.5, Math.min(3, current + deltaEm))}em`;
    return;
  }

  const span = doc.createElement("span");
  span.className = "fs-step";
  span.style.fontSize = `${1 + deltaEm}em`;
  try {
    range.surroundContents(span);
  } catch {
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
  }
  sel.removeAllRanges();
}

/** The <a> the caret/selection currently sits inside, if any. */
export function currentLink(doc: Document, container: HTMLElement): HTMLAnchorElement | null {
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const node = sel.getRangeAt(0).commonAncestorContainer;
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const anchor = el?.closest("a") ?? null;
  return anchor && container.contains(anchor) ? (anchor as HTMLAnchorElement) : null;
}

/** Normalises what a person types into a usable href — `example.com` is
 * meant as a web address, not a relative path, and a bare `href` beginning
 * `javascript:` is never acceptable. */
export function normaliseHref(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) return null;
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Applies a hyperlink to the current selection, or updates the one the caret
 * is already inside. There was previously no way to create, edit or remove a
 * link at all — arguably the most basic thing missing from a document editor.
 */
export function applyLink(doc: Document, container: HTMLElement, href: string): boolean {
  const safe = normaliseHref(href);
  if (!safe) return false;

  const existing = currentLink(doc, container);
  if (existing) {
    existing.setAttribute("href", safe);
    return true;
  }

  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return false;

  const anchor = doc.createElement("a");
  anchor.setAttribute("href", safe);
  try {
    range.surroundContents(anchor);
  } catch {
    anchor.appendChild(range.extractContents());
    range.insertNode(anchor);
  }
  sel.removeAllRanges();
  return true;
}

/** Unwraps the link under the caret, keeping its text. */
export function removeLink(doc: Document, container: HTMLElement): boolean {
  const anchor = currentLink(doc, container);
  if (!anchor) return false;
  const parent = anchor.parentNode;
  if (!parent) return false;
  while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
  parent.removeChild(anchor);
  return true;
}

/** Tags worth preserving from pasted rich text. Everything else becomes its
 * own text content — the point is to keep MEANING (emphasis, list structure,
 * links) while discarding the source's appearance. */
const PASTE_ALLOWED_TAGS = new Set([
  "P", "BR", "B", "STRONG", "I", "EM", "U", "S", "SUP", "SUB",
  "UL", "OL", "LI", "A", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "CODE", "PRE",
]);

/**
 * Cleans an HTML fragment from the clipboard.
 *
 * Pasting from Word, Google Docs or a webpage carries the source's entire
 * visual identity with it: `style="font-family:Calibri;font-size:11pt;
 * color:#1F497D"` on every run, `<span class="apple-converted-space">`,
 * `<o:p>` tags, MSO conditional comments. Dropped straight into a
 * contenteditable block (which is what happened before — pasted TEXT was
 * completely unhandled, only pasted IMAGES had a listener) that markup wins
 * over the book's own typography and permanently corrupts the page's look.
 *
 * Keeping structure while dropping presentation is what makes pasted content
 * adopt the destination document's styling, which is what people expect.
 */
export function sanitizePastedHtml(doc: Document, html: string): DocumentFragment {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const out = doc.createDocumentFragment();

  const convert = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent ?? "");
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const el = node as Element;
    if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return null;

    const children: Node[] = [];
    el.childNodes.forEach((child) => {
      const converted = convert(child);
      if (converted) children.push(converted);
    });

    if (!PASTE_ALLOWED_TAGS.has(el.tagName)) {
      // Unwrap: keep what it contained, discard the wrapper and everything
      // it was carrying (classes, inline styles, data attributes).
      const frag = doc.createDocumentFragment();
      children.forEach((c) => frag.appendChild(c));
      return frag;
    }

    const clean = doc.createElement(el.tagName.toLowerCase());
    if (el.tagName === "A") {
      const href = el.getAttribute("href") ?? "";
      // Only http(s)/mailto survive — `javascript:` in a pasted link would
      // otherwise be a script-injection vector straight into the document.
      if (/^(https?:|mailto:)/i.test(href)) clean.setAttribute("href", href);
    }
    children.forEach((c) => clean.appendChild(c));
    return clean;
  };

  parsed.body.childNodes.forEach((child) => {
    const converted = convert(child);
    if (converted) out.appendChild(converted);
  });
  return out;
}

/**
 * Intercepts paste inside contenteditable blocks. Plain text by default;
 * Shift-modified paste keeps (sanitized) structure, matching the convention
 * every editor uses. Returns a detach function.
 */
export function attachPasteSanitizer(doc: Document): () => void {
  // ClipboardEvent carries no modifier state, so the Shift that distinguishes
  // "paste with structure" from "paste as plain text" has to be sampled from
  // the keyboard event that triggered the paste.
  let shiftHeld = false;
  const onKey = (e: KeyboardEvent) => {
    shiftHeld = e.shiftKey;
  };
  doc.addEventListener("keydown", onKey, true);
  doc.addEventListener("keyup", onKey, true);

  const handler = (e: ClipboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target?.isContentEditable) return;
    // Images are handled separately by imageSwap's own listener.
    if (Array.from(e.clipboardData?.items ?? []).some((i) => i.type.startsWith("image/"))) return;

    const html = e.clipboardData?.getData("text/html");
    const text = e.clipboardData?.getData("text/plain") ?? "";
    e.preventDefault();

    const sel = doc.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();

    const node: Node =
      html && html.trim() && !shiftHeld ? sanitizePastedHtml(doc, html) : doc.createTextNode(text);

    range.insertNode(node);
    // Leave the caret after what was just inserted, not before it.
    sel.collapseToEnd();
  };
  doc.addEventListener("paste", handler, true);

  return () => {
    doc.removeEventListener("paste", handler, true);
    doc.removeEventListener("keydown", onKey, true);
    doc.removeEventListener("keyup", onKey, true);
  };
}

/** Strips bold/italic/underline and text-color/highlight/fs-step spans from
 * the current selection, leaving plain text — the toolbar's "clear
 * formatting" action. */
export function clearSelectionFormatting(doc: Document, container: HTMLElement) {
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return;

  doc.execCommand("removeFormat", false);
  // removeFormat handles b/i/u but not our own spans — unwrap those for every
  // node the (possibly now-split) selection still touches. Covers both
  // formatting mechanisms: the pipeline's semantic classes, and the
  // inline-styled <span> used in documents that don't define those classes
  // (see capabilities.ts). Without the second case, "clear formatting" was
  // silently a no-op on any non-pipeline document.
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
  const toUnwrap: Element[] = [];
  let current = walker.currentNode as Element | null;
  while (current) {
    const el = current as HTMLElement;
    const classed =
      el.classList.contains("text-color") ||
      el.classList.contains("highlight") ||
      el.classList.contains("fs-step");
    const inlineStyled =
      el.tagName === "SPAN" &&
      !!(el.style.color || el.style.backgroundColor || el.style.fontSize);
    if (range.intersectsNode(el) && (classed || inlineStyled)) {
      toUnwrap.push(el);
    }
    current = walker.nextNode() as Element | null;
  }
  toUnwrap.forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });
}
