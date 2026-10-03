/**
 * Text editing + inline color/highlight spans. Hand-rolled Range surgery,
 * not a general rich-text framework — the formatting vocabulary is small
 * and fixed (bold, 11 text-colors, 5 highlights), matching how ix() in
 * engine.py already renders `{color|word}` / `~word~` as
 * `<span class="text-color text-color--red">` / `<span class="highlight highlight--yellow">`.
 */

import type { InlineStyleRecipe } from "./capabilities";
import { looksLikeLatex, formatLatex } from "./latexInput";

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

/**
 * Every Greek letter, operator and mark a maths chapter actually uses,
 * grouped for a picker. Values are the exact glyphs the pipeline itself
 * emits — `book/format/inline.py`'s own Unicode targets — so a symbol
 * typed by hand and one inserted here are indistinguishable on the page.
 */
export const MATH_SYMBOLS: { label: string; symbols: string[] }[] = [
  { label: "Greek", symbols: [
    "α", "β", "γ", "δ", "ε", "θ", "λ", "μ", "π", "ρ", "σ", "τ", "φ", "ψ", "ω",
    "Δ", "Σ", "Φ", "Ω",
  ] },
  { label: "Operators", symbols: [
    "×", "÷", "±", "∓", "·", "≤", "≥", "≠", "≈", "≡", "∝", "→", "⇒", "⇌",
    "∞", "√", "∫", "∂", "∇", "∑", "∏", "∆",
  ] },
  { label: "Marks", symbols: ["°", "′", "″", "⊥", "∥", "∠", "△", "⊙", "∅"] },
];

/**
 * Inserts `text` at the live caret/selection in `doc`, replacing whatever
 * (if anything) is selected — exactly what typing that text would do.
 *
 * READS THE SELECTION FRESH, AT CALL TIME, rather than taking a Range as a
 * parameter. The picker that calls this renders OUTSIDE the iframe as an
 * absolute-positioned overlay (the same shape the colour/highlight swatches
 * already use), so by the time its button is clicked, focus has moved to
 * that button — but the iframe's own `Selection` is a property of ITS
 * document, independent of which element in the OUTER page currently has
 * focus, and survives untouched as long as nothing inside the iframe steals
 * it first. Every other toolbar action here (`toggleInlineTag`, `wrapSelection`)
 * already relies on exactly this, which is why the caller must call
 * `e.preventDefault()` on the button's `mousedown` — the one event that
 * WOULD refocus the outer page and drop the iframe's selection.
 */
export function insertAtCaret(doc: Document, text: string): boolean {
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const node = doc.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  return true;
}

/**
 * Marks the current selection as a vector — `<span class="vec">…</span>`,
 * the exact shape `book/format/inline.py`'s `_vectors()` builds from a
 * letter followed by the combining arrow U+20D7 in the source markdown.
 * The arrow itself is CSS (`::after` in every chapter's own stylesheet,
 * see math-inline/style.css), not a Unicode glyph, which is why this
 * wraps a real element rather than inserting a combining character: a
 * bare U+20D7 renders as whatever the browser's font does with it —
 * usually nothing usable — and would not match a single vector elsewhere
 * on the same page.
 *
 * With no selection (a collapsed caret), inserts a one-letter placeholder
 * `a⃗` for the user to type over, the same "insert a template, not an
 * empty shell" idea `itemEditing.ts` uses for a new row.
 */
