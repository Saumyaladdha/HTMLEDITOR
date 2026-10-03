/**
 * A STACKED FRACTION IS ONE THING, NOT SIX.
 *
 * The pipeline sets a fraction as
 *
 *   <span class="fr"><span>V</span><span class="dn">I</span></span>
 *
 * — visually two-dimensional, but in the DOM a plain linear run of nested
 * spans, and fully editable like everything else in the canvas. So pressing
 * the right-arrow through a formula walked the caret INTO the numerator,
 * then into the denominator, then out again. On screen the caret appeared to
 * stick, jump upwards, or vanish, and a space typed at the wrong moment
 * landed inside a fraction cell where it cannot be seen.
 *
 * That is the whole of "in special characters I cannot move the cursor". It
 * is not the characters — no private-use sentinel reaches the output, I
 * checked — it is that a 2D construct was being navigated as though it were
 * text.
 *
 * The fix is to tell the browser what it already looks like: the fraction is
 * ONE atom. `contenteditable="false"` on it makes the caret step over the
 * whole thing in a single arrow press, and makes a click select it rather
 * than land inside it.
 *
 * Editing is not lost — it moves to a deliberate gesture. Double-clicking a
 * fraction turns it back into the plain source the pipeline itself parses
 * (`V/I`), which can be edited as ordinary text and is re-stacked when you
 * leave it. That round trip goes through the same `formatMath` the rest of
 * the editor uses, so a fraction typed by hand and one edited here come out
 * identical.
 *
 * `contenteditable` is already stripped on save (sanitize.ts), so none of
 * this reaches the stored chapter.
 */

import { formatMath } from "./mathInput";

/** Marks the element as an editor-made atom, so it can be found again and
 * so sanitize can drop the attribute. */
export const MATH_ATOM_ATTR = "data-math-atom";
/** Set on the temporary editable span while a fraction is being retyped. */
export const MATH_EDIT_ATTR = "data-math-editing";

/** Everything that should behave as a single character for the caret.
 *
 * Only genuinely two-dimensional constructs. `<sub>`/`<sup>` are left alone:
 * they are ordinary inline text one line high, the caret handles them
 * correctly, and making them atomic would stop a subscript being corrected
 * without retyping the whole term. */
export const ATOMIC_SELECTOR = ".fr";

/**
 * Serializes an element back to the `^{…}`/`_{…}` shorthand `mathInput.ts`'s
 * `scripts()` parses, rather than to plain text.
 *
 * `.textContent` was used here originally, and it drops markup by
 * definition — a superscript exponent has no textual form, so `<sup>-6</sup>`
 * and a bare `-6` sitting beside it read identically once flattened. That is
 * invisible on a fraction with no exponents and permanent on one with them:
 * double-clicking `9 × 10⁻⁶` to fix a typo, then leaving it, re-stacked the
 * numerator from text that no longer said "superscript" anywhere — `10⁻⁶`
 * came back as the plain digits `10-6`, indistinguishable from a wrong
 * answer. Walking the tree and re-emitting the one marker `scripts()` already
 * knows how to read back keeps the round trip lossless in both directions.
 */
function toMarkedText(el: Element | null): string {
  if (!el) return "";
  let out = "";
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const e = node as Element;
    if (e.tagName === "SUP") out += `^{${toMarkedText(e)}}`;
    else if (e.tagName === "SUB") out += `_{${toMarkedText(e)}}`;
    else out += toMarkedText(e);           // `.up` and anything else: unwrap
  });
  return out;
}

/** The plain-text source of a stacked fraction — the inverse of the
 * `stack_fracs` the pipeline applies, and of `formatMath` here.
 *
 * `.dn` is the denominator; everything before it is the numerator. Operands
 * are re-bracketed when they contain an operator, because `a+b/c` and
 * `(a+b)/c` are different formulas and the brackets are what the pipeline's
 * own `fracLeft`/`fracRight` boundaries read.
 */
