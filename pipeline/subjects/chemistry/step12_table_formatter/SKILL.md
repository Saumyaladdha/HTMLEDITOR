---
name: step12_table_formatter
description: Format chemistry comparison tables — periodic trends, electronic-configuration series, d-block vs f-block property tables — and decide when an ion/species pair is a table at all versus array-stack notation. Use when a configuration table's columns do not line up, or when step12 flags a table candidate that might actually be a stacked pair.
---

# Table Formatter — CHEMISTRY

> Read `pipeline/subjects/physics/step12_table_formatter/SKILL.md` first —
> the column-count/cell-length/ragged-row flags, the alignment defaults, and
> the full-width/shorten/split/restructure fallback order all apply
> unchanged. This file is chemistry's deltas.

## Chemistry's tables are comparisons

Periodic trends (`| समूह-4 | Zr | ≈ | Hf |`), electronic configurations
across a series (up to 10 columns wide), and property-by-property
comparisons of d-block against f-block. **20 tables across the three
measured chapters** (5 in physical, 7 in inorganic, 8 in organic —
`book/subjects/chemistry.py`'s docstring).

## Decision: is this really a table, or is it array-stack notation? — see step00 and FORMAT_SPEC §8.4

Before formatting a "table" candidate, confirm it actually has a second
COLUMN of comparable data, not just two related rows:

```text
IF the content shows a species and its ion/oxidation state, one full
   equation per row, with NO column of data lining up across the rows
   (`Ti = 1s²…` next to `Ti³⁺ = 1s²…`)
    THEN this is NOT a table — it is array-stack notation
    (`\begin{array}{l}` with no `&`), handled per FORMAT_SPEC §8.4 and
    step00's decision tree. Do not reach for a pipe table here; a table
    implies a column relationship that does not exist between the two rows.

IF there genuinely is a second column of comparable data — oxidation states
   AGAINST ionic radii, atomic number AGAINST melting point, across several
   rows
    THEN it IS a table — format it per this step's rules below
```

Getting this backwards in either direction is visible on the page: a pipe
table built from two unrelated equations invents a column relationship the
content does not have; array-stack notation used for genuinely tabular data
loses the alignment a reader needs to compare values across rows.

## Alignment: digit columns need the digit to line up, not just the text

A configuration table's columns must line up **on the digit** — tabular
(monospaced-width) numerals, not proportional ones, or `3d¹⁰4s²` in one row
and `3d⁵4s²` in the next drift out of register and the comparison the table
exists to enable stops working. The physics default (first column left
if labels, else centre, numbers right) still applies; the addition here is
specifically that a numeral-heavy chemistry column needs the numeral-width
CSS, not just an alignment keyword.

**Correct example:** a d-block configuration table, header repeated on every
column-split continuation, digits vertically aligned within each cell.
**Incorrect:** the same table split across a column boundary with no
repeated header — a continuation of bare numbers with nothing above them to
say what they measure is unreadable, and unlike a physics numeric table,
misreading a d-block configuration this way is a chemistry error (wrong
electron count), not just an inconvenience.

## When a comparison table will not fit — chemistry-specific preference order

Same fallback order as physics (`full_width` → shorten headers → split →
restructure as `bullets`), with one addition specific here: **before
restructuring a comparison table into bullets, check it is not actually the
array-stack shape above** — a table restructured into "key: value" bullets
when it should never have been a table in the first place just moves the
same misclassification into a different component.

## Never

- Never build a pipe table from two ion/species rows that have no shared
  second column — that is array-stack notation misclassified; see
  FORMAT_SPEC §8.4.
- Never split a configuration table across a column without repeating the
  header — a column of bare digits and letters with nothing labelling it is
  actively wrong for chemistry (a mis-attributed electron count), not just
  hard to read.
- Never shrink font size to fit a wide configuration table. The type scale
  is a system; one table opting out is visible immediately (same doctrine
  as physics and as FORMAT_SPEC §8.2's matrix-sizing rule).

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**The cover's two analytics tables have their own skins.** A ranked value
column becomes `priority_table`, a numbered procedure becomes
`study_table` — picked by shape, not by heading text.

**Only emit a column the source actually has.** `priority_table` used to
emit three cells unconditionally to match the reference's three-column
table; a chapter writing only `टॉपिक | कितने अंक` then got a ruled,
permanently blank third strip down the cover's biggest block. The header is
trimmed to match the body for the same reason.

A qualifier in a value cell (`लगभग 2 अंक`) is set OUTSIDE the count pill:
`.count-value` is `display:inline-flex`, and a flex container discards the
whitespace between its children, which rendered `लगभग2 अंक`.
