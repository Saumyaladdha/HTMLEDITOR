---
name: step07_formatting_agent
description: Decide maths presentation — above all how a matrix is set, sized, and protected through the LaTeX-strip pass. Use when a matrix loses its brackets, its columns do not line up, one matrix on a page renders smaller than its neighbours, or a cell will not fit.
---

# Formatting Agent — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step07_formatting_agent/SKILL.md`, and the CODE
> each step runs is shared — one `pipeline/step07_formatting_agent/run.py` for
> all three subjects, so a fix lands once. **Read `docs/FORMAT_SPEC.md` §8 and
> `book/format/matrix.py` in full before touching anything matrix-related** —
> the module's own comments are the primary source of truth; this file only
> adds what is not already there.

## THE MATRIX IS THE WHOLE PROBLEM

Before `book/format/matrix.py` existed, every one of the chapter's 496
`bmatrix` environments reached the page as loose digits:

```
$A=\begin{bmatrix}1&2&3\\2&3&1\end{bmatrix}$   ->   A= 1 2 3<br>2 3 1
```

Nothing was DROPPED — the chapter's own token round-trip passed — and the
mathematical object was destroyed anyway. Six numbers are not a 2×3 matrix,
and no reader can recover the second fact from the first no matter how
carefully the digits survived. This is the one construct in the whole
pipeline where losing the visual structure loses the content, even though
every word-count check says nothing is missing.

## How a matrix is set now — cite the module, don't restate it

`matrix.grid()` (`book/format/matrix.py:102-149`) draws the brackets with CSS
borders (`.mx > i`) rather than typed `[`/`]` glyphs, so they stretch to the
row count exactly — a typed bracket around a 3-row matrix ends a line and a
half short. Cells are a CSS grid (`.mx > .mxg`, `grid-template-columns:
repeat(var(--c), auto)`) with tabular numerals so a column of `1`, `12`, `−6`
lines up. A short row is padded with empty `<span>`s so the columns below it
do not shift left. Every cell is run through the caller's inline formatter,
so `3a + 8c`, `-\frac{1}{2}`, `3\sqrt{3}` are set exactly as that expression
would be anywhere else (see step06 for the routing bug this exposed).
`vmatrix`/`Vmatrix` get `.mx-det` — vertical rules, no brackets — because a
determinant is a number, not a matrix.

## Decision: does this LaTeX environment want a bracket at all?

This is `matrix._stack_lines` (`book/format/matrix.py:152-191`) as a
decision tree — read the module's own comments for the full reasoning, this
is the summary an agent needs at a glance:

```text
IS the environment bmatrix/pmatrix/vmatrix/Vmatrix?
    ALWAYS grid() — even a width-1 bmatrix (a column VECTOR) gets brackets.
    This is exactly the case the module exists to keep bracketed.

IS the environment `array` with NO `&` in any row?
    NEVER grid() — it is a STACK of independent lines (e.g. two electron
    configurations shown together). Render each row as its own line,
    joined with <br>, no bracket. A row needs a SECOND column (an `&`)
    before it is data worth bracketing.

IS the environment `aligned`?
    NEVER grid(), regardless of `&` count. Its `&` marks where `=` should
    line up down the column, not a second column of data. RECOMBINE each
    row's cells with NOTHING between them — that join is what puts the `=`
    back where the alignment removed it from view.

IS the environment `array` WITH `&` in its rows (e.g. an augmented matrix's
   column-spec argument, {ccc|ccc})?
    grid(), with the `|` in the spec argument placing an augment rule down
    the right column (matrix._augment_at). The spec argument is REQUIRED —
    without it the bar has nowhere to attach and the row-reduction steps
    that follow read as commentary on nothing.
```

**Counterexample — do not do this:** do not bracket a chemistry-style
`\begin{array}{l} Ti = 1s^2… \\ Ti^{3+} = 1s^2… \end{array}` stack just
because `\begin{array}` "usually means matrix." It puts a `[`/`]` around two
unrelated equations, implying a mathematical object that was never there,
and shrinks two full equations to fit a cell font sized for one short entry.

