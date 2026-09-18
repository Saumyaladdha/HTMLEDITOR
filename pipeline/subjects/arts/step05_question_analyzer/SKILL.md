---
name: step05_question_analyzer
description: Judge flagged arts (history/geography) questions — history's `no_marks` on its 44-question bulk bank is EXPECTED; geography's current build additionally carries a real `no_answer` (answer prose present but never labelled **उत्तर:**) and two `marks_unsorted` groups caused by book-sourced buckets pooling more than one exercise. Use when step05 reports any of these on an arts chapter.
---

# Question Analyzer — ARTS

> Subject profile: `book/subjects/arts.py`. Everything not contradicted here
> is in `pipeline/subjects/biology/step05_question_analyzer/SKILL.md` and
> `pipeline/subjects/physics/step05_question_analyzer/SKILL.md` (read that
> one first — the five problem kinds and the general "never silence a
> no_answer without reading it" rule are defined there). The CODE is
> shared: `book/taggers/questions.py`.

## `no_marks` on history's bulk question bank is EXPECTED, not a defect

History's build flags all 44 bulk-bank questions (`प्र. 14` onward,
`महत्वपूर्ण प्रश्न` group) as `no_marks`. Checked against the source: these
carry no per-question marks chip. Instead a YEAR LIST —
`**प्र. 16** ☞ V Imp • [2025, 16, 15, 11]` — and the marks value is
declared once, at the GROUP level, by the section heading the questions
sit under (the marks-value groupings visible in
`content/arts_01_history_print_ready.md`), not repeated per question.

**Do not invent a marks chip to silence this.** The group heading is
already the marks source; a per-question chip here is a duplicate guess,
not a recovered fact. Decide `by_design` on this class of finding unless a
specific question's group-heading marks value looks wrong against the
year/marks table earlier in the chapter — neither has been seen yet.

## Geography's current build has 6 open items, and three are NOT the history pattern

`build/arts-02-geography/artifacts/_reports.json`: `step05_question_analyzer
open_items=6` — 1 `no_answer`, 2 `marks_unsorted`, 3 `no_marks`. Verified
directly against `05_questions.json`; none of these has a decisions file
yet, so they are live.

### The `no_answer` is real content loss — the answer text exists, the label doesn't

Group `"पुस्तक से — 4 अंक"`, the second `प्र. 1` (the one that also collides
in `step04_content_namer`'s queue — see that file). Its blocks are `[para,
athava, para, para]` — no `answer`-kind block at all. Read the source,
`content/arts_02_geography_print_ready.md:551-566`:

```markdown
### प्र. 1 · मानव संसाधन का तात्पर्य
`[2023 · 2 अंक]` ★★ *2022 में भी आया था*

'मानव संसाधन' से क्या तात्पर्य है ?

**अथवा** *(2023, set_a)*

मानव संसाधन से क्या तात्पर्य है ?

⚠ `मानव संसाधन` पद अध्याय की पुस्तक में **एक बार भी नहीं** आता, जबकि बोर्ड
ने इसे दो वर्षों में पूछा है।

