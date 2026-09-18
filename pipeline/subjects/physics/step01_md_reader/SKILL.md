---
name: step01_md_reader
description: Resolve markdown structure the deterministic reader could not recognise. Use when step01_md_reader reports a high share of blocks falling through to `para`, or when a new chapter's markdown uses conventions the parser has not seen.
---

> **Read `docs/FORMAT_SPEC.md` first.** It is the complete list of constructs
> the pipeline understands and exactly what each one becomes on the page,
> derived by diffing two real chapters against the finalised reference. Every
> answer you give here has to be consistent with it — and if a chapter uses a
> convention the spec does not cover, say so: the fix is to add it to the spec
> and the reader, never to contort the content.


# step01_md_reader — agent

**The code does the reading.** `book/readers/markdown.py` walks the file and
infers structure from shape: a part whose `###` children look like `N.M Title`
is sections; one containing `**प्र. N**` is question groups. Your job starts
where that inference is not confident.

**Input**
- `content/<name>_reader_edition.md` — the source
- `build/<stem>/artifacts/01_read.json` — what the reader produced
- `build/<stem>/review/step01_md_reader.open.json` — what it is unsure about

**Output** → `build/<stem>/review/step01_md_reader.decisions.json`

```json
{"decisions": [
  {"id": "<from the open queue>",
   "verdict": "reader_gap | source_convention",
   "rule": "a one-sentence statement of the pattern",
   "where": "book/readers/markdown.py:RE_QHEAD | content/…md:line"}
]}
```

## How to decide

The queue's usual complaint is **high para share** — too much text fell
through to `para`, which is the reader's "I don't know" bucket. Read the
markdown and work out which of two things is true.

| It is a… | when | fix goes in |
|---|---|---|
| **reader gap** | the source follows the documented convention and the reader still missed it | `book/readers/markdown.py` |
| **source convention** | the source invented a new marker or shape | the markdown, or add the convention to `skill_extractor` |

The distinction matters. A reader gap will hit every future chapter; a source
convention will not. Never contort content around a reader bug — the next
chapter hits the same bug and the contortion starts to look like a rule.

## DIALECT DRIFT — read this before parsing a new chapter

Every chapter so far has written the same construct differently, and each
difference cost a full debugging pass because nothing errored — the reader
simply did not recognise the shape and the content became loose paragraphs.
**This table is the cheapest thing in the project. Add a row every time.**

| Construct | ch. 3 wrote | ch. 4 wrote | What broke when unhandled |
|---|---|---|---|
| year groups in Part 2 | `### 2026` under an `##` | `## 2026` directly | **147 questions → 0 in the IR** |
| alternative marker | `अथवा` / `**अथवा**` | `*अथवा*` | all 43 printed as literal `*अथवा*` |
| formula-row separator | ` · ` | ` : ` | formula, caption and शर्त in one box, closing backtick stranded |
| body sub-heading | — | `#### …` | printed its own `####` as text |
| variant year | — | `* *(2026)*` | parsed as an EMPTY bullet list; the year vanished |
| decorative marker | — | a lone `*` line | became a paragraph containing one asterisk |
| PYQ pointer lines | — | `🔢 "…" → …` with NO bold label | three consecutive ones merged into one run-on paragraph |
| front-matter analytics | one `##` per card | six `###` under one `##` | six cover cards collapsed to one; three tables dropped |
| paper reference | — | `` `2025/set_jv` `` | backticks mean maths, so it stacked as a fraction |

**How to check a new chapter in one pass**, before trusting anything:

```bash
for pat in '^## [0-9]' '^### [0-9]' '^\*अथवा\*' '^\*\*अथवा' '^#### ' '^\* \*(' '^\*$'; do
  printf '%-16s %s\n' "$pat" "$(grep -cE "$pat" content/…md)"
done
```

Anything non-zero that the table does not cover is a **new** dialect. Find
the rule in `book/readers/markdown.py` that should have matched it, widen
that rule so both spellings work, and **add the row here**.

## Two failures this has actually had

Both were silent — nothing errored, the book just had less in it.

1. `_is_question_part` required **two** `**प्र.` heads before treating a
   group as questions. The 2020 and 2012 groups have one entry each, so both
   years vanished.
2. `_is_section_part` accepted a bare leading integer as a section number.
   A Part 2 grouped by marks (`### 1 अंक`, `### 3 अंक`) was read as sections,
   and every question inside it disappeared.

So when you inspect a suspicious file, **count things**:

```bash
grep -c '^\*\*प्र'  content/…md      # vs "question" in 01_read.json
grep -c '^\*\*उत्तर' content/…md      # vs "answer"
grep -c '^> #### '  content/…md      # vs "card"
grep -c '\[FIGURE:\|\[IMAGE:' …md    # vs "figure"
```

A mismatch is the finding. Report the number, not an impression.

## Never

- Never edit `01_read.json`. It is a build artefact and the next parse
  overwrites it.
- Never add a rule that only works for one chapter. If you cannot state the
  rule without naming this chapter, it belongs in the markdown instead.
- Never widen a rule and leave the dialect table alone. The next chapter is
  written by someone who has not read the code, and the table is the only
  place that carries what the last one taught us.
- Never assume a construct is absent because this chapter lacks it. Run the
  one-pass check above; a count of zero is information, an unchecked
  assumption is how 147 questions went missing.
