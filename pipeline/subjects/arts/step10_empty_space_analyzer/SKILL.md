---
name: step10_empty_space_analyzer
description: Decide whether an empty area on an arts page should stay empty or be reclaimed — arts's two real gaps sit next to an `answer` paragraph and a map `figure`, neither of which is in the splittable tuple, so neither is closable by the mechanism that fixed biology's dead space. Use when step10 reports a gap.
---

# Empty Space Analyzer — ARTS

> Subject profile: `book/subjects/arts.py`. `"splittable": ("bullets",
> "options", "table")` — identical to biology's, since arts also has no
> सूत्र panels to split (`latex=False`). Everything not contradicted here is
> in `pipeline/subjects/biology/step10_empty_space_analyzer/SKILL.md`, and
> the CODE is shared — one `pipeline/step10_empty_space_analyzer/run.py` for
> both subjects.

## State, measured this session against the current `draft.html` for both chapters

(`probe.empty_space()` + `space.classify()`, the same functions
`pipeline/step10_empty_space_analyzer/run.py` calls — run directly to
confirm before trusting a stored artifact; see the staleness note below.)

| | gaps (>620px) | slack (380-620px) | lopsided | worst free px |
|---|---|---|---|---|
| history | 1 | 5 | 1 | 628 |
| geography | 2 | 4 | 1 | 715 |

Compare against biology's own measured numbers (`step10`'s biology
SKILL.md): a 1,026px worst hole and 17 holes over 300px on biology's FIRST
build, before table splitting landed; 422px worst after. Arts's worst holes
(628px / 715px) sit well below biology's PRE-fix number and close to its
POST-fix one — but for a different reason than biology's fix, see below.

**A stored `10_space.json` artifact can be stale — check its mtime against
`09_layout.json` for the same build before citing it.** This session's own
`build/arts-02-geography/artifacts/10_space.json` initially carried an
mtime a full build behind `09_layout.json` for the same directory (the
geography build regenerated its layout under the fix but not, on the first
pass, its space report) — the two files in the same `artifacts/` folder are
not guaranteed to be from the same run. When in doubt, re-run
`probe.empty_space()` directly against the current `draft.html` rather than
trusting the stored JSON's timestamp alone.

## Why arts's reclaimable-space profile is NOT the same as biology's, despite the identical `splittable` tuple

Biology's dead space (per its own SKILL.md) sits in `table`/`options`
holes — kinds `splittable` actually covers, which is exactly why adding
`table` to the tuple dropped its worst hole from 1,026px to 422px. Arts's
TWO real `gap`-tier holes, measured this session, are next to kinds
`splittable` does **not** cover at all:

- **Geography, page 10, column 0 (715px)**: the block that did not fit is
  प्र.4/5's long unbulleted `answer` paragraph (मानवीकरण/प्रकृतीकरण,
  confirmed by reading the page text). `answer` is not in `("bullets",
  "options", "table")` — there is no row-payload mechanism for it, the way
  there is for a list or a table, so this hole cannot be closed by the
  existing split pass at all, at any threshold.
- **History, page 7, column 1 (628px)**: the block is प्र.13, a map
  question's reserved `figure` plate plus a `स्रोत-नोट` aside — both atomic,
  neither splittable by kind for the same structural reason a figure can
  never be (`step09_layout_analyzer`'s "Long figure captions" note).

**The practical consequence:** unlike biology, where the fix was "add a kind
to `splittable`," arts's two current gaps are not fixable by extending the
same tuple — `answer` and `figure` are atomic by their nature (splitting an
argument mid-sentence, or a plate in half, loses the content), not by an
omission from a list. If either recurs across many chapters rather than as
these two isolated pages, the fix would be a genuinely new mechanism (e.g.
letting a very long `answer` break between SENTENCES, the way
`step10`'s own generic file notes prose splitting "is a different mechanism
and does not exist yet") — not a `splittable` tuple edit.

## Choosing the action, for arts's own two gaps

Per the generic decision tree (`leave` / `repack` / `decorate`):

- **History page 7 / col 1 (628px, figure+aside)**: `leave`. The figure's
  reserved size and the aside are both legitimate content, not a packer
  error, and neither is splittable — matches the generic file's "if the
  next block is a tall table or figure, the fix is in step12 or the
  figure's reserved size, not here."
- **Geography page 10 / col 0 (715px, long answer)**: `leave`, with the same
  reasoning — this is `answer`'s atomicity working as designed, not a
  packing bug. **Do not mark it `decorate`** either: the gap sits
  mid-question (not at a part boundary or a genuine breathing point), and a
  decorator there would hide a real structural limit behind a graphic — see
  the generic file's own trap: "a `gap` filled with a decorator is a hidden
  pagination bug."

## What to check

- [ ] `gaps` count and `worst_free_px` for both chapters, against the table
      above — a new chapter significantly worse than 715px with a similar
      answer-length mix is worth investigating; matching or better is not
      news.
- [ ] For every `gap` finding, identify the block immediately after it
      (`raw` in `10_space.json`, filtered by `page`) before proposing an
      action — arts's gaps so far are all `answer`/`figure` adjacent, never
      `bullets`/`options`/`table` adjacent, which is the opposite of
      biology's profile.
- [ ] Re-run `probe.empty_space()` directly if a stored `10_space.json`'s
      mtime looks older than its sibling `09_layout.json` — see the
      staleness note above.

## Never

- Never add `answer` or `figure` to `splittable` casually to close one of
  these two holes — both are atomic because splitting them loses content,
  not because nobody remembered to list them (contrast biology's
  `numbered`, which is atomic only until `start=` support lands — see
  biology's own SKILL.md — a genuinely temporary restriction, unlike this
  one).
- Never decorate a gap that sits mid-question. The generic file's
  `decorate` action is for genuine breathing room (a part end, before a
  cover); dressing up a mid-answer packing limit hides it instead of
  explaining it.
- Never cite a `10_space.json` artifact's numbers without checking it is
  from the same build as the `09_layout.json` beside it.

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
