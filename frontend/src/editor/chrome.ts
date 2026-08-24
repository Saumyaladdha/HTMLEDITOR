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
} as const;

const CHROME_CSS = `
/* Injected by the editor. Removed on save — see sanitize.ts. */
.${ED.block} { cursor: grab; }
.${ED.block}:hover { outline: 1px solid rgba(108,139,255,0.35); outline-offset: 2px; }
.${ED.nestedItem} { cursor: grab; }
.${ED.dragging} { opacity: 0.35 !important; cursor: grabbing !important; }
.${ED.overflow} { outline: 4px solid #e05a5a !important; outline-offset: -4px; }
.${ED.multiSelected} { outline: 2px dashed #6c8bff !important; outline-offset: 2px; }
.${ED.dropTarget} { outline: 3px dashed #6c8bff !important; }
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