export function wrapSelectionAsVector(doc: Document): boolean {
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  const span = doc.createElement("span");
  span.className = "vec";
  if (sel.isCollapsed) {
    span.textContent = "a";
    range.insertNode(span);
  } else {
    try {
      range.surroundContents(span);
    } catch {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
    }
  }
  const after = doc.createRange();
  after.setStartAfter(span);
  after.collapse(true);
  sel.removeAllRanges();
  sel.addRange(after);
  return true;
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

/** Everything built by the maths renderer: a run, a stacked fraction, a
 *  display block, and the `.up`/`.mt`/`.k` parts inside them. */
const MATH_SELECTOR = ".m, .fr, .dm, .up, .mt, .mx, .math-line, [data-math-atom]";

/**
 * Does the selection touch maths?
 *
 * WHY THIS HAS TO BE ASKED BEFORE ANY INLINE FORMATTING. Bold, italic,
 * underline and "clear formatting" all go through `document.execCommand`,
 * which is the only cross-browser way to toggle a tag over an arbitrary
 * mid-text range — and which re-writes the markup it spans to whatever it
 * considers equivalent. For a paragraph that is fine. For maths it is
 * destructive: a stacked fraction is `.fr > span + span.dn`, a term is
 * `.m > .up + sup`, and there is no arrangement of `<b>` that preserves
 * either. `removeFormat` is worse still — it strips exactly the `<b>` and
 * `<sup>` that a formula is built from. The formula does not error; it
 * quietly renders as ordinary text, which is how it was reported: "I
 * highlighted one formula and it goes to normal".
 *
 * Refusing is the honest answer. A formula is edited by double-clicking it
 * (see mathAtomic.attachMathEditing), which round-trips it through the same
 * plain-text form the pipeline reads.
 */
export function selectionTouchesMath(doc: Document): boolean {
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);

  // Inside a formula: the whole selection sits within one.
  const start = range.startContainer;
  const host = start.nodeType === Node.ELEMENT_NODE
    ? (start as Element)
    : start.parentElement;
  if (host?.closest(MATH_SELECTOR)) return true;

  // Or spanning one: any maths element the range intersects, whole or part.
  const scope = range.commonAncestorContainer;
  const root = scope.nodeType === Node.ELEMENT_NODE
    ? (scope as Element)
    : scope.parentElement;
  if (!root) return false;
  for (const el of Array.from(root.querySelectorAll(MATH_SELECTOR))) {
    if (range.intersectsNode(el)) return true;
  }
  return false;
}

/** Toggles a native inline formatting tag (b/i/u) around the current
 * selection. Uses document.execCommand — deprecated but still the only
 * cross-browser way to toggle bold/italic/underline on an arbitrary
 * mid-text range without hand-rolling DOM-splitting for every case
 * (nested tags, partial overlaps, collapsed selections mid-word). */
export function toggleInlineTag(doc: Document, tagName: "bold" | "italic" | "underline"): boolean {
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  if (selectionTouchesMath(doc)) return false;   // see selectionTouchesMath
  doc.execCommand(tagName, false);
  return true;
}

/** Bumps the selected text's font size up/down a step, independent of the
 * block's own --fs-base — wraps the selection in a span with an inline
 * font-size style (relative em, so it still scales with the page's own
 * base size instead of freezing an absolute px value). */
/** How small and how large text may be stepped, relative to its own size. */
const FS_MIN = 0.4;
const FS_MAX = 4;

/**
 * Grows or shrinks text — the SELECTION if there is one, otherwise the whole
 * block.
 *
 * Two things made this feel dead. It did nothing at all unless text was
 * selected first, so clicking a paragraph and pressing A+ appeared broken.
 * And it cleared the selection when it finished, so a SECOND press had
 * nothing to act on: you got exactly one step, then it stopped, however many
 * times you pressed. Both are why "increase and decrease" seemed useless.
 *
 * The selection is now kept across the change, so presses compound, and a
 * collapsed caret steps the block instead of being ignored.
 */
