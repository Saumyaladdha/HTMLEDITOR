---
name: step07_formatting_agent
description: Decide how a semantic kind should be set — atomic, density, accent, emphasis — when it has no formatting rule. Use when step07_formatting_agent reports unknown kinds.
---

# step07_formatting_agent — agent

Formatting is decided from the **semantic tag**, never from what the text
looks like. `book/format/rules.py` holds the whole mapping as a table, so
changing how definitions are set, or making bullets tighter, is a one-line
edit rather than a hunt through the renderer.

This queue is a kind with no rule. It is currently falling back to `DEFAULT`,
which renders as a plain paragraph.

**Input**
- `build/<stem>/artifacts/07_formatted.json` → every node carries `fmt`
- `build/<stem>/review/step07_formatting_agent.open.json`

**Output** → `build/<stem>/review/step07_formatting_agent.decisions.json`

```json
{"decisions": [
  {"id": "…", "kind": "worked_example",
   "atomic": true, "density": 1.1, "accent": false, "emphasis": "strong",
   "why": "a worked example must not split across a column"}
]}
```

Then **add it to `book/format/rules.py`** — the decisions file keeps this
build correct; the table keeps every future build correct.

## The four attributes

| | Meaning | Get it wrong and… |
|---|---|---|
| `atomic` | may this block split across a column/page boundary? | a boxed formula gets cut in half, or a long answer refuses to break and leaves a dead column |
| `density` | vertical room relative to body text (0.8–1.2) | the block crowds its neighbours or floats in space |
| `accent` | does it take the section's accent colour? | the page stops reading as one system |
| `emphasis` | `normal` / `strong` / `quiet` | a source note shouts louder than the answer |

## How to choose `atomic`

Ask: *if a reader saw only the top half of this, would it still make sense?*

- A bullet list, a paragraph, an options grid — **not** atomic. Splitting is
  fine and the reference book does it constantly.
- A boxed result, a callout, a sticky note, a table, a figure — **atomic**.
  Half a box is not a box.
- A whole question — **not** atomic. Insisting a question stay whole is what
  produces half-empty columns; only its *head* must not be orphaned.

## How to choose `accent`

`accent: true` means the block takes the colour of the section it lives in —
the same colour as that section's number circle and highlighter. Use it for
things that *belong to* a section (bullets, section heads). Do not use it for
things with their own semantic colour (callouts, answer tags): a `po-trap`
is amber because it is a trap, not because of which section it is in.

## Never

- Never set formatting from what a block looks like. If two blocks need to
  look different, they are different *kinds* — go back to `step03`.
- Never write the decision only into the decisions file. Without the table
  entry, the next chapter hits the same gap.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**The answer's shape changed.** Judge against these, not against the older
build:

- `उत्तर:` is a floated `.anslabel` and the answer text wraps **around** it
  (`.ansrow` is `display:block` with `:after{clear:both}`). It was a flex
  row, which forced the answer into a narrow column beside the label and
  dropped the space between them.
- a display equation is one `.eqline > .math-line` **per row** — never a
  `<br>`-joined run;
- `…(i)` rides inside the last `.eqline` as a `.k` run; only a **marks
  chip** becomes a separate right-aligned `.eq-tail` row;
- `\boxed{…}` is the final-answer highlight.

Never put mixed inline content straight into a `display:flex` row — flex
discards the whitespace between children, which welds words together.

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
