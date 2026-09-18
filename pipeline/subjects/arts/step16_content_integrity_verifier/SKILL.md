---
name: step16_content_integrity_verifier
description: Triage missing arts text — almost all of it is a title heading that was never meant to render; a real 24-line drop (history's `RE_REPEAT_STARS` over-match) has SINCE been fixed upstream and confirmed gone on rebuild — read the fix note below before re-diagnosing it as open. Use when step16 reports missing_text or duplicated_text, or a citation filename is reported vanished.
---

# Content Integrity Verifier — ARTS

> Subject profile: `book/subjects/arts.py`. Everything not contradicted here
> is in `pipeline/subjects/biology/step16_content_integrity_verifier/SKILL.md`,
> and the CODE is shared — one
> `pipeline/step16_content_integrity_verifier/run.py` for every subject.

## Current real state: both builds still mechanically FAIL here, but for the SAME reason now

```
history:    missing_text, 2 distinct words, severity high, coverage 98.24%
            (परीक्षण, सुमेलन — both by-design, see below)
geography:  missing_text, 17 distinct words, severity high, coverage 95.21%
            + notation_retokenised, 2 words, info (the renderer working)
```

**History's count moved from 4 to 2 between builds — the real 24-line
`अपना`/`चयन` drop documented below is FIXED, not open.** Verified directly:
`book/readers/markdown.py:232`'s `RE_REPEAT_STARS` now requires a digit
inside every bracket group (`\[[^\]]*\d[^\]]*\]`), and a fresh rebuild
(`build/arts-01-history/artifacts/_reports.json`, `step16` now reports
`vanished: 2`, not 4) confirms the fix actually landed — history's ONLY
remaining `missing_text` words are `परीक्षण`/`सुमेलन`, the same by-design
title-heading pattern geography's whole finding is made of. **Both
chapters' `missing_text` findings are now, as of this rebuild, entirely
by-design** — the mechanical `fail` on both is the false-positive case
`step17`'s SKILL.md describes, not a real blocker on either chapter
anymore. The fault write-up below is kept as history: the mechanism, the
regex, the word-count proof — because the SAME over-matching shape could
recur in a future arts chapter with a different bracket-chip wording, and
whoever hits it next should not have to re-derive the diagnosis.

`step17`'s verdict is `fail` on both chapters **because of this step**, not
because of anything else — every other step reports `ok` on both builds.
Do not read "step15 is clean" or "the citation-filename bug is fixed"
(both true, both below) as "content integrity is clean" — the mechanical
status is still `fail` on both (any `missing_text` finding is hard-severity
regardless of verdict), it is just that BOTH chapters' findings now
resolve to `by_design` on inspection. The two sections below are the full
triage of every word in both findings, done once so the next person does
not have to re-derive it.

## Fault (previously fixed): the citation-filename bug

Both chapters cite their answer-source file the same way, in a backtick
span with no slash: `` `0_corrected_ocr_file.md` ``, `` `corrected_book.md` ``.
This needed two independent fixes in `book/format/inline.py`:

1. **`protect_slugs`'s digit-led gap.** `_SLUG_TOKEN_RE` required the token
   to START with `[a-z]{3,}`; `0_corrected_ocr_file` starts with a digit, so
   `ocr` (between two underscores) came out as a genuine subscript. Fixed by
   widening the regex to also accept a digit-only head, gated on 2+
   underscore segments (`x_1`, `i_2` still convert as real subscripts).
2. **`_tick()` had no "this is a filename" branch.** A bare filename
   citation matched neither the pure-Hindi branch nor the `YYYY/slug` paper
   branch, so it fell to the generic maths span — and `upright()` wrapped
   the leading `0` on its own, splitting the filename into two DOM text
   nodes. Fixed by adding a third `_tick()` branch: a backtick run matching
   `[0-9A-Za-z_US_MARK]+\.[a-z]{2,4}` (checked after `protect_slugs` has
   masked internal underscores) returns a `.ref` span, same as the
   `YYYY/slug` branch.

**The general lesson stands**: a backtick span in arts prose is very often
a CITATION, never an equation. A new backtick-wrapped shape that
mis-renders is more often a missing "this is not maths" branch in
`_tick()` than a maths-formatting bug.

## The dominant pattern in BOTH current findings: `### प्र. N · <title>` headings never render

`step01`'s own SKILL.md (FAULT 1) already documents that arts's
`RE_QHEAD` fix makes a `### प्र. N · <full title>` heading correctly stay
attached to its question — but the title text itself is never displayed
anywhere; only the number `प्र. N` is shown, matching every other subject's
convention. That fact, combined with how `_words()` tokenises, is why most
of both findings' words trace back to a heading and nothing else:

```
history:    परीक्षण  <- only in "### प्र. 7 · हड़प्पा संस्कृति — कथन-परीक्षण"
            सुमेलन    <- only in "### प्र. 1 · स्थल और साक्ष्य — सुमेलन"

geography:  every one of its 17 words traces to a title heading — several
            of the headings are ALSO truncated mid-word in the source:
              line 242: "...सम्भववाद की संकल्पना निम्न में से किस विद्वान ने प्रस्त"
              line 296: "...एलेन सी. सेम्पल के शब्दों में मानव भूगोल को परिभाषित कीज"
              line 760: "...अस्थिर पृथ्वी और क्रियाशील मानव के बीच परिव"
              line 844: "...मानव तथा भौतिक पर्यावरण के पारस्परिक सम्ब"
              line 1178: "...अन्य सामाजिक विज्ञानों से सम्बन्धि"
```

**Why the SAME word can appear correctly elsewhere on the page and STILL
show up as fully "vanished":** `_words()`'s tokenizer (`_WORD =
re.compile(r"[\wऀ-ॿ]+")`) treats the Devanagari danda `।` (U+0964) as a
word character, because it falls inside the `ऀ-ॿ` range (U+0900–U+097F)
along with every letter and matra. A heading's bare
`...को परिभाषित कीज` has no trailing punctuation, so it tokenises as
`कीज`; the SAME word in a body sentence — `...को परिभाषित कीजिए।` — carries
a trailing danda and tokenises as `कीजिए।`, a **different dictionary key**.
The two never cancel out even when the full word occurs correctly in prose
elsewhere. This is a structural property of the checker for any subject
that writes a full sentence as a heading title with no closing punctuation
— arts is the only subject that does, per `step01`'s own measurement table
(`### प्र. N · <full descriptive title>` — "never" for every other
subject) — so this is the first thing to check for THIS subject
specifically, not a general-purpose rule.