किसी देश की जनसंख्या का वह भाग जो अपनी शिक्षा, कौशल, स्वास्थ्य और
कार्यक्षमता के कारण उत्पादन में योगदान दे सकता है, **मानव संसाधन** कहलाता
है। मानव भूगोल में जनसंख्या को केवल संख्या नहीं, बल्कि देश का सबसे
मूल्यवान संसाधन माना जाता है …
```

The last paragraph IS the answer — it directly defines "मानव संसाधन",
which is exactly what the question asks. It is simply never introduced with
`**उत्तर:**`, so the reader correctly has no `answer`-kind block to emit
and the page will show a question with no visible answer even though the
content is sitting right there. **Verdict: `content`**, per physics's
SKILL.md ("a book that ships a question with no answer is a defect, not a
style") — `fix:
content/arts_02_geography_print_ready.md:562 — insert **उत्तर:** before
"किसी देश की जनसंख्या…"`. Do not close this as `by_design`; unlike
history's group-level marks, there is no alternative place this chapter
states the answer.

### `marks_unsorted` on two book-sourced buckets — same root as `step04`'s collisions

`"पुस्तक से — 4 अंक"` (marks per question: `6,6,6,1,1,2,2,2,2`) and
`"6 अंक"` (`4,1,2,1,2`) are both flagged `marks_unsorted`. These are the
SAME two groups that pool more than one original exercise —
`step04_content_namer`'s SKILL.md documents the matching `प्र. 1`/`प्र. 2`
number collisions in these exact groups. **One root cause, two downstream
symptoms**: a group assembled by concatenating separate exercises has
neither continuously-numbered questions NOR ascending marks, because each
pooled run carries its own internal order. The yellow marks bands
(FORMAT_SPEC §6) will genuinely thrash on these two groups as built today.

**This IS a real problem, unlike history's `no_marks`** — sort each pooled
run internally, or split the "पुस्तक से — N अंक" umbrella label into
per-source sub-groups, so a reader does not see `6 अंक → 1 अंक → 2 अंक → 1
अंक → 2 अंक` repeating on one page. Verdict: `content`, `fix: reorder the
questions inside content/arts_02_geography_print_ready.md`'s "पुस्तक से —
4 अंक" and "6 अंक" sections so marks ascend within each — do not merge this
into the same `by_design` bucket as history's group-level `no_marks`; the
two symptoms look similar (both come from a marks-bucket group) but this
one visibly breaks the page and history's does not.

### The 3 `no_marks` in geography — check each against history's group-level pattern first

Geography's own `"पुस्तक से — 2 अंक"` and `"2 अंक"`/`"6 अंक"` questions
that show `marks: null` should be checked the same way as history's: does
the marks value already come from the group label ("2 अंक" IS the marks),
or is the chip genuinely malformed? If the group label states it, `by_design`
same as history. If not, read the question directly before deciding.

## Matching / कथन-कारण (assertion-reason) / CBQ questions — do NOT expect these to trip `thin_options`

Both chapters carry question types with no biology equivalent
(`book/subjects/arts.py`'s own comparison table): a matching question
(history `प्र. 1`, `2026`) writes THREE marker families on consecutive
lines — `(a)…(d)` match items, `(i)…(iv)` the second column, `(A)…(D)` the
lettered answer-combinations — and `book/readers/markdown.py`'s
`_marker_family()` (line 412) correctly splits these into two SEPARATE
`options` blocks by family, summed together in this step's own
`n_option_items`. **Verified**: that exact question shows `has_options:
true, n_option_items: 8` (4+4, two grid blocks) and is NOT flagged — the
family-split already works, nothing to fix here.

A कथन-कारण question (history `प्र. 2`, `2026` — "कथन… कारण…" followed by
`(i)`–`(iv)` standard "both true and A explains B" options) parses and
flags cleanly the same way: `has_options: true, n_option_items: 4,
has_answer: true`. No special handling needed.

A CBQ (competency-based) matching table — history `प्र. 55`, a सूची I /
सूची II table followed by the lead-in word `कूट` ("code:") and an `(a)…(d)`
options block — also parses clean (`has_options: true`, answer present).
`कूट` itself is `step03_content_tagger`'s concern (an `uncertain_tag`, see
that file), not this step's.

**If any of these three shapes DOES get flagged** (`thin_options`
especially): before assuming the parser ate content, confirm which marker
family the flagged block's items belong to — a matching question's SECOND
options block (the `(A)…(D)` answer combinations) is short on its own by
design; only worry if the COMBINED `n_option_items` across both blocks for
one question is under 2.

## What to check before closing this step

- [ ] For every `no_marks`, check whether the ENCLOSING group's label
      already states a marks value (`N अंक`, `पुस्तक से — N अंक`) before
      treating it as content damage — history's whole 44-item queue is
      this pattern.
- [ ] For every `no_answer`, read the full question body — geography's
      example above has the answer text present as an unlabelled
      paragraph, which is real loss, but only findable by reading, not by
      the flag alone.
- [ ] For `marks_unsorted`, check whether the group is a "पुस्तक से —
      N अंक"/bare "N अंक" pooled bucket (real problem, needs source
      reordering) versus a single exam year (would be a genuine authoring
      bug if it ever occurs, not seen yet in either chapter).
- [ ] For a matching/कथन-कारण/CBQ question, sum `n_option_items` across ALL
      of that question's `options` blocks before calling `thin_options`
      real — a low count on one block alone is expected when marker
      families split it.

## Never

- Never mark a `no_answer` acceptable without reading the question, even
  when the group otherwise looks fine — geography's example proves the
  answer prose can be sitting right there, unlabelled, which reads
  identically to "no answer" from the flag alone.
- Never "fix" `no_marks` by inventing a per-question chip when the group
  heading already states the marks — a duplicate guess, not a recovered
  fact, per history's established pattern.
- Never treat a matching question's family-split options blocks as
  `thin_options` damage without summing across all of that question's
  option blocks first — `_marker_family()` splitting `(a)-(d)` from
  `(A)-(D)` is correct behaviour, not the parser eating the stem.
