---
name: step00_extract
description: Extract chemistry source. Use when structures or figure numbers are missing.
---

# Extract — CHEMISTRY

> Subject profile: `book/subjects/chemistry.py`. This file covers what chemistry
> needs that physics, biology and maths do not. Everything not contradicted
> here is in `pipeline/subjects/physics/step00_extract/SKILL.md`, and the CODE each
> step runs is shared — one `pipeline/step00_extract/run.py` for all four subjects,
> so a fix lands once.

## CHEMISTRY IS THREE DIALECTS AND ONE PROFILE

The three chapters supplied map one-to-one onto the three areas:

| | physical (ch 1 विलयन) | inorganic (ch 4 d/f-block) | organic (ch 6 हैलोऐल्केन) |
|---|---|---|---|
| `$...$` inline | 775 | 547 | 987 |
| `\frac` | 218 | 0 | 14 |
| `\begin{aligned}` numericals | 10 | 1 | 0 |
| `\xrightarrow[..]{..}` | 0 | 12 | **107** |
| `\underset{name}{formula}` | 2 | 36 | **217** |
| `\overset{+}{atom}` | 0 | 0 | **95** |
| `\mathrm` | 254 | 431 | **2126** |
| structures as images | 3 | 7 | **78** |

There is no clean split to switch on, so nothing switches: reaction handling
is always on and fractions are always on. A profile keyed on frequency would
have turned reaction handling off for chapter 4 and destroyed all twelve of
its labelled arrows.

## What extraction must preserve

Structures arrive as **image files**, not as drawable formulae. All 78 organic
structures are `source_figures/*.png`. Nothing in this pipeline draws a benzene
ring and nothing should pretend to — a ring inferred from a formula string
would be the wrong molecule about half the time.

So extraction owes each structure two things: the file, and the `चित्र N.M`
number that ties it to the sentence that refers to it. A structure with no
number is unplaceable; there are 79 of them in chapter 6 and they are
referenced in reading order.

## Decision tree — inorganic's ion/species pairs vs a genuine matrix

Inorganic chapters (d/f-block especially) write a species next to its ion
as two stacked electron configurations:

```text
DOES the content show a species and its ion/oxidation state together, one
full equation per line, with NO tabular relationship between them (no
column of data that lines up across the rows)?

    YES → `\begin{array}{l} Ti = 1s^2\ldots \\ Ti^{3+} = 1s^2\ldots
          \end{array}` — a STACK of independent lines, not a matrix. See
          FORMAT_SPEC §8.4. Do NOT reach for `\begin{bmatrix}` here even
          though the content is "two rows of chemistry" — a bracket around
          it implies a mathematical object (a 2×1 matrix) that does not
          exist, and the matrix cell's font — sized for one short numeric
          entry — will shrink two full equations to fit.

    NO, there genuinely is a second column of comparable data (e.g. a
    table of oxidation states against ionic radii)
        → this is a TABLE, not array-stack notation. Write it as a pipe
          table; see `step12_table_formatter`'s SKILL.md for its own
          shape rules.
```

## ⚠ Subject-detection gotcha specific to chemistry extraction

`book/subjects/detect()` (FORMAT_SPEC §10) uses `\xrightarrow`,
`\underset`, `\overset`, `\xrightleftharpoons` and `\rightleftharpoons` as
the UNAMBIGUOUS chemistry signal, with `\mathrm` only counted as a
tie-breaker ON TOP of that signal — never on its own. **This means a
chemistry chapter you extract MUST actually carry real reaction-arrow LaTeX
for the ones it has reactions in.** If a physical-chemistry chapter's
numericals are transcribed using `\mathrm{}` for units (a normal, correct
thing to do) but the chapter has genuine reactions elsewhere that got
written as plain arrows (`→`) instead of `\xrightarrow{}`, the chapter's
`\mathrm` count alone will NOT be enough to auto-detect chemistry — it must
either be run with an explicit `--subject chemistry`, or its reactions must
be transcribed with the real LaTeX reaction commands so the signal is
genuinely present. **Never rely on `\mathrm` frequency as a proxy for "this
is chemistry" when writing new chapters** — it is the exact assumption
that silently misclassified an unrelated physics chapter as chemistry this
year (407 unit `\mathrm` commands, zero reactions, detected wrong).

## What to check on extraction

- [ ] Every reaction that has a reagent-over-arrow or condition-under-arrow
      is written as `\xrightarrow[<condition>]{<reagent>}`, not a bare `→`
      — a bare arrow carries none of that information into the IR at all.
- [ ] Every ion/species stacked pair (see the decision tree above) uses
      `\begin{array}{l}` with NO `&`, never `\begin{bmatrix}`.
- [ ] Every structure image has its `चित्र N.M` number, and that number
      appears in the sentence that refers to it — an orphaned structure
      file with no citing number is unplaceable.
- [ ] If this chapter will be run WITHOUT an explicit `--subject
      chemistry` flag, confirm it actually contains `\xrightarrow` /
      `\underset` / `\overset` somewhere — otherwise auto-detection may
      not recognise it, per the gotcha above.
