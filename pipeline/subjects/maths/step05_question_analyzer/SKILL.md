---
name: step05_question_analyzer
description: Judge flagged maths questions — dollar-delimited marks chips, अथवा alternative-answer pairing, and set/question-number source citations. Use when step05 reports no_answer, no_marks, or marks_unsorted on a maths chapter.
---

# Question Analyzer — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step05_question_analyzer/SKILL.md`, and the CODE
> each step runs is shared — one `pipeline/step05_question_analyzer/run.py`
> for all three subjects, so a fix lands once.

## What is different about a maths question record

- **More answers than questions is expected here, within a bound.** A
  question can carry an `अथवा` (alternative) with its own separate answer,
  so `answers > questions` by roughly the `अथवा` count is normal, not a
  `no_answer` false-positive waiting to happen the other direction.
- **The marks chip is dollar-delimited**, `$[1 अंक \cdot 2026 \cdot 1
  अंक]$`, using `\cdot`/`\times` where physics/biology use `·`/`×` in
  backticks (see step01 for the parsing side of this). `_chip_text`
  (`book/readers/markdown.py:178-184`) normalises the operators before the
  chip is parsed; a `no_marks` finding whose chip is dollar-delimited and
  still unparsed means check `_chip_text`'s coverage before assuming the
  source is malformed.
- **A source citation cites a set AND a question number within it** —
  `स्रोत 2025/set_bjb #27` — where other subjects cite only a paper/year.
  Keep both parts; the number is how a student locates the original
  question inside that year's paper set, not decoration.

## Decision tree — `no_answer` on a maths question

```text
DOES the question have an अथवा sibling with its own **उत्तर:** block?
    YES → this is not no_answer at all; the analyser is looking at the
    wrong record. Check the grouping — the अथवा's answer may have been
    attached to the wrong question id.

IS the question genuinely missing a **उत्तर:** in the source?
    YES → content defect, verdict: content. A maths book shipping a
    question with no worked answer is worse than in other subjects,
    because a maths "answer" IS the derivation a student needs to see,
    not just a final value — flag it, do not wave it through.

DOES the answer exist but read as an unparsed matrix block (a wall of
   un-gridded bracket text where the source clearly has a matrix)?
    THEN this is not this step's finding — it is step06/step07's matrix
    conversion failing. Route it there; do not mark no_answer.
```

## How to check one

```bash
python3 -c "
import json;d=json.load(open('build/<stem>/artifacts/05_questions.json'))
for r in d['_questions']['records']:
    if r['id']=='<id>': print(json.dumps(r,ensure_ascii=False,indent=1))"
grep -n '\*\*प्र\. <N>\*\*' content/<name>.md
```

Read the source at that question. The chip's `\cdot`/`\times` chain and any
अथवा sibling are both things only the markdown shows — the record tells you
what the parser saw, the source tells you what is true, same discipline as
every other subject.

## Never

- **Never treat `answers > questions` as a bug by default.** Check the
  `अथवा` count first; it explains the gap in the normal case.
- **Never "fix" a dollar-chip parse failure by rewriting the chip into
  backtick form in the source.** That contorts content around a parser gap
  — widen `_chip_text`/`RE_QHEAD` instead (see step01), or the next
  chapter written the same way hits the identical failure.
- **Never mark a `no_answer` acceptable without reading the question.** A
  maths answer that is missing is missing the derivation, which is most of
  the pedagogical value — this is a stricter bar than a one-line physics
  answer, not a looser one.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**The question tag is three kinds of fact, not one chip.** `split_qtag` in
`book/components/question.py` is the parser; §3 of the shared doc is the
grammar. Marks become `.qmarks`; each year (+ optional `Set A/C`) becomes
one `.paper-ref` in a gold `.paper-refs` band; anything else is an
`.inline-tag`. A year with no `Set` is itself one reference.

When judging a question's marks, read the **first** field only — a tag may
carry several years, and a four-digit number in it is a paper, not a score.

Every `.qhead` now carries `id="q-N"`, so a cross-reference in prose
(`पूरा निगमन ☞ प्र. 73`) has a real anchor to reach.

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
