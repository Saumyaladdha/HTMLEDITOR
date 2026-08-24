/**
 * Text editing + inline color/highlight spans. Hand-rolled Range surgery,
 * not a general rich-text framework — the formatting vocabulary is small
 * and fixed (bold, 11 text-colors, 5 highlights), matching how ix() in
 * engine.py already renders `{color|word}` / `~word~` as
 * `<span class="text-color text-color--red">` / `<span class="highlight highlight--yellow">`.
 */

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
 * span with the given class names. Uses surroundContents for the common
 * single-parent-range case, falling back to extractContents + manual
 * re-insertion for a range that spans multiple sibling nodes (the known
 * contenteditable edge case where surroundContents throws). */
export function wrapSelection(doc: Document, container: HTMLElement, className: string, styleVar?: [string, string]) {
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return;

  const span = doc.createElement("span");
  span.className = className;
  if (styleVar) span.style.setProperty(styleVar[0], styleVar[1]);

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

/** Strips bold/italic/underline and text-color/highlight/fs-step spans from
 * the current selection, leaving plain text — the toolbar's "clear
 * formatting" action. */
export function clearSelectionFormatting(doc: Document, container: HTMLElement) {
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return;

  doc.execCommand("removeFormat", false);
  // removeFormat handles b/i/u but not our own classed spans — unwrap those
  // for every node the (possibly now-split) selection still touches.
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
  const toUnwrap: Element[] = [];
  let current = walker.currentNode as Element | null;
  while (current) {
    if (
      range.intersectsNode(current) &&
      (current.classList.contains("text-color") ||
        current.classList.contains("highlight") ||
        current.classList.contains("fs-step"))
    ) {
      toUnwrap.push(current);
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
