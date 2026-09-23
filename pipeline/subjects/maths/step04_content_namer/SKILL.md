---
name: step04_content_namer
description: Assign stable ids in a maths chapter, where most decisions are about a matrix rather than a paragraph. Use when a decision no longer matches the block it was made about, or a matrix's id changes when its cell formatting changes.
---

# Content Namer — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step04_content_namer/SKILL.md`, and the CODE each
> step runs is shared — one `pipeline/step04_content_namer/run.py` for all
> three subjects, so a fix lands once.

## What differs: not the mechanism, the subject matter

Naming (`book/taggers/naming.py`) is unchanged for maths. What differs is
what a *decision* is usually about: in physics it is a callout type; in
maths it is almost always a matrix — which environment it was
(`bmatrix`/`pmatrix`/`vmatrix`/`array`), how its cells were split, or
whether a multi-line ASCII block was paired by column position correctly
(FORMAT_SPEC §8.5).

## The rule this implies

An id must be stable **across a matrix being re-rendered**, because cell
formatting (step06/step07) can change — a `\sqrt{3}` cell rendering
`√(3)` today and `√3` tomorrow — without the matrix itself changing. If a
decision was written against `p1.s3.matrix2` and a later fix changes only
how that matrix's cells are set, the id must still point at the same
matrix, or the earlier decision silently stops applying.

**Correct:** `p1.s3.matrix2` names the matrix by its position in the
document (part → section → nth matrix), independent of its cell contents.
**Incorrect (would break the naming contract):** an id derived from a hash
of the matrix's rendered cell text — a bracket-height fix or a `√(3)` → `√3`
fix would silently change the id and orphan every decision made against it.

## Never

- **Never hand-edit `_index`.** It is regenerated from the document every
  run — same rule as every subject.
- **Never make an id depend on a matrix's cell formatting.** Formatting
  changes across builds (step06/step07 fixes land constantly on this
  subject); the id must not.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below.

Naming is unchanged by the reference work, with one thing to know: a
`.qhead` now carries `id="q-N"`, so a question's number is an ANCHOR that
prose links to (`#q-73`). Whatever you name a question, the number itself
has to keep matching what the markdown wrote, or a cross-reference in an
answer points at nothing.
