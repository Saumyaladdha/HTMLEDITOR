---
name: step02_content_validator
description: Judge count mismatches in a maths chapter — matrix environment balance, & separator arithmetic, and dollar-chip questions the source-side counter must match independently of the reader. Use when step02 reports a count_mismatch on question, matrix, or given.
---

# Content Validator — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step02_content_validator/SKILL.md`, and the CODE
> each step runs is shared — one `pipeline/step02_content_validator/run.py`
> for all three subjects, so a fix lands once.

## Why this step is not redundant with step01

`step02` counts the source with rules that share **no code** with the
reader (`book/validators/content.py`'s `SOURCE_RULES`). Two independent
counters disagreeing is the entire point — a helper reused by both sides
would agree with itself even when both are wrong. On the matrices chapter
this mattered directly: the reader's `RE_QHEAD` bug (step01) that turned 58
questions into 0 was caught here, because the source-side question counter
used a separate, dollar-chip-aware regex and reported "markdown 58, IR 0".

## Maths-specific checks

| Check | What a mismatch usually means |
|---|---|
| **Question count** (`grep -c '\*\*प्र\.'`) | 0 in the IR against a real source count is the RE_QHEAD spelling gap — see step01. |
| **`\begin{bmatrix}` opened = closed** | An unbalanced pair swallows everything up to the *next* matching `\end{}`, silently absorbing unrelated text into one broken matrix — this does not error, it just produces a wrong parse. |
| **`&` count is a multiple of what the rows imply** | 1731 separators on the reference chapter; a count that does not divide evenly across rows points at a row with a missing cell — a transcription error, not a rendering one. |
| **Matrix rows are rectangular** | `matrix.grid` (`book/format/matrix.py:131-145`) pads a short row so the columns below it do not shift on the page, but a ragged row in the SOURCE is almost always a transcription slip worth reporting even though the renderer will not crash on it. |
| **No bare `$` inside a `$…$` span** | Truncates the outer span at the first inner delimiter — a real bug that has shipped (see FORMAT_SPEC §8, step00's extraction checklist). |

## How to decide

```bash
grep -c '\*\*प्र\.' content/<name>.md
python3 -c "
import json;d=json.load(open('build/<stem>/artifacts/02_validated.json'))
print(sum(1 for p in d['parts'] for c in p['children']
          for q in (c.get('children') or []) if q['kind']=='question'))"
grep -o '\\begin{bmatrix}' content/<name>.md | wc -l
grep -o '\\end{bmatrix}'   content/<name>.md | wc -l
```

**parsed < source is almost always real loss** and `high` severity — treat it
as a bug until proven otherwise, same as physics. A matrix-specific reading:
if the question count is fine but the **matrix count** is short, the most
likely cause is an unbalanced `\begin{}`/`\end{}` pair upstream swallowing a
run of matrices into one broken block, not a dropped matrix.

**by_design is legitimate but rare here too.** A stack shape
(`\begin{array}{l}` with no `&` in any row — FORMAT_SPEC §8.4) is one
`array` environment producing several rendered lines with no bracket; that is
correct, not a mismatch, and should be added to the tolerance in
`SOURCE_RULES` if it is not already accounted for — never silenced by eye.

## What to check before signing off

- [ ] `\begin{bmatrix}`/`\begin{pmatrix}`/`\begin{vmatrix}`/`\begin{array}` —
      opened count equals closed count, checked separately per environment.
- [ ] `&` total divides evenly by (rows × (columns − 1)) for every matrix you
      can hand-verify; an odd remainder means a specific row is short a cell.
- [ ] Question count and answer count both reconcile; more answers than
      questions is legitimate ONLY when it matches the number of `अथवा`
      alternatives (see step05) — never accepted without that check.

## Never

- **Never widen a tolerance to make a finding go away.** The tolerance is a
  statement about the content model (e.g. "an `array` stack yields N lines
  from 1 environment"), not a way to silence the check.
- **Never accept "the totals are close."** A matrix off by one row is not
  close — it is a different mathematical object. Reconcile exactly.
- **Never assume a ragged row is the renderer's problem.** `matrix.grid`
  padding hides it from the *page*; it does not make the source correct, and
  the transcription error is worth fixing at the root.
