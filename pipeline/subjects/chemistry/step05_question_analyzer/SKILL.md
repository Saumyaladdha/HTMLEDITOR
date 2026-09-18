---
name: step05_question_analyzer
description: Judge flagged chemistry questions — half marks, multi-paper chips, an MCQ options block that is really a numbered reaction/answer part, and product labels (A)/(B) misread as options. Use when step05 reports thin_options, no_marks or marks_unsorted on a chemistry chapter.
---

# Question Analyzer — CHEMISTRY

> Read `pipeline/subjects/physics/step05_question_analyzer/SKILL.md` first —
> the five `kind`s (`no_answer`, `no_marks`, `thin_options`, `empty`,
> `marks_unsorted`) and their usual verdicts apply unchanged. This file is
> chemistry's deltas.

## Marks and repeats

Chemistry writes half marks two ways — `[1/2]` and `[1 ½ अंक]` — and the
chip in three different field orders: `[1 अंक · 2026/set_a_ea · 347(EA)]`,
`[2026 · 1 अंक]`, `[2022 · 3 अंक | 2023 · 4 अंक | 2024 · 5 अंक]`. One chip
can name three papers with three different marks values for the *same*
question — that is a legitimate repeat, and it is the single most valuable
thing on the cover analytics page, not a formatting quirk to normalise away.

`inline.strip_trailing_marks` is the one place that knows every marks
spelling. **Do not add a second parser for it** — that specific mistake has
been made five times across this codebase's history; a marks chip fixed in
one place and not the other silently disagrees with itself on the next
build.

## `thin_options` on a chemistry MCQ — check WHY before assuming a parser bug

The physics SKILL says `thin_options` is usually the parser's fault. In
chemistry there is a THIRD real cause specific to this subject: an
`(i)…(ii)…(iii)…` run that is a **numbered answer part**, not an MCQ options
grid, being misread the other way around — or vice versa.

```text
IF the block has 2-4 short items (< 44 chars), no reaction arrow, and reads
   as alternatives to CHOOSE BETWEEN
    THEN it is a genuine `options` block — `thin_options` here usually
    means the splitter really did eat a marker; check `opt_tokens`
    (markdown.py:331) against the source

IF the block has exactly ONE item, and that item is LONG (> 62 chars) OR
   contains a reaction arrow (→ ⟶ ⇌ or \xrightarrow/\longrightarrow)
    THEN this is NOT options — it is an answer part that happens to open
    with "(ii)". markdown.py:961-965 already special-cases this and emits
    a `para` instead; if you still see it tagged `options` with one item,
    that guard did not fire — check the item's length/arrow test directly

IF the block's `(A)`/`(B)` markers sit INSIDE a `$...$`/backtick span
    THEN they are reaction-product labels, not options at all — see step01
    and step03. A `thin_options` finding here means the block should never
    have been routed to the options parser in the first place.
```

**Correct example:** `(i) चुम्बकीय गुण … प्रश्न 5 (ii) देखें।` — one long
item citing another question — correctly becomes one `para`, not a
`thin_options` finding.

**Incorrect (what a wrong fix looks like):** padding the source with extra
short alternatives to make a genuine one-item reaction answer "look like" a
proper options block. The item IS one answer part; the fix (if any) is
upstream in how the block was routed, never in rewriting the content to fit
the wrong shape.

## `no_answer` and reaction-only answers

An answer whose entire text is one reaction (`CH₃Br + KOH → CH₃OH + KBr`,
nothing else) is a real, complete answer — do not flag it `no_answer` because
it "looks short". Chemistry's `promote_reactions` pass specifically preserves
the `उत्तर` badge even when the reaction is all the answer has (see
`book/readers/markdown.py:2788-2796`'s `emitted_answer` handling) — if you
see an answer badge missing next to a reaction-only answer, that is a real
`step07b` finding (a regression in that guarantee), not a `no_answer` case
here.

## Never

- Never treat a `(A)`/`(B)` product-label collision as a `thin_options`
  parser bug to route around by rewriting the source's letters. The fix is
  recognising the maths-span boundary, and it already exists — verify it
  actually fired before assuming it is broken.
- Never mark a reaction-only answer `no_answer` for being short. A correct
  one-line chemical equation is a complete answer to "पूर्ण कीजिए".
- Never add a second marks-chip parser. `inline.strip_trailing_marks` is the
  only place that may know a marks spelling.