## Sizing: every matrix renders at the SAME size — this was tried twice and reverted

`matrix.grid()`'s own docstring (`book/format/matrix.py:110-129`) records
this directly: an earlier version shrank the font of ONE matrix whose cell
was too wide for a column (`\cos x \cos y - \sin x \sin y + 0`). Tried a
second way too — sharing the shrink across every matrix in the same
expression, so a short input matrix at least matched a long result matrix
next to it. **Both were reverted.** A visibly smaller matrix next to
normal-sized ones on the same page reads as a bug even when the shrink is
internally consistent, because the SAME short cell (`cos x`, `0`) in a
neighbouring question that never needed shrinking looks different at a
glance.

The fix that stuck: `.subj-maths .mx>.mxg>span` allows a cell to WRAP at its
own word/operator boundary instead. **If you are asked to make a matrix cell
"fit" and wrapping still does not work, that is a step00/§8.1 question to
re-examine — is this really one cell, or should the source break the
expression into a separate numbered step? — never a font-size lever to
pull.**

## The sentinel, and why the index is LETTERS not digits

A matrix is built and parked behind `\ue040<index>\ue041`
(`book/format/inline.py:1005-1020`) BEFORE `strip_latex` runs, because that
pass deletes `\begin{bmatrix}`, turns `&` into a space and `\\` into a line
break — by the time it finishes there is no grid left to build from.

**The index is letters (`a`, `b`, …, `z`, `ba`, …) specifically because a
digit index was tried first and broke everything.** With a digit index,
`upright` (the pass that sets digits/operators/π upright inside maths, FORMAT
SPEC §7) wrapped the index itself: `\ue040<span class="up">0</span>\ue041`.
The restore pattern no longer matched that string, and every single matrix
in the chapter came back as a bare `0` — a total, silent failure across the
whole document from one digit-vs-letter choice. Letters are exactly what
`upright` does not touch inside a maths run, so the token survives intact to
the restore step.

**Never revert this to a digit index**, even for a "simpler" counter — this
is not a style preference, it is the one thing standing between "matrix" and
"the numeral zero."

## What to check before signing off

- [ ] No `\begin{` survives anywhere in rendered output (`grep -c
      '\\\\begin{' build/<stem>.html` is 0).
- [ ] No bare sentinel (`\ue040`/`\ue041`) reaches visible text.
- [ ] Every `.mx` carries a `--c` value — its absence means the grid falls
      back to one column and the matrix renders as a vertical strip, not a
      grid at all.
- [ ] Spot-check one matrix from each of the five FORMAT_SPEC §8 notations
      present in the source, not just the LaTeX `bmatrix` form — the ASCII
      and semicolon paths have separate code and separate failure modes.

## Never

- **Never shrink a matrix's font to make a wide cell fit.** Tried twice,
  reverted twice — see "Sizing" above. Wrapping is the only accepted fix;
  a cell that still will not wrap is a source-modelling question, not a
  CSS one.
- **Never switch the sentinel index back to digits.** This has already
  destroyed every matrix in a chapter once, silently, with no error at any
  step before step15's visual scan.
- **Never bracket an `aligned` or a no-`&` `array` stack.** Both look like
  "just another matrix environment" and neither is one — see the decision
  tree above.

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

### Maths

Every step IS the answer, so a short step (`= I`, `= O`) is still a display
line, never inline `.work` — one step set inline while its neighbours are
centred breaks the alignment a reader is following down the page.

A matrix must keep its bracket: losing it turns a 2×3 object into six loose
numbers, and a reader cannot recover the first from the second. `\tag{1}`
is a line number wherever it appears. A long cell WRAPS rather than shrinks
— a matrix in a smaller font beside one at full size reads as a mistake.