export function fractionToPlain(fr: HTMLElement): string {
  const den = fr.querySelector<HTMLElement>(":scope > .dn");
  const numParts = Array.from(fr.children).filter((c) => c !== den);
  const text = (el: Element | null) =>
    (toMarkedText(el).replace(/\s+/g, " ").trim());
  const num = numParts.map(text).join("") || text(fr);
  const d = text(den);
  if (!d) return num;
  const wrap = (t: string) => (/[+\-−×·÷/ ]/.test(t) && !/^\(.*\)$/.test(t) ? `(${t})` : t);
  return `${wrap(num)}/${wrap(d)}`;
}

/** Makes every fraction in the document atomic for the caret. Idempotent,
 * so it is safe to call after each re-render. */
export function markMathAtomic(doc: Document): number {
  const frs = Array.from(doc.querySelectorAll<HTMLElement>(ATOMIC_SELECTOR));
  frs.forEach((fr) => {
    // Never freeze the one currently being retyped.
    if (fr.hasAttribute(MATH_EDIT_ATTR)) return;
    fr.setAttribute("contenteditable", "false");
    fr.setAttribute(MATH_ATOM_ATTR, "1");
  });
  return frs.length;
}

/**
 * Double-click a fraction to retype it; blur or Enter re-stacks it.
 *
 * `onChanged` is called only when the text actually differs, so opening a
 * fraction and closing it again does not spend an undo checkpoint.
 */
export function attachMathEditing(doc: Document, onChanged: () => void) {
  doc.addEventListener("dblclick", (e) => {
    const fr = (e.target as Element | null)?.closest<HTMLElement>(ATOMIC_SELECTOR);
    if (!fr || !fr.hasAttribute(MATH_ATOM_ATTR)) return;
    e.preventDefault();
    e.stopPropagation();
    openForEditing(doc, fr, onChanged);
  }, true);
}

function openForEditing(doc: Document, fr: HTMLElement, onChanged: () => void) {
  const source = fractionToPlain(fr);
  const holder = doc.createElement("span");
  holder.setAttribute(MATH_EDIT_ATTR, "1");
  holder.setAttribute("contenteditable", "true");
  // A visible box, because the text shown is the SOURCE and not the
  // formula — without one it reads as the formula having broken.
  holder.style.cssText =
    "outline:2px solid #6c8bff;border-radius:4px;padding:0 3px;" +
    "font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-style:normal;";
  holder.textContent = source;
  fr.replaceWith(holder);

  const finish = () => {
    holder.removeEventListener("blur", finish);
    holder.removeEventListener("keydown", onKey);
    const typed = (holder.textContent ?? "").trim();
    if (!typed) {
      // Emptied: put the original back rather than deleting the formula,
      // which is almost never what an accidental select-all-delete meant.
      holder.replaceWith(fr);
      markMathAtomic(doc);
      return;
    }
    const wrapper = doc.createElement("span");
    wrapper.innerHTML = formatMath(typed);
    // `formatMath` returns a `.m` run; a fraction inside it is what replaces
    // the atom. Where the typed text no longer contains a fraction at all,
    // the whole `.m` run stands in its place.
    const replacement =
      wrapper.querySelector<HTMLElement>(".fr") ??
      (wrapper.firstElementChild as HTMLElement | null);
    if (!replacement) {
      holder.replaceWith(fr);
      markMathAtomic(doc);
      return;
    }
    holder.replaceWith(replacement);
    markMathAtomic(doc);
    if (typed !== source) onChanged();
  };

  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === "Enter") { ev.preventDefault(); finish(); }
    if (ev.key === "Escape") {
      ev.preventDefault();
      holder.removeEventListener("blur", finish);
      holder.removeEventListener("keydown", onKey);
      holder.replaceWith(fr);
      markMathAtomic(doc);
    }
  };

  holder.addEventListener("blur", finish);
  holder.addEventListener("keydown", onKey);

  // Select the whole source, so retyping replaces it.
  const range = doc.createRange();
  range.selectNodeContents(holder);
  const sel = doc.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  (holder as HTMLElement).focus();
}
