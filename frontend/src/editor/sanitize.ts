/**
 * Turns the live editing DOM back into the user's own document.
 *
 * This is the ONLY function that should ever produce HTML for saving or
 * exporting. Saving used to be `"<!doctype html>\n" + doc.documentElement.outerHTML`
 * at three separate call sites, which shipped every piece of editor
 * scaffolding into the stored version and the exported file: `data-block-id`
 * on every block, `draggable="true"`, `cursor:grab`, a red overflow outline,
 * leftover `contenteditable`, and (if an autosave timer happened to fire
 * mid-drag) the drop-indicator element itself.
 *
 * Because all editor state is now class-based and namespaced (see chrome.ts),
 * removing it is exact rather than heuristic — there is no guessing about
 * whether a given outline belonged to the editor or to the document.
 */

import { CHROME_CLASS_PREFIX, CHROME_STYLE_ID } from "./chrome";

const EDITOR_ATTRS = [
  "data-block-id",
  "data-page-id",
  "data-broken-flagged",
  "draggable",
  "contenteditable",
  "spellcheck",
  // A stacked fraction is frozen for the caret while editing — see
  // mathAtomic.ts. The marker is editor state, not content.
  "data-math-atom",
  // Where a formula's own inline style is parked while it is emphasised —
  // see toggleMathEmphasis. Editor bookkeeping, never part of the book.
  "data-emph-prev",
  "data-math-editing",
];

/** The list above, for tests that assert a new piece of editor state is
 * actually stripped. Exported rather than duplicated in the test, so a
 * marker added without being listed here fails instead of silently
 * shipping into every saved chapter. */
export const EDITOR_ATTRS_FOR_TEST: readonly string[] = EDITOR_ATTRS;

const EDITOR_ELEMENT_IDS = [
  "__drop_indicator__",
  "__nested_drop_indicator__",
  // The drop overlays live on <body> rather than in the flow, so nothing
  // removes them structurally — without listing them here they would be
  // serialised straight into the saved chapter.
  "__drop_label__",
  "__side_drop_indicator__",
  // Snap guides live on the .page while a free block is being dragged. A
  // save that lands mid-gesture would otherwise serialise a green hairline
  // into the chapter.
  "__free_drop_indicator__",
  // The landing preview is a CLONE of a real block, and it now lives inside
  // the target's own column so that the column's CSS applies to it (see
  // showGhost). That makes stripping it essential rather than tidy: an
  // autosave landing mid-drag would otherwise write a duplicate of the
  // dragged block into the chapter as content.
  "__drag_ghost__",
  "__ed_guide_x__",
  "__ed_guide_y__",
  CHROME_STYLE_ID,
];

/** Strips editor scaffolding from a detached clone, in place. */
function stripInto(root: Document | Element) {
  EDITOR_ELEMENT_IDS.forEach((id) => {
    // An attribute selector rather than `#id`: it needs no escaping (so no
    // dependency on CSS.escape, which isn't defined in every environment
    // this runs in), and getElementById isn't available here anyway — `root`
    // is a cloned <html> ELEMENT, not a Document.
    root.querySelectorAll(`[id="${id}"]`).forEach((el) => el.remove());
  });

  // The throwaway <input type="file"> that openImagePickerFor appends to the
  // iframe body is normally removed in its own onchange handler — but if the
  // user cancels the OS picker, no change event ever fires and it stays.
  root.querySelectorAll('input[type="file"]').forEach((el) => el.remove());

  root.querySelectorAll("*").forEach((el) => {
    EDITOR_ATTRS.forEach((attr) => el.removeAttribute(attr));

    if (el.classList.length) {
      Array.from(el.classList)
        .filter((c) => c.startsWith(CHROME_CLASS_PREFIX))
        .forEach((c) => el.classList.remove(c));
      // An element whose ONLY classes were editor ones shouldn't be left
      // carrying an empty class="" it never had.
      if (el.classList.length === 0) el.removeAttribute("class");
    }

    // Chrome/Safari leave `style=""` behind after the last inline property is
    // cleared; it's noise in a diff and in the exported file.
    if (el.getAttribute("style") === "") el.removeAttribute("style");
  });
}

/**
 * Serializes the editing document for save/export.
 *
 * Works on a CLONE: the live document must keep its `data-block-id`s,
 * draggability and editor classes, since the user is still editing it. An
 * earlier in-place approach would have had to put all of that back
 * afterwards, and any failure mid-way would leave the canvas unusable.
 */
export function serializeForSave(doc: Document): string {
  const clone = doc.documentElement.cloneNode(true) as HTMLElement;
  stripInto(clone);
  return "<!doctype html>\n" + clone.outerHTML;
}
