---
name: step10_empty_space_analyzer
description: Judge maths dead space — above all, whether a hole is the packer correctly declining to split an atomic matrix rather than a real pagination defect. Use to decide leave/repack/decorate on a maths chapter's gaps.
---

# Empty Space Analyzer — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step10_empty_space_analyzer/SKILL.md` — the
> thresholds (`ok`/`slack`/`gap`/`lopsided`) and the three actions
> (`leave`/`repack`/`decorate`) apply unchanged. This file is the maths-
> specific version of "look at what comes next."

## Reading the numbers for maths

Reference chapter: 27 pages, 16609px total free, worst hole 1114px, 1 `gap`
flagged.

## Decision tree — before assuming the packer is wrong

```text
LOOK at the block immediately after the gap (per the physics reference's
   "look at what comes next" command).

IS it a matrix (inline, inside formula/given/flow) or an `.mxrow`
   (multi-line ASCII block)?
    YES → compare the gap size to that block's MEASURED height. If the gap
    is smaller, the packer is CORRECT: it declined to split an atomic
    matrix and closed the column rather than clip it. Action: `leave`,
    with the why citing the specific matrix and its height — this is not
    the same finding as a biology or physics gap in front of a divisible
    list, and treating it as one wastes a `repack` attempt that cannot
    succeed (there is no way to split a matrix).

    NO (it's prose, a bullet list, a splittable table/formula_card) →
    this is an ordinary gap, diagnose it the way the physics reference
    does: is the packer giving up early on a block that could actually
    split? Route to step09/step12 as appropriate.
```

This is the one genuinely different diagnosis maths needs versus the other
two subjects: a physics or biology gap in front of a divisible list is
usually the packer being lazy; a maths gap in front of an atomic matrix is
usually the packer being right. Do not apply one subject's default
suspicion to the other's typical cause.

## What to check before signing off

- [ ] For every `gap` finding, confirm what block follows it and whether
      that block is matrix-shaped before proposing `repack`.
- [ ] A `repack` proposal against a matrix-caused gap is a wasted
      round — verify a `leave` or `decorate` action is being used instead
      once the matrix has been confirmed as the cause.

## Never

- Never propose `repack` against a hole caused by an atomic matrix that
  genuinely does not fit the remaining space. There is nothing to
  repack — the matrix cannot be split, only moved, and moving it does not
  shrink it.
- Never flag the last page of the document, same rule as every subject —
  it is meant to end short.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**There is now a measured benchmark.** Probing the reference edition the
same way this step probes a build:

| | pages | avg free / column | worst column |
|---|---|---|---|
| reference | 35 | **105px** | 418px (on the last page) |

So ~105px of slack per column is what a good build looks like — not zero.
A column far above that wants explaining; the whole book far above it means
the packer is stopping early, which is what a wrong `GAP` did (it charged
9px a boundary against a real 0.22px and cost ~100px a column).

Judge the **worst hole** as well as the total: one column two-thirds empty
reads as a mistake, the same slack spread over six does not.
