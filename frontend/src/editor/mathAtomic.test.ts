import { describe, expect, it } from "vitest";
import {
  ATOMIC_SELECTOR, MATH_ATOM_ATTR, fractionToPlain, markMathAtomic,
} from "./mathAtomic";
import { EDITOR_ATTRS_FOR_TEST } from "./sanitize";
import { formatMath } from "./mathInput";

/** A fraction exactly as the pipeline stacks it — see
 * HTML_Automation/book/format/inline.py stack_fracs. */
function frac(num: string, den: string): HTMLElement {
  const doc = new DOMParser().parseFromString(
    `<body><p class="dm"><span class="m">V <span class="up">=</span> ` +
    `<span class="fr"><span>${num}</span><span class="dn">${den}</span></span>` +
    `</span></p></body>`, "text/html");
  return doc.querySelector<HTMLElement>(".fr")!;
}

describe("a fraction is one atom for the caret", () => {
  it("freezes every fraction so an arrow key steps over it", () => {
    const fr = frac("W", "q");
    const doc = fr.ownerDocument;
    expect(markMathAtomic(doc)).toBe(1);
    expect(fr.getAttribute("contenteditable")).toBe("false");
    expect(fr.getAttribute(MATH_ATOM_ATTR)).toBe("1");
  });

  it("is idempotent — safe to call after every re-render", () => {
    const fr = frac("W", "q");
    markMathAtomic(fr.ownerDocument);
    markMathAtomic(fr.ownerDocument);
    expect(fr.getAttribute("contenteditable")).toBe("false");
  });

  it("leaves sub- and superscripts editable", () => {
    // One line high and linearly ordered: the caret handles them correctly,
    // and freezing them would stop a subscript being fixed without retyping
    // the whole term.
    const doc = new DOMParser().parseFromString(
      `<body><span class="m">v<sub>d</sub>x<sup>2</sup></span></body>`,
      "text/html");
    markMathAtomic(doc);
    expect(doc.querySelector("sub")!.hasAttribute("contenteditable")).toBe(false);
    expect(doc.querySelector("sup")!.hasAttribute("contenteditable")).toBe(false);
    expect(doc.querySelectorAll(ATOMIC_SELECTOR)).toHaveLength(0);
  });

  it("never reaches the saved document", () => {
    // contenteditable and the marker are both editor state.
    expect(EDITOR_ATTRS_FOR_TEST).toContain("contenteditable");
    expect(EDITOR_ATTRS_FOR_TEST).toContain(MATH_ATOM_ATTR);
  });
});

describe("reading a fraction back as source", () => {
  it("recovers the plain form the pipeline parses", () => {
    expect(fractionToPlain(frac("W", "q"))).toBe("W/q");
  });

  it("brackets an operand that contains an operator", () => {
    // `a+b/c` and `(a+b)/c` are different formulas, and the brackets are
    // what fracLeft/fracRight read as the operand boundary.
    expect(fractionToPlain(frac("a + b", "c"))).toBe("(a + b)/c");
    expect(fractionToPlain(frac("v", "2 × r"))).toBe("v/(2 × r)");
  });

  it("does not double-bracket an operand already bracketed", () => {
    expect(fractionToPlain(frac("(a + b)", "c"))).toBe("(a + b)/c");
  });

  it("keeps a subscripted numerator's SCRIPT, not just its text", () => {
    // This used to assert "μ0NI/2r" — the subscript flattened to a plain
    // digit indistinguishable from μ times the number 0. That is the exact
    // bug reported from a real chapter: double-clicking a fraction to fix a
    // typo, then leaving it, turned every `10⁻⁶` inside it into the plain
    // digits `10-6` permanently, because nothing here ever put the marker
    // back. The correct round trip keeps the `_{…}` `scripts()` reads back
    // into a real `<sub>`.
    const doc = new DOMParser().parseFromString(
      `<body><span class="fr"><span>&#956;<sub>0</sub>NI</span>` +
      `<span class="dn">2r</span></span></body>`, "text/html");
    expect(fractionToPlain(doc.querySelector<HTMLElement>(".fr")!))
      .toBe("μ_{0}NI/2r");
  });

  it("keeps a superscript exponent through the same round trip", () => {
    const doc = new DOMParser().parseFromString(
      `<body><span class="fr"><span>9 × <sup>9</sup></span>` +
      `<span class="dn">1 × <sup>-6</sup></span></span></body>`, "text/html");
    const plain = fractionToPlain(doc.querySelector<HTMLElement>(".fr")!);
    expect(plain).toBe("(9 × ^{9})/(1 × ^{-6})");
    // …and scripts() reads it straight back into real <sup> markup, not
    // digits — the digit itself also picks up the usual .up wrapper, same
    // as any exponent the pipeline sets from scratch.
    const rebuilt = formatMath(plain);
    expect(rebuilt).toContain("<sup><span class=\"up\">9</span></sup>");
    expect(rebuilt).toMatch(/<sup>-<span class="up">6<\/span><\/sup>/);
  });
});
