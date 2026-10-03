/**
 * THE `.u` WRAPPER, AND WHY EVERY STRUCTURAL EDIT HAS TO KNOW ABOUT IT.
 *
 * The pipeline wraps every block it emits in a `<div class="u">`:
 *
 *     <div class="acol"><div class="u" data-it="7"><p class="q">…</p></div>…
 *
 * The wrapper is not decoration. It is a margin-collapse guard — in a column
 * it is `display:flow-root`, so a child's margins cannot collapse THROUGH it
 * and the height the packer measured is the height the block occupies. See
 * _wrap() in HTML_Automation/book/assemble/html.py.
 *
 * The consequence for the editor is that `.u`, not the block, is the thing
 * that occupies a line. Any edit that adds or removes a line has to work at
 * that level, and code that reaches for `block.parentElement` gets the
 * wrapper when it meant the column. That mistake has now produced the same
 * bug four separate times:
 *
 *   - reordering inserted the dragged block INSIDE the target's wrapper, so
 *     it landed in roughly the right area but the wrong slot (pairUnit);
 *   - clipping a panel put the second half inside the first half's wrapper,
 *     so dragging either half moved both;
 *   - cutting a block left the empty wrapper behind — a blank line, still
 *     carrying its margin guard;
 *   - pasting put the pasted block inside the selected block's wrapper, so
 *     the two then moved as one.
 *
 * Hence this module. If an edit changes which lines exist, it goes through
 * here rather than touching parentElement directly.
 */

/** The `.u` guard around `el`, or null if the document does not use them. */
export function unitOf(el: HTMLElement): HTMLElement | null {
  const parent = el.parentElement;
  return parent && parent.classList.contains("u") ? parent : null;
}

/** Whatever occupies the line `el` is on — its wrapper, or `el` itself. */
export function lineOf(el: HTMLElement): HTMLElement {
  return unitOf(el) ?? el;
}

/** The container the LINES live in — the column, not the wrapper. */
export function lineParentOf(el: HTMLElement): HTMLElement | null {
  return lineOf(el).parentElement;
}

/**
 * Puts `block` on its own line directly after `after`'s line.
 *
 * When the document uses `.u` guards, `block` is given one of its own: a
 * shallow clone of the neighbour's, so it keeps whatever classes the document
 * put there. `data-it` is dropped — that id belongs to the packer's item for
 * the existing block, and two lines claiming one would misdirect any height
 * correction that reads it back.
 */
export function insertLineAfter(after: HTMLElement, block: HTMLElement): HTMLElement {
  const unit = unitOf(after);
  if (!unit) {
    after.after(block);
    return block;
  }
  const wrapper = unit.cloneNode(false) as HTMLElement;
  wrapper.removeAttribute("data-it");
  wrapper.appendChild(block);
  unit.after(wrapper);
  return wrapper;
}

/** Appends `block` as the last line of `container` (a column). */
export function appendLine(container: HTMLElement, block: HTMLElement): HTMLElement {
  const last = Array.from(container.children)
    .reverse()
    .find((c): c is HTMLElement => c instanceof HTMLElement);
  if (last && last.classList.contains("u")) {
    const wrapper = last.cloneNode(false) as HTMLElement;
    wrapper.removeAttribute("data-it");
    wrapper.appendChild(block);
    container.appendChild(wrapper);
    return wrapper;
  }
  container.appendChild(block);
  return block;
}

/**
 * Removes `block`, and its wrapper if that leaves it empty.
 *
 * A `.u` left behind still occupies a line and still carries its margin
 * guard, so deleting or cutting a block left a blank gap where it had been.
 */
export function removeLine(block: HTMLElement): void {
  const unit = unitOf(block);
  block.remove();
  if (unit && !unit.children.length) unit.remove();
}
