---
name: step09_layout_analyzer
description: Paginate a maths chapter, where a matrix is wide, tall and atomic — it cannot split, so a hole in front of one may be the packer being correct rather than lazy. Use when a matrix is clipped, an .mxrow splits across a column, or a derivation breaks in a visually wrong place.
---

# Layout Analyzer — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step09_layout_analyzer/SKILL.md` — **read it
> first**, all of it applies unchanged (measured geometry, `settle`'s
> convergence, the flow-vs-columns split criteria, `absorb_tail_page`). This
> file is only what a matrix-heavy chapter adds.

## What is different about paginating maths: the atomic unit is bigger

A matrix is wide, tall, and **atomic by construction** — there is no such
thing as half a matrix. A 3×3 with non-trivial cell expressions can run
~200px across and ~90px high, and `matrix.grid()` gives it no internal break
points at all. `.mxrow` (side-by-side matrices from a multi-line ASCII block,
FORMAT_SPEC §8.5) is set `break-inside: avoid` for exactly this reason:
splitting side-by-side matrices across a column boundary makes them read as
unrelated grids rather than one paired expression.

On the reference chapter: 27 pages, `total_free_px` 16609, `worst_free_px`
1114, 1 gap flagged by step10. That one gap is worth checking against the
next section's first rule below before assuming the packer failed.

## Decision tree — is a hole in front of a matrix a packing bug?

```text
IS the block immediately after the hole a matrix (inline, inside a formula/
   given/flow) or an `.mxrow` (ASCII block)?
    YES → check whether the hole is smaller than that block's measured
    height. If so, the packer correctly declined to split an atomic block
    and closed the column early — this is CORRECT behaviour, route to
    step10 for the "is this hole acceptable" judgement, not back here as
    a packing defect.
    NO → this is an ordinary layout question, same as any subject —
    see the physics reference's "when a page still overflows" checklist.

IS a derivation (a run of `.dm` display lines, each holding one or more
   matrices) breaking BETWEEN lines rather than within one?
    THEN this is correct. A step is the unit; `.dm` lines break between
    each other exactly as intended, the same way a physics derivation's
    steps do.

IS a derivation breaking WITHIN one `.dm` line, mid-matrix?
    THEN this is a hard bug — `.mxrow`'s break-inside:avoid should have
    prevented it. Check whether the block carrying the matrix (not just
    the ASCII `.mxrow` wrapper) is marked atomic in `book/format/rules.py`
    for its kind.
```

## What stays splittable, and what does not

`formula_card` and `table` remain splittable in the maths profile (the
reference chapter carries 72 table rows — the most of any subject — and the
सूत्र-panel-equivalent `मानक परिणाम` catalogue is exactly the kind of long
list that benefits from splitting across a column boundary). `bullets` and
`options` too, same as physics. **A matrix itself — whether inline or an
`.mxrow` — is never in the splittable set**, because there is no rule for
what "half a matrix" would mean visually.

## What to check before signing off

- [ ] No page reports `overflow` — content is CLIPPED, not reflowed, exactly
      the physics warning; a maths chapter's matrices being wide makes this
      easier to trigger, not exempt from the rule.
- [ ] Every `.mxrow` in the rendered draft has no internal column break —
      spot-check the multi-line ASCII blocks specifically, since they are
      the ones most likely to be tall enough to tempt a split.
- [ ] A derivation's `.dm` lines break only between lines, never inside one.

## Never

- Never raise `CONTENT_H` because a matrix does not fit — same rule as
  physics, doubly true here since matrices are the tallest atomic blocks
  this subject produces.
- Never conclude a hole in front of a matrix is a bug without checking the
  matrix's measured height against the hole first. That check is the
  entire difference between a real packing defect and the packer working
  correctly — see step10 for where this judgement actually gets made.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**Three structural changes to the packer's world.**

- **Part 1 is two columns**, packed by `pack_columns` in the same stream as
  Part 2 — a part boundary is no longer a page boundary. There is no
  `flowwrap` half and no floated note column.
- **`GAP` is 0**, and that is measured: across 54 built columns and 601
  block boundaries the real space between stacked blocks is 0.22px. It was
  9, which invented ~100px of phantom occupancy per column. If the
  stylesheet ever puts real space back between `.u` siblings, **re-probe**
  and set it to what the browser reports.
- A part banner that opens a page is **hoisted out of the column** into the
  page header so it spans the sheet. The packer still charges its column
  height, so that can only leave a page emptier than modelled, never
  overfull.

`.page` is `overflow:hidden` — clipped content is DELETED, so the settle
pass measuring a real render is not optional.
