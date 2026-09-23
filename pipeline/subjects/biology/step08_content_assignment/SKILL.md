---
name: step08_content_assignment
description: Assign biology content to components before measurement. Use when the block mix looks wrong for a callout-heavy, figure-led chapter, or when figure_brief reads as unassigned rather than deliberately empty.
---

# Content Assignment — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step08_content_assignment/SKILL.md` — **read
> it first** for the full kind→component table and the reuse-vs-new-component
> rule. The CODE is shared — one `pipeline/step08_content_assignment/run.py`
> for both subjects.

## What this step is for

Deciding which component renders which block, before measurement.

## Biology shape, measured

932 blocks (current build) against physics's 1538, but **214 callouts
against 108** — biology is shorter and far more interrupted. Long unbroken
prose runs are rarer; short labelled strips are commoner. Practically: the
assignment step sees many more small atomic blocks, so the packer has more
places it CAN break and fewer large blocks it must place whole — this is a
real contributor to why biology's build came out 41 pages against
physics's comparable 61.

## Decision tree — a kind that renders to nothing is not an unassigned kind

```text
IS the kind in `book/format/assignment.RENDERS_NOTHING`
   (currently: {"figure_brief"})?
    YES → it correctly has NO component, by design. Do not report it
    through the "unassigned kind" path — that path means "nobody has
    decided what this looks like," which is a different, fixable
    problem, and an item that can NEVER be closed (because nothing should
    ever be assigned) is a review queue nobody can act on.
    → verify: `component_for("figure_brief")` returns `None`, but
    `RENDERS_NOTHING` is what `apply()` checks BEFORE treating `None` as a
    defect (assignment.py, around line 65-75).

    NO → a `None` component IS a real defect: `apply()`'s only other
    reading of `None` is "missing," and `verify()` calls `hasattr(C,
    component_name)` — mapping a real kind to `None` directly in `MAP`
    breaks verify() outright rather than reporting cleanly. Never do this
    to silence a kind; add it to RENDERS_NOTHING only if it is TRUE
    metadata, or give it a real component otherwise.
```

**Correct**: `figure_brief` shows up in the step's report as `renders:
none (by design)`, distinct from an actual gap.
**Incorrect (the original failure this trap describes)**: reporting
`figure_brief` through the generic "no component assigned; it will not
render" path — indistinguishable from a genuine bug, and because nothing
should ever be assigned to it, this specific review item can never be
closed. An always-open, never-closeable item is worse than no report at
all — reviewers learn to skip the queue.
**Edge case**: if a FUTURE kind needs to render SOMETIMES (say, a debug
mode that prints figure briefs for internal review builds), it does not
belong in `RENDERS_NOTHING` — that set means "never, by design," not
"not right now." A conditionally-rendered kind needs its own component
that decides internally, not a blanket exclusion here.

## What to check before closing this step

- [ ] `figure_brief` (and any other kind added to `RENDERS_NOTHING`) is
      reported separately from genuinely unassigned kinds in this step's
      summary — not folded into the same count.
- [ ] Every OTHER kind present in `08_assigned.json` has a non-`None`
      `component`, and that component name exists in
      `book/components/__init__.py`'s `__all__` — `verify()` should catch
      a typo, but confirm it actually ran rather than assuming.
- [ ] The callout count (214) and figure count (21, all currently unresolved
      to real art — see `step11`) are both accounted for with a real
      component (`pointer`, `figure`) even though most figures render as a
      reserved empty plate rather than a filled image.

## Never

- Never map a real, rendering kind to `None` in `MAP` to make a queue item
  disappear. `None` is how `apply()` detects a genuinely missing
  component; doing this to a real kind breaks `verify()`'s
  `hasattr(C, None)` check outright rather than reporting a clean gap.
- Never point a kind at a component whose markup does not fit — a
  biology `figure` rendered through `para` would print a bare filename
  as a sentence, not a plate.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**Part 1 and Part 2 both pack into two columns now.** There is no
single-column `flowwrap` half and no 300px floated note column; a sticky
note is assigned INLINE, into the column its section sits in. A Part-1
item carries `revision`, which is what gives it `.revision-unit` and its
page `.revision-flow`.
