---
name: step15_visual_qa_agent
description: Look at rendered pages and judge visual problems geometry cannot detect — crowding, awkward rag, bad balance, art in the wrong place. Use after step15_visual_qa_agent renders screenshots.
---

# step15_visual_qa_agent — agent

Every other step reasons about numbers it computed. This one **looks at the
page that actually rendered**, which is the only way to catch failures that
live between the model and the browser.

**Input**
- `build/<stem>/artifacts/15_visual_qa.json` → `issues`, `by_kind`
- `build/<stem>/qa/page-NN.png` — rendered pages, **open these**

**Output** → `build/<stem>/review/step15_visual_qa_agent.decisions.json`

```json
{"decisions": [
  {"id": "…", "verdict": "real | acceptable",
   "fix": "step12: the table needs full_width", "why": "…"}
]}
```

**Every page is rendered by default now, not a sample of the ones geometry
already flagged.** A chapter with zero geometry findings used to get zero
screenshots — the one case this step exists for, since a page can be
geometrically perfect and still read badly. `build/<stem>/qa/` holds one
PNG per page after a normal run; open all of them, not the first few.

Render specific pages only when you already know which ones you want
(after fixing something, to recheck just that page):

```bash
python3 pipeline/step15_visual_qa_agent/run.py --shots 7,14,22
```

## What the code already finds

| `kind` | Severity | Meaning |
|---|---|---|
| `overflow` | **hard fail** | the page is clipped — CONTENT IS DELETED |
| `broken_math` | **hard fail** | a `.fr` or `.vec` rendered with no content |
| `orphan_heading` | soft | a heading alone at the foot of a column |
| `tiny_text` | soft | something under 11px — illegible in print |
| `empty_page` | soft | a page with almost nothing on it |

## What only you can find

Open the PNGs and look for:

- **crowding** — technically fits, reads as a wall. Usually too many callouts
  in a row, or a decorator that should not be there.
- **awkward rag** — a Devanagari line broken at a bad point, or a single word
  alone on the last line of a block.
- **visual imbalance** — one column dense, the other airy, on a page where
  both should be full.
- **art in a silly place** — a doodle beside a diagram, a character mid-column.
- **inconsistent accent** — two adjacent sections in the same colour, or a
  section head whose circle and highlighter disagree.
- **broken formulas that still have content** — a fraction whose rule is the
  wrong width, a vector arrow sitting on the wrong glyph.

## Route the fix to the right step

Do not fix things here. Say where the fix belongs:

| Symptom | Step |
|---|---|
| clipped page | `step09` (layout) |
| table overflowing | `step12` |
| big hole mid-document | `step10` |
| decorator in a bad place | `step11` |
| tiny text, wrong colour | `step13` |
| formula rendered wrong | `step06` |
| wrong block type entirely | `step03` |

## Never

- Never sign this step off without opening EVERY screenshot, not just one or
  the first few. Geometry passing is not the same as the page being good,
  and that gap is the entire reason this step exists — a single sampled
  page tells you nothing about the other forty.
- Never mark an `overflow` acceptable. There is no version of clipped content
  that is fine.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**Open the screenshots against the reference, block for block.** This is
the only step that sees what actually rendered, and most of the
reference-parity work is invisible to geometry. Check specifically:

| Block | Should look like |
|---|---|
| column gutter | one **solid** blue rule (`2px #6f97d2`), not dashed |
| Part 1 | two columns, dashed rule between topics, a red `.topic-frequency` seal beside a topic name |
| सूत्र panel, Part 1 | a flat purple card with a **bulleted** list — not a row of boxed results |
| सूत्र panel, Part 2 | boxed `.frow` results |
| callouts | **always** a bordered box, both halves — a boxless ⚠️ paragraph is a bug |
| त्रिक strip | green, two columns, one labelled fact per row |
| question head | `प्र. N` pill, `N अंक` chip at the far right, a gold `.paper-refs` band on its own row |
| a derivation | one centred line per step; `…(i)` on the step's own line; the final answer in a gold `.math-result` box |
| निगमन card | upright (not rotated), each step on its own line |

**Dead space is now measurable, so measure it.** The reference averages
**105px free per column** (worst 418px, on its last page). A build far
above that is packing wrong, not merely looking airy — say so and route it
to `step09`/`step10` rather than calling it acceptable.

Two failure modes worth naming because they are invisible in the markup:
words welded together (`लगभग2 अंक`) mean a `display:flex` row was fed mixed
inline content; a Hindi word inside maths in the wrong typeface means a
`.mt` run fell back from a serif with no Devanagari glyphs.

