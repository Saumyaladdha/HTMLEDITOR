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
