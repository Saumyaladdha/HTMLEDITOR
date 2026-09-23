---
name: step09_layout_analyzer
description: Measure chemistry layout — a reaction line and a drawn structure are ATOMIC and must be measured at column width, not page width. Use when a reaction line overflows a column, or a drawn structure/ring gets clipped.
---

# Layout Analyzer — CHEMISTRY

> Read `pipeline/subjects/physics/step09_layout_analyzer/SKILL.md` first —
> the `.page{overflow:hidden}` danger, `settle()`'s convergence, and the
> "measure, never estimate" doctrine all apply unchanged. This file is
> chemistry's deltas.

## What is wide, and why it must be measured at COLUMN width

A reaction line with named species (`\underset{नाम}{formula}` under each
side) is the widest thing chemistry sets — wider than any bare physics
formula — and a 3×3 inorganic configuration table is close behind. Both
**must be measured at column width (449.5px `.acol`), not page width**:
measured at page width a reaction reads shorter than it will actually be on
the page, and the pack is balanced on a number that never happens on the
real sheet.

## Reactions, structures and rings are ATOMIC — never let them split

`book/assemble/render.py` marks every `structure`, `ring` and `rxn_smiles`
node `atomic=True` (lines 214, 220, 226), same as a display formula. Half a
drawn benzene ring, or a reaction whose arrow lands on one page and its
product on the next, is not a smaller version of the reaction — it is
unreadable. If a chemistry chapter reports `block_too_tall` on one of these,
that is a genuine "does not fit at all" finding, not a split candidate —
route it to `step12`'s table-restructuring options only if it is actually a
`table` node; a `structure`/`ring`/`rxn_smiles` node has no split path at
all (see `layout/split.py`'s note in the physics SKILL: only a list-shaped
block divides).

## Widow control already fixes most inline reaction wrapping — know what is left

An INLINE reaction (one sitting inside a question stem or an answer
sentence, not its own display line) is not wrapped `nowrap` by
`format/reaction.structure()` alone — `structure_inline()`
(`book/format/reaction.py:542-580`) has to find every `.m` span holding an
arrow grid and structure each one individually, because `components.math.eq`
only structures a DISPLAY equation. Before this ran, **43 of 151 arrows on
chapter 6 had their species split across two lines**, and what landed alone
on the next line was usually the smallest piece — `+ CO2`, `+ H₂O`, `+ KCl`
— reading as a new, disconnected statement.

`bind_widow()` (`reaction.py:513-536`) additionally makes only the LAST
`+ X` of a finished reaction unbreakable, deliberately not every `+` —
binding every operator would make a long equation refuse to wrap at all and
push it off the column, which is worse than one controlled wrap at the
arrow.

```text
IF an inline reaction's PRODUCT ends up alone on the next line
    THEN check bind_widow's max_tail (26 chars) — if the orphaned tail is
    longer than that, this is expected: only a SHORT trailing "+ X" is
    protected, a long one is allowed to wrap normally
IF the reaction splits somewhere OTHER than at the arrow or the final "+"
    THEN structure_inline did not run on this span — check it is really a
    `.m` span with a `.rxn` grid inside it, not prose that merely mentions
    a formula
```

## Never

- Never measure a reaction or a table at page width "to save a round" — the
  balance decision needs the real column number or it is a decision about
  numbers that never occur on the printed sheet.
- Never treat a `structure`/`ring`/`rxn_smiles` overflow as splittable. They
  are atomic by construction; the only fixes are a smaller reserved slot or
  restructuring the source content, never a partial split.
- Never raise `CONTENT_H` to make a wide reaction "fit" — see the physics
  doctrine: that hides clipping, it does not remove it.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**Three structural changes to the packer's world.**

- **Part 1 is two columns**, packed by `pack_columns` in the same stream as
  Part 2 — a part boundary is no longer a page boundary. There is no
  `flowwrap` half and no floated note column.
- **`GAP` is 0**, and that is measured: across 54 built columns and 601
  block boundaries the real space between stacked blocks is 0.22px. It was
  9, which invented ~100px of phantom occupancy per column. If the
  stylesheet ever puts real space back between `.u` siblings, **re-probe**
  and set it to what the browser reports.
- A part banner that opens a page is **hoisted out of the column** into the
  page header so it spans the sheet. The packer still charges its column
  height, so that can only leave a page emptier than modelled, never
  overfull.

`.page` is `overflow:hidden` — clipped content is DELETED, so the settle
pass measuring a real render is not optional.
