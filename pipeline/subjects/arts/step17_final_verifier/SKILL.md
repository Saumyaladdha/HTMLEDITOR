---
name: step17_final_verifier
description: Final arts gates — both real chapters currently mechanically FAIL on step16, but as of the latest rebuild BOTH findings resolve to by_design on inspection; know how to re-verify that yourself rather than trusting this note indefinitely. Use before declaring an arts chapter shippable.
---

# Final Verifier — ARTS

> Subject profile: `book/subjects/arts.py`. Everything not contradicted here
> is in `pipeline/subjects/biology/step17_final_verifier/SKILL.md`, and the
> CODE is shared.

## Current real verdict, as of this writing: FAIL, both chapters — but NOT for the reason an older note said

```
history:    verdict fail  — step16 fail (2 words vanished, coverage 98.24%)
geography:  verdict fail  — step16 fail (17 words vanished, coverage 95.21%)
```

Every other step reports `ok` on both builds (`_reports.json` for each
stem). The mechanical verdict is `fail` on both purely because `step16`'s
own code treats any `missing_text` finding as hard-severity — but per
`step16`'s SKILL.md (read it before writing a verdict here), **both
chapters' findings now resolve to `by_design`**:

- **geography's 17 words** — every one traces to a `### प्र. N · <title>`
  heading that is never rendered by design (confirmed mechanism in
  `step01`'s SKILL.md, confirmed word-by-word in `step16`'s). None of
  these is real loss.
- **history's 2 words** (`परीक्षण`, `सुमेलन`) — the SAME by-design heading
  pattern. **This chapter used to also show a real, confirmed 24-occurrence
  content drop** (`अपना`/`चयन`, from `RE_REPEAT_STARS` over-matching a chip
  line it was never meant to catch, `book/readers/markdown.py:232`) — that
  bug is now FIXED and verified gone on rebuild (see `step16`'s SKILL.md
  for the before/after proof). **Do not re-flag `अपना`/`चयन` as an open
  blocker without first re-running the count yourself** — a stale note
  (including an older version of this very file) saying "history blocks,
  geography doesn't" is exactly the kind of claim that goes wrong silently
  once the underlying bug is fixed and nobody updates the surrounding
  prose.

This is the standing example for the note already in this file below: read
`step16`'s report word-by-word, not as a single pass/fail bit — and
re-verify the numbers against the CURRENT `_reports.json`/`open.json`
before trusting even this file's own counts, since they change as fixes
land.

## What blocks a release, always

| | Why |
|---|---|
| any `overflow` | `.page` is `overflow:hidden` — content is *deleted*, not reflowed |
| `missing_text` with real prose words | a block is being dropped — history's `अपना`/`चयन` finding is exactly this |
| `no_answer` on any question | a book shipping a question with no answer is a defect |
| `broken_math` | not applicable to arts (`latex=False`) — if it ever fires here, something upstream is mis-detecting the subject; see FORMAT_SPEC §10 |
| a broken component name | the block renders as nothing |

## What does not block

- reserved art slots and unaccepted decorator proposals — an undecorated
  page is a valid page (`step11`: 0 accepted on both chapters, and that is
  fine)
- `notation_retokenised` (geography has 2, info severity) — the renderer
  working
- a `missing_text` finding whose every word traces to a `### प्र. N ·
  <title>` heading — confirmed by-design for this subject specifically,
  per `step01` and `step16`. **This is arts-specific**: no other subject
  writes a full-sentence, never-rendered title on its question heading, so
  this exception does not transfer to another subject's `step16` output
  without the same word-by-word check.
- `step12`'s comparison-table flags (see below) — a wide contrast table is
  a legitimate shape here, not a defect
- `step10`'s gap findings on geography pages 1 and 10, or `step11`'s
  matching low-confidence proposals on those same pages — see below, these
  correctly do NOT get decorated, and an unfilled gap is not itself a
  release blocker (though it is worth a `step09` look eventually)

## Read the queues together — a real arts pair, not a hypothetical one

`step10` reports a **gap** — not slack — at geography page 1 (708px) and
page 10 (715px). `step11` proposes a `character` at those exact same
page/pixel values, tagged `confidence: low`, with its own `why` string
calling it "probably a PAGINATION problem." Both steps independently
flagged the same two spots. **Reject both proposals; this is not a
decoration decision, it's a `step09` packing question** — decorating over
it would make the gap look deliberate and bury the real question of why
the packer left 700+px empty mid-document.

## The faults found across this chapter's build history

