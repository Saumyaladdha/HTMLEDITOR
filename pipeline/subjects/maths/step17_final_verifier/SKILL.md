---
name: step17_final_verifier
description: Give the final ship/hold verdict on a maths build — the matrix-specific hard gates (every matrix a grid, no LaTeX command printing its own name, no leaked sentinel, no Devanagari in the slanted maths face) plus what NOT to fail on (a hole in front of an atomic matrix, expected notation re-tokenisation, unverified integral handling). Use at the end of a maths pipeline run.
---

# Final Verifier — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step17_final_verifier/SKILL.md` — the three
> verdicts, the "read the queues together" method, and the pre-ship checklist
> (open three PNGs, check page count, check byte counts, confirm every `high`
> finding has a decision) all apply unchanged. This file is what additionally
> blocks or does not block a maths chapter specifically.

## What blocks a release here, in addition to the physics gates

| Gate | Why it is a hard block, not a note |
|---|---|
| **Any matrix rendered as loose digits/text instead of a grid** | `grep -c '\\begin{' build/<stem>.html` nonzero, or a `.mx` with no `--c`. The content survives every word-count check and the mathematical object is still destroyed — see step07's founding account of this exact failure. |
| **Any LaTeX command printing its own name**, matrix cells included | This is where the worst historical fault hid — 68 `\frac`/`\sqrt` inside cells (step06/step07b). A command name on the page is never acceptable, and it is EASIER to miss inside a matrix cell than inline, because the cell sits next to five correctly-converted neighbours. |
| **A leaked matrix sentinel** (the `\ue040`/`\ue041` stash pair) | Not currently caught by the automated scanner (see step14/step15's documented gap) — run the by-hand check from step15 before signing off; do not rely on `scan_render_defects.py` alone for this one gate. |
| **Devanagari inside the ITALIC maths face** | Wrapped in `.mt` is correct and must NOT be flagged; bare inside a `.m` run is wrong. `devanagari_in_maths` was refined specifically to make this distinction — see step15. |
| **Production notes visible on the page** | A source comment block (measured at 1084 characters on the reference chapter) must be fully stripped — see step16. |

## What to report rather than fail on — maths-specific

- **Dead space in front of an atomic matrix.** Worst measured hole on the
  reference chapter: 1114px. A tall matrix that genuinely will not fit is
  the packer being CORRECT (step09/step10's decision tree), not lazy —
  report it, do not fail the build over it.
- **`notation_retokenised` findings.** Reference chapter: 63, all matrix
  cells or subscripted terms, all correct per step16.
- **Integrals are UNVERIFIED, not broken.** `\int` appears 0 times in the
  chapter this whole subject profile was measured against, so nothing about
  integral rendering has been tested against real content. If a new
  chapter contains integrals, **do not report the existing gates as having
  covered them** — say explicitly that this is untested territory and needs
  its own verification pass, the same honesty FORMAT_SPEC and this file's
  sibling documents insist on for every unverified claim.

## Reading maths queues together — pairs worth checking

- `step09` reports a gap on page N *and* the block after it is a matrix →
  almost always step10's "packer is correct" case, not a pagination bug.
  Reject any `step11` decorator proposal for that same page/column.
- `step06` reports a `latex_command` finding *and* `step15`'s screenshot
  shows a matrix on the same page → very likely the SAME fault (a cell
  passthrough), not two independent problems — fix once at `_matrix_cell`,
  confirm both queues clear together.
- `step16` reports `notation_retokenised` clustered on matrix-heavy pages
  *and* nothing else is wrong there → expected, not a signal to keep
  investigating.

## Never

- Never sign off on "every matrix present" without running the
  `grep -c '\\begin{'` and sentinel-leak checks yourself — a build can pass
  every other step's numeric report and still ship a page of raw LaTeX or
  a leaked control character, because neither the word-count check nor the
  block-count check can see either fault.
- Never claim integral rendering "works" because the rest of the chapter's
  gates passed. Passing gates on content that contains zero integrals is
  not evidence about integrals — say so plainly rather than letting a
  clean report imply more than it tested.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**What a green build means now.** Geometry passing is necessary and not
sufficient: the build is judged against `build/REFERENCE_chapter-02.html`,
and the two measurable gates are `overflow=0` and dead space in the
neighbourhood of the reference's **105px free per column**. A build with no
overflow but 250px+ of slack per column is packing wrong.
