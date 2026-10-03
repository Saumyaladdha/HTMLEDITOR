import { describe, expect, it } from "vitest";
import { formatMath, looksLikeMath, normaliseTypedOperators } from "./mathInput";

describe("formatting typed maths", () => {
  it("stacks a fraction the way the pipeline does", () => {
    // The exact markup chapter 3 already contains 627 times.
    expect(formatMath("P/Q")).toContain(
      '<span class="fr"><span>P</span><span class="dn">Q</span></span>',
    );
  });

  it("takes only the operands, not the whole line", () => {
    // `_FR_STOP` is why the numerator is `W` and not `V = W`.
    const html = formatMath("V = W/q");
    expect(html).toContain("<span>W</span>");
    expect(html).toContain('<span class="dn">q</span>');
    expect(html).toContain("V ");
  });

  it("unwraps one layer of brackets", () => {
    const html = formatMath("(a+b)/2");
    // The operand is `a+b`, not `(a+b)`. The `+` inside then picks up its own
    // `.up` wrapper, exactly as the pipeline does — so this checks the
    // brackets are gone rather than expecting an untouched string.
    expect(html).not.toContain(">(a+b)<");
    expect(html).toContain("a<span class=\"up\">+</span>b");
  });

  it("keeps (a)/(b) as two separate operands", () => {
    const html = formatMath("(x)/(y)");
    expect(html).toContain("<span>x</span>");
    expect(html).toContain('<span class="dn">y</span>');
  });

  it("handles superscripts and subscripts", () => {
    expect(formatMath("v_d")).toContain("<sub>d</sub>");
    // A superscript DIGIT is upright inside the italic maths face, so it
    // carries a `.up` — the reference does this 428 times and never emits a
    // bare `<sup>2</sup>`.
    expect(formatMath("x^2")).toContain('<sup><span class="up">2</span></sup>');
    expect(formatMath("x^{n+1}")).toContain("<sup>n");
  });

  it("keeps digits and operators upright inside italic maths", () => {
    // 5077 `.up` spans in the reference exist for exactly this.
    expect(formatMath("R = 2")).toContain('<span class="up">');
  });

  it("wraps everything in the book's own inline-maths span", () => {
    expect(formatMath("P/Q").startsWith('<span class="m">')).toBe(true);
  });

  it("escapes markup rather than trusting typed text", () => {
    const html = formatMath("a<b/c");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;");
  });

  it("leaves prose containing a slash alone", () => {
    // "either/or" and "20/25" in a date are not formulas — this is what stops
    // typing turning ordinary words into fractions.
    expect(looksLikeMath("either/or")).toBe(true);   // shape matches…
    expect(looksLikeMath("hello world")).toBe(false);
    expect(looksLikeMath("")).toBe(false);
    // …so the guard that actually protects prose is that this only ever runs
    // on an explicit selection or the token just typed, never on a paragraph.
  });

  it("does not stack a slash with nothing usable beside it", () => {
    expect(formatMath("a/ ")).not.toContain('class="fr"');
  });
});

/**
 * `a/b*2` is how a formula actually gets typed. The `*` stayed a literal
 * asterisk sitting beside fractions the pipeline had set with `×`, and `>=`
 * / `!=` / `=>` had the same problem: reachable on a keyboard, wrong on a
 * page.
 */
describe("operators there is no key for", () => {
  it("turns a typed star into a multiplication sign", () => {
    expect(normaliseTypedOperators("a/b*2")).toBe("a/b × 2");
  });

  it("leaves a star that is not between operands alone", () => {
    expect(normaliseTypedOperators("**bold**")).toBe("**bold**");
  });

  it("converts the comparison shorthands", () => {
    expect(normaliseTypedOperators("x>=1")).toBe("x ≥ 1");
    expect(normaliseTypedOperators("x<=1")).toBe("x ≤ 1");
    expect(normaliseTypedOperators("a!=b")).toBe("a ≠ b");
    expect(normaliseTypedOperators("p=>q")).toBe("p ⇒ q");
  });

  it("uses a real minus between digits", () => {
    expect(normaliseTypedOperators("10-3")).toBe("10 − 3");
  });

  it("still stacks the fraction after normalising", () => {
    const html = formatMath("a/b*2");
    expect(html).toContain('class="fr"');
    expect(html).toContain("×");
  });
});
