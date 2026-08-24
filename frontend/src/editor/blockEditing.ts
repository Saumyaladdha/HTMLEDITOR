/**
 * Block-level text semantics: Enter splits, Backspace merges, Tab indents.
 *
 * Every block is independently `contenteditable`, which gets inline editing
 * for free but gives no notion of blocks as a SEQUENCE. Pressing Enter
 * therefore inserted a `<div>` or `<br>` INSIDE the current paragraph rather
 * than starting a new one, and Backspace at position 0 did nothing at all.
 * The practical consequence was that you could not add a paragraph by
 * typing — the only way to get a new block was the insert palette — and you
 * could not remove one by backspacing into it. That is the difference
 * between "a page you can restyle" and "a document you can write in".
 *
 * Everything here operates on the live DOM (like the rest of the editor) and
 * reports back what changed, so the caller can re-stamp ids, re-arm dragging
 * and push a single undo checkpoint.
 */

/** Blocks that are edited as a whole even though they contain block-level
 * children — splitting one at the caret would destroy its structure. */
const ATOMIC_TAGS = new Set(["FIGURE", "TABLE", "IMG", "HR", "VIDEO", "AUDIO", "IFRAME", "SVG"]);

const HEADING_RE = /^H[1-6]$/;

export interface EditResult {
  /** Block the caret should end up in. */
  focusBlock: HTMLElement;
  /** Node the caret should be placed after, if a specific position matters. */
  caretAfter?: Node | null;
  /** Caret goes to the very start of focusBlock instead. */
  caretAtStart?: boolean;
}

/** True when a range contains neither text nor any element (an <img> counts
 * as content even though it contributes no characters). */
function rangeIsEmpty(range: Range): boolean {
  if (range.toString().length > 0) return false;
  const contents = range.cloneContents();
  return contents.querySelector("*") === null;
}

export interface CaretPosition {
  atStart: boolean;
  atEnd: boolean;
  collapsed: boolean;
}

/** Where the caret sits relative to `block`'s full contents. */
export function caretPosition(doc: Document, block: HTMLElement): CaretPosition | null {
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!block.contains(range.commonAncestorContainer)) return null;

  const before = doc.createRange();
  before.selectNodeContents(block);
  before.setEnd(range.startContainer, range.startOffset);

  const after = doc.createRange();
  after.selectNodeContents(block);
  after.setStart(range.endContainer, range.endOffset);

  return { atStart: rangeIsEmpty(before), atEnd: rangeIsEmpty(after), collapsed: range.collapsed };
}

function placeCaret(doc: Document, node: Node, atStart: boolean) {
  const sel = doc.getSelection();
  if (!sel) return;
  const range = doc.createRange();
  range.selectNodeContents(node);
  range.collapse(atStart);
  sel.removeAllRanges();
  sel.addRange(range);
}

/** Puts the caret immediately after `node` — the join point after a merge,
 * so continuing to type carries on exactly where the two blocks met. */
function placeCaretAfter(doc: Document, node: Node) {
  const sel = doc.getSelection();
  if (!sel) return;
  const range = doc.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

export function isAtomicBlock(el: HTMLElement): boolean {
  return ATOMIC_TAGS.has(el.tagName);
}

/** The <li> the caret is in, when the caret is inside a list inside `block`.
 * Lists are edited as one block (a <ul> is atomic in the block model), and
 * the browser's native contenteditable behaviour for Enter inside a list is
 * already correct — so list handling is about the EXCEPTIONS (empty item
 * exits the list, Tab indents), not about reimplementing it. */
export function currentListItem(doc: Document, block: HTMLElement): HTMLLIElement | null {
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const node = sel.getRangeAt(0).startContainer;
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const li = el?.closest("li") ?? null;
  return li && block.contains(li) ? (li as HTMLLIElement) : null;
}

/**
 * Splits `block` at the caret into two sibling blocks.
 *
 * The new block keeps the original's tag and attributes so a split paragraph
 * stays a paragraph and keeps whatever styling it had — EXCEPT for a heading
 * split at its very end, where the new block becomes a plain paragraph. That
 * matches what every editor does and what people expect: pressing Enter at
 * the end of a title starts body text, not a second title.
 */
export function splitBlockAtCaret(doc: Document, block: HTMLElement): HTMLElement | null {
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!block.contains(range.commonAncestorContainer)) return null;

  if (!range.collapsed) range.deleteContents();

  const pos = caretPosition(doc, block);
  const tail = doc.createRange();
  tail.setStart(range.endContainer, range.endOffset);
  tail.setEnd(block, block.childNodes.length);
  const fragment = tail.extractContents();

  const startsFresh = pos?.atEnd ?? false;
  let clone: HTMLElement;
  if (HEADING_RE.test(block.tagName) && startsFresh) {
    clone = doc.createElement("p");
    // Carry inline styling across so the new paragraph doesn't jump to a
    // different size/colour than the surrounding body text implies.
    const style = block.getAttribute("style");
    if (style) clone.setAttribute("style", style);
  } else {
    clone = block.cloneNode(false) as HTMLElement;
  }
  clone.removeAttribute("data-block-id");
  clone.appendChild(fragment);

  // A block with no content at all collapses to zero height and becomes
  // impossible to click back into; <br> keeps it a real, selectable line.
  if (!clone.textContent?.trim() && clone.querySelector("*") === null) {
    clone.appendChild(doc.createElement("br"));
  }
  if (!block.textContent?.trim() && block.querySelector("*") === null) {
    block.appendChild(doc.createElement("br"));
  }

  block.after(clone);
  return clone;
}

