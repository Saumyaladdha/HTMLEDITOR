---
name: step14_html_assembler
description: Emit maths HTML and verify the matrix survived assembly intact — present, not doubled, not reduced to a bare sentinel index. Use when a matrix is missing, doubled, or arrives as a bare letter/number where a grid should be.
---

# Html Assembler — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step14_html_assembler/SKILL.md` — the assembler's
> one invariant ("bytes out ≥ bytes in"), slot-filling, and the "never let the
> assembler transform text" rule all apply unchanged. This file is what to
> verify about matrices specifically once the final HTML exists.

## What to verify in maths output

- **Matrix count.** The reference chapter produces 508 `.mx` spans for 496
  source LaTeX environments plus the ASCII-block grids — more spans than
  source environments is expected (an ASCII block's several side-by-side
  matrices each get their own `.mx`). **A count near zero with digits
  scattered through the text** means the sentinel was destroyed before this
  step ever ran — see step07's "why the index is letters" account; this is
  the visible symptom of that exact failure mode reaching the final page.
- **No `\begin{` left anywhere in the output** — `grep -c '\\\\begin{'
  build/<stem>.html` must be 0.
- **No bare sentinel** (`\ue040` or `\ue041`, the matrix stash markers,
  `book/format/inline.py:1005-1020`) in visible text. A leaked sentinel
  prints as a hollow box or an invisible control character depending on the
  font, and is easy to miss by eye — grep for it, do not rely on the
  screenshot.
- **`--c` present on every `.mx`.** Its absence means the grid fell back to
  one column and rendered as a vertical strip, not a grid — see step13.
- **`.mxrow` present for every ASCII block**, one per source block.

## What to check before signing off

- [ ] `grep -c '\\\\begin{' build/<stem>.html` → 0
- [ ] `grep -c '\ue040\|\ue041' build/<stem>.html` → 0 (leaked matrix
      sentinel; **note this is NOT covered by any automated scanner
      currently** — `tools/scan_render_defects.py`'s `sentinel` rule and
      `book/validators/latex_check.py`'s `unreopened_sentinel` check both
      only cover the sub/superscript sentinel range, not the matrix pair —
      this grep must be run by hand until that gap is closed)
- [ ] Every `.mx` in the output carries a `--c` attribute
- [ ] `.mx` count is plausible against the source's matrix-environment
      count (roughly equal or somewhat higher, never near zero)

## Physics and biology must be unaffected

Same rule as the physics reference: adding or changing maths-specific
assembly must not change a tested subject's output. The matrix passes are
inert for physics and biology because neither contains a matrix
environment — verify by rebuilding both and diffing their block counts, not
by assuming the subject gate protects them.

## Never

- Never assume a near-zero `.mx` count with visible digits is a content
  problem. It is the sentinel-destruction failure mode — check step07's
  sentinel logic before touching anything else.
- Never skip the sentinel-leak grep because "the scanner already checks
  this." As of this writing it does not for the matrix-specific sentinel
  pair — see the checklist note above.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**The page shell and both halves changed.**

- every page is `.page > .sheet-body`, with an always-on
  `<footer class="page-bottom"><span class="page-number">`;
- both halves are two-column `.acols`; a page holding a Part-1 item is
  `.acols.revision-flow` and each such item is `.u.revision-unit`;
- a part banner opening a page is hoisted out of the left column into the
  page header, so it spans the sheet;
- `.qhead` carries `id="q-N"`; the dashed rule between questions is its
  `border-top`, not a `.qsep` element;
- the cover is a LINEAR stack — `.source-front-title` then one
  `.source-front-section` per `##` heading, in source order. It is not a
  role-classified card grid.
