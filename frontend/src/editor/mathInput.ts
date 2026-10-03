/**
 * Turning typed maths into the markup the book already uses.
 *
 * Typing `P/Q` gave the literal three characters on one line. The pipeline
 * renders the same source as a STACKED fraction — `<span class="fr"><span>P
 * </span><span class="dn">Q</span></span>` — so a formula written in the
 * editor came out looking nothing like the 627 fractions already on the page
 * beside it.
 *
 * The rules here are a direct port of `HTML_Automation/book/format/inline.py`
 * (`stack_fracs`, `upright`, sub/superscripts), including its operand
 * boundaries: `_FR_STOP` decides where a numerator starts and a denominator
 * ends, which is why `V = W/q` makes a fraction of `W/q` and not of `= W/q`.
 * Keeping the two in step matters more than keeping this short — markup that
 * merely looks similar would diverge the moment a chapter is rebuilt.
 *
 * Nothing here runs on its own. It is applied to a selection on request, or
 * to a just-typed run when the user types a space after it, so plain prose
 * containing a slash ("either/or") is never silently turned into a fraction.
 */

import { formatLatex, looksLikeLatex } from "./latexInput";

/** Where a fraction's operand stops, from inline.py's `_FR_STOP`. */
const FR_STOP = new Set(" \t =+×·⇒⇐∝≪≫≤≥≠<>,;∮Σ∑√±→←−-".split(""));

/** Characters that stay UPRIGHT inside otherwise-italic maths — digits,
 * operators, brackets. From inline.py's `_UPRIGHT_CHARS`. */
const UPRIGHT_CHARS = "0123456789π°%()[]{}+=<>≤≥≠≈≡∝×·÷±∓⇒⇐→←↔∞∴∵,;:!|−⋅";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Start of the numerator ending at `i`. */
function fracLeft(s: string, i: number): number {
  let depth = 0;
  let j = i;
  while (j > 0) {
    const ch = s[j - 1];
    if (ch === ")" || ch === "]") depth += 1;
    else if (ch === "(" || ch === "[") {
      if (depth === 0) break;
      depth -= 1;
    } else if (depth === 0 && FR_STOP.has(ch)) break;
    j -= 1;
  }
  return j;
}

/** End of the denominator starting at `i`. */
function fracRight(s: string, i: number): number {
  let depth = 0;
  let j = i;
  while (j < s.length) {
    const ch = s[j];
    if (ch === "(" || ch === "[") depth += 1;
    else if (ch === ")" || ch === "]") {
      if (depth === 0) break;
      depth -= 1;
    } else if (depth === 0 && FR_STOP.has(ch)) break;
    j += 1;
  }
  return j;
}

/** Drops one layer of wrapping brackets: `(a+b)/2` stacks `a+b`, not `(a+b)`. */
function bare(t: string): string {
  const s = t.trim();
  if (s.length > 1 && s.startsWith("(") && s.endsWith(")")) {
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "(") depth += 1;
      else if (s[i] === ")") {
        depth -= 1;
        if (depth === 0 && i !== s.length - 1) return s;   // `(a)/(b)` — not one group
      }
    }
    return s.slice(1, -1);
  }
  return s;
}

/** `x^2` -> superscript, `v_d` -> subscript. A braced run groups: `x^{n+1}`. */
function scripts(s: string): string {
  return s
    .replace(/\^\{([^}]{1,24})\}/g, (_m, g) => `<sup>${g}</sup>`)
    .replace(/_\{([^}]{1,24})\}/g, (_m, g) => `<sub>${g}</sub>`)
    .replace(/\^([A-Za-z0-9+\-−]{1,3})/g, (_m, g) => `<sup>${g}</sup>`)
    .replace(/_([A-Za-z0-9+\-−]{1,3})/g, (_m, g) => `<sub>${g}</sub>`);
}

/** Wraps digit/operator runs in `.up` so they stay upright inside the italic
 * maths face. Never touches the inside of a tag, and never splits an HTML
 * entity — `&lt;` contains a `;`, which is an upright character. */
