---
name: step09_layout_analyzer
description: Diagnose arts pagination failures — currently clean on both chapters (0 overflow). Arts's overflow risk comes from a long atomic `answer` paragraph that cannot split, not from a tall equation or matrix the way physics/maths risk it. Use when a page clips or a settle loop does not converge.
---

# Layout Analyzer — ARTS

> Subject profile: `book/subjects/arts.py`. Everything not contradicted here
> is in `pipeline/subjects/biology/step09_layout_analyzer/SKILL.md` and
> `pipeline/subjects/physics/step09_layout_analyzer/SKILL.md` (read that one
> first — the measured-not-calculated geometry, the `settle` convergence
> model, and the `.page{overflow:hidden}` clipping danger are defined there
> and apply unchanged, and `splittable = ("bullets", "options", "table")` is
> shared byte-for-byte with biology). The CODE is shared:
> `pipeline/step09_layout_analyzer/run.py`, `book/layout/pack.py`,
> `book/layout/split.py`.

## Current state — clean, TWO-COLUMN throughout, and NOT the same page count as before

`build/arts-01-history/artifacts/09_layout.json`: `pages: 21, mode: "a4",
overflow: []`. `build/arts-02-geography/artifacts/09_layout.json`:
`pages: 20, mode: "a4", overflow: []`. **`mode: "a4"` is the PAGE-SIZE
profile, not a column count — do not read it as "single column."** Counting
`class="acol"` directly in both current drafts: history 20 of 21 pages
carry exactly 2 `acol` divs (only the cover page is `flowwrap`, single-
width); geography 19 of 20. Both chapters are almost entirely two-column —
Part 2 (`acols`) always is, by `book/assemble/html.py`'s own design (a
"flow part" is only a part whose children are ALL `section`-kind with no
`qgroup`; every arts Part 1 still ends up in `col_parts` here, since it was
measured going through the column packer just like Part 2 — verify against
`VIDYUT_PART1_COLUMNS`/the part's own child-kind mix before assuming
otherwise on a future chapter). **Physics's two-column dead-space guidance
(`free_by_column`, the flow-vs-columns split-criteria table) DOES apply to
arts** — an earlier version of this note claimed the opposite; that was
wrong, corrected here against the actual `acol` count in both drafts.

**If you are comparing against an OLDER note that said "27 pages / 28
pages"**: that was measured before this session's reader fixes landed
(`RE_QHEAD` widened to accept `### प्र. N · <title>`, the stray `# चैप्टर
मैप` heading removed — see `step01_md_reader`'s SKILL.md FAULT 1 and FAULT
2). Both fixes change how many blocks are top-level vs nested, which changes
pagination. **21/20 is the CURRENT correct count under a
structurally-correct parse** — a future build landing back near 27/28 would
be the regression, not this number.

## `build/arts-02-geography.html`'s staleness — same trap noted in step07/step07b

The top-level `build/arts-02-geography.html` predates this session's
rebuild and carries `body class="subj-biology"` — it was built without
`--subject arts`. `build/arts-02-geography/draft.html` is the correct
current build (`body class="subj-arts"`), generated this session. History's
two files already match (`build/arts-01-history.html` is `subj-arts`
throughout). Check the `body` class before trusting either arts HTML as
"the current build," geography specifically — see `step07_formatting_agent`'s
SKILL.md for the full `detect()` evidence.

## What actually risks an arts page: an `answer` block that cannot split

`book/format/rules.py` marks `answer` `atomic: true` — splitting an answer
mid-sentence loses the argument, the same reasoning physics's file gives for
a boxed result. Arts's answers run long — 5, 6, sometimes 10 अंक essay
questions of 6-10 sentences (`step07b_answer_beautifier`'s own note) — so
the block most likely to not fit a column's remaining space here is a
**paragraph**, not a formula or matrix the way it would be for
physics/maths, and there is no सूत्र panel (`latex=False`) to be the culprit
either. Two real instances, measured this session
(`probe.empty_space()` + `space.classify()` against the current
`draft.html` — see `step10_empty_space_analyzer`'s SKILL.md for the exact
call and full findings):

- **History, page 7, column 1: 628px free**, paired with a 471px
  column-height difference on the same page. That page carries प्र.13, a
  map-based question with a reserved-plate figure (`चित्र 1.4`) and a
  `स्रोत-नोट` aside, both atomic.
- **Geography, page 10, column 0: 715px free**, column 1 used 1293/1432px
  (576px difference). Reading the page's actual text: column 0 ends
  mid-way through प्र.4/5 (मानवीकरण/प्रकृतीकरण), a long unbulleted answer
  with no internal break — it did not fit the space left in column 0, so
  the whole block moved to column 1, leaving column 0's tail empty.

Both are the same signature: a large `gap` paired with `lopsided` columns on
one page, caused by one atomic block (an answer, or a figure+aside pair)
taller than the space the packer had left when it reached it. This is
`step10`'s "the packer met an atomic block it could not fit and closed the
column early" case — check the block AFTER the gap before assuming a packer
bug.

## Long figure captions did not need special handling

Both chapters carry `[FIGURE: … | ref: … — <200-400 word description>]`
map-question figures (e.g. history चित्र 1.4/1.5/1.6 —
`content/arts_01_history_print_ready.md:351`). These paginate as an
ordinary `figure` block; the long description is the figure's brief data,
not rendered page prose, so its length does not affect layout the way a
long ANSWER paragraph does (see above).

## What to check

- [ ] `overflow: []` in both chapters' `09_layout.json` — if not, apply
      physics's diagnosis order (single block >1432px, float column taller
      than text, settle not converging by round 4) exactly as written
      there; nothing in arts's content changes that order.
- [ ] A `gap` + `lopsided` pair on the same page — check whether the block
      right after the gap is an atomic `answer`, `figure`, or
      `callout`/`srcnote` aside before assuming a packer bug; an
      arts-length essay answer genuinely can be too tall for a partial
      column, and that is a `step10`/`step12` question, not necessarily a
      `step09` regression.
- [ ] Do not read `mode: "a4"` as "single column" — count `acol` divs in
      the actual draft HTML if column layout matters to your decision;
      both current arts chapters are two-column on nearly every page.
- [ ] Before citing a page count for either chapter, check the artifact's
      own `09_layout.json`, not a note in this file — the count has already
      moved once this session (see above).

## Never

- Never treat an old page-count figure — including 27/28 above — as ground
  truth. Always re-read `09_layout.json` for the build you are actually
  looking at; arts's count moves whenever an upstream reader fix changes
  how many blocks a chapter produces, unlike physics/maths where it is far
  more stable chapter to chapter.
- Never raise `CONTENT_H` to make overflow go away — the number is
  measured, not chosen; changing it hides clipping instead of fixing it.
- Never disable `settle` to speed up a build — without it, "it fits" is an
  opinion, not a measurement.
