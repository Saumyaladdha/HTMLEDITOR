---
name: step01_md_reader
description: Parse maths markdown to IR — dual-spelling question chips (backtick vs dollar-delimited), and multi-line ASCII matrix rows as block boundaries. Use when matrices render as loose digits, or 0 questions come out of a chapter that clearly has some.
---

# Md Reader — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step01_md_reader/SKILL.md`, and the CODE each step
> runs is shared — one `pipeline/step01_md_reader/run.py` for all three
> subjects, so a fix lands once. **Read `docs/FORMAT_SPEC.md` §7, §8 and §10
> first** — §8's five-notation decision tree is what `book/readers/markdown.py`
> uses to decide whether a line is a matrix row at all.

## Maths dialect, measured

From `book/subjects/maths.py`'s own docstring (measured on the matrices
chapter, against physics and biology):

| | physics | biology | MATHS |
|---|---|---|---|
| `$…$` inline | 1537 | 15 | 939 |
| `\begin{bmatrix}` | 0 | 0 | **496** |
| `&` column separators | 7 | 1 | **1731** |
| `\sin`/`\cos`/`\tan` | 81 | 0 | 355 |
| `A'` transpose | 14 | 0 | 95 |

`book/subjects/__init__.py:91-92` detects maths on `\begin{bmatrix}` +
`\begin{pmatrix}` + `\begin{vmatrix}` counting **≥ 4**, checked before the
chemistry/physics/biology signatures — a maths chapter's Greek letters and
fractions would otherwise read as physics (see FORMAT_SPEC §10). Without that
gate the chapter was detected as physics and every matrix went down the
linear maths formatting path, which is what destroys them (see step07).

## Decision tree — is this line part of a matrix?

```text
IF the line is only bracketed value groups, 2+ of them, nothing else but
   spacing/operators between them (matrix.is_ascii_row)
    THEN it is a CONTINUATION row of a multi-line ASCII block

IF the line has 2+ bracketed value groups with only operators between them,
   AND prose before/after (matrix.opens_block)
    THEN it OPENS a multi-line ASCII block — split prose from matrix with
    matrix.split_around, keep reading rows while is_ascii_row keeps matching

IF a line above has exactly the same number of value groups as this one and
   is not yet claimed by another block
    THEN it is the block's FIRST row, reached-back — see "the missing top
    row" failure below

OTHERWISE (single bracket group, marks tag `[2]`, reference `[NCERT|4 अंक]`)
    THEN it is prose with an incidental bracket — leave it alone
```

`_para_run` in `book/readers/markdown.py` used to run straight through ASCII
matrix art and glue it to the paragraph above, so the branch in `run()` never
saw a matrix row at all (`book/readers/markdown.py:1925-1929` fixed this: the
para-continuation test now excludes any line where `is_ascii_row` or
`opens_block` matches). **A row of a grid is not continuation prose** — treat
that as a rule, not a one-off fix, if you see it recur.

## THE QUESTION-HEADING TRAP — two spellings, one regex

Maths writes the marks chip in **dollars**, the others in **backticks**
(`book/readers/markdown.py:65-66`, `RE_QHEAD`):

```
physics   **प्र. 1**  `[1 अंक · 2026/set_dw · खण्ड अ]`
maths     **प्र. 1**  $[1 अंक \cdot 2026 \cdot 1 अंक]$
```

`RE_QHEAD` originally accepted only the backtick form. On the matrices
chapter that meant **58 questions in the markdown became 0 in the IR** and
step02 stopped the build outright — not a partial loss, the whole question
bank. `RE_QHEAD` now matches both delimiters, and `_chip_text`
(`book/readers/markdown.py:178-184`) normalises `\cdot` → `·` and `\times` →
`×` inside the dollar form so the chip prints the same glyphs either way.

**Correct:** `**प्र. 12**  $[3 अंक \cdot 2024]$` parses as a question with a
3-mark chip reading "2024".
**Incorrect (the original bug):** the same line, with `RE_QHEAD` still
backtick-only — the whole line falls through to `para`, the question
disappears from every downstream count, and nothing errors.
**Edge case:** a chip written `$[1 अंक \cdot 2026 \cdot 1 अंक]$` with the year
duplicated inside the multiplier chain — `_chip_text` still normalises the
operators; the duplicate year is a source typo to flag in step05, not a
reader bug.

This is the same *shape* of bug the physics reader has hit four other times
(`## 2026` vs `### 2026`, `अथवा` vs `*अथवा*`, `दिया है,` vs `दिया है :`, a
named fence vs a bare one) — **two spellings of one construct, code that
knows only one.** When a maths chapter loses a whole category of block, check
for the dollar-vs-backtick split before looking anywhere else.

## What to check before trusting a parse

- [ ] `grep -c '\*\*प्र\.' content/<name>.md` vs the reader's `question` kind
      count in `01_read.json` — any gap means a chip spelling was missed.
- [ ] `grep -c '\\begin{bmatrix}\|\\begin{pmatrix}\|\\begin{vmatrix}'
      content/<name>.md` — if this is ≥ 4 and the parse did not detect
      `maths`, `--subject` was not passed and `detect()` mis-fired; pass it
      explicitly (FORMAT_SPEC §10).
- [ ] Every multi-line ASCII block: same bracket-group count on every line
      (see step00's extraction-time checklist — this is the reading-time
      half of the same check).
- [ ] `para_share` in the step01 report ≤ 0.45. A maths chapter running hot
      on `para` usually means matrix rows are being swallowed as prose again.

## Never

- **Never treat a matrix row as continuation prose.** That is exactly the
  `_para_run` bug above, and it does not error — it just quietly turns a
  grid into a paragraph of numbers.
- **Never assume the backtick chip form is the only one.** A maths chapter
  written by a different transcriber may use either; both must parse.
- **Never edit `01_read.json` by hand.** It is regenerated every run; a hand
  fix disappears on the next build and hides the real reader gap.
