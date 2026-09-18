---
name: step12_table_formatter
description: Set maths tables — this subject has the most table rows of any subject — and tell a table apart from ASCII matrix art before formatting either. Use when a table will not fit, or a matrix row is being mistaken for a table row (or vice versa).
---

# Table Formatter — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step12_table_formatter/SKILL.md` — the flags
> (too many columns > 5, a cell > 46 chars, ragged rows), the alignment
> defaults, and the "never shrink the font" rule all apply unchanged. This
> file is the maths-specific matrix/table boundary.

## Maths has the most tables of any subject

72 table rows on the reference chapter, against 46 in physics and 54 in
biology — the chapter index, the topic-frequency table, marks summaries.
`table` is in the maths profile's `splittable` set (`book/subjects/maths.py`,
`PROFILE["splittable"]`), and a continuation repeats its header row — unlike
a सूत्र-style panel, whose repeated heading costs more than the split
reclaims. A table without its header on a continuation column is unreadable,
so verify the header repeats on every split before signing off.

## Decision tree — is this a table row, or a matrix row?

```text
DOES the line look like `| a | b | c |` (pipe-delimited)?
    THEN it is unambiguously a table row — RE_TABLE_ROW territory,
    nothing maths-specific here.

DOES the line look like `[ 3  -2   1 ] [ 3  -2   1 ]` — bracketed value
   groups with only spacing/operators between them (FORMAT_SPEC §8.5)?
    THEN it is matrix ASCII art, tested by `matrix.is_ascii_row` BEFORE
    `RE_TABLE_ROW` is ever tried (`book/readers/markdown.py`). This
    ordering is deliberate and load-bearing: a matrix row can look
    tabular to a naive regex (numbers, consistent spacing) — but it has
    no header, its alignment is mathematical (columns of ONE matrix's
    values), and it needs a bracket, not a border.
```

**Why the ordering is load-bearing, not incidental:** if `RE_TABLE_ROW` ran
first and happened to match a matrix row's shape, the row would be
formatted as a table cell — losing the bracket, the tabular-numeral
alignment, and the pairing-by-column-position that makes a multi-line ASCII
block readable at all (FORMAT_SPEC §8.5). Never reorder these checks to "try
table first, matrix second" even if it looks more natural — matrix
detection must win the tie.

## Alignment for a maths table specifically

Same defaults as physics (left for labels, centre for short symbols, right
for magnitude comparisons) — nothing maths-specific changes the rule itself.
What differs is the CONTENT: a maths chapter's tables are more often a
topic-vs-marks frequency grid or a chapter index than a data table, so the
"first column holds labels" auto-detection (numeric-first check in
`pipeline/step12_table_formatter/run.py`) fires correctly more often here
than it would on a physics data table full of measurements.

## What to check before signing off

- [ ] Every flagged table's `sample` rows are genuinely table data, not a
      matrix row that slipped past `is_ascii_row` — if a "table" has
      exactly the shape of bracketed value groups, that is a step01 bug to
      report, not a table to format.
- [ ] A split table's continuation column repeats the header row.
- [ ] No table exceeds 5 columns or a 46-char cell without either
      `full_width: true` or a restructuring decision.

## Never

- Never let a table-shaped regex win against `is_ascii_row` for an
  ambiguous line. The ordering exists specifically to protect matrices,
  and reversing it — even locally, even "just this once" — reintroduces
  the exact bug `matrix.is_ascii_row` was written to prevent.
- Never reduce font size to fit a wide table, same rule as physics — and
  note that a maths table sitting near a matrix on the same page makes a
  font-scale inconsistency between the two even more visible than usual.
