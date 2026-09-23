---
name: step13_css_generator
description: Diagnose a failing stylesheet check — missing print rules, wrong zoom, missing swipe strokes, fonts not embedded. Use when step13_css_generator fails.
---

# step13_css_generator — agent

The stylesheet is **generated from tokens**, not hand-written.
`book/design/tokens.py` holds the values; `book/design/css.py` builds the
sheet. A re-skin touches `css.py`; a re-scale touches `tokens.py`; neither
has to read the other.

This step normally passes silently. It fails when a load-bearing rule has
gone missing.

**Input** `build/<stem>/artifacts/13_css.json` → `checks`
**Output** → `build/<stem>/review/step13_css_generator.decisions.json`

## The five checks and what each is protecting

| Check | Why it is load-bearing |
|---|---|
| `print-color-adjust` | without it **every background colour drops on many printers** — the callouts, the sticky notes and the marks bands all print white. Old NIYAM #16. **The reference file itself is missing this**; we add it deliberately. |
| `A4 page rule` | `@page { size: A4; margin: 0 }` — without it the browser adds its own margins and the 1080px page no longer maps to a sheet |
| `print zoom` | `zoom: 0.7352` × 1080px = 794px = 210mm @96dpi. Old NIYAM #15: scale with `zoom`, **never** `width: 210mm` — that reflows the whole book at print time |
| `swipe strokes` | nine highlighter variants. Fewer means an accent lost its marker and its text sits on nothing |
| `fonts embedded` | Kalam 400 + Caveat 500 as data URIs, ~1.4MB |

## The font rule that bites

Kalam is embedded at **weight 400 only**. Every bold in the book is
*synthetic*, and that is the intended look. Loading Kalam 700 from Google
gives real bold — and shifts **every measured height in the book**, which
silently invalidates the entire measurement cache and the pagination built
on it.

The same CSS must be used to **measure** as to **render**, or the packer is
measuring a different book from the one it lays out.

## Values that must stay irregular

Do not "tidy" these. They are the design:

```
.secno       border-radius: 50% 46% 52% 48%     hand-drawn circle
.yearbanner  border-radius: 16px 24px 18px 26px
.sticky      transform: rotate(1.6deg)          per-note, hand-chosen
.swipe > i   left: -6px; right: -6px            the marker OVERHANGS the text
.vec::after  top: -0.66em                       tuned to Georgia italic caps
```

The `.swipe` overhang in particular *is* the highlighter look. Setting it
to 0 makes the strokes end exactly at the text and the effect dies.

## Never

- Never add a colour or a size directly in `css.py`. Add the token, then use
  it — otherwise the next re-scale misses it.
- Never fix a print problem by changing the screen layout. Print scaling has
  exactly one lever: `zoom`.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**New CSS goes in `book/elements/<id>/extra.css` — never in the numbered
`base.rules.json` / `a4.rules.json`.** Those are regenerated verbatim from
the archived old reference by `tools/split_css.py`, so hand edits there
disappear on the next split, silently, with the class still applied and no
rule behind it.

`bundle()` appends each element's `extra.css` last, in element-id order.
`book/elements/zz-reference-parity/` is named to sort last on purpose: it
carries final numeric alignments that have to win over the archived value
they correct.

New element directories: `revision-flow` (Part 1's skin, `.formula-list`,
`.paper-refs`, `.topic-frequency`, `.derivation-note`, `.qref`,
`.subhead`), `acols` (the ruled gutter and the `.u` measurement contract),
`display-math` (`.eqline`, `.math-result`, `.eq-tail`), `trio`.

To find what is still missing, diff the class inventories — parse `<style>`
out of the reference, parse `bundle("a4")`, normalise declarations, report
what is missing or differing.