## Worked examples — answer presentation

Taken from `build/REFERENCE_chapter-02.html`. These are the shapes to
judge against — not a style you may vary.

### A short question: the stem is a HEADING

```markdown
**प्र. 3**  `[1 अंक · 2023 · Set A]`

वैद्युत विभव का मात्रक है
(a) जूल/कूलॉम  (b) जूल × कूलॉम  (c) कूलॉम/जूल  (d) न्यूटन/कूलॉम

**उत्तर:** (a) जूल/कूलॉम
```

```html
<div class="qhead" id="q-3"><span class="qnum"><i></i><b>प्र. 3</b></span>
  <span class="qmarks">1 अंक</span>
  <div class="question-meta"><span class="paper-refs">
    <span class="paper-ref">2023/set_a</span></span></div></div>
<div class="subhead"><b>वैद्युत विभव का मात्रक है</b></div>
<div class="opts">…</div>
<div class="ansrow"><span class="anslabel"><i></i><b>उत्तर:</b></span>
  <div class="anstext">(a) जूल/कूलॉम</div></div>
```

A stem this short is a **`.subhead`** — blue, 20px, bold. Measured on the
reference: its `.subhead` stems run to a median of 25 characters, its
bold-body stems to a median of 108. Set as ordinary body text a one-line
stem disappears into the options beneath it.

### A long question: the stem is BOLD BODY TEXT

A stem past ~46 characters stays a paragraph and is wrapped in `<b>`:
`<p class="q"><b>दो बिन्दु आवेशों को वायु में … होगा</b></p>`. **All 79**
of the reference's question stems are emphasised one way or the other;
none is plain. A stem at the same weight as the answer under it makes a
question and its answer read as one undifferentiated block.

### A long answer: sectioned, not a wall

```markdown
**उत्तर:**

**परावैद्युत ध्रुवण**
परावैद्युत पदार्थों में इलेक्ट्रॉन नाभिक से दृढ़तापूर्वक बँधे रहते हैं। …

**वैद्युत संधारित्र**
संधारित्र एक ऐसा समायोजन है, जिसमें … संचित की जा सकती है।
```

```html
<div class="subhead"><b>उत्तर:</b></div>
<div class="subhead"><b>परावैद्युत ध्रुवण</b></div>
<p class="q">परावैद्युत पदार्थों में …</p>
<div class="subhead"><b>वैद्युत संधारित्र</b></div>
<p class="q">संधारित्र एक ऐसा समायोजन है …</p>
```

Two rules, both load-bearing:

1. **A bare `**उत्तर:**` opens a long answer as a `.subhead`, not as the
   green pill.** The pill is an INLINE label — it works because the
   answer's first line sits beside it. Alone on a row it reads as an
   answer that has gone missing.
2. **A standalone bold line inside an answer is a section heading.** The
   author already marked where the breaks go; honour them. Run together
   into the prose (`<b>धारिता</b> धारिता (Capacitance) …`) a
   five-paragraph answer becomes one wall of text, which is the single
   biggest difference between a rebuilt page and the reference's.

A lead-in with a trailing colon (`**सूत्र:**`) is **not** a heading — the
rubric claims it long before this.

### A derivation inside an answer

```html
<div class="dm">
  <div class="eqline"><span class="math-line">E = <span class="fr">…</span></span></div>
  <div class="eqline"><span class="math-line">= <span class="math-result">…</span></span></div>
</div>
<div class="eq-tail"><span class="qmarks">2 अंक</span></div>
```

One `.eqline` per step. `…(i)` rides **inside** the last line as a `.k`
run; only the marks chip becomes a separate `.eq-tail` row. The final
answer is boxed **only** where the source wrote `\boxed{…}` — never
guessed from position. `.dm` carries no left hairline and no left padding.

### Physics

The answer is usually a DERIVATION, and its readability is the derivation's
structure: one `.eqline` per algebraic step, the `\boxed{}` result in
`.math-result`, and `…(i)`/`…(ii)` kept because the prose cites them
("समी (iii) व (iv) से"). Never invent a second numbering.

A unit written as a ratio (`\dfrac{कूलॉम}{वोल्ट}`) is **maths** and stacks —
it is not prose. A `**त्रिक:**` strip (मात्रक · विमीय सूत्र · राशि का
प्रकार) is the compact fact block above a topic; it is optional, so do not
synthesise one where the chapter did not write it.