function upright(s: string): string {
  const cls = "[" + UPRIGHT_CHARS.replace(/[\\\]^-]/g, "\\$&") + "]+";
  const re = new RegExp(`(${cls})`, "g");
  return s
    .split(/(<[^>]+>|&(?:#[0-9]+|#[xX][0-9A-Fa-f]+|[A-Za-z][A-Za-z0-9]*);)/)
    .map((part) =>
      part.startsWith("<") || (part.startsWith("&") && part.endsWith(";"))
        ? part
        : part.replace(re, '<span class="up">$1</span>'),
    )
    .join("");
}

/** One pass of `a/b` -> stacked fraction, left to right. */
function stackOne(s: string): string {
  const i = s.indexOf("/");
  if (i < 0) return s;
  const start = fracLeft(s, i);
  const end = fracRight(s, i + 1);
  const num = bare(s.slice(start, i));
  const den = bare(s.slice(i + 1, end));
  if (!num.trim() || !den.trim()) {
    // A slash with nothing usable either side — a date, a unit, "either/or".
    return s.slice(0, i + 1) + stackOne(s.slice(i + 1));
  }
  const frac =
    `<span class="fr"><span>${scripts(escapeHtml(num))}</span>` +
    `<span class="dn">${scripts(escapeHtml(den))}</span></span>`;
  return escapeHtml(s.slice(0, start)) + frac + stackOne(s.slice(end));
}

/** True if this text is worth converting at all. */
export function looksLikeMath(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  // A slash between two operand-ish runs, or an explicit script marker.
  // A typed operator counts as well: `a*b`, `x>=1`, `p=>q` are maths a
  // keyboard cannot spell, and refusing them meant the star stayed an
  // asterisk on the page.
  return /[A-Za-z0-9)\]]\s*\/\s*[A-Za-z0-9(\[]/.test(t)
    || /[\^_][A-Za-z0-9{]/.test(t)
    || /[A-Za-z0-9)\]]\s*\*\s*[A-Za-z0-9(\[]/.test(t)
    || /(?:<=|>=|!=|=>)/.test(t);
}

/** Typed shorthands for operators there is no key for.
 *
 * `a/b*2` is how a formula gets typed, and the `*` stayed a literal asterisk
 * beside fractions the pipeline had set with `×`. `--` for a minus sign and
 * `>=`/`<=` are the same problem: reachable on a keyboard, wrong on a page.
 * Applied BEFORE stacking, so `×` becomes an operand boundary the way it is
 * in `_FR_STOP`.
 */
const TYPED_OPERATORS: [RegExp, string][] = [
  [/(?<=[\w\)\]])\s*\*\s*(?=[\w\(\[])/g, " × "],
  [/<=>/g, "⇔"],
  [/(?<![<>=!])<=(?!=)/g, " ≤ "],
  [/(?<![<>=!])>=(?!=)/g, " ≥ "],
  [/!=/g, " ≠ "],
  [/=>/g, " ⇒ "],
  [/(?<=\d)\s*-\s*(?=\d)/g, " − "],
];


export function normaliseTypedOperators(text: string): string {
  return TYPED_OPERATORS.reduce((t, [re, to]) => t.replace(re, to), text)
    .replace(/\s{2,}/g, " ");
}


/**
 * Formats a plain string as the book's inline maths.
 *
 * Returns the HTML for a `<span class="m">` — the same wrapper the pipeline
 * puts round every one of its inline maths runs, so the result inherits the
 * Georgia italic face and sits correctly on the line.
 */
export function formatMath(raw: string): string {
  const text = normaliseTypedOperators(raw);
  const stacked = stackOne(text);
  // `scripts` runs inside stackOne for the two operands; anything outside a
  // fraction still needs it.
  const withScripts = stacked.includes('class="fr"') ? stacked : scripts(escapeHtml(text));
  return `<span class="m">${upright(withScripts)}</span>`;
}

/**
 * Replaces the current selection (or the word just typed) with formatted
 * maths. Returns true if anything changed.
 *
 * Works on the live DOM inside the canvas iframe, so it takes the document
 * rather than reaching for a global one.
 */
export function applyMathToSelection(doc: Document): boolean {
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  const text = range.toString();
  // LaTeX FIRST. The source is written in LaTeX, so that is what gets pasted
  // into a formula box — and `looksLikeMath` does not recognise it, so
  // `\frac{\mu_0}{4\pi}` was refused with "select something like P/Q"
  // while the identical source stacked correctly everywhere in the book.
  if (looksLikeLatex(text)) {
    return replaceSelectionWith(doc, sel, range, formatLatex(text));
  }
  if (!text.trim() || !looksLikeMath(text)) return false;
  return replaceSelectionWith(doc, sel, range, formatMath(text));
}


function replaceSelectionWith(
  doc: Document, sel: Selection, range: Range, html: string,
): boolean {
  const holder = doc.createElement("span");
  holder.innerHTML = html;
  const node = holder.firstElementChild;
  if (!node) return false;

  range.deleteContents();
  range.insertNode(node);
  // Caret after the formula, so typing continues in prose rather than inside
  // the fraction.
  const after = doc.createRange();
  after.setStartAfter(node);
  after.collapse(true);
  sel.removeAllRanges();
  sel.addRange(after);
  return true;
}

/**
 * Formats the run of maths immediately before the caret, if there is one.
 *
 * Called when the user types a space: `V = W/q ` becomes a real fraction the
 * moment the expression is finished, which is what makes this feel automatic
 * without ever guessing mid-word. Only the last whitespace-delimited token is
 * considered, so the prose before it is untouched.
 */
export function formatMathBeforeCaret(doc: Document): boolean {
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
  const node = sel.anchorNode;
  if (!node || node.nodeType !== 3) return false;

  const text = node.textContent ?? "";
  const caret = sel.anchorOffset;
  const before = text.slice(0, caret);
  const start = Math.max(before.lastIndexOf(" "), before.lastIndexOf(" ")) + 1;
  const token = before.slice(start);
  if (!looksLikeMath(token)) return false;

  const range = doc.createRange();
  range.setStart(node, start);
  range.setEnd(node, caret);
  sel.removeAllRanges();
  sel.addRange(range);
  return applyMathToSelection(doc);
}
