---
name: step06_latex_validator
description: Validate arts LaTeX. Use when this step reports a finding — it should never have work to do.
---

# Latex Validator — ARTS

> Subject profile: `book/subjects/arts.py` sets `"latex": False`. Everything
> not contradicted here is in
> `pipeline/subjects/biology/step06_latex_validator/SKILL.md` (biology sets
> the same flag), and the CODE is shared.

## Expected state: always clean

Measured on both chapters: zero `\frac`, zero `\vec`, zero `$$`, zero
inline `$…$`. `findings=0` on both the history and geography builds, first
try. If this step ever reports a finding on an arts chapter, treat it as a
sign the chapter is NOT pure prose — check whether a map/timeline table has
smuggled in a coordinate expression or similar, rather than assuming the
validator itself needs an arts-specific rule.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**Three conversions that were broken and must not regress.**

- `\boxed{…}` is the author's own "this is the final answer" marker and
  becomes `.math-result`. Never strip it, and never try to infer the final
  answer from position instead.
- `\\[6pt]` — LaTeX's optional inter-row spacing after a row break — is
  part of the row-break delimiter, not content. Split on the bare `\\`
  and `[6pt]` lands inside the next row's first cell, which corrupted every
  step after it in a derivation.
- A fraction whose numerator and denominator are pure Devanagari
  (`\dfrac{कूलॉम}{वोल्ट}` — any unit written as a ratio) is **maths** and
  stacks. It used to be classified as prose and printed flat with a slash.

Test anything involving backslashes from a **script file**, never
`python3 -c "…"` — bash double quotes collapse `\\` to `\` before Python
sees it, which makes a working fix look broken.
