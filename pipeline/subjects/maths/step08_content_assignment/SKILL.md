---
name: step08_content_assignment
description: Assign components for maths kinds — above all, know that matrix_art is the only matrix-related BLOCK kind; a matrix inside $…$ is never a block and never gets its own component. Use when matrix_art or a maths rubric kind has no component.
---

# Content Assignment — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step08_content_assignment/SKILL.md`, and the CODE
> each step runs is shared — one `pipeline/step08_content_assignment/run.py`
> for all three subjects, so a fix lands once.

## The one maths-specific row

| kind | component | via |
|---|---|---|
| `matrix_art` | `matrix_art` (`book/components/text.py:203`) | side-by-side grids built from multi-line ASCII rows — `book/assemble/render.py:228-231` |

`book/format/assignment.py:22-23` maps this directly: `"matrix_art":
"matrix_art"`.

## Decision tree — is a matrix ever anything other than `matrix_art`?

```text
IS the matrix written as multi-line ASCII art occupying its own source
   lines (FORMAT_SPEC §8.5/§8.6)?
    THEN it is the `matrix_art` BLOCK kind — assign the `matrix_art`
    component. This is the ONLY case a matrix is a block at all, because
    it is the only case where it occupies whole lines of the source on
    its own, outside any surrounding paragraph.

IS the matrix written inside $…$ or $$…$$ (LaTeX bmatrix/pmatrix/vmatrix,
   FORMAT_SPEC §8.2/§8.3), sitting inline within a sentence or a formula
   line?
    THEN it is NEVER a block kind. It is built inline by
    `format/inline.py`'s `_restore_matrices` inside whatever block already
    holds the expression — a `formula`, `given`, `flow` step, or `para`.
    Assigning it its own component would mean re-tagging the PARENT block
    as something else entirely, which is a step03 decision, not a step08
    one — and step08 never invents new block boundaries.
```

**Correct:** a `**दिया है:**` line containing `A = \begin{bmatrix}1&2\\3&4
\end{bmatrix}` stays kind `given`, component `given`; the matrix renders
inside it via the inline path.
**Incorrect:** retagging that block `matrix_art` because it contains a
matrix — this discards the `given` semantics (the pink left rule, the
"values a solution starts from" meaning) for no reason the source asked for.

## Never

- Never give an inline matrix its own component. If a matrix is
  wrongly appearing to need one, the actual problem is almost always that
  step07's conversion is failing and the matrix is reaching this step as
  literal, un-gridded bracket text inside a `para` — that is step07's fault,
  not a missing mapping here.
- Never point `matrix_art` at a generic text component "temporarily." A
  matrix rendered through `para` prints the row markers and brackets as
  literal characters, same failure mode `step08`'s physics reference warns
  about for `figure`.
