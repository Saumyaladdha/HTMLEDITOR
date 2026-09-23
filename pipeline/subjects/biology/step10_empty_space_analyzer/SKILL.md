---
name: step10_empty_space_analyzer
description: Report where biology's dead space is, and judge it against the CURRENT baseline (worst hole 422px, 0 gap-tier findings) now that table splitting has landed — not the first build's 1026px/17-gap numbers, which are history.
---

# Empty Space Analyzer — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step10_empty_space_analyzer/SKILL.md` —
> **read it first** for the `ok`/`slack`/`gap`/`lopsided` thresholds and the
> `leave`/`repack`/`decorate` action triage; both apply unchanged. The CODE
> is shared — one `pipeline/step10_empty_space_analyzer/run.py` for both
> subjects.

## What this step is for

Reporting where the dead space is, so `step09`'s packing can be judged.

## Read biology's numbers against the CURRENT baseline, not the historical one

Biology's first build (before `table` was added to `splittable`, see
`step09`) had a 1,026px worst hole and 17 holes ≥300px. **That is now
history, not the current state**: the current build measures a 422px
worst hole, 4 `slack`-tier findings, and **0 `gap`-tier findings**, after
`book/assemble/render.py`'s `split_payload()` gained a `table` branch. Do
not read a new biology chapter's numbers against the 1,026px figure and
conclude the layout is "about as good as biology gets" — the working
baseline today is the 422px one, and a new chapter with several `gap`-tier
findings is a real regression worth investigating, not an accepted
biology-specific ceiling.

## Decision tree — reading a `gap`/`slack` finding on a new biology chapter

```text
IF total gap-tier findings > 0 on a chapter with a similar
   table/options/bullets mix to chapter 1
    THEN treat this as a REGRESSION first, not a structural biology limit —
    the mechanism that reduced 17 gaps to 0 is shared code
    (render.split_payload) and should behave the same way on comparable
    content; find out why it declined this chapter's holes (see step09's
    decision tree — small tables, an atomic block immediately following)

IF the chapter has an unusually LOW table/options/bullets count (a
   prose-heavy biology chapter, unlike ch.1's front-matter-dense shape)
    THEN a return toward the historical 1,026px-style numbers is plausible
    and not automatically a bug — there is genuinely less splittable
    content for the mechanism to act on; report the shape (block-kind
    counts) alongside the hole numbers so the comparison is fair
```

## Never

- Never flag the last page of a document — it is meant to end short.
- Never treat lopsided columns as a defect on their own — the packer fills
  column 1 before column 2 by design.
- Never cite the 1,026px/17-gap figures as biology's expected performance
  on a NEW chapter without first checking whether table splitting is
  actually running (`step09`'s table above) — those numbers describe a
  build from before that mechanism existed and are not a target to match.

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
