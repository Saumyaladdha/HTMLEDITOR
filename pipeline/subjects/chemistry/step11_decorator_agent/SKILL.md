---
name: step11_decorator_agent
description: Decorate chemistry sparingly — a reaction grid or a drawn structure already carries meaning through position and density; a doodle beside one competes with the reagent for attention. Use when a proposal would place art near a reaction, structure or ring.
---

# Decorator Agent — CHEMISTRY

> Read `pipeline/subjects/physics/step11_decorator_agent/SKILL.md` first —
> the density-inversely-proportional-to-content rule, the placement limits
> in `book/decorators/policy.py`, and the role table apply unchanged. This
> file is chemistry's deltas.

## Restraint around drawn chemistry

The reaction grid, a drawn `.cst` chain structure, and a drawn `.cring` are
already carrying meaning through their own position and whitespace — the
arrow's stretch, the substituent sitting exactly over its carbon, the ring's
own proportions. Adding a rule, a tint, or a border around any of them
competes with that for the reader's attention and makes the reagent (or the
locant, or the substituent) harder to find — which is the one thing on the
line the question is actually asking for.

```text
IF a decorator proposal sits within one line of a `.rxn`, `.cst` or `.cring`
    THEN reject by default — art beside drawn chemistry reads as clutter
    around the answer, not decoration of a margin

IF the page is a Q&A page carrying real reactions and structures (organic
   chapters run dense here — up to 78 structure images in one measured
   chapter)
    THEN treat it exactly like physics's full Q&A pages: the reference
    design puts ZERO doodles there. A page busy with real chemistry content
    needs no filler.

IF the slack is genuinely at the END of a section or part, with no drawn
   chemistry nearby
    THEN the ordinary physics decision tree applies unchanged
```

## Never

- Never accept a doodle or character placement adjacent to a `.rxn`, `.cst`
  or `.cring` element, whatever the free-space number says next to it.
- Never propose art on an organic Q&A page dense with structure images —
  the structures themselves are the visual interest the page has; more art
  competes with them.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**There is no floated note column any more.** The reference carries zero
`.stickycol`: a note is set inline, in the column it belongs to. A
निगमन (derivation) card additionally gets `.derivation-note`, which drops
the rotation and puts each step on its own line — those cards are read
down, not glanced at.

So "move it to the margin" is no longer an available fix. A note that does
not fit belongs earlier or later in its own column.
