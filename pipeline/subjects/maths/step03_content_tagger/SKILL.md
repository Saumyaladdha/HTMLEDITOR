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
