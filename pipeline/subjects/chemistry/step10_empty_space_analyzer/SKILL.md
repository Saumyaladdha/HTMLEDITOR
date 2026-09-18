---
name: step10_empty_space_analyzer
description: Reclaim chemistry dead space — formula_card panels, tables, options and bullets are splittable; a drawn structure, ring or reaction is not, so a gap in front of one is not this step's to fill. Use when a column ends early.
---

# Empty Space Analyzer — CHEMISTRY

> Read `pipeline/subjects/physics/step10_empty_space_analyzer/SKILL.md`
> first — the `ok`/`slack`/`gap`/`lopsided` thresholds and the
> leave/repack/decorate decision apply unchanged. This file is chemistry's
> deltas.

## Where the reclaimable space is

`formula_card` panels (17 across the three measured chapters), tables (20),
options and bullets — see `book/subjects/chemistry.py`'s `splittable` tuple:
`("formula_card", "bullets", "options", "table")`. `numbered` is excluded
for the same reason as biology: an `<ol>` continuation restarts at 1, and
telling a student that step 4 of a mechanism is step 1 is worse than the
hole it would fill.

```text
IF the gap sits in front of a `formula_card`, `table`, `bullets` or
   `options` node
    THEN `repack` is the right default suspicion — the splitter can
    genuinely divide it; check whether it actually tried (see below)

IF the gap sits in front of a `structure`, `ring` or `rxn_smiles` node
    THEN `repack` CANNOT apply — these are atomic (step09), no split path
    exists. The only real fixes are: shrink the reserved slot if it was
    over-sized, or `decorate` if the leftover is genuine slack, or `leave`
    if it is end-of-section breathing room

IF the gap sits in front of a reaction that is NOT its own display line
   (an inline `.rxn` still sitting in prose)
    THEN this may actually be a `step09`/promote_reactions gap — a reaction
    that should have been promoted to a display line and was not; route
    there, not here
```

## The splitter looks past leading chrome — this was itself a bug, now fixed

The panel-finding pass used to consider only the FIRST block of a column, so
a splittable `formula_card` sitting behind a 152px section head was skipped
every round even though it was genuinely divisible. Fixed to look past
leading section chrome to find the actual panel. If a chemistry chapter still
shows a large gap in front of a सूत्र/अभिक्रिया panel that never gets
repacked, check whether something new is again sitting in front of it and
blocking the scan, before concluding the panel itself cannot split.

## Never

- Never propose `repack` for a gap in front of a `structure`/`ring`/
  `rxn_smiles` node — there is no split mechanism for it; see step09.
- Never flag the last page, or the natural pause between Part 1 and Part 2's
  cover, as a defect — chemistry chapters use the same part structure as
  physics and the same exemption applies.
