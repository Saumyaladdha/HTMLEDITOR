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
