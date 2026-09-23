---
name: step03_content_tagger
description: Decide the true semantic kind of maths blocks the deterministic tagger could not classify — standard results, given values, proof steps, and matrix-vs-prose ambiguity. Use when step03 reports uncertain_tag items in a maths chapter.
---

# Content Tagger — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step03_content_tagger/SKILL.md`, and the CODE each
> step runs is shared — one `pipeline/step03_content_tagger/run.py` for all
> three subjects, so a fix lands once.

## The maths rubric

`book/subjects/maths.py`'s `PROFILE["rubric"]`:

| Lead-in label | `kind` | Why |
|---|---|---|
| `दिया है` | `given` | the values a solution starts from |
| `मानक परिणाम` | `formula_card` | the chapter's own catalogue of standard results (its §3.0) |
| `उपपत्ति के चरण` | `flow` | **a proof IS a sequence of steps** — the same object as biology's `क्रम`, and it deserves the same timeline treatment, not a bullet list |
| `शर्त` | `condition` | when the result holds |

This chapter carries 59 lead-in labels — fewer than physics (188) or biology
(175), because most of a maths chapter's content is worked derivation rather
than labelled fact. That is a real ratio, not noise: expect fewer
`uncertain_tag` items driven by lead-ins here and more driven by matrix/prose
ambiguity instead.

## Decision tree — matrix, formula, or prose?

```text
IS the block a run of \begin{bmatrix}/pmatrix/vmatrix, or a multi-line
   ASCII / semicolon matrix block (FORMAT_SPEC §8)?
    IF it stands on its own lines (multi-line ASCII form)
        THEN kind = matrix_art (a BLOCK kind — see step08)
    IF it sits inside a $…$/$$…$$ span alongside other maths
        THEN it is NOT a block kind at all — it is inline, built by
        format/matrix inside whatever formula/para/given block already
        holds the expression. Do not retag the surrounding block just
        because it contains a matrix.

IS the text short, symbol-heavy, mostly Latin/Greek/digits with an `=`?
    THEN formula, not para — same rule as physics.

IS the text a Hindi SENTENCE that happens to contain a matrix expression
   or an `=` (e.g. "यदि A' A = I हो तो A को लंबकोणीय कहते हैं")?
    THEN para. A sentence ABOUT an equation is prose; the equation itself,
    if it is set off with $…$, stays inline maths inside that paragraph.

IS the block a numbered derivation ("चरण 1 …", "चरण 2 …") under
   `उपपत्ति के चरण`?
    THEN flow — see rubric table above.
```

**Correct:** `A' A = I को संतुष्ट करने वाला आव्यूह लंबकोणीय कहलाता है।` tagged
`para` — a definition sentence, matrix notation inline inside it.
**Incorrect:** the same sentence tagged `formula` because it contains `=` and
capital letters — it is prose *about* a matrix property, not an equation on
its own.
**Edge case:** a bare line `A² − 6A² + 7A + 2I = O` with no surrounding
sentence — this IS `formula` (or `given`/`flow` depending on its lead-in),
because nothing in it is a Hindi clause.

## Never

- **Never invent a kind for a matrix.** `matrix_art` already exists in
  `ir.KINDS` for the block form; an inline matrix is never a kind at all,
  it is a formatting detail of whatever block holds it (see step07,
  step08). Retagging the parent block to "matrix" breaks the
  kind → component mapping.
- **Never retag something just because it would look nicer.** Tags are
  semantic; appearance is step07's decision, same rule as every other
  subject.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**The element catalogue grew.** New ids you may route a block to:
`revision-flow` (Part 1's whole skin), `formula-list` (the bulleted सूत्र
panel), `trio` fact strips, `paper-refs`, `topic-frequency`,
`display-math` (`.eqline`/`.math-result`), `zz-reference-parity`.

**Three old shapes no longer exist and must never be chosen:**

- `.poflat` — a flat, boxless callout. The reference has none; **every**
  callout is the bordered `.po` box, in Part 1 as well as Part 2.
- `.qsep` between consecutive questions — the rule is `.qhead`'s own
  `border-top` now. `qsep` remains only where the SOURCE writes `---`.
- `.examchip` — the exam stamp is `.topic-frequency`.

Part 1 and Part 2 are different designs, not one design with different
content, so the same IR kind can legitimately want a different element in
each half — see §1 of the shared doc.

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

### Maths

Every step IS the answer, so a short step (`= I`, `= O`) is still a display
line, never inline `.work` — one step set inline while its neighbours are
centred breaks the alignment a reader is following down the page.

A matrix must keep its bracket: losing it turns a 2×3 object into six loose
numbers, and a reader cannot recover the first from the second. `\tag{1}`
is a line number wherever it appears. A long cell WRAPS rather than shrinks
— a matrix in a smaller font beside one at full size reads as a mistake.
