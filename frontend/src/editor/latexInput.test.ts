import { describe, expect, it } from "vitest";
import { formatLatex, looksLikeLatex, texToPlain } from "./latexInput";

/**
 * LaTeX typed in the editor has to land on the same markup the pipeline
 * produces from the same source, or a formula added by hand sits next to 736
 * pipeline-built fractions looking nothing like them.
 *
 * These assert the INTERMEDIATE (`tex()`'s plain-text form) as well as the
 * final markup, because that intermediate is the contract with
 * `book/validators/latex_convert.py` — if the two drift, this is where it
 * shows.
 */
describe("LaTeX to the pipeline's plain-text form", () => {
  it("turns a fraction into the (a)/(b) form the stacker expects", () => {
    expect(texToPlain(String.raw`\frac{\mu_0}{4\pi}`)).toBe("(μ₀)/(4π)");
  });

  it("nests", () => {
    expect(texToPlain(String.raw`\frac{I(d\vec{l})}{r^3}`))
      .toBe("(I(d**l⃗**))/(r³)");
  });

  it("gives a vector its arrow AND its bold, as latex_convert does", () => {
    expect(texToPlain(String.raw`\vec{B}`)).toBe("**B⃗**");
  });

  it("keeps a subscript that cannot be a small form as markup", () => {
    // `max` has no Unicode small letters, so it stays for formatMath.
    expect(texToPlain(String.raw`v_{max}`)).toBe("v_{max}");
    expect(texToPlain(String.raw`i_1`)).toBe("i₁");
  });

  it("handles the spacing commands, which are punctuation-named", () => {
    expect(texToPlain(String.raw`B\,dl`)).toBe("B dl");
    expect(texToPlain(String.raw`x\!y`)).toBe("xy");
  });

  it("converts Greek and operators", () => {
    expect(texToPlain(String.raw`\theta \times \omega \cdot \pi`))
      .toBe("θ × ω · π");
  });

  it("drops \\left and \\right", () => {
    expect(texToPlain(String.raw`\left( a \right)`)).toBe("( a )");
  });

  it("keeps an unknown command's NAME so nothing vanishes silently", () => {
    expect(texToPlain(String.raw`\weirdcmd x`)).toBe("weirdcmd x");
  });

  it("recognises what is worth converting", () => {
    expect(looksLikeLatex(String.raw`\frac{a}{b}`)).toBe(true);
    expect(looksLikeLatex(String.raw`B\,dl`)).toBe(true);
    expect(looksLikeLatex("plain V = W/q")).toBe(false);
  });
});

describe("LaTeX to the book's markup", () => {
  it("stacks the fraction, exactly as a typed a/b would", () => {
    const html = formatLatex(String.raw`\frac{\mu_0}{4\pi}`);
    expect(html).toContain('class="fr"');
    expect(html).toContain('class="dn"');
    expect(html).toContain("μ₀");
  });

  it("produces the same markup as the plain form it is equivalent to", () => {
    // `\frac{P}{Q}` and a typed `P/Q` must not differ.
    const viaLatex = formatLatex(String.raw`\frac{P}{Q}`);
    expect(viaLatex).toContain('class="fr"');
    expect(viaLatex).toContain("P");
    expect(viaLatex).toContain("Q");
  });

  it("does not leave a backslash on the page", () => {
    expect(formatLatex(String.raw`dB = \frac{\mu_0}{4\pi} \cdot I\,dl`))
      .not.toContain("\\");
  });
});
