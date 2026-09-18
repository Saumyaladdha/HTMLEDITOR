---
name: step16_content_integrity_verifier
description: Prove no biology content was lost — figure_brief text must be BOTH excluded from the expected count AND absent from the output (two separate checks; conflating them once produced a false vanished=49). Use to judge missing_text/reduced_occurrences on a biology chapter.
---

# Content Integrity Verifier — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step16_content_integrity_verifier/SKILL.md` —
> **read it first** for why word-counting rather than diffing text is the
> method, and the `TRANSLATED`/`SCAFFOLD`/`_LATEX_CMD`/`_SUBSCRIPTED`
> category table. The CODE is shared — one
> `pipeline/step16_content_integrity_verifier/run.py` for both subjects.

## What this step is for

Proving no content was lost between the markdown and the HTML.

## The brief-exclusion trap, measured — and how it was actually fixed

Biology chapter 1's FIRST run of this check reported **`vanished=49`** — a
hard failure on a document that had lost nothing. The 49 words were figure
briefs, which render to nothing ON PURPOSE (see `step01`/`step14`).

```text
`figure_brief` text must satisfy TWO SEPARATE checks, and both are needed:

  1. EXCLUDED from the expected word count — otherwise the count itself
     is wrong, and a real loss can hide inside the noise (this is what
     produced vanished=49)
  2. ABSENT from the rendered output — otherwise the brief has leaked onto
     the page (a DIFFERENT failure, caught by `fence_leaked` in
     `tools/scan_render_defects.py`, not by this step)

A chapter can pass check 1 and fail check 2 (excluded from the count, but
STILL leaked into the HTML) or the reverse (correctly absent from the page,
but still counted as "expected" and therefore reported as vanished). Both
must be true.
```

`integrity._FIG_BRIEF` (`book/validators/integrity.py:236`,
`re.compile(r'```\s*चित्र[^\n]*\n.*?```', re.S)`) strips
```चित्र-निर्देश``` fences from the EXPECTED count before comparison
(`integrity.py:270`). After that fix: `md_words=18903 html_words=18963
vanished=0` on the current build.

**Correct**: a `figure_brief`'s text is invisible to BOTH the expected
count and the rendered output — `step16` reports `vanished=0` and
`step15`'s `fence_leaked` rule finds nothing.
**Incorrect (the actual bug, now fixed)**: `_FIG_BRIEF` not yet applied to
the expected-word extraction — the brief text is counted as "the source
expects these 49 words to appear" and then correctly does not appear
(because it renders to nothing), producing a false `vanished=49`.
**Edge case**: if a FUTURE chapter's brief text legitimately overlaps with
real body-text vocabulary (a technical term that appears both inside a
`चित्र-निर्देश` fence AND in the surrounding answer prose), the exclusion
must strip only the FENCED text, not every occurrence of that vocabulary
elsewhere in the document — `_FIG_BRIEF`'s regex is fence-scoped for
exactly this reason; do not "fix" a false positive by adding whole words to
a stoplist that would then also suppress real losses of that word
elsewhere.

## Current live numbers — the baseline to compare a new chapter against

`md_words=18903, html_words=18963, vanished=0, coverage=0.9994,
deficit_words=12`. Two open findings on the current build, both worth
reading as examples of what a real "not loss" finding looks like:

- `reduced_occurrences` (medium, count 8): `3x, 2x, युग्मक।, क्या, करना,
  परागकोश, 1x, 4x` appear fewer times than in the source. The `1x`/`2x`/
  `3x`/`4x` tokens pair with a separate `notation_retokenised` (info, count
  4) finding on the SAME tokens — this is the exact "appears twice" pattern
  `step17` looks for: a multiplier notation (`2x` chromosome count, say)
  legitimately splits across spans when rendered (a digit in one span, an
  italic `x` in another), so it is undercounted as one literal string AND
  correctly flagged as retokenised. Read these two findings TOGETHER before
  writing separate verdicts on each.
- The Hindi words (`युग्मक।`, `क्या`, `करना`, `परागकोश`) reduced by a small
  count are worth an actual `grep -c` check (see below) before assuming
  reflow — do not wave off every `reduced_occurrences` finding as
  notation-splitting just because some of the batch clearly is.

## Numbers to expect on chapter 1

932 IR blocks, 138 questions, 138 answers, 21 figures, 10 tables, 10 flow
chains, 11 figure briefs. `vanished` must be 0 with briefs excluded.

## What to check before closing this step

- [ ] `vanished == 0` (or every non-zero word is individually explained).
- [ ] Every `reduced_occurrences` word has been `grep -c`'d in both the
      source and the HTML — do not accept "probably reflow" without the
      count; the `1x`/`2x`/etc. tokens above show why: some of a batch is
      genuinely by-design and some of a batch may not be.
- [ ] `_FIG_BRIEF` is confirmed to strip ONLY fenced चित्र-निर्देश content,
      not general vocabulary — check the regex's fence anchors, not just
      that the count looks right.

## Never

- Never widen `TRANSLATED`/`SCAFFOLD` to make a number look better — each
  entry is a claim about the design, and a wrong entry blinds the check
  permanently.
- Never accept a `missing_text` finding without locating the words —
  biology's 138 answers are prose with no equation fallback; a dropped
  paragraph here cannot be re-derived by a reader the way a lost physics
  derivation sometimes can be guessed at.
- Never "fix" a false `vanished` count by adding whole words to a
  stoplist instead of scoping the exclusion to the actual fenced text — see
  the edge case above.
