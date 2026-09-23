# The reference edition — what every agent must know

`build/REFERENCE_chapter-02.html` is the **design source of truth** for this
pipeline. Its paired source is `content/21_figures_final.md`. A rebuilt
chapter is correct when it reproduces that file's design — page shell,
cover, spacing, colours, blocks, formula boxes, answer formatting.

This file records what changed when the pipeline was brought onto that
reference, because most of it is **not** visible in the code you will be
looking at from any one step. If your step's output disagrees with
something here, the reference wins.

---

## 1 · Part 1 and Part 2 are two different designs

Not one design with different content.

Both halves pack into the **same two columns** (`pack_columns`), with a
solid blue rule down the gutter (`.acol:first-child`). Part 1 used to be
full-width single-column `flowwrap` pages with a 300px floated margin
column of sticky notes — **that is gone**. The reference has:

- **zero `.stickycol`** — a note is set INLINE in the column it belongs to;
  a निगमन card additionally gets `.derivation-note`, which un-rotates it
  and puts each step on its own line;
- **zero `.qsep`** — the dashed rule between questions is `.qhead`'s own
  `border-top`, so a question opening a column can suppress it;
- **zero `.poflat`** — every callout is the bordered `.po` box, in both
  halves;
- **zero `.examchip`** — the exam stamp is `.topic-frequency`.

Every Part-1 flow item carries `revision` and renders inside
`.u.revision-unit`; a page holding one gets `.acols.revision-flow`. That
class drives Part 1's own skin: denser prose (18px), a **bulleted
`.formula-list`** सूत्र panel instead of Part 2's boxed `.frow` results, a
**two-column green त्रिक strip**, and a dashed rule between topics. See
`book/elements/revision-flow/`.

---

## 2 · New source constructs

| Source | Becomes |
|---|---|
| `**त्रिक:** मात्रक: … · विमीय सूत्र: … · राशि का प्रकार: …` | `.trio[data-fact-labels]` — one `.fact-item` per fact, green two-column grid in Part 1 |
| `### 2.3 नाम · **13 सवाल आए · 1 व 5 अंक में**` | title, plus a red `.topic-frequency` seal for the trailer |
| `` `[1 अंक · 2026 · Set A/C]` `` | `.qmarks` + a gold `.paper-refs` band — see §3 |
| `\boxed{…}` | `.math-result`, the gold final-answer highlight |

The त्रिक strip and the frequency seal are **optional**: a chapter that
does not write them simply has none. Do not synthesise either.

---

## 3 · The question tag

One `·`-separated list holding three kinds of fact. `split_qtag` in
`book/components/question.py` is the parser.

| Field | Recognised by | Becomes |
|---|---|---|
| `1 अंक` | number + `अंक`/`marks`/`M`, first field | `.qmarks`, pushed to the end of the head's row |
| `2026` / `2022A` | bare 4-digit year, optional letter | opens a paper reference |
| `Set A/C/E` | `Set` + `/`-separated ids | fills the year just opened — one `.paper-ref` each (`2026/set_a`, …) |
| anything else | — | a small `.inline-tag` (`आंकिक प्रश्न`) |

A year with no `Set` is itself one reference. A tag may name several
papers: `1 अंक · 2025 · Set H · 2023 · Set A` is **two** papers, not four
facts. All refs collect into one `.paper-refs` band on its own row
(`.question-meta`). An unrecognised tag falls back to a single `.chip`.

Each `.qhead` carries `id="q-N"`, so prose can link to `#q-N`.

---

## 4 · Display maths

A `.dm` holds **one `.eqline > .math-line` per row**, never a `<br>`-joined
run. A multi-step derivation (`\begin{aligned}`, or a plain `A = B = C`
chain) becomes one `.eqline` per step.

- the equation number `…(i)` rides **inside** the last `.eqline` as a `.k`
  run — it is a label on the step;
- only a **marks chip** becomes a separate right-aligned `.eq-tail` row;
- `\boxed{…}` becomes `.math-result` — this is the AUTHOR's own marker for
  "this is the final answer", far more reliable than guessing the last
  line of a derivation.

Two conversion bugs were fixed here and must not regress:
`\\[6pt]` (LaTeX's optional inter-row spacing) is part of the row-break
delimiter, not content; and a fraction whose two sides are pure Devanagari
(`\dfrac{कूलॉम}{वोल्ट}` — every unit written as a ratio) is **maths**, not
prose, and stacks.

---

## 5 · Spacing — the measured budget

`GAP` in `book/layout/pack.py` is **0**, and that is a measured value, not a
guess: probed across 54 built columns and 601 block boundaries, the real
space between two stacked blocks is **0.22px**. It was 9, which invented
~100px of occupancy per column and stopped the packer filling a column
while a hundred-odd pixels were still free.

The benchmark, both files probed the same way:

| | pages | avg free / column | worst column |
|---|---|---|---|
| reference | 35 | **105px** | 418px (last page) |

A column much above ~105px free wants explaining. Re-probe rather than
re-guess if the stylesheet ever puts real space back between `.u` siblings.

---

## 6 · Where CSS goes

**New CSS belongs in `book/elements/<id>/extra.css`, never in the numbered
`base.rules.json` / `a4.rules.json`.** Those are regenerated verbatim from
the archived old reference by `tools/split_css.py`, so hand edits there
vanish on the next split. `bundle()` appends every `extra.css` last, in
element-id order — which is why `book/elements/zz-reference-parity/`
sorts last: it holds final numeric alignments that must win.

To find what is still missing, **diff the class inventories** — parse
`<style>` out of the reference, parse `book.elements.bundle("a4")`,
normalise declarations, and report selectors missing or differing. That
found ~56 missing and ~52 differing selectors in one pass.

**Watch for `display:flex` fed mixed inline content.** A flex container
makes every child its own item and *discards the whitespace between them*.
This silently welded words together in the cover's count pill
(`लगभग2 अंक`), in the cover notes, and in `.ansrow`. The reference always
puts a single wrapping `<span>` in such a row.
