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
];

const EDITOR_ELEMENT_IDS = ["__drop_indicator__", "__nested_drop_indicator__", CHROME_STYLE_ID];

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
