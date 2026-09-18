---
name: step02_content_validator
description: Judge arts (history/geography) count mismatches. The source-regex gap that undercounted heading-style `### प्र. N · <title>` questions (geography writes ONLY that shape) is now FIXED in book/validators/content.py — history's rebuild confirms it; geography's stale artifact just hasn't picked it up yet. Use when step02 reports a count_mismatch, especially `element: question`.
---

# Content Validator — ARTS

> Subject profile: `book/subjects/arts.py`. Everything not contradicted here
> is in `pipeline/subjects/biology/step02_content_validator/SKILL.md` and
> `pipeline/subjects/physics/step02_content_validator/SKILL.md` (read that
> one first — the general reconciliation method is defined there). The CODE
> is shared: one `pipeline/step02_content_validator/run.py`,
> `book/validators/content.py`, for every subject.

## What this step is for

Comparing a regex count of the SOURCE against what `step01`'s reader put in
the IR, per element (`question`, `answer`, `card`, `figure`, `table`,
`given`). The two implementations share no code on purpose — see
`book/validators/content.py`'s own docstring.

## The question-count gap — FIXED, but geography's stored artifact predates the fix

`book/validators/content.py`'s `SOURCE_RULES` question pattern used to be
`^\*\*\s*(?:प्र\.?|Q\.?|प्रश्न)\s*[0-9]+\s*\*\*` — BOLD lead-in shape only
(`**प्र. N**`). Arts's curated question set writes `### प्र. N · <title>`
instead (see `step01_md_reader`'s FAULT 1) — a genuine third shape the
reader (`RE_QHEAD`, widened this session) parses correctly into
`question`-kind nodes, but the OLD counting regex here never learned to
see. That produced a live mismatch on both chapters — history `source=44,
parsed=66` (44 bulk bold-style questions counted, 22 curated heading-style
ones missed), geography `source=0, parsed=56` (100% heading-style, so the
old regex counted zero questions in a 56-question chapter).

**The fix has landed**: `SOURCE_RULES`'s question pattern is now
`r'^\*\*\s*(?:प्र\.?|Q\.?|प्रश्न)\s*[0-9]+\s*\*\*'
r'|^#{2,4}\s*(?:प्र\.?|Q\.?|प्रश्न)\s*[0-9]+'` (`book/validators/content.py`,
`SOURCE_RULES`, first entry) — a second alternative for the `##`-`####`
heading shape, or-combined with the original bold pattern. **Verified on a
fresh rebuild**: `build/arts-01-history/review/step02_content_validator
.open.json` now reads `count: 0` — the question mismatch is gone.
`build/arts-02-geography/review/step02_content_validator.open.json` STILL
shows the old `count_mismatch, source=0, parsed=56` finding as of this
writing — that artifact is simply stale (last regenerated before the
`content.py` fix landed), not evidence the fix doesn't work for geography's
all-heading shape too. **Before treating a `question` count_mismatch as
open on EITHER chapter, check the artifact's own mtime against
`content.py`'s, or just re-run `step02` and look at the fresh output**
rather than trusting a stored `open.json` that may predate the fix.

```bash
grep -c '^\*\*प्र\.' content/arts_01_history_print_ready.md   # 44
grep -c '^### प्र\.'  content/arts_01_history_print_ready.md   # 22  -> 44+22 = 66
grep -c '^\*\*प्र\.' content/arts_02_geography_print_ready.md  # 0
grep -c '^### प्र\.'  content/arts_02_geography_print_ready.md  # 56 -> matches parsed=56
```

## Decision tree

```text
IS element == "question" AND parsed > source?
    Grep both patterns above against the source chapter first.
    IF bold-count + heading-count == parsed
        THEN by_design — this is the SOURCE_RULES gap above, not loss.
    IF bold-count + heading-count != parsed
        THEN something else moved — check step01's fault table for a
        NEW reader gap before assuming it's the same known issue.

IS element == "figure" AND parsed < source?
    Check for a figure declaration glued to another lead-in on the same
    line (`**उत्तर** [FIGURE: …]`) — the reader's figure check requires
    `[FIGURE:`/`[IMAGE:` to be the FIRST thing on its own line
    (`ln.lstrip().startswith(...)`). This is real loss — verdict `loss`,
    fix at the source line, not the validator. Exact precedent: history
    चित्र 1.4, see step01's FAULT 4.

IS element == "table" and both counts are 0?
    Expected — neither arts chapter has been measured with a pipe table
    (grep `^\s*\|.+\|\s*$` before assuming; do not assume from this file).
```

## Example triad

**Correct** verdict, as it stood while the gap was still open: geography's
`question: source=0, parsed=56` closed as `by_design`, citing the exact
`SOURCE_RULES` regex gap, with the specific fix location named — not "looks
fine" or "close enough." **That regex fix has since landed** (see above);
the reasoning here is kept as the template for the next gap like it, not
because this specific instance is still open.

**Incorrect** verdict: closing the same finding as `by_design` with no
grep run and no regex cited — indistinguishable, to a future reader, from
having rubber-stamped genuine duplication. The whole point of this step is
an exact reconciliation (see the physics SKILL.md); "probably fine because
it was fine last time" is not a verdict.

**Edge case**: if a THIRD arts chapter ever mixes bold-style bulk questions
with heading-style curated questions AND also has a real reader gap in the
same build (e.g. a new heading shape `RE_QHEAD` still rejects), the
question count could show `by_design` slack AND real loss simultaneously,
netting to a small difference that looks unremarkable. Diff the actual
question lists (`grep -n` both patterns, list the numbers, compare against
the IR's `question` nodes by number) rather than trusting the aggregate —
exactly the "totals hide the failure" trap physics's SKILL.md warns about.

## What to check before closing this step

- [ ] For a `question` mismatch, run both source regexes above and confirm
      bold-count + heading-count equals the parsed count before calling it
      `by_design`.
- [ ] For a `figure` mismatch, check every `[FIGURE:`/`[IMAGE:` line starts
      the line — grep `grep -n 'FIGURE:\|IMAGE:' content/<name>.md` and
      manually scan for one glued to a preceding `**label**`.
- [ ] Do not assume the LaTeX/सूत्र checks apply — `book/subjects/arts.py`
      sets `latex: False`; a rule tuned for physics's `\frac`/`\vec` counts
      can only produce false positives here.

## Never

- Never close a `question` mismatch as `by_design` without citing the
  specific regex gap and the actual grep counts — an uncited `by_design` is
  indistinguishable from a rubber stamp on real content loss.
- Never widen the tolerance in `SOURCE_RULES`/`validate()` to make a
  finding go away silently. Fix the regex to actually count the missed
  shape (as was done for the heading-style question pattern — see above)
  or document the gap here — a wider tolerance hides the NEXT chapter's
  real duplication behind the same number.
- Never treat "structurally the counts match" as proof the tree is right —
  `step01`'s FAULT 1 produced 44/44 (before the count itself drifted with
  today's heading fix) while still rendering every question as an
  oversized year banner. This step does not check qgroup/question nesting
  depth; that requires reading `01_read.json`'s tree directly, per
  `step01`'s SKILL.md.
