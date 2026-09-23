---
name: step02_content_validator
description: Judge whether a biology count mismatch is real loss or a modelling difference — above all whether a flow chain's stage count, a figure/caption pairing, or ploidy notation (2n, 3n) survived intact. Use when step02 reports a count_mismatch on a biology chapter.
---

# Content Validator — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step02_content_validator/SKILL.md`, and the
> CODE the step runs is shared — one `pipeline/step02_content_validator/run.py`
> for both subjects, so a fix lands once. **Read that file first**: the
> general reconciliation method (source-count vs. parsed-count, independent
> implementations, `by_design` requires naming the exact construct) applies
> unchanged here.

## What this step is for

Checking the IR is internally consistent before anything is laid out —
biology's version of the same "silent loss is the failure this step
catches" contract.

## Decision tree — biology-specific checks

```text
IS the block a `flow`?
    Count its stages (split on `→`). IF stages < 2 THEN it is not a
    sequence — it is a definition that happens to contain one arrow;
    verdict `loss`, fix: retag as `definition` in step03, not a flow bug.

IS the block a `figure_brief`?
    Its rendered text must be EMPTY. If figure_brief text appears anywhere
    in html_words, that is the exact leak FORMAT_SPEC and step01 exist to
    prevent (see step01's fault table) — verdict `loss`, fix in
    book/readers/markdown.py or book/format/assignment.py's RENDERS_NOTHING.

IS the block a `figure`?
    It must have a caption. Chapter 1: 21 `![...]`, 21 italic
    `*चित्र N.M — ...*` captions — a 1:1 pairing. A count mismatch means a
    caption was orphaned into a paragraph or absorbed by the preceding one.

DOES the text contain a ploidy token — `n`, `2n`, `3n`, `(3n)`?
    It must survive as ONE token. `त्रिगुणित (3n)` torn into `(3` + `n` +
    `)` is the failure to watch for — it comes from the maths/upright path
    reading a ploidy as algebra (see step07's `_UPRIGHT_RE` note).
```

**Correct**: `(3n)` counted once in the source, appears once in
`04_named.json`/`08_assigned.json` as one token, never split across nodes.
**Incorrect**: a validator that counts `(`, `3`, `n`, `)` as four separate
things and reports "4 tokens found, 1 expected" — that is the validator
being wrong, not the content; ploidy notation is inherently short and
symbol-adjacent and a rule tuned for physics variables will over-segment it.
**Edge case**: `2nd` (an English ordinal, if the chapter ever quotes one) or
`sin`/`cos`-shaped tokens must NOT be caught by the ploidy check — this is
exactly why the guard lives in `_UPRIGHT_RE` itself (a trailing `n` joins
the upright run only when no letter follows it) rather than as a
post-processing regex here.

## What NOT to check

Do not run the physics notation checks (`\frac` balance, `\vec` presence,
`$$` display-block counts). Chapter 1 has zero of all three
(`book/subjects/biology.py` sets `latex: False`); a rule written for them
can only produce false positives on a chapter that legitimately has none.

## What to check before closing this step

- [ ] `grep -c '→' content/<name>.md` roughly matches the number of `flow`
      blocks with ≥2 stages in `02_validated.json` (a chain may also cross a
      relation arrow `⇌`/`↔` inside a `संबंध:` line — count those too).
- [ ] Every `![...]` has a paired italic caption line — diff the two counts.
- [ ] No `figure_brief` text token appears in the validator's counted
      output; it must be excluded from BOTH the source count and the
      parsed count, or a real loss can hide inside brief-text noise (see
      `step16`'s identical trap, `_FIG_BRIEF` in
      `book/validators/integrity.py:236`).
- [ ] Grep the chapter for `\dn`/`\(3n\)`-shaped tokens and confirm each is
      one node, not several.

## Never

- Never widen a tolerance to make a finding go away — the tolerance is a
  statement about the content model, not a way to silence the check.
- Never accept "the totals are close." A flow chain missing one stage and a
  caption gaining one word can net to the same total while both are wrong
  in opposite directions.

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
