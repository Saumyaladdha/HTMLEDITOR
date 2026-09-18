---
name: step13_css_generator
description: Bundle maths stylesheets including the matrix element (.mx/.mxg/.mxrow/.mx-det) and its invariants. Use when brackets render at the wrong height, columns do not align, or a matrix's cell numerals are not tabular.
---

# Css Generator — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step13_css_generator/SKILL.md` — the five checks
> (`print-color-adjust`, A4 page rule, print zoom, swipe strokes, fonts
> embedded), the "measure with the same CSS you render with" rule, and the
> irregular hand-drawn values all apply unchanged. This file is the matrix
> element specifically.

## The matrix element: `book/elements/matrix`

Classes: `.mx`, `.mxg`, `.mxrow`, `.mx-det`. `bundle(mode)` reads
`base.rules.json` + `a4.rules.json` + `extra.css` — **it does NOT read
`style.css`**, same caveat the physics file gives for its own elements. A
rule added only to `style.css` never reaches a printed page; this has
already cost a debugging pass once for a different element family (see the
physics `step13` file's "marker strokes" note) and the same mistake is
possible here.

## Invariants — cite the actual rule, do not restate loosely

- `.mx > i` are the BRACKETS, drawn with CSS borders, not typed glyphs:
  `width: 5px`, `border-right: none` on the first `<i>`, `border-left: none`
  on the last. They stretch to the full row count because `.mx` is
  `align-items: stretch` — this is what lets `matrix.grid()`
  (`book/format/matrix.py:146-149`) build a bracket that always matches the
  row count exactly, instead of a typed `[`/`]` that ends a line and a half
  short on anything past 2 rows.
- `.mx > .mxg` is `grid-template-columns: repeat(var(--c), auto)`; `--c` is
  written inline by `matrix.grid()` from the widest row in the matrix.
  **A `.mx` with no `--c` falls back to one column** and the whole grid
  renders as a vertical strip of every cell stacked — this is the CSS-side
  half of what "matrix arrives as loose digits" looks like when the JSON
  side is otherwise correct.
- `.mxg > span` is `font-variant-numeric: tabular-nums`. Without it, a
  column of `1`, `12`, `−6` does not line up — each digit takes its natural
  proportional width and the visual columns drift, defeating the entire
  point of a grid layout.
- `.mx-det` swaps the brackets for plain vertical rules — a determinant
  is a number, not a matrix, and must not look bracketed.
- `.m .mt` resets `font-style` to normal, the `\text{}` equivalent used
  for a remark inside a matrix cell (see step06/step07b) — without it, a
  cell's upright remark renders in the surrounding slanted maths face.

## What to check before signing off

- [ ] `.mx > .mxg { grid-template-columns: repeat(var(--c), auto) }` is
      present in the bundled sheet, not just in `style.css`.
- [ ] `.mxg > span { font-variant-numeric: tabular-nums }` is present.
- [ ] `.mx-det` renders vertical rules, not brackets, in a rendered
      determinant.

## Never

- Never add or fix a matrix CSS rule only in `style.css`. Same trap the
  physics file already names for its own elements — `bundle()` does not
  read it, so the fix silently does nothing on the printed page.
- Never remove `tabular-nums` from `.mxg > span` "to save a rule." Column
  alignment is the entire visual point of a matrix; without it the grid is
  just numbers in a box.
