---
name: step05_question_analyzer
description: Judge flagged questions — missing answers, unparsed marks, swallowed options, unsorted marks. Use when step05_question_analyzer reports problems.
---

# step05_question_analyzer — agent

The parser finds question *heads*. This step works out what each question
actually **is**: its parts, its marks, its options, its answer, and how the
questions in a group relate. Then it flags what looks wrong.

**Input**
- `build/<stem>/artifacts/05_questions.json` → `_questions.records / .groups / .problems`
- `build/<stem>/review/step05_question_analyzer.open.json`

**Output** → `build/<stem>/review/step05_question_analyzer.decisions.json`

```json
{"decisions": [
  {"id": "…", "verdict": "content | parser",
   "fix": "content/…md:1204 — add **उत्तर:** | book/readers/markdown.py:RE_OPT_TOKEN",
   "why": "…"}
]}
```

## The five problems, and what each usually means

| `kind` | What it means | Usually |
|---|---|---|
| `no_answer` | no `**उत्तर:**` block | **content** — the question really has no answer written |
| `no_marks` | the chip has no parsable marks | **content** — a malformed `[… अंक · …]` chip |
| `thin_options` | fewer than 2 options parsed | **parser** — the splitter ate the stem or the first option |
| `empty` | a question head with no body | **content** — a stray `**प्र. N**` |
| `marks_unsorted` | marks descend inside a group | **content** — reorder the questions |

`thin_options` deserves particular suspicion. Anchoring the option splitter
on `^` once dropped option **(i)** of every question in the book while the
answer key still said "(iii)" — visible only if you counted.

`marks_unsorted` is not cosmetic. The yellow **1 अंक / 3 अंक** bands are
*synthesised* wherever the marks value changes, so unsorted questions make
the bands repeat and the page stops making sense. Sort the source.

## How to check one

```bash
python3 -c "
import json;d=json.load(open('build/<stem>/artifacts/05_questions.json'))
for r in d['_questions']['records']:
    if r['id']=='<id>': print(json.dumps(r,ensure_ascii=False,indent=1))"
```

Then open the markdown at that question and read it. The record tells you
what the parser saw; only the source tells you what is true.

## Never

- Never mark a `no_answer` as acceptable without reading the question. A
  physics book that ships a question with no answer is a defect, not a style.
- Never "fix" `thin_options` by rewriting the source into a shape the parser
  happens to like. If the source follows the convention, the parser is wrong.

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

### Physics

The answer is usually a DERIVATION, and its readability is the derivation's
structure: one `.eqline` per algebraic step, the `\boxed{}` result in
`.math-result`, and `…(i)`/`…(ii)` kept because the prose cites them
("समी (iii) व (iv) से"). Never invent a second numbering.

A unit written as a ratio (`\dfrac{कूलॉम}{वोल्ट}`) is **maths** and stacks —
it is not prose. A `**त्रिक:**` strip (मात्रक · विमीय सूत्र · राशि का
प्रकार) is the compact fact block above a topic; it is optional, so do not
synthesise one where the chapter did not write it.
