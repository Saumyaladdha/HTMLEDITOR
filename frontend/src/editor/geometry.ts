/**
 * Converts a rect measured inside the (unscaled) iframe document into
 * on-screen coordinates in the OUTER page — the iframe itself is shrunk via
 * a CSS `transform: scale()` in the outer document, which getBoundingClientRect
 * already accounts for on the iframe element itself, so the transform only
 * needs to be re-applied to a child rect measured from inside.
 */
export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function toOuterRect(iframeEl: HTMLIFrameElement, innerRect: DOMRect, scale: number): ScreenRect {
  const outer = iframeEl.getBoundingClientRect();
  return {
    left: outer.left + innerRect.left * scale,
    top: outer.top + innerRect.top * scale,
    width: innerRect.width * scale,
    height: innerRect.height * scale,
  };
}

/** A page overflows its fixed print box when its content taller than the
 * page element's own (CSS-fixed) height — `.page` never grows to fit
 * content, it clips/spills, so scrollHeight > clientHeight is a reliable
 * signal without needing to know the exact --pg-h value. A few px of
 * tolerance absorbs sub-pixel rounding from the browser's column layout. */
export function isPageOverflowing(pageEl: HTMLElement): boolean {
  return pageEl.scrollHeight > pageEl.clientHeight + 2;
}