**Verdict for every one of these: `by_design`.** The mechanism is
confirmed (step01), the title is confirmed never rendered, and — for
geography's truncated headings — the truncation itself has **zero
rendering impact** since the title text is not shown. It is still worth
flagging to whoever owns `step00_extract` for geography: several question
titles were cut off mid-word during extraction (a source-quality defect,
not a pipeline bug), even though nothing on the page is wrong because of
it. Do not "fix" it here — this step verifies the PAGE against the
SOURCE, and the source is what it is.

## Fault (FIXED — was open, NOT by-design): a 24-occurrence chip line was silently dropped, history only

History's bulk answer-bank section opens with a one-line chip that applies
to the whole section, not one question:

```markdown
### महत्वपूर्ण प्रश्न

`[वर्ष नहीं — पुस्तक का अपना चयन]`

**प्र. 43**
हड़प्पा सभ्यता को अन्य किस नाम से जाना जाता है?
```

This exact line (`` `[वर्ष नहीं — पुस्तक का अपना चयन]` ``, "not from an
exam year — the book's own pick") occurs **24 times**, always directly
before a bold-branch `**प्र. N**` head. It does not appear ANYWHERE in the
built HTML — `grep -c 'वर्ष नहीं' build/arts-01-history.html` is 0.
Confirmed with word counts, not just a substring grep: `वर्ष` occurs 60×
in the markdown and 36× on the page — exactly 24 short. `अपना` and `चयन`
occur 24× in the markdown and 0× on the page. Every one of the 24 lines is
dropped, completely, with nothing kept.

**Root cause**: `RE_REPEAT_STARS` (`book/readers/markdown.py:219`,
`r'^`(?:\[[^\]]*\]\s*)+`\s*(★+)?\s*$'`), applied in `_parse_questions`
(`book/readers/markdown.py:2046`). It was written for a DIFFERENT
construct — history's repeat-frequency summary chaining several
`[year, ...]` groups before a question head, e.g.
`` `[2025, 16, 15, 11] [2024, ...] ...` ★★★ ``, where dropping the line is
correct because every year it lists is already on that question's own
`अथवा` tag. The regex only checks SHAPE ("one or more bracket groups
inside one pair of backticks, then optional stars, then end of line, then
a question head follows") — it has no way to tell that shape apart from
`` `[वर्ष नहीं — पुस्तक का अपना चयन]` ``, which is a single bracket group
holding a real, distinct label. Both match; both get silently consumed;
only one of them is actually redundant. The redundant case at least keeps
its `★★★` rating when present — this one has no stars, so `pending_stars`
stays 0 and the line leaves no trace at all.

**Verdict, at the time this was open: `loss`, not `by_design`.** This label
distinguishes a "book's own selection" question from a real exam-year
question — real, distinct information a reader would have lost with no
substitute anywhere on the page. Do not widen `TRANSLATED`/`SCAFFOLD`/
`ADDED_BY_DESIGN` to hide a finding shaped like this one — none of those
categories describe this shape, and forcing it into one would blind the
check to a real future regression in the same regex.

**Confirmed fixed, this session**: `RE_REPEAT_STARS` now requires a digit
inside every bracket group (`book/readers/markdown.py:232`,
`r'^`(?:\[[^\]]*\d[^\]]*\]\s*)+`\s*(★+)?\s*$'` — note the `\d` inside the
inner class). `` `[वर्ष नहीं — पुस्तक का अपना चयन]` `` has no digit
anywhere in its brackets, so it no longer matches and falls through to an
ordinary `para` node instead — verified directly against the rebuilt
`build/arts-01-history.html`: `वर्ष नहीं` and `अपना चयन` both now occur 24
times, matching the source exactly, and `step16`'s own report shows
`vanished: 2` (परीक्षण/सुमेलन only), not 4. **If a future chapter reopens
this exact finding, check the regex has not regressed before re-deriving
this whole trace again** — the fix is a one-character class addition, easy
to accidentally revert while editing something nearby in the same
function.

