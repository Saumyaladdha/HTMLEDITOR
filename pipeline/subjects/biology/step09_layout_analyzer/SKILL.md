---
name: step09_layout_analyzer
description: Paginate a biology chapter. Use when dead space is large, or to confirm table splitting (biology's dead-space fix) is still landing — the worst hole dropped from 1026px to 422px once table's split payload shipped.
---

# Layout Analyzer — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step09_layout_analyzer/SKILL.md` — **read it
> first** for the packing/settle mechanism, the `sorted by hole size not
> index` rule, and `absorb_tail_page`; all of it applies unchanged. The CODE
> is shared — one `pipeline/step09_layout_analyzer/run.py` for both subjects.

## What this step is for

Pagination: measuring, packing, reclaiming dead space.

## Table splitting has landed — this is CURRENT state, not outstanding work

`book/assemble/render.py:88` `split_payload()` handles `kind == "table"`
today: a table's rows become a split payload the same way a `bullets` list
does, header included so a continuation repeats it (see `step12`). Confirm
before assuming otherwise — do not describe table splitting as future work.

Measured before and after, on chapter 1:

| | first build (no table split) | current build |
|---|---|---|
| pages | 41 | 41 |
| total dead space | 19,997px | 19,991px |
| worst single hole | **1,026px** | **422px** |
| slack findings (380–620px) | 17 (all `gap`-tier) | 4 (`slack`-tier only) |
| `gap`-tier findings (>620px) | present | **0** |

The mechanism: `splittable = ("bullets", "options", "table")` in
`book/subjects/biology.py`, and `render.split_payload()` is explicitly
GATED per-subject (`k not in _PROFILE.get("splittable", ())`) — adding
`table` to biology's list does not touch physics's packing, because
physics's `splittable` tuple is separate and physics's 61-page output stays
the regression baseline (`render.py:88`'s own comment says exactly this).

## Decision tree — a table hole that still won't close

```text
IF a table-adjacent hole remains ≥300px after the split pass ran
    CHECK whether the table's row count is small (2-3 rows) — a table
    below `min_rows=2, min_keep=1`'s floor cannot be split further; that
    hole is a genuine structural limit, not a bug

    CHECK whether the NEXT block after the table is itself atomic
    (`figure`, `callout`, `flow`) — the split pass can move rows INTO the
    hole but cannot pull a following atomic block up to fill what's left;
    that is `step10`'s "next block is atomic" reason, not this step's

    OTHERWISE: report it — a hole this step's own mechanism should have
    closed and did not is a real regression, not an accepted structural gap
```

## Where remaining reclaimable space sits

| kind | count in ch.1 | splittable? |
|---|---|---|
| `options` | 41 | yes |
| `numbered` | 14 | **no — see below** |
| `table` | 10 | yes |
| `bullets` | 4 | yes |

**`numbered` is deliberately NOT splittable**, despite being a list, and
this is not an oversight: an `<ol>` continuation restarts at 1 unless given
a `start` attribute, and a wrong number is worse than a hole — it tells a
student item 4 is item 1. Adding `numbered` to `splittable` requires first
adding `start=` support to the `numbered` component/renderer; doing one
without the other would ship a visible numbering bug to reclaim a few
hundred pixels. There are 14 of these blocks, so it remains worth doing
properly, but do not add `numbered` to the profile's `splittable` tuple
until that support exists.

## Rules that carry over unchanged from physics

- Order candidates by HOLE SIZE, not index — sorting the dict's keys walks
  the book backwards and spends the budget on late holes.
- `min_rows=2, min_keep=1` — one row moved up is still a row.
- Judge each split LOCALLY, on the hole it targeted — `settle` only
  ratchets heights up, so a global total can say "worse" even when the
  target hole was genuinely filled.
- `absorb_tail_page` for a nearly-empty final sheet.

## What to check before closing this step

- [ ] `10_space.json`'s `gaps` count is 0 (or every remaining gap is
      explained by the decision tree above) — the current build has 0
      `gap`-tier findings and this should hold for any biology chapter of
      comparable shape; a new chapter reporting several `gap`s is a
      regression worth investigating, not the expected baseline.
- [ ] `worst_free_px` is reported and compared against the 422px baseline
      above — a new chapter significantly worse than this, with a similar
      table/options mix, means the split pass is declining holes it
      shouldn't.
- [ ] No `numbered` block was added to `splittable` without `start=`
      support landing first.

## Never

- Never raise `CONTENT_H` to make overflow go away — the number is
  measured, not chosen; changing it hides clipping rather than fixing it.
- Never disable `settle` to speed up a build — without it, "it fits" is an
  opinion, not a measurement.
- Never add `numbered` to biology's `splittable` tuple without `start=`
  support in the renderer first — see above.

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
