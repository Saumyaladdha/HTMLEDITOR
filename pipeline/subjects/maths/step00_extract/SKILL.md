---
name: step00_extract
description: Extract a maths chapter to markdown, choosing the correct matrix notation for every table of numbers the source contains. Use when matrices arrive as ASCII art, as unbalanced LaTeX environments, or when a matrix reaches the page as loose digits instead of a bracketed grid.
---

# Extract — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths
> needs that physics and biology do not — everything not contradicted here
> is in `pipeline/subjects/physics/step00_extract/SKILL.md`, and the CODE
> each step runs is shared (one `pipeline/step00_extract/run.py` for every
> subject), so a fix lands once. **Read `docs/FORMAT_SPEC.md` §8 (all five
> matrix notations, with a decision tree) before transcribing a single
> matrix.** This file adds only what §8 does not already cover: which
> notation to CHOOSE when the source is ambiguous, and the extraction-time
> checks that catch a broken matrix before it reaches step01.

## Why this is the hardest extraction in the pipeline

Chapter 3 carries **496 balanced `bmatrix` pairs** and about 26 lines of
multi-line ASCII matrix art. A matrix that loses its bracket does not lose
formatting — it loses the mathematical object. `A=\begin{bmatrix}1&2&3\\2&3
&1\end{bmatrix}` reduced to `A= 1 2 3` / `2 3 1` passes every word-count
round-trip check there is; the six numbers are all present. But `1 2 3 2 3
1` is six numbers, and a matrix is a bracketed grid whose columns line up —
a reader cannot recover the second fact from the first no matter how
carefully the digits were preserved.

## Choosing a notation — decision tree

FORMAT_SPEC §8.1 covers how the READER tells the five notations apart once
written. This is the earlier question: **which one should YOU write**, when
transcribing from a raw scan or PDF where the matrix might not arrive in
any markdown form at all.

```text
IS the matrix part of a multi-step derivation where several matrices are
combined in one expression (A² = A·A = [..][..], or A − 6[..] + 7[..])?

    YES → write LaTeX `\begin{bmatrix}...\end{bmatrix}`, one per matrix,
          inside the SAME `$…$`/`$$…$$` span as the rest of the
          expression. This is the only notation that composes — see
          FORMAT_SPEC §8.2. Do NOT split a multi-matrix expression across
          several separate `$…$` spans; the reader needs them together to
          size and lay them out as one line.

IS this an augmented matrix — a system of equations being row-reduced,
written as [A | I] or [A | b]?

    YES → `\left[\begin{array}{ccc|ccc} … \end{array}\right]`, and the
          column-spec argument is NOT optional. Count the columns before
          the augment bar and after it, and write exactly that many `c`s
          on each side of the `|`. Getting the count wrong silently moves
          the bar to the wrong column with no error anywhere in the
          pipeline — verify by counting, not by eye.

IS the source a scanned image of a HANDWRITTEN multi-line grid — several
matrices drawn side by side across 2-3 lines, spacing being the only thing
that shows which numbers belong to which matrix?

    YES → transcribe as multi-line ASCII notation (FORMAT_SPEC §8.5):
          preserve the LINE breaks exactly as the source has them (one
          source line per matrix ROW, not per matrix), and preserve
          left-to-right ORDER of the bracket groups on each line — that
          order, not proximity or reading order, is what the reader uses
          to decide which bracket belongs to which matrix.
          Double check: does every line have the SAME NUMBER of bracket
          groups? If line 2 has three groups and line 3 has two, the
          reader will misalign row 3 against the wrong matrices — count
          groups per line before moving on.

IS the matrix short enough to fit on ONE line, and does it sit inside
running prose (mid-sentence, or wrapped in **bold**) rather than as its
own display block?

    YES → semicolon notation, FORMAT_SPEC §8.6: `[ a b ; c d ]`. This is
          the ONLY notation the reader can pull out of bold-wrapped or
          mid-sentence text; ASCII notation requires the matrix's own
          line(s), and LaTeX bmatrix requires `$…$` delimiters the
          surrounding bold markup would otherwise swallow.

IS a cell's value itself irrational, fractional, or otherwise not a bare
integer (√3, -1/2, a fraction)?

    THEN wrap that cell's value in its own `$…$` span BEFORE placing it in
    the matrix, regardless of which of the three notations above is used
    — `[ 3  $\sqrt{3}$  2 ; 4  2  0 ]`, `[ 2  $- 1$  2 ]`. A bare "√3" or
    "-1/2" typed directly into an ASCII or semicolon cell will not convert
    to proper maths notation; a `$…$`-wrapped one will, and the cell
    splitter already knows to treat a `$…$` span as ONE token even when it
    contains spaces (`$- 1$` stays one cell, not two).
```

