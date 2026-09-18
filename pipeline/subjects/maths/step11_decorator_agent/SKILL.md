---
name: step11_decorator_agent
description: Place art in a maths chapter — almost never. A matrix IS the page's own illustration, and a chapter of worked matrix algebra can carry zero figures and still be dense and visual. Use only when step10 has already confirmed a gap is genuine slack, not matrix-caused dead space.
---

# Decorator Agent — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step11_decorator_agent/SKILL.md` — the density
> rule ("decoration density is inversely proportional to content density"),
> the placement limits, and the roles table all apply unchanged. This file is
> the maths-specific case for saying no more often than usual.

## Maths needs almost no decoration, and this is measured, not a guess

The reference chapter has **0 figures** against physics' 69 and biology's 21
(`book/subjects/maths.py`'s profile notes; `PROFILE["figures"] = "inline"`
exists for a future chapter that might have one, not because this one does).
A matrix IS the diagram — a page of worked matrix algebra is already dense
and visual in exactly the way a doodle is supposed to make a bare page feel,
so art competes with the notation instead of supporting it.

## Decision tree

```text
DID step10 already classify this space as `gap` (caused by a matrix that
   would not fit — see step10's decision tree) rather than genuine `slack`?
    YES → accept: false, always. Decorating a matrix-caused gap hides a
    pagination fact behind a picture; fix the packing question at step09,
    never paper over it here.

IS the page ALREADY carrying a matrix or a derivation nearby?
    YES → the page is visually busy by this subject's own standard even
    if the free-space number suggests otherwise. Lean toward accept:
    false — the same "is the page already busy" question the physics
    reference asks, but maths pages read as busy at a lower text-density
    threshold because a matrix is visually heavier than a paragraph.

IS the space at the end of a part, or after the LAST derivation on a page,
   with no matrix nearby and no pagination question outstanding?
    THEN it is the same as any subject's ordinary slack — apply the
    physics reference's three questions (slack vs gap, already busy,
    would removing it be a loss) normally.
```

## Never

- Never accept a decorator placement where step10 attributed the space to
  an unsplittable matrix. That art would be sitting on top of a real
  pagination question the reader never gets to see fixed.
- Never propose art beside a matrix or a derivation "to balance the page."
  A matrix's own bracket and grid lines are already the page's visual
  interest; adding a doodle next to one reads as clutter, not balance.