| fault | symptom | file | detail |
|---|---|---|---|
| `RE_QHEAD` no title support | every question in Part 2 rendered as an oversized year banner | `book/readers/markdown.py` | `step01` |
| extra `# चैप्टर मैप` H1 | whole cover analytics area unstyled, no cards | both `content/arts_*.md` | `step01` |
| inline `**प्र. N** <text>` | 44 questions vanished from the IR (history) | `content/arts_01_history_print_ready.md` | `step01` |
| `[FIGURE:]` glued to `**उत्तर**` | 1 figure dropped (history) | `content/arts_01_history_print_ready.md` | `step01` |
| `_numeric_col` too loose | a genuine numbered-steps card rendered as a meaningless bars chart | `book/assemble/render.py` | `step14` |
| short citation trailer tagged `formula` | a `YYYY/slug` code rendered stacked as a fraction | `book/readers/markdown.py`, `_looks_like_formula` | `step15` |
| digit-led filename unprotected | `0_corrected_ocr_file.md` split across two spans, read as missing text | `book/format/inline.py` | `step16` |
| `क्रम:` trailing punctuation glued to backtick | orphaned `।`, comma-led sentence fragment | `content/arts_02_geography_print_ready.md` | `step15` |
| `RE_REPEAT_STARS` over-matched a section-level chip | 24 lines (history) silently dropped, zero trace kept | `book/readers/markdown.py:232` | `step16` — **FIXED and verified on rebuild**: history's `missing_text` count dropped from 4 to 2 words once the regex required a digit inside every bracket group |

Also two pipeline-plumbing bugs, neither arts-specific but only surfaced
because arts was the first subject to actually need `--subject` passed
explicitly:

- `pipeline/_step.py` / `pipeline/run_all.py`: `--subject` choices list was
  stale (missing `chemistry`, `maths`, `arts` — never exercised before).
- `pipeline/step01_md_reader/run.py`: parsed `--subject` into `a.subject`
  but never forwarded it to `markdown.parse()` — silently fell back to
  auto-detect every time, subject-agnostic bug, latent until now.

## Current open queues (both real, non-empty)

```
history (latest rebuild, 22 pages): step03 (4) · step05 (44, expected —
            see below) · step10 (1, gap — new since the RE_QHEAD/RE_REPEAT_STARS
            fixes shifted pagination, not yet triaged the way geography's two
            gaps are in step10's own SKILL.md) · step11 (5, proposed — 0
            accepted) · step12 (1) · step16 (1, entirely by_design now — see
            above). step02 is now CLEAN (0) on this rebuild.

geography:  step02 (1) · step03 (7) · step05 (6) · step10 (2, gaps — see above) ·
            step11 (6, 2 correlate with step10's gaps) · step12 (2) ·
            step16 (2, entirely by_design per step16's own trace)
```

`step05`'s 44 on history is the bulk answer-bank (`महत्वपूर्ण प्रश्न`)
correctly flagged `no_marks` by design — these are book questions, not
exam questions, and never carry a marks chip (see `step05_question_analyzer`'s
own SKILL.md). Not a defect, not new information from this build.

## Before you say "ship"

1. Open at least three PNGs per chapter — a Part 1 page, a Q&A page, and
   the cover. `step15` is confirmed clean (0 findings, both chapters) as
   of the citation-trailer and `क्रम:`-punctuation fixes, but a clean
   render scan is necessary, not sufficient — it does not catch content
   loss, which is exactly what `step16` is for.
2. For history: the `अपना`/`चयन` drop that used to require a `hold` here is
   FIXED (`RE_REPEAT_STARS` now requires a digit in every bracket group)
   and verified gone on rebuild — re-run the word-count check yourself
   before trusting that, though; do not take this file's word for it
   indefinitely, since the whole point of this note is that a fix landing
   without the surrounding docs being updated is exactly how a stale
   `hold` note turns into a wrong one.
3. For BOTH chapters: the mechanical `fail` is now a false positive once
   the word-by-word trace in `step16`'s SKILL.md is applied — but write
   that down explicitly in your decision, do not just override the status
   silently. A future rebuild that reruns step16 needs the same reasoning
   available, not a bare "reviewed, ok."

## Never

- Never read `17_final.json`'s `verdict` field as the answer. It is a
  mechanical OR over every step's hard-failure bit — exactly why history's
  real drop and geography's false-positive both currently say `fail`
  despite being different situations that call for different actions.
- Never sign off on numbers alone. Every step can pass and the page can
  still be unreadable — that is why `step15` renders pictures.
- Never clear a queue by writing decisions you have not made. An empty
  queue is meant to mean "resolved," and if it starts meaning "ignored"
  the whole chain stops being worth running.
