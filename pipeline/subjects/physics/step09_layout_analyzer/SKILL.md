---
name: step09_layout_analyzer
description: Diagnose pagination failures — clipped pages, blocks that will not fit, a settle loop that does not converge. Use when step09_layout_analyzer reports overflow.
---

# step09_layout_analyzer — agent

This step measures every block in a real browser, packs pages, then checks
the guess against a real render.

**The thing that makes this dangerous:** `.page` is `overflow:hidden`.
Content that does not fit is **clipped, not reflowed** — a packing error
*deletes* content and nothing errors anywhere.

**Input**
- `build/<stem>/artifacts/09_layout.json` → `pages`, `overflow`
- `build/<stem>/draft.html`

**Output** → `build/<stem>/review/step09_layout_analyzer.decisions.json`

```json
{"decisions": [
  {"id": "…", "verdict": "block_too_tall | model_error | content",
   "block": "p2.g2024.q11.tbl", "fix": "…"}
]}
```

## Geometry — all measured, never calculated

```
page             1080 × 1527 px      print: @page A4 + zoom 0.7352
content          944 × 1432 px
column (.acol)   449.5 px × 2
```

Old NIYAM #11a and #11c: measure, do not estimate; measure `COL_H`, do not
compute it. Character-count estimates were wrong by up to **100% per block**
in the previous system.

## Why `settle` exists

An additive model — sum of measured blocks plus gaps — is always an
approximation. Margin collapse, float wrap and re-breaking at a different
width all move the real total; inside Part 1's float region the error ran to
about **15%**.

Pushing the overflow forward one page per round *cascades* and needs as many
rounds as there are pages. Instead `settle` measures every item's real height
in its real context, feeds that back, and repacks the whole part. Converges
in two or three rounds.

Heights only ratchet **up**. Letting one shrink makes the packer pull a block
back onto the page it just left, and the loop oscillates instead of settling.

## When a page still overflows

1. **A single block taller than 1432px.** Nothing can fit it. Split the
   content, or make the component shrink (a table with too many columns, a
   figure slot sized too generously).
2. **The float column is taller than the text beside it.** In Part 1 a sticky
   note is page content too; if it outruns the text the page overflows even
   though the text fits. Check `_float_bottom` accounting in
   `book/assemble/html.py`.
3. **`settle` gave up.** Look at the round log. If heights are still being
   corrected at round 4, the model is badly wrong for some block — find which.

## Panel splitting runs in BOTH halves now

`layout/split.py` breaks a splittable panel over a boundary to reclaim the
dead space an atomic block leaves behind. Every helper in it used to filter to
`len(cols) == 1`, so the pass only ever applied to the single-column half of
the book: a six-row सूत्र panel in a 449px column sat above several hundred
px of unusable space with no mechanism to touch it.

A column is the packing unit in a two-column part exactly as a page is in the
flow, so keying free space by column was the whole adaptation —
`free_by_column`, `worst_hole_columns`, `dead_space_columns`, and a `free_fn`
argument on `split_pass`.

**The two halves judge a split differently, on purpose.**

| | criterion | why |
|---|---|---|
| flow | the worst hole must fall | one page two-thirds empty reads as a mistake; the same slack over six pages does not |
| columns | the worst hole **or** total dead space (≥120px) | `worst_hole` is a single global maximum, so a split filling a 400px hole in one column moves it not at all and was reverted — three splits were thrown away for that reason, each reclaiming real space |

If you loosen the flow criterion to match, measure `dead_space` before and
after. The `pull_up` pass in `layout/pack.py` is disabled for exactly this
reason: it reclaimed 18 blocks and made the total WORSE, because moving a
block changes the float geometry on both pages and the next settle re-inflates
the heights.

## Never

- Never raise `CONTENT_H` to make overflow go away. The number is measured;
  changing it makes the clipping invisible rather than absent.
- Never disable `settle` to make the build faster. Without it, "it fits" is
  an opinion.

## Dead space: what the packer can and cannot reach

Measured on chapter 19 (columnar), 2026-09-04. The split pass reports why it
declines each hole; read that output before theorising.

Of 120 usable column holes, the reasons they stayed open were:

| reason | holes |
|---|---|
| hole under 200px | 56 |
| next block is prose (`para`, `answer`) | 19 |
| next block is `figure` / `formula` / `table` / `callout` / `athava` | 19 |
| untyped (headings, marks rows, aside wrappers) | 20 |
| panel already split or rejected | 5 |

**Only a list-shaped block can divide.** `render.split_payload` gives a rows
payload to `formula_card`, `bullets` and `options`; everything else is atomic
by construction, so a hole in front of it cannot be filled by splitting. To
use the 19 prose holes you would have to break a paragraph between LINES,
which is a different mechanism and does not exist yet.

Three ordering rules were wrong and each cost real space:

1. **Order candidates by hole size, not by index.** `sorted(free, reverse=True)`
   sorts the KEYS, so the pass walked the book backwards and spent its rounds
   on whatever lay late in the document. A 523px hole on page 9 was never
   examined. Now `sorted(free, key=lambda k: (-free[k], k))`.
2. **`min_rows=2, min_keep=1`.** Four-with-two meant a panel needed four rows
   to split at all and a three-row panel could never be halved. One row moved
   up is still a row.
3. **Judge locally.** `settle` only ratchets heights UP, so a global
   dead-space total says "worse" even when the targeted hole was filled.
   Compare `rep["target"]` before and after.

## A nearly-empty final page

`splitter.absorb_tail_page` moves the last page into the column before it
when the whole page fits in that column's MEASURED free space. Chapter 19
ended on a sheet holding one line (2825px of 2864px blank) while the previous
column had 164px spare and the line needed 47.

The packer was not wrong: it packs against model heights, which are upper
bounds, and `settle` never corrects one downwards — so a column it believed
was full can measure far from it. Nothing reconsidered that decision.

It operates on the **column list**, not the item list. A correction expressed
in the item list is re-derived away by the next `pack_columns`, which puts the
line straight back on its own sheet. The column list is what the emitter turns
into pages, so a change there is the last word. Guarded by `TAIL_ABSORB_MAX`
(420px — above that it is a short last page, not an empty one) and verified by
rendering and checking for overflow before it is accepted.

Result on `chapter-19b-cols`: 62 -> 61 pages, dead space 29917 -> 26991px,
worst hole 1432 -> 436px, `vanished=0`, 0 clipped.

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