export function stepSelectionFontSize(doc: Document, container: HTMLElement, deltaEm: number) {
  const sel = doc.getSelection();
  const clamp = (v: number) => Math.max(FS_MIN, Math.min(FS_MAX, v));

  // Nothing selected — step the block. Clicking something and pressing A+ is
  // the obvious gesture and it previously did nothing.
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed
      || !container.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    const current = parseFloat(container.style.fontSize || "1") || 1;
    container.style.fontSize = `${clamp(current + deltaEm)}em`;
    return;
  }

  const range = sel.getRangeAt(0);
  const node = range.commonAncestorContainer;
  const startEl = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;

  // Already inside a stepped span — adjust it rather than nesting another.
  // The old test compared the span's whole text against the selection, so any
  // partial re-selection nested a new span instead of stepping the one there.
  const existing = startEl?.closest<HTMLElement>(".fs-step");
  if (existing && container.contains(existing)) {
    const current = parseFloat(existing.style.fontSize || "1") || 1;
    existing.style.fontSize = `${clamp(current + deltaEm)}em`;
    return;
  }

  const span = doc.createElement("span");
  span.className = "fs-step";
  span.style.fontSize = `${clamp(1 + deltaEm)}em`;
  try {
    range.surroundContents(span);
  } catch {
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
  }

  // Keep the words selected, so pressing again keeps going. Clearing the
  // selection here is what limited this to a single step.
  const after = doc.createRange();
  after.selectNodeContents(span);
  sel.removeAllRanges();
  sel.addRange(after);
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

    // A pasted formula — copied straight out of a LaTeX source file or a
    // question bank written in LaTeX — arrives as plain text, not HTML. Runs
    // it through the same converter the ƒx button uses instead of dropping
    // `\frac{\mu_0}{4\pi}` onto the page literally.
    if ((!html || !html.trim() || shiftHeld) && looksLikeLatex(text)) {
      const holder = doc.createElement("span");
      holder.innerHTML = formatLatex(text);
      const formula = holder.firstElementChild;
      if (formula) {
        range.insertNode(formula);
        const after = doc.createRange();
        after.setStartAfter(formula);
        after.collapse(true);
        sel.removeAllRanges();
        sel.addRange(after);
        return;
      }
    }

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
export function clearSelectionFormatting(doc: Document, container: HTMLElement): boolean {
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return false;
  // `removeFormat` strips the very `<b>` and `<sup>` a formula is built from.
  if (selectionTouchesMath(doc)) return false;

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
  return true;
}

/** Class the emphasis below carries, so a chapter's own stylesheet can own
 *  the look and `clearSelectionFormatting` can recognise it. */
export const MATH_EMPHASIS_CLASS = "math-emph";

/**
 * Rings a formula in a gold box and sets it bold — the safe answer to
 * "make this formula stand out".
 *
 * Bold and highlight go through `execCommand`, which rewrites the markup it
 * spans, and a formula is markup: `.fr > span + span.dn` for a stacked
 * fraction, `.m > .up + sup` for a term. So those are refused on maths (see
 * selectionTouchesMath) — and refusing without offering anything would leave
 * a real need unmet, since a key result is exactly what a teacher wants to
 * mark.
 *
 * This touches NOTHING inside: one class on the formula's outermost element,
 * and the same declarations inline so it looks right in a chapter built
 * before the class existed. Toggling it off removes both. The formula's own
 * structure is never read, split or rebuilt, so it cannot be damaged.
 */
/** Where the element's own inline style is parked while emphasis is on, so
 *  removing the emphasis restores exactly what was there. Stripped on save —
 *  see EDITOR_ATTRS in sanitize.ts. */
export const MATH_EMPHASIS_PREV_ATTR = "data-emph-prev";

export function toggleMathEmphasis(el: HTMLElement): boolean {
  // SNAPSHOT AND RESTORE, rather than removing properties one by one.
  // `background` expands to eight longhands and `border` to twelve, and
  // removing a shorthand does not reliably clear what it expanded into — the
  // formula came back carrying `border-top-width: 2px; …` after the emphasis
  // was taken off, which is residue in every future diff of the chapter.
  // Putting the original style back is exact, whatever the browser did in
  // between.
  const on = el.classList.toggle(MATH_EMPHASIS_CLASS);
  if (on) {
    el.setAttribute(MATH_EMPHASIS_PREV_ATTR, el.getAttribute("style") ?? "");
    el.style.fontWeight = "700";
    el.style.background = "#fdf6dd";
    el.style.border = "2px solid #d9a825";
    el.style.borderRadius = "8px";
    el.style.padding = "2px 8px";
    el.style.setProperty("box-decoration-break", "clone");
  } else {
    const prev = el.getAttribute(MATH_EMPHASIS_PREV_ATTR) ?? "";
    el.removeAttribute(MATH_EMPHASIS_PREV_ATTR);
    if (prev.trim()) el.setAttribute("style", prev);
    else el.removeAttribute("style");
  }
  return on;
}


/** The formula a selection or click is inside, if any — what
 *  `toggleMathEmphasis` should be applied to. */
export function mathTargetOf(el: Element | null): HTMLElement | null {
  // Outermost first: emphasising the whole display block reads better than
  // ringing one fraction inside it.
  return el?.closest<HTMLElement>(".dm, .math-line, .mx") ?? el?.closest<HTMLElement>(".m, .fr") ?? null;
}
