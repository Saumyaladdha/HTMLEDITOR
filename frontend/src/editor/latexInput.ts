/**
 * LaTeX typed in the editor -> the markup the book already uses.
 *
 * `mathInput.ts` ports the pipeline's plain-text rules: type `P/Q` and you
 * get the same stacked fraction the chapter has 736 of. But it knows no
 * LaTeX at all, and LaTeX is what the source is written in — so typing
 * `\frac{\mu_0}{4\pi}` into a formula box gave those fourteen characters
 * literally, sitting next to fractions that the pipeline had stacked from
 * the identical source.
 *
 * This is a port of the commands `HTML_Automation/book/validators/
 * latex_convert.py` actually meets in these chapters. It converts LaTeX to
 * the SAME intermediate the pipeline produces — Unicode with `/` for a
 * fraction and `**x**` for a vector — and then hands that to `formatMath`,
 * so a formula typed here and a formula built by the pipeline take the same
 * path and cannot drift apart.
 *
 * What it deliberately does NOT do: environments (`aligned`, `array`) and
 * matrices. Those decide their own line breaks, `tex()` does not handle them
 * either, and a half-supported environment is worse than an unsupported one.
 */

import { formatMath } from "./mathInput";

/** `\alpha` … — the Greek the chapters use, from latex_convert's table. */
const GREEK: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε",
  varepsilon: "ε", zeta: "ζ", eta: "η", theta: "θ", vartheta: "ϑ",
  iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ",
  pi: "π", rho: "ρ", sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ",
  varphi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π",
  Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
};

/** Everything else that maps to one character. */
const SYMBOL: Record<string, string> = {
  cdot: "·", times: "×", div: "÷", pm: "±", mp: "∓",
  leq: "≤", le: "≤", geq: "≥", ge: "≥", neq: "≠", ne: "≠",
  approx: "≈", equiv: "≡", propto: "∝", infty: "∞",
  Rightarrow: "⇒", Leftarrow: "⇐", rightarrow: "→", leftarrow: "←",
  to: "→", therefore: "∴", because: "∵", circ: "°",
  int: "∫", oint: "∮", sum: "Σ", prod: "Π", partial: "∂", nabla: "∇",
  ldots: "…", dots: "…", cdots: "⋯", perp: "⊥", parallel: "∥",
  Delta: "Δ", degree: "°", ell: "ℓ", hbar: "ℏ",
  // spacing — see _SPACING in latex_convert.py
  quad: " ", qquad: "  ",
};

/** Sub/superscript digits, so `x^2` matches what the pipeline emits. */
const SUP: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵",
  "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", "−": "⁻",
};
const SUB: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅",
  "6": "₆", "7": "₇", "8": "₈", "9": "₉", "+": "₊", "-": "₋", "−": "₋",
};

/** Read a `{…}` group at `i`, or a single character. -> [content, nextIndex] */
function group(src: string, i: number): [string, number] {
  while (i < src.length && src[i] === " ") i += 1;
  if (src[i] !== "{") return [src[i] ?? "", i + 1];
  let depth = 0;
  for (let j = i; j < src.length; j += 1) {
    if (src[j] === "{") depth += 1;
    else if (src[j] === "}") {
      depth -= 1;
      if (depth === 0) return [src.slice(i + 1, j), j + 1];
    }
  }
  return [src.slice(i + 1), src.length];
}

const smallable = (s: string, table: Record<string, string>) =>
  s.length > 0 && Array.from(s).every((c) => c in table);

/**
 * LaTeX -> the pipeline's plain-text intermediate.
 *
 * `\frac{a}{b}` becomes `(a)/(b)` rather than any markup, exactly as
 * `tex()` does, because the fraction stacking lives one layer up in
 * `formatMath`. Two implementations of that would drift.
 */
export function texToPlain(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch !== "\\") {
      // `_x` / `^x` outside a command
      if ((ch === "_" || ch === "^") && i + 1 < src.length) {
        const [arg, next] = group(src, i + 1);
        const inner = texToPlain(arg);
        const table = ch === "^" ? SUP : SUB;
        out += smallable(inner, table)
          ? Array.from(inner).map((c) => table[c]).join("")
          : ch + (arg.length > 1 ? `{${inner}}` : inner);
        i = next;
        continue;
      }
      out += ch;
      i += 1;
      continue;
    }
    // a spacing command is punctuation-named, so it is matched first
    const sp = src[i + 1];
    if (sp && ",;:! ".includes(sp)) {
      out += sp === "!" ? "" : " ";
      i += 2;
      continue;
    }
    const m = /^\\([a-zA-Z]+)/.exec(src.slice(i));
    if (!m) { out += ch; i += 1; continue; }
    const cmd = m[1];
    const j = i + m[0].length;

    if (cmd === "frac" || cmd === "dfrac" || cmd === "tfrac") {
      const [num, a] = group(src, j);
      const [den, b] = group(src, a);
      out += `(${texToPlain(num)})/(${texToPlain(den)})`;
      i = b;
      continue;
    }
    if (cmd === "sqrt") {
      const [arg, a] = group(src, j);
      out += `√(${texToPlain(arg)})`;
      i = a;
      continue;
    }
    if (cmd === "vec") {
      const [arg, a] = group(src, j);
      // `**x⃗**` — bold plus the combining arrow, matching latex_convert.
      out += `**${texToPlain(arg)}⃗**`;
      i = a;
      continue;
    }
    if (cmd === "text" || cmd === "mathrm" || cmd === "mathbf"
        || cmd === "operatorname") {
      const [arg, a] = group(src, j);
      out += texToPlain(arg);
      i = a;
      continue;
    }
    if (cmd === "hat") {
      const [arg, a] = group(src, j);
      out += `${texToPlain(arg)}̂`;
      i = a;
      continue;
    }
    if (cmd === "left" || cmd === "right" || cmd === "displaystyle"
        || cmd === "limits") {
      i = j;
      continue;
    }
    if (cmd in GREEK) { out += GREEK[cmd]; i = j; continue; }
    if (cmd in SYMBOL) { out += SYMBOL[cmd]; i = j; continue; }
    // an unknown command: keep the NAME, drop the backslash, so nothing is
    // silently lost and the author can see what was not understood.
    out += cmd;
    i = j;
  }
  return out;
}

/** True when this text is worth running through the LaTeX converter. */
export function looksLikeLatex(text: string): boolean {
  return /\\(?:frac|dfrac|tfrac|sqrt|vec|hat|text|mathrm|int|oint|sum|cdot|times|[a-zA-Z]{2,})/
    .test(text) || /\\[,;:!]/.test(text);
}

/** LaTeX -> the book's inline markup, via the same path the pipeline uses. */
export function formatLatex(src: string): string {
  return formatMath(texToPlain(src));
}
