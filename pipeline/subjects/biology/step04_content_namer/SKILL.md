---
name: step04_content_namer
description: Assign stable block ids to a biology chapter. Use when a recorded decision no longer matches the block it was made about, or a duplicate id fires on a figure/flow-heavy chapter.
---

# Content Namer — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step04_content_namer/SKILL.md` — **read it
> first** for the three properties an id must have (stable, unique,
> readable) and the general duplicate-id triage. The CODE the step runs is
> shared — one `pipeline/step04_content_namer/run.py` for both subjects — so
> a fix to `book/taggers/naming.py` lands once.

## What this step is for

Giving every block a stable id, so a later step's decision can be pinned to
it across builds.

## What differs in biology

Nothing in the naming MECHANISM differs. What differs is what a recorded
decision is likely to be ABOUT: in physics, most decisions concern notation
and equation numbering; in biology they concern **figures** — which plate
belongs to which brief, and what to do about the ones missing from disk
(21 image references, 9 unique files, all 9 absent — see `step11`) — and
**flow chains**, where a decision may need to survive the chain's own
layout changing shape between builds.

## Decision tree — when a `flow` block's id must stay stable across a re-render

```text
IF a `flow` block's stage count/character length crosses FLOW_WRAP_STAGES
   (4) or FLOW_WRAP_CHARS (62) between one build and the next (content
   edited, or the same content measured against a re-flowed page)
    THEN the block RE-RENDERS horizontally -> vertical (or back), via
    `book/elements/flow`'s `.flow-down` variant
    THEN its id MUST NOT change — a decision recorded against it (say, a
    step07b note about its wording) still has to resolve to the same node
```

**Correct**: an id derived from the block's position in the document tree
and a content hash of its STAGE TEXT (not its rendered orientation) —
`p1.s1-4.flow1` stays `p1.s1-4.flow1` whether it prints as four horizontal
chips or a vertical column.
**Incorrect**: an id that encodes "horizontal" or "vertical" in the string,
or derives from measured pixel geometry — either breaks the moment the
same content is remeasured against a different page width.
**Edge case**: two `flow` blocks under the same section with identical
stage text (a repeated summary chain) — `naming.py`'s collision suffix
(`p1.s3.flow1`, `p1.s3.flow2`) is the correct outcome here; do not treat
this as a content bug the way a duplicate `प्र. 4` would be (see below).

## When it does fail

A duplicate id almost always means the CONTENT has a duplicate: two
questions numbered 4 in one group, two figures both captioned "चित्र 3.1".
Fix the markdown — the renaming suffix in `book/taggers/naming.py` is a
safety net, not a solution, and a book with two "चित्र 3.1" captions is
wrong on the page too, independent of the id collision.

## What to check

- [ ] Re-run the same chapter twice with no content change; every id must
      be byte-identical between runs (stability).
- [ ] No id in `04_named.json`'s `_index` repeats (uniqueness) — a repeat
      here is a hard failure, not a review item, because it silently makes
      two blocks share every later decision.
- [ ] A figure id and its `figure_brief` sibling id are distinguishable at
      a glance when reading a `step11` review queue — if both read as
      `p1.s2.fig1`, the id scheme has collapsed two different kinds into
      one shape.

## Never

- Never hand-edit `_index`. It is regenerated from the document every run.
- Never make an id depend on page number, column, or rendered orientation.
  Pagination moves and a `flow` chain's layout can flip between builds; an
  id tied to either is worthless the moment either changes.