## Triage decision tree for a new arts `missing_text` finding

```text
Does the word occur ONLY inside a `### प्र. N · <title>` line, nowhere
else in the source (check with `grep -n '<word>' content/<stem>.md`)?
    YES → by_design. Confirm with step01's SKILL.md (titles never
          render) and move on — do not chase this as a step16 bug.

Does the word occur in the title AND in body prose, but the body
occurrence has trailing sentence punctuation (।, ॥) directly against it?
    → check the PUNCTUATED form (word + ।) in the html word count
      separately from the bare form — they are different tokens to this
      checker. If the punctuated form's count matches the source, the
      body occurrence is fine and only the title's bare form is "missing"
      — same as the case above, by_design.

Does the word's FULL markdown count fail to appear on the page at all,
with no heading/title explanation?
    → find every line containing it (`grep -n`), and check whether those
      lines share a common shape that might be getting swallowed by a
      regex meant for something else — see the RE_REPEAT_STARS case
      above for exactly this failure mode. Verify with a word-count
      comparison (not just a substring grep) before concluding it is real
      loss: `python3 -c "...I._md_words(...); I._html_words(...)"` for
      the exact words in question.
```

## Never

- Never widen `TRANSLATED` or `SCAFFOLD` to make a number look better.
  Every entry is a claim about the design, and a wrong entry blinds the
  check permanently — see the RE_REPEAT_STARS case: it would have been
  easy to add `अपना`/`चयन` to `ADDED_BY_DESIGN` or similar to clear the
  queue, and that would have silently accepted a real 24-line content drop
  as intentional forever.
- Never conclude a word is `by_design` from the title-heading pattern
  without actually checking it occurs ONLY there. Geography's headings are
  the majority of its findings, but not the whole story on every future
  arts chapter — verify per word, per chapter.
- Never accept a `missing_text` finding without locating every line the
  word appears on. A book that quietly drops a paragraph — or, as here, a
  distinguishing label repeated 24 times — is the exact failure this whole
  pipeline exists to prevent.
