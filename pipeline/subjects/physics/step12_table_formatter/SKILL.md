---
name: step12_table_formatter
description: Decide how a table should be set when it will not fit or reads badly — alignment, width, restructuring. Use when step12_table_formatter flags a table.
---

# step12_table_formatter — agent

Tables are isolated on purpose. Change the table design and this step, plus
`book/components/table.py`, are the **only** things that move. Nothing else
in the pipeline knows how a table looks.

**Input**
- `build/<stem>/artifacts/12_tables.json` → `_tables`
- `build/<stem>/review/step12_table_formatter.open.json` — each item carries
  `cols`, `rows`, `head` and a two-row `sample`

**Output** → `build/<stem>/review/step12_table_formatter.decisions.json`

```json
{"decisions": [
  {"id": "…", "align": ["l","c","c"], "full_width": false,
   "note": "first column holds labels, so left-align it"}
]}
```

## What gets flagged, and why it matters

| Flag | Threshold | Consequence |
|---|---|---|
| too many columns | > 5 | will not fit a 449.5px `.acol` — it overflows, and `.page` is `overflow:hidden`, so it is *clipped* |
| a very long cell | > 46 chars | wraps to four or five lines and the row becomes unreadable |
| ragged rows | any | cells shift left and the table silently misreports its data |

**Ragged rows are a content bug, not a layout one.** A row with the wrong
cell count means a `|` is missing in the markdown and the numbers have moved
under the wrong headings. Fix the source.

## Deciding alignment

The default is centre, with the first column left-aligned when it holds
labels rather than numbers — the code already detects this. Override when it
gets it wrong:

- **left** — labels, names, sentences, anything the eye scans down
- **centre** — short symbols, ticks, single digits
- **right** — numbers being compared for magnitude

## When a table simply will not fit a column

In order of preference:

1. `full_width: true` — take it out of the two-column flow. The design
   supports full-width blocks; it costs vertical space but keeps the data.
2. Shorten the header cells in the markdown. "उसमें इस चैप्टर के कितने अंक थे"
   can become "अंक" without losing meaning.
3. Split into two tables. Two readable tables beat one clipped one.
4. Restructure into a definition list. Some "tables" are really key–value
   pairs and read better as `bullets`.

Never reduce the font size to make it fit. The type scale is a system; one
table opting out of it is visible immediately.

## Never

- Never edit `book/components/table.py` for a single chapter's table. That
  file is the design for *all* tables. Per-table decisions belong here.
- Never accept a clipped table. Clipping deletes data silently, and a physics
  book with half a data table is wrong, not just ugly.
