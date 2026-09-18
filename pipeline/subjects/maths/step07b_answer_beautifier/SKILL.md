---
name: step07b_answer_beautifier
description: Judge whether a maths derivation READS as a chain of steps — matrices staying bracketed grids, no LaTeX command printing its own name inside a cell, row-operation arrows not reading as the English words "to"/"mid", nothing re-flowed into prose. Use when a matrix answer looks like a wall of brackets with no visible steps, or a proof line runs several derivation steps together.
---

# step07b_answer_beautifier — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step07b_answer_beautifier/SKILL.md` — **read it
> first**; its eight defects (`prose_maths`, `unstacked_fraction`,
> `false_fraction`, `detached_eqno`, `run_on_steps`, `tofu_glyph`,
> `mid_formula_break`, `clipped_inline`) apply to maths unchanged, since the
> underlying passes (`stack_fracs`, `split_eqno`, `split_steps`) are shared
> code. This file is what a MATRIX-heavy derivation adds on top.

**The failure this step exists to catch is the same one physics names: an
answer that is CORRECT and UNREADABLE.** `step02` counts blocks, `step16`
counts words, `step06` confirms the LaTeX converted — none of them can tell
you a four-step matrix proof was flattened into one paragraph, or that a
grid lost its brackets while every one of its digits survived. Only looking
at the rendered page answers "can this be read as a derivation?"

---

## Input / Output

Same shape as the physics version:

| | |
|---|---|
| `build/<stem>/artifacts/07_formatted.json` | the answer nodes and their `fmt` |
| `build/<stem>.html` | what actually rendered |
| `build/<stem>/qa/page-NN.png` | **look at it** — most of these are invisible in the HTML |
| `build/<stem>/review/step07b_answer_beautifier.open.json` | what the code could not judge |

Output → `build/<stem>/review/step07b_answer_beautifier.decisions.json`, same
`{"decisions": [{"id", "defect", "verdict", "where", "why", "fix"}]}` shape.
A decision without a `fix` naming a FILE is not finished — same rule, same
reason: a decisions file fixes this build, a rule in the code fixes every
build.

## Start here, always

```bash
python3 tools/scan_render_defects.py build/<stem>.html
```

Same scanner physics uses. It is subject-agnostic; a matrix-specific fault
that slips past it is a gap in the scanner worth adding a rule for, not a
reason to check by eye every time.

---

## The maths-specific defects, and how to see each

### 1 `unbracketed_matrix` — a matrix reached the page as loose digits

```bash
grep -c '\\begin{bmatrix}\|\\begin{pmatrix}\|\\begin{vmatrix}' build/<stem>.html
```

