---
name: step13_css_generator
description: The chemistry-only CSS elements — .rxn arrow grid, .sp species, .ovl lone-pair bar — where their rules live and why print sizes must stay in absolute px. Use when reaction styles do not reach the page.
---

# Css Generator — CHEMISTRY

> Read `pipeline/subjects/physics/step13_css_generator/SKILL.md` first — the
> five load-bearing checks (`print-color-adjust`, A4 page rule, print zoom,
> swipe strokes, embedded fonts), the Kalam-400-only rule, and the "measure
> with the same CSS you render with" doctrine all apply unchanged. This file
> is chemistry's deltas.

## Elements chemistry adds

`book/elements/reaction/` — `.rxn` (the three-row arrow grid: `.rxn-t` top
label, `.rxn-a` the drawn arrow, `.rxn-b` bottom label), `.sp` (a species,
`.sp-c` the formula body, `.sp-u` the name underneath, `.sp-o` a charge
above), and `.ovl` (the lone-pair/charge bar `\overline` draws — see
step06). Also `.cst` (the drawn chain-structure grid, `format/structure.py`)
and `.cring` (the RDKit-drawn ring SVG wrapper, `format/ring.py`).

`bundle(mode)` reads `base.rules.json` + `a4.rules.json` + `extra.css`. It
does **not** read `style.css` — a rule put there is silently ignored and
never reaches a built page, chemistry or otherwise. If a `.rxn`/`.cst`/
`.cring` rule "does nothing" on a fresh build, check which file it landed in
before assuming the selector is wrong.

## Print sizes stay in absolute px — the arrow grid is why this bites hardest here

Set in absolute px in `a4.rules.json`, never as `em` fractions: `.72em` of a
19px display line is 13.7px, which becomes 10.1px at the 0.734 print zoom —
under the 11px floor `step15` enforces. A `.rxn`'s reagent label
(`.rxn-t`/`.rxn-b`) is exactly the kind of small, secondary text an `em`
value would be tempting to use for, and exactly the kind that silently drops
below the legibility floor once zoom is applied. Check any new reaction-grid
rule against the printed size, not the CSS size — see step15's legibility
check for the actual gate.

## The arrow's width is CSS-driven, not glyph-driven — do not "simplify" it back

`.rxn-a` stretches to whichever of its two labels (`.rxn-t`/`.rxn-b`) is
wider — this is why the arrow is drawn by CSS rather than set as the
character `⟶`: a six-word reagent overhanging a fixed-width glyph arrow on
both sides stops reading as a label attached to the arrow. The glyph
(`⟶`/`⇌`/etc, set via `data-g`) exists only as the no-CSS fallback. Do not
remove the CSS grid and fall back to the glyph-only rendering "to simplify"
— that reintroduces exactly the defect the grid was built to fix.

## Never

- Never add a chemistry rule to `style.css` — `bundle()` does not read it;
  put it in `extra.css` or the appropriate `.rules.json`.
- Never set a `.rxn`/`.sp`/`.cst`/`.cring` font size in `em`. Chemistry's
  small secondary labels (reagent captions, IUPAC names under a structure)
  are exactly what crosses the 11px print floor first if sized relatively.
- Never revert `.rxn-a` to a fixed glyph-only arrow to save a rule — that is
  the specific defect (a reagent overhanging a fixed arrow) the CSS grid
  exists to prevent.
