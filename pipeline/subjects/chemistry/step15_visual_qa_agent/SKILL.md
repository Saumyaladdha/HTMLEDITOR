---
name: step15_visual_qa_agent
description: Inspect chemistry pages for what geometry cannot catch — a reagent printed inline instead of above the arrow, a carbocation charge drifting off its atom, a reaction running past the column edge, a drawn structure too small to read at print zoom. Use after step15 renders screenshots on a chemistry chapter.
---

# Visual Qa Agent — CHEMISTRY

> Read `pipeline/subjects/physics/step15_visual_qa_agent/SKILL.md` first —
> the hard-fail `overflow`/`broken_math` findings, the soft findings, and
> the "route the fix to the right step" table apply unchanged. This file is
> chemistry's deltas.

## What to look at first, in order

1. **Does every arrow have its label above/below it, not inline?** An arrow
   with the reagent printed inline (`xrightarrow[Δ]KOH` or similar leaked
   text) is the single defect chemistry's reaction handling exists to fix —
   ~500 of these shipped across two chapters before `format/reaction.py`
   existed (see step06). If you see it now, it is a regression, not a
   discovery.
2. **Is any `+` sitting a line above its own carbon?** That is a carbocation
   charge (`\overset{+}{C}`) rendered as a separate term instead of tight
   against the atom — `CH₃⁺` misread as `CH₃` plus an unrelated `+` changes
   the chemistry, not just the layout.
3. **Does any reaction or drawn structure run past the right column edge?**
   `.page` is `overflow:hidden`, so this is invisible to the automated
   overflow check — the page's `scrollHeight` never grows when content is
   clipped sideways rather than vertically. Look at the rendered sheet, not
   the numbers.
4. **Legibility at PRINT size, not CSS size.** The gate measures `px ×
   0.734` (the print zoom). A reagent label or an IUPAC name set at a CSS
   size that looks fine unzoomed can print under the 11px floor — a nested
   fraction inside a reaction's condition line printed at 9.8px and passed
   an unzoomed check once; only the zoomed measurement catches it.
5. **Is a drawn ring or chain structure actually readable, not just
   present?** RDKit sizes a ring's canvas from the molecule's own 2D
   coordinate span at a fixed scale (`format/ring.py`'s `_SCALE`/`_PAD`) —
   check that a multi-ring structure (biphenyl, a fused system) is not
   visually smaller than a plain benzene ring elsewhere on the same page;
   that specific defect (rings shrinking to fit a size formula keyed on atom
   count rather than actual geometry) was the reason the canvas sizing was
   rewritten.

## What only you can find, chemistry-specific

- **A locant or substituent not lining up over its atom.** `.cst`'s grid
  puts a branch in the column directly above/below its carbon — if it reads
  as floating or offset, that is a real rendering defect, not a source one.
- **Two adjacent structures at visibly different scale.** Per point 5 above
  — a chapter with several ring sizes on one page (a Fittig coupling product
  next to its plain-ring reagent) should read as consistent, not as one
  drawn "bigger" for no chemical reason.
- **A reaction reading as one wall with no breathing room between mechanism
  steps** (`पद I`, `पद II`) — each step needs to read as its own line, not
  run together with the next.

## Route the fix to the right step

| Symptom | Step |
|---|---|
| reagent inline instead of above the arrow | `step06` (LaTeX validator — check `_stash_reactions` order) |
| charge/locant drifting off its atom | `step06` |
| drawn structure too small / inconsistent scale | report as a code gap — `format/ring.py`'s canvas sizing, not a content fix |
| reaction/structure past the column edge | `step09` |
| answer badge missing on a reaction-only answer | `step07b` |
| build crashed on a ring/reaction-SMILES node | `step08` — this is the `chem_ring`/`chem_rxn` export gap, not a visual finding at all |

## Never

- Never mark an inline-reagent leak "acceptable" for being a small chapter
  or a rare construct — every leaked `\xrightarrow`/`\underset`/`\overset`
  represents a real answer misread, and the historical count (~500 across
  two chapters) shows this is not rare once it happens.
- Never sign off a chemistry build from the HTML/JSON findings alone. Point
  3 above (sideways clipping) and point 5 (structure legibility) are both
  invisible to every automated check in this pipeline.
