---
name: step12_table_formatter
description: Set biology tables — 10 in chapter 1, 7 of them currently flagged for a long cell that will wrap badly. Table splitting has landed (see step09), so the outstanding work here is per-table alignment/width judgement, not the split mechanism itself.
---

# Table Formatter — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step12_table_formatter/SKILL.md` — **read it
> first** for the column/cell-length thresholds, the alignment defaults,
> and the fit-order preference list; all apply unchanged. The CODE is
> shared — one `pipeline/step12_table_formatter/run.py` for both subjects.

## What this step is for

Setting tables.

## Biology has more of them, and its front matter is largely tabular

10 tables against physics's 7, in a shorter chapter — and unlike physics,
several of biology's tables live in FRONT MATTER (a topic-weight table, a
reading-order table), not just inside answers.

## Table splitting is DONE — this step is now about per-table judgement

`book/assemble/render.py:88`'s `split_payload()` already handles `kind ==
"table"`, header included so a continuation repeats it. That mechanical
work is complete (see `step09` for the measured before/after). What
remains here is judging EACH table's alignment, width and wrap — the
step's normal job, just with more instances than physics.

## Decision tree, with the current live queue as real examples

The current build has 7 of 10 tables flagged, all for the same reason —
a cell too long and about to wrap badly:

```text
FOR EACH flagged table:

  IS the long cell in a FRONT-MATTER table (topic-weight, reading-order),
  where the long text is INSTRUCTIONAL prose rather than data?
      → shorten the cell's WORDING in the markdown first (see the real
        example below); a front-matter table is meant to be scanned in
        seconds, and a 89-character cell defeats that regardless of how
        the table is laid out

  IS the long cell inside a QUESTION/ANSWER table (a comparison table
  contrasting two structures, say), where the content genuinely needs the
  words it has?
      → prefer full_width first (the design supports it) over shortening
        biological terminology, which risks losing precision a student
        needs — "लघुबीजाणुधानी (परागकोश)" is not safely abbreviable the
        way "उसमें इस चैप्टर के कितने अंक थे" is
```

**Correct — a real front-matter fix**: table `front.s5.tbl`'s second
column header reads `"क्या करना है"` but a body cell under it runs 89
characters (`"भाग 1 के **1.4 परागण** और **1.2 परागकण** पढ़ो; 4 अंक यहीं
हैं।"`) — this is instructional text that can be tightened without losing
meaning (e.g. splitting the "क्यों" justification into a second, shorter
column) rather than reflowing at a smaller font.
**Incorrect**: shrinking the font to fit `front.s5.tbl`'s cells — the type
scale is a system-wide token; one table opting out is visible immediately
(see the physics file's "never reduce font size" rule, which applies here
unchanged).
**Edge case — the real comparison table**: `p3.g2024.q7.tbl` (a
लघुबीजाणुधानी-vs-गुरुबीजाणुधानी comparison, 2 columns, 3 rows) has a cell
running 151 characters of genuine biological description. This is content
that should stay full-width and un-shortened — the fix is `full_width:
true`, not trimming the biology out of the answer. The distinction from the
front-matter case above is exactly the decision tree's first branch:
instructional metadata compresses; answer content does not.

## Ragged rows are still a content bug here too

A row with the wrong cell count means a `|` is missing in the markdown and
the numbers have shifted under the wrong headings — fix the source, this
is unchanged from physics.

## What to check before closing this step

- [ ] Every flagged table's decision states which branch of the tree above
      it took (front-matter wording tightened vs. content kept and made
      `full_width`), not just an alignment value.
- [ ] No biological terminology was shortened to make a comparison table
      fit — check the diff against the source if a decision touched
      content, not just formatting metadata.
- [ ] A table's continuation (post-split) repeats its header row — verify
      in the rendered PNG, not just in `12_tables.json`.

## Never

- Never edit `book/components/table.py` for a single chapter's table — it
  is the design for ALL tables; per-table decisions belong here.
- Never accept a clipped table — clipping deletes data silently.
- Never shorten a biological term's precision to fit a column when
  `full_width` is available and unused — width is the cheaper cost.

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