## Extraction-time checks — verify these before handing off

- [ ] `\begin{bmatrix}` count equals `\end{bmatrix}` count (and likewise
      for `pmatrix`/`vmatrix`/`array`/`aligned`). An unbalanced pair
      swallows everything up to the NEXT matching `\end{}` in the file,
      silently absorbing unrelated text into one broken matrix.
- [ ] No bare `$` sits INSIDE a `$…$` span (i.e. no un-escaped delimiter
      nested inside another). This truncates the outer span at the first
      inner delimiter — confirmed in the physics chapter this exact bug
      shipped in.
- [ ] Every multi-line ASCII matrix block has the SAME bracket-group count
      on every line — see the decision tree above.
- [ ] No bare `~` (tilde) survives inside a matrix cell's LaTeX — it is a
      non-breaking space in real LaTeX, not a literal character; see
      FORMAT_SPEC §11 for why a stray one is actively dangerous (it can
      collide with unrelated markup many sentences away).
- [ ] An `array` environment with NO `&` in any row is a STACK of lines,
      not a matrix — do not wrap it in bmatrix-style brackets on the
      assumption that `\begin{array}` always means "matrix." See FORMAT_SPEC
      §8.4.
- [ ] Marks chips: maths writes `$[1 अंक \cdot 2026]$`, physics writes
      `` `[1 अंक · 2026]` ``. Either works; be consistent within one file —
      a chapter mixing both conventions is harder to audit, not harder to
      render.
- [ ] **No production notes in the delivered markdown.** Chapter 3 once
      opened with 1084 characters of `<!-- … -->` notes; the reader strips
      HTML comments now, but a clean extraction should not rely on that
      stripping — write the delivered file as if nothing will be stripped.

## Repair example — a matrix that reached step01 broken

**Symptom:** `A′A = [cosα sinα; -sinα cosα][cosα -sinα; sinα cosα]` renders
as two proper grids, but the very next line — the multiplied-out result —
prints as raw, un-gridded `[ cos²α+sin²α cosαsinα-cosαsinα ; …]` text.

**Diagnosis:** the result line was written with a BARE backslash somewhere
in one cell (real, unrelated LaTeX the semicolon-notation splitter does not
understand), which correctly disqualifies the WHOLE row from conversion —
see FORMAT_SPEC §8.6's rule that a bare backslash outside any `$…$` span
means "leave this bracket alone." The fix is never to loosen that rule; it
is to find and correct the stray backslash, or wrap the specific term that
needs it in its own `$…$` span so the backslash sits INSIDE a span instead
of bare in the row.

**Validation:** after the fix, `has_semicolon_matrix()` on that exact line
returns a match, and the built page shows three same-sized grids in a row,
not two grids and one wall of un-rendered brackets.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below.

Extraction feeds the reader, so the constructs it must preserve VERBATIM
now include four the reader learned: a `**त्रिक:**` fact strip, a
`· **13 सवाल आए · 1 व 5 अंक में**` trailer on a topic heading, the
`` `[1 अंक · 2026 · Set A/C]` `` question tag (marks, papers, notes — do
not normalise the `·` separators or the `Set A/C` spelling), and
`\boxed{…}` inside maths. Losing any of them downgrades a styled block to
a plain paragraph with no error anywhere.