/**
 * Merges `block` into the block before it (Backspace at position 0).
 *
 * Returns null when there is nothing sensible to merge into — no previous
 * sibling, or a previous sibling that is atomic (merging a paragraph's text
 * into a table or figure would corrupt it). In the atomic case an EMPTY
 * block is still removed, since that's unambiguously what backspacing from
 * an empty line means.
 */
export function mergeWithPrevious(doc: Document, block: HTMLElement): EditResult | null {
  const previous = block.previousElementSibling as HTMLElement | null;
  if (!previous) return null;

  const isEmpty = !block.textContent?.trim() && block.querySelector("img, svg, video") === null;

  if (isAtomicBlock(previous)) {
    if (!isEmpty) return null;
    block.remove();
    return { focusBlock: previous };
  }

  if (isEmpty) {
    block.remove();
    placeCaret(doc, previous, false);
    return { focusBlock: previous };
  }

  // Drop a trailing <br> placeholder on the target, otherwise merged text
  // starts on a visually blank second line.
  const lastChild = previous.lastChild;
  if (lastChild && lastChild.nodeName === "BR") previous.removeChild(lastChild);

  const joinPoint = previous.lastChild;
  while (block.firstChild) previous.appendChild(block.firstChild);
  block.remove();

  if (joinPoint) placeCaretAfter(doc, joinPoint);
  else placeCaret(doc, previous, true);

  return { focusBlock: previous, caretAfter: joinPoint };
}

/** Merges the following block into this one (Delete at the end of a block). */
export function mergeWithNext(doc: Document, block: HTMLElement): EditResult | null {
  const next = block.nextElementSibling as HTMLElement | null;
  if (!next || isAtomicBlock(next)) return null;

  const lastChild = block.lastChild;
  if (lastChild && lastChild.nodeName === "BR") block.removeChild(lastChild);
  const joinPoint = block.lastChild;

  while (next.firstChild) block.appendChild(next.firstChild);
  next.remove();

  if (joinPoint) placeCaretAfter(doc, joinPoint);
  return { focusBlock: block, caretAfter: joinPoint };
}

/**
 * Enter on an EMPTY list item leaves the list — the universal way to stop
 * writing a list. Without it the only escape is to create a new block from
 * the palette and drag it into place.
 */
export function exitListFromEmptyItem(doc: Document, block: HTMLElement, li: HTMLLIElement): HTMLElement | null {
  const list = li.parentElement;
  if (!list) return null;

  const paragraph = doc.createElement("p");
  paragraph.appendChild(doc.createElement("br"));

  const parentLi = list.parentElement?.closest("li");
  if (parentLi) {
    // Nested list: one Enter outdents by one level rather than abandoning
    // the whole list, matching every other editor.
    const promoted = doc.createElement("li");
    while (li.firstChild) promoted.appendChild(li.firstChild);
    li.remove();
    parentLi.after(promoted);
    if (list.children.length === 0) list.remove();
    placeCaret(doc, promoted, true);
    return null;
  }

  li.remove();
  if (list.children.length === 0) {
    block.after(paragraph);
    if (list === block || block.children.length === 0) block.remove();
  } else {
    block.after(paragraph);
  }
  placeCaret(doc, paragraph, true);
  return paragraph;
}

/** Tab inside a list nests the item under the one above it. Silently does
 * nothing for the first item of a list, which has nothing to nest under —
 * the same rule every editor uses. */
export function indentListItem(doc: Document, li: HTMLLIElement): boolean {
  const previous = li.previousElementSibling as HTMLElement | null;
  if (!previous || previous.tagName !== "LI") return false;

  let sublist = previous.querySelector(":scope > ul, :scope > ol") as HTMLElement | null;
  if (!sublist) {
    sublist = doc.createElement(li.parentElement?.tagName === "OL" ? "ol" : "ul");
    previous.appendChild(sublist);
  }
  sublist.appendChild(li);
  placeCaret(doc, li, false);
  return true;
}

/** Shift+Tab — the inverse of indentListItem. */
export function outdentListItem(doc: Document, li: HTMLLIElement): boolean {
  const list = li.parentElement;
  const parentLi = list?.parentElement?.closest("li");
  if (!list || !parentLi) return false;

  parentLi.after(li);
  if (list.children.length === 0) list.remove();
  placeCaret(doc, li, false);
  return true;
}

/**
 * Changes a block's element type, preserving its content and inline styling.
 *
 * Turning a paragraph into a heading is the most common single operation in
 * any document editor and there was no way to do it at all. CLASSES are
 * deliberately dropped: in a styled document the class is what encodes the
 * old type (`.text-body`, `.subheading`), so carrying it onto the new tag
 * would keep the old appearance and make the conversion look like it did
 * nothing. Inline `style` is kept, since that's the user's own override.
 */
export function convertBlockType(doc: Document, block: HTMLElement, tagName: string): HTMLElement {
  const replacement = doc.createElement(tagName);
  const style = block.getAttribute("style");
  if (style) replacement.setAttribute("style", style);
  while (block.firstChild) replacement.appendChild(block.firstChild);
  block.replaceWith(replacement);
  return replacement;
}

/** Types offered by the block-type control. */
export const BLOCK_TYPES: { tag: string; label: string; shortcut?: string }[] = [
  { tag: "p", label: "Paragraph", shortcut: "Ctrl+Alt+0" },
  { tag: "h1", label: "Heading 1", shortcut: "Ctrl+Alt+1" },
  { tag: "h2", label: "Heading 2", shortcut: "Ctrl+Alt+2" },
  { tag: "h3", label: "Heading 3", shortcut: "Ctrl+Alt+3" },
  { tag: "h4", label: "Heading 4", shortcut: "Ctrl+Alt+4" },
  { tag: "blockquote", label: "Quote" },
  { tag: "pre", label: "Code" },
];
