---
name: step06_latex_validator
description: Validate maths LaTeX conversion — above all inside matrix cells, which are cut out of their $…$ delimiters and need a separate conversion path. Use when a command prints its own name, especially inside a bracketed grid, or when a row operation arrow prints "to"/"mid" as English words.
---

# Latex Validator — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step06_latex_validator/SKILL.md`, and the CODE
> each step runs is shared — one `pipeline/step06_latex_validator/run.py` for
> all three subjects, so a fix lands once.

## Why this step matters more here than anywhere

Maths is the only subject where the notation carries the entire meaning, and
the worst bug found in this subject lived exactly here:

**68 `\frac` and `\sqrt` commands printed their own names INSIDE matrix
cells** (`pipeline/subjects/physics/step15_visual_qa_agent`-style scan,
confirmed by `tools/scan_render_defects.py`'s `latex_command` rule on the
first maths build).

**The cause, and why it is not obvious.** `strip_latex` finds maths by its
`$…$` delimiters — that is literally how it knows what to convert. A matrix
cell has been cut out of the MIDDLE of an expression by `matrix._cells`
(splitting on `&`/`\\`) and arrives with no delimiters of its own, so handing
a bare cell like `\sqrt{3}` to the ordinary converter converted nothing —
it just is not maths-shaped text as far as that function is concerned.
`_matrix_cell` (`book/format/inline.py:1096-1120`) exists specifically to
route around this: it calls the converter DIRECTLY on the stripped cell
rather than relying on delimiter detection, and its docstring names the
exact fault (68 occurrences) this fixed.

**Correct:** a matrix cell `-\frac{1}{2}` renders as a stacked fraction
inside the grid, same as it would inline.
**Incorrect (the shipped bug):** the same cell prints literally as
`-\frac{1}{2}` — the backslash, the command name and the braces, sitting
inside an otherwise-correct bracketed grid.
**Edge case:** a cell carrying a `\text{...}` remark inside an `array` stack
(chemistry-adjacent, but the same code path a maths `array` stack uses) must
ALSO run through `maths_text` as `_matrix_cell`'s last step
(`book/format/inline.py:1108-1114`), or the remark inside the cell renders
in the slanted maths face instead of upright — a subtler version of the same
class of bug, not a different one.

## Row-operation and relation commands maths uses that physics rarely does

From `book/validators/latex_convert.py:40-56`:

| Command | Renders | Why it is here and not obvious |
|---|---|---|
| `\to` | → | the arrow of a ROW OPERATION, `R_1 \to \tfrac{1}{2}R_1` — "replace row 1 with half of row 1." Unlisted, it printed the bare word "to": every step of a matrix-inversion answer read `R₁ to …`, looking like an English word dropped mid-notation. |
| `\mid` | `\|` | the bar of an AUGMENTED matrix, `[A \mid I]` (FORMAT_SPEC §8.3), and of set-builder notation. Unlisted, matrix-inversion answers opened with "[A mid I] लिखकर" — reads as a typo, not notation. |
| `\gets` `\mapsto` `\implies` `\iff` | ← ↦ ⇒ ⇔ | same family as `\to`; check these are covered if a new chapter's row-reduction proofs use them. |

## `\sqrt` and `\frac` bracket rules — grounded in the actual code

`book/validators/latex_convert.py:230-243`: `\sqrt{3}` must render `√3`, not
`√(3)`. Brackets are added ONLY when the argument contains an operator or a
space, because `√a + b` and `√(a + b)` are different quantities — a single
token needs no protecting brackets. The same rule (same file, ~15 lines
above) governs `\frac`'s numerator/denominator when re-composed as a flat
`a/b`: `(1)/(4πε₀)` was a real, shipped bug from over-bracketing a single
token, read as a product instead of a quotient.

**Why this matters more inside a matrix cell specifically:** `√(3)` next to
bare digits in a grid — `3 √(3) 2` — reads as a factor, widening the row
relative to its neighbours; `√3` does not. The bracket rule is general, but
a matrix cell is where a wrong bracket is most visually obvious, because
every other cell in the row is bare.

## What is verified vs. what is not

- 137 `\frac`, 355 trig commands (`\sin`/`\cos`/`\tan`), 321 Greek letters —
  all on the ordinary (non-matrix) conversion path, all measured working.
- **0 `\int` in the chapter this was built against.** Nothing about integral
  rendering has been verified against real maths content. Do not report
  integral handling as working until a chapter containing them has actually
  been built — this is a gap to disclose, not a gap to guess past.

## What to check before signing off

- [ ] `grep -o '\\\\frac\|\\\\sqrt' build/<stem>.html` returns nothing — any
      hit means a command survived conversion and is printing its own name.
- [ ] `python3 tools/scan_render_defects.py build/<stem>.html` — zero
      `latex_command` and `bare_backslash` hits.
- [ ] Spot-check at least one matrix cell containing `\frac`/`\sqrt`/`\to`/
      `\mid` in the rendered PNG, not just the HTML source — a cell can be
      byte-correct and still overflow or misalign in the grid (step15's job,
      but worth a glance here since this step is where the fault usually
      originates).

## Never

- Never assume `strip_latex`'s ordinary path covers a matrix cell. It
  categorically does not — cells have no `$…$` delimiters to find. Any new
  matrix-adjacent conversion issue starts by checking whether it is going
  through `_matrix_cell` at all.
- Never hand-convert a matrix cell's LaTeX to Unicode in the source to dodge
  a converter gap. The next chapter's matrices hit the identical gap, and
  now the source and the converter disagree about how maths is written.
- Never trust the HTML alone for a matrix fault. A mis-bracketed `√(3)` cell
  is visually obvious in a PNG and easy to miss in raw markup sitting next
  to five other correctly-converted cells.
