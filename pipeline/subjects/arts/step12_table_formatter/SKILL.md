---
name: step12_table_formatter
description: Decide how an arts table should be set when a cell is far past the wrap threshold — comparison tables of full sentences are the recurring shape here, not numeric grids. Use when step12 flags a table.
---

# Table Formatter — ARTS

> Subject profile: `book/subjects/arts.py`. Everything not contradicted here
> is in `pipeline/subjects/biology/step12_table_formatter/SKILL.md`, and the
> CODE is shared — `pipeline/step12_table_formatter/run.py`,
> `book/components/table.py`. The two thresholds that decide whether a table
> gets flagged at all: `WIDE_COLS = 5` columns, `LONG_CELL = 46` characters.

## Table shapes actually seen, and which side of the threshold they land on

| Table | Chapter | Shape | Longest cell | Flagged? |
|---|---|---|---|---|
| topic/marks distribution | both | 2 col, numeric | short | no |
| "किस क्रम में पढ़ना है" step table | geography (`front.s7.tbl`) | 3 col, 5 rows | **54 chars** | **yes** |
| सूची I / सूची II matching (साक्ष्य ↔ स्थल) | history | 2 col, 4 rows, short labels | short | no |
| भोजन/समूह (food source ↔ group) | history (`p3.gमहत्वपूर्ण-प्रश्न.q45.tbl`) | 2 col, 3 rows | **60 chars** | **yes** |
| सम्भववाद / नियतिवाद contrast | geography (`p3.gअतिलघु-उत्तरीय-प्र.q27.tbl`) | 2 col, 3 rows, full sentences | **131 chars** | **yes** |

Three of five tables clear `LONG_CELL`. That is the real, measured shape of
an arts table: **a two-column CONTRAST or MATCHING table whose cells are
sentences, not values.** The matching table that did NOT get flagged
(सूची I / सूची II) is the useful contrast case — same "two parallel columns"
shape, but its cells are short noun phrases (`मिट्टी के हल` ↔ `मोहनजोदड़ो`),
so it fits without any intervention. **The flag is about cell length, not
about the table being a comparison/matching shape at all** — do not treat
every two-column arts table as needing a decision; check the actual
`detail` string first.

## The 131-char case — what "will not fit" actually looks like here

`p3.gअतिलघु-उत्तरीय-प्र.q27.tbl`'s cells are full contrast sentences:

```
सम्भववाद विचारधारा के अनुसार, मनुष्य प्रकृति का दास नहीं है।
```
```
नियतिवाद के अनुसार, मानव का आचरण, कार्य, जीवन आदि पर्यावरण से
प्रभावित होते हैं।
```

131 characters is **almost three times** `LONG_CELL`. This is not a
borderline case where a width tweak helps — a 131-char sentence forced into
a two-column-page-width cell wraps to 5+ lines regardless of alignment.
Per the decision order below, this table needs `full_width: true` before
anything else is considered; alignment is not the lever that fixes it.

## Deciding what to do, in order (from `book/components/table.py` + the run.py thresholds)

```text
IS the flagged cause "N cols — will not fit" (ncols > 5)?
    Not yet seen in arts (every flagged table so far is 2–3 cols). If it
    happens: full_width first, then shorten headers, same as any subject.

IS the flagged cause "a cell is N chars" (N > 46)?
    IS N roughly 1.5x the threshold or less (up to ~70 chars)?
        → full_width: true is usually enough on its own — a full-width
          two-column layout gives each cell roughly double the characters
          per line before wrapping badly.
    IS N well past that (like the 131-char contrast table)?
        → full_width alone is not enough. Consider restructuring: does
          each row read as a genuine KEY-VALUE contrast (सम्भववाद-side
          claim vs नियतिवाद-side claim on the same concept), or could it
          split into two shorter tables / a bulleted contrast list? Ask
          the question before reshaping — a real two-column argument
          table (this is exactly that) is a legitimate shape arts uses
          for A-vs-B contrast answers, so full_width is usually the
          right call even at 131 chars; only reach for restructuring if
          full_width still reads badly on the actual rendered page.

IS the flagged cause "N row(s) have the wrong cell count" (ragged)?
    Not seen in arts yet. Same rule as every subject: this is a content
    bug (a missing `|` in the markdown), not a layout one — fix the
    source, never paper over it with alignment.
```

## Alignment

The default (left for the first column when it holds labels, centre
otherwise) is right for every arts table seen so far — none has needed an
override. `भोजन` (food) and `सूची I` (evidence) are both label columns, not
numbers, so the run.py's own `re_is_num()` check already left-aligns them
without intervention.

## What to check before closing a table's queue item

- [ ] Read the `detail` string first — it names WHICH threshold tripped
      (`cols`, `longest_cell`, `ragged`) and by how much; do not guess from
      the `sample` alone.
- [ ] For a long-cell table, compare the char count against 46 — a cell at
      50 chars and one at 131 chars are not the same problem and do not
      take the same fix (see the decision tree above).
- [ ] Confirm the table is genuinely a contrast/matching pair and not two
      unrelated lists that happen to sit side by side — arts uses both
      shapes (सूची I/II is matching-by-position; सम्भववाद/नियतिवाद is a
      concept-vs-concept contrast), and a matching table split into two
      separate tables loses the pairing entirely.

## Never

- Never reduce the font size to make an arts table fit — the type scale is
  shared across the whole book; one table opting out is visible on sight.
- Never restructure a matching-shape table (सूची I / सूची II — evidence
  matched by row position to a site) into a bulleted list. The row
  position IS the answer; a list loses which evidence pairs with which
  site the same way FORMAT_SPEC §8.5 warns a matrix loses its shape if
  linearised.
- Never accept a clipped table. `.page` is `overflow:hidden` — a comparison
  table with `नियतिवाद`'s column silently cut off reads as complete to a
  student who has no way to know a clause is missing.

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