Should always be **0** — every one of these environments must have been
consumed by `matrix.convert_latex`/`inline._restore_matrices` before the
page was written. A nonzero count here is the founding bug this subject was
built to prevent: `A=\begin{bmatrix}1&2&3\\2&3&1\end{bmatrix}` reaching the
page as `A= 1 2 3` / `2 3 1` — six digits present, the 2×3 grid gone, every
downstream word-count check reporting success. **This is a SOURCE-adjacent
finding only when the environment itself is malformed** (unbalanced
`\begin{}`/`\end{}`, FORMAT_SPEC §8's extraction checklist); otherwise it is
`step07`'s conversion pass failing — see that file.

### 2 `shrunk_matrix` — a matrix visibly smaller than its neighbours

Look at the PNG, not the HTML — `--c` and cell content can both be correct
while a stray inline `font-size` or transform makes one grid read smaller
than the matrix next to it on the same page. This was tried as an
intentional feature TWICE (per-matrix shrink, then a shared shrink across
one expression) and reverted both times — see `book/format/matrix.py:110-129`
— because a visibly smaller matrix next to normal ones reads as a bug even
when the shrink is internally consistent. **Any occurrence now is a
regression, never a deliberate choice.** The fix is always to let the wide
cell WRAP (`.subj-maths .mx>.mxg>span`), never to re-introduce a shrink.

### 3 `matrix_cell_passthrough` — a command prints its own name inside a cell

```bash
grep -oE '<span class="mxg">[^<]*\\\\[a-zA-Z]+' build/<stem>.html | head
```

The historically worst fault in this subject: 68 `\frac`/`\sqrt` occurrences
printing literally inside matrix grids, because `strip_latex` only finds
maths via `$…$` delimiters and a cell has none (see step06's full account —
`_matrix_cell`, `book/format/inline.py:1096`). **This is a renderer fault,
always** — a source cell written correctly (`\sqrt{3}`) still fails if
`_matrix_cell` is not the path converting it.

### 4 `row_op_as_word` — `\to` or `\mid` prints as the literal English word

```bash
grep -n '[^a-zA-Z]to[^a-zA-Z]\|[^a-zA-Z]mid[^a-zA-Z]' build/<stem>.html | grep -v '<'
```

`R_1 \to \tfrac{1}{2}R_1` (a row operation) or `[A \mid I]` (an augmented
matrix bar, FORMAT_SPEC §8.3) unlisted in `_CMD`
(`book/validators/latex_convert.py:40-56`) print the bare words "to" and
"mid" mid-derivation — reads as an English word dropped into notation, not
as an arrow or a bar. **Renderer fault** — both are legal LaTeX the
converter must know; check `_CMD` before assuming a source problem.

### 5 `mark_tag_in_bracket` — a half-mark `[1/2]` stacked like a 1×1 matrix

`2A = [matrix] [1/2]` — before `strip_trailing_marks`
(`book/format/inline.py:415-433`) matched `[1/2]` as well as `[1]`/`[2]`,
the half-mark tag stayed inside the maths run and was stacked as a fraction
in square brackets: visually indistinguishable from a real 1×1 matrix on a
page already full of matrices. **Renderer fault when the trailing tag is
legitimately a marks marker; source fault if the author meant an actual
1×1 matrix and wrote it ambiguously** — check which by reading the sentence
before the bracket.

### 6 `dropped_operator` — the `+`/`=` between side-by-side matrices vanished

A 3×3 addition laid out over three lines sometimes carries its operator on
the MIDDLE line, not the first, because the source is laid out as if
printed and the `+`/`=` is vertically centred on the whole matrix
(`book/format/matrix.py:441-460`, `ascii_block`'s `ops_per_line` handling).
Reading only the first line's gaps drops every operator silently — the
grids render side by side with nothing showing how they combine. **Always a
renderer fault** if the source has the operator anywhere in the block;
verify every line was checked, not just the first.

### 7 `run_on_derivation_steps` — several derivation steps set as one paragraph

The physics `run_on_steps` mechanism (`book/format/answer.py`, thresholds
`MAX_STEP_CHARS=150`, `MIN_MATH_RATIO=0.72`) applies unchanged, and earns
its keep harder here: a matrix derivation is naturally MULTIPLE steps —
`A² = A·A`, the product, the substitution, the result — each one a mark on
its own. A four-step matrix derivation collapsed onto one source line is
unreadable regardless of whether every matrix in it rendered correctly.
**Source fault** when the author wrote several steps on one line; **renderer
fault** only if each step was already its own source line and still ran
together on the page.

### 8 `slanted_remark` — a `\text{}` note inside a matrix cell reads as maths

`_matrix_cell` must run `maths_text` as its LAST step
(`book/format/inline.py:1108-1114`), same as the ordinary `.m` inline path.
A remark like `\text{ (अधिक स्थायी)}` inside a stack cell that skips this
prints in the slanted maths face instead of upright — subtle, easy to miss
in HTML, obvious in a screenshot next to upright prose.

---

## How to decide: matrix-specific version of the source/renderer table

| Symptom | Source's fault when… | Renderer's fault when… |
|---|---|---|
| unbracketed matrix | `\begin{}`/`\end{}` unbalanced, or a bare `$` nested inside `$…$` truncated the span | the environment is well-formed and still fell through |
| shrunk matrix | — | always; this feature was deliberately removed twice |
| cell command passthrough | — | always; `_matrix_cell` exists to prevent exactly this |
| `to`/`mid` as words | — | always; both are legal LaTeX missing from `_CMD` |
| dropped inter-matrix operator | the source genuinely omits an operator (rare, and worth flagging back) | the operator is present on ANY line of the block and still missing on the page |
| run-on derivation | 3+ steps genuinely on one source line | each step already had its own line |

## Never

- **Never re-flow a matrix into prose when re-breaking a run-on answer.** A
  matrix must stay a bracketed grid even while the surrounding text is being
  split into steps — `split_steps` operates on lines around the matrix
  token, never inside it.
- **Never treat a `shrunk_matrix` finding as acceptable "for this one wide
  cell."** It was tried, on purpose, twice, and reverted twice for the same
  reason each time — see defect 2. The fix is always wrapping, never a
  font-size exception.
- **Never widen `_SLUG_RE`/`MIN_MATH_RATIO` to quiet a maths finding.**
  Same rule as physics, for the same reason: these are shape-based
  thresholds shared with every subject, and loosening them to fix one
  chapter's matrix derivations breaks the next chapter's ordinary prose.
- **Never mark a defect `by_design` without naming the construct that
  causes it.** Same discipline `step02` requires for its tolerances.

## Faults fixed here since, with their causes

| Symptom | Cause | Rule now in place |
|---|---|---|
| a matrix reduced to loose digits, six numbers where a 2×3 grid should be | the general maths pass treats `&`/`\\` as stray characters and a line break | `matrix.convert_latex` runs BEFORE the general pass, stashed behind a sentinel |
| every matrix in a chapter rendered as a bare `0` | the matrix sentinel was digit-indexed; `upright` wrapped the digit and the restore pattern stopped matching | sentinel index is letters-only (`book/format/inline.py:1005-1020`) |
| 68 `\frac`/`\sqrt` printing their own command names inside cells | `strip_latex` finds maths via `$…$` delimiters; a cell has none | `_matrix_cell` converts the cell directly |
| `R₁ to …` / `[A mid I]` mid-derivation | `\to`/`\mid` missing from `_CMD` | both added, with the specific matrix context noted in-line |
| every `+`/`=` between side-by-side matrices silently dropped | only the first line's gaps were checked for an operator; the source centres the operator on the MIDDLE row of three | every line's gaps are checked, first non-empty wins |
| a 1×1-matrix-looking `[1/2]` after an answer | `strip_trailing_marks` matched `\d{1,2}` only, not the half-mark spelling | `[1/2]` recognised as a marks tag before the maths pass sees it |
| a chapter mixing ASCII-row and semicolon notation on the SAME line fused into one broken block | widening the ASCII gap-detector to accept `$…$`-wrapped operators also let it treat an unrelated standalone semicolon-matrix line as a continuation row | the gap detector deliberately excludes `$`; a `$…$`-wrapped operator is only unwrapped AFTER a row is confirmed to belong to a real multi-row block |

Add a row here whenever you fix a NEW one — this table, not memory, is what
keeps the next maths chapter from re-discovering the same fault by eye.
