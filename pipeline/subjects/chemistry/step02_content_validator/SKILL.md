---
name: step02_content_validator
description: Judge chemistry count mismatches — questions, answers and reaction constructs (xrightarrow/underset/overset) — between the markdown and the IR. Use when step02 reports a count_mismatch, and check the question-head counter itself before blaming the source.
---

# Content Validator — CHEMISTRY

> Read `pipeline/subjects/physics/step02_content_validator/SKILL.md` first —
> the whole "go and look, parsed<source is loss, never widen a tolerance"
> doctrine applies unchanged. This file is chemistry's deltas, and the CODE
> is shared (`pipeline/step02_content_validator/run.py`,
> `book/validators/content.py`).

## What to count, beyond questions/answers

`\xrightarrow`, `\underset` and `\overset` appear **zero** times in physics,
biology and maths source — a non-zero count is independent proof the
chapter is chemistry and that `format/reaction.py` has real work to do.
Measured: 419 reaction constructs in chapter 6, 81 in chapter 4 (12
`\xrightarrow` + 36 `\underset` + others). If `promote_reactions` /
`format/reaction.py` never ran on a chapter carrying these, every one of
them prints its own command name — that is `step06`'s check, but a
non-trivial count here is the first sign something downstream needs to fire.

## A REAL GAP: the source counter does not know chemistry's own H2 question-head spelling

`SOURCE_RULES` in `book/validators/content.py:25` counts questions with:

```python
("question", r'^\*\*\s*(?:प्र\.?|Q\.?|प्रश्न)\s*[0-9]+\s*\*\*')
```

This matches **only the bold form**. But `RE_QHEAD` in
`book/readers/markdown.py:93-96` — the actual reader, fixed for exactly this
reason (see step01's SKILL) — accepts an H2–H4 heading form too:
`## प्र. 1`, which is how chemistry chapter 1 writes all 102 of its question
heads. **`count_source` was never updated to match.** On an H2-style
chapter this independent counter will report far fewer source questions
than actually exist, while the parser (correctly, per step01's fix) produces
the true count — so step02 sees `parsed > source` and reads it as
duplication, when the real problem is the *counter*, not the parse.

```text
IF `parsed > source` for "question" AND the chapter's question heads are
   written as `## प्र. N` / `### प्र. N` (grep confirms zero bold `**प्र.`
   heads, non-zero `^#{2,4}\s*प्र\.`)
    THEN this is the SOURCE_RULES gap above, not real duplication —
    verdict: by_design is wrong too; the honest verdict is "counter bug",
    fix: book/validators/content.py:25 (widen the regex to accept
    `#{2,4}\s*(?:प्र\.?|Q\.?|प्रश्न)\s*[0-9]+`, mirroring RE_QHEAD)
IF `parsed > source` and the heads ARE the bold form
    THEN treat as ordinary duplication per the physics doctrine — bisect
    which block is emitted twice
```

Do not paper over this by hand-adjusting a tolerance for one chapter; a
tolerance is a claim about the content model (see the physics SKILL's
"Never" section) and this is not a modelling difference, it is a regex the
reader was fixed to match and the counter was not.

## Never

- Never treat a chemistry-specific `parsed > source` mismatch as
  automatically "by_design" because chemistry is "different". Go count the
  actual question-head spelling in the source first — the gap above is real
  but chapter-specific to which heading form is used.
- Never widen `SOURCE_RULES`'s question pattern to `.*प्र.*` to make this
  go away generally — that would start matching a bold prose sentence that
  merely mentions a question number, the same false-positive class
  `RE_QHEAD`'s own trailing-note branch was built to avoid (see step01).
- Never accept "roughly right" on a reaction-construct count. A chapter with
  81 reaction constructs and a rendered page with visible `xrightarrow` text
  is not a rounding error — see step06.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**Count the new constructs independently.** The whole point of this step is
that it shares no code with the parser, so add a counter for anything the
reader learned: `**त्रिक:**` lines, `· **N सवाल आए …**` heading trailers,
`\boxed{…}` markers, and the three field kinds inside a `` `[…]` ``
question tag (marks / year+Set / note).

A tag naming several papers is **one** tag: `1 अंक · 2025 · Set H · 2023 ·
Set A` is two papers, not four facts. Counting `·` rather than parsing will
disagree with the reader for the right reason and the wrong one at once.
