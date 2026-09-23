---
name: step00_extract
description: Extract arts (history/geography) source into reader-edition markdown, always with --subject arts (auto-detection has no signature for this subject and silently falls back to physics). Use when a chapter's raw source needs turning into markdown, or when a build looks like it ran under the wrong subject profile.
---

# Extract — ARTS

> Subject profile: `book/subjects/arts.py`. Everything not contradicted here
> is in `pipeline/subjects/biology/step00_extract/SKILL.md`, and the CODE is
> shared.

## ⚠ Always pass `--subject arts` — auto-detection will pick the wrong profile

`book/subjects/__init__.py`'s `detect()` (see `docs/FORMAT_SPEC.md` §10) has
**no signature for `arts`** — its decision tree only branches on maths
(`bmatrix`/`pmatrix`), chemistry (`\xrightarrow`/`\underset`/…) and a
physics-vs-biology LaTeX/rubric score. An arts chapter has none of the
first two and, per `book/subjects/arts.py`'s own module docstring, scores
close enough on `**पहचान:**` alone that the biology/physics split is not
reliable either. Left to auto-detect, an arts chapter silently falls
through step 4 of the decision tree to the `physics` default — this has
actually happened, shipping three chapters under the wrong profile before
it was caught.

**Every invocation of this pipeline on arts content — this step and every
step after it — must pass `--subject arts` explicitly:**

```bash
python3 pipeline/step00_extract/run.py --md content/<NN>_reader_edition.md --subject arts
python3 pipeline/run_all.py --md content/<NN>_reader_edition.md --stem <stem> --subject arts --to step05
```

Never rely on detection "probably being fine because the last chapter
detected correctly" — a wrong profile under physics defaults gives arts
prose `backticks: maths` instead of `sequence` (a `क्रम:`/timeline chain
renders in italic maths face instead of as a flow component — see
`step03_content_tagger`'s SKILL.md), the wrong rubric words, and
`latex: True` checks that will never fire on prose that has none. None of
that raises an error anywhere in the pipeline; it just ships wrong.

## What arts source looks like once extracted

Both chapters built so far (history — ईंटें, मनके तथा अस्थियाँ; geography —
मानव भूगोल: प्रकृति तथा विषय-क्षेत्र) arrived already in reader-edition
markdown, not raw OCR — this step has not yet been exercised on a fresh
arts extraction. Two things worth checking if/when it is:

- **The chapter-title line.** Geography's source arrived with the title
  left as a literal unfilled placeholder — `# अध्याय 1 — <अध्याय NN का
  शीर्षक — पुस्तक से भरिए>`. If extraction produces this again, it is a
  required field, not decorative — fill it from the body's own content
  before it reaches `step01`, or leave it and flag loudly rather than
  silently shipping the placeholder text onto a cover.
- **Citation filenames.** Both chapters cite their answer-source with a
  backtick-wrapped filename — `` `0_corrected_ocr_file.md` ``,
  `` `corrected_book.md` `` — carried straight through from whatever
  produced the source. See `step16`'s SKILL.md for the rendering fix this
  needed; nothing to do differently at extraction time, just don't strip
  or "clean up" these citations — they are load-bearing provenance notes.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below.

Extraction feeds the reader, so the constructs it must preserve VERBATIM
now include four the reader learned: a `**त्रिक:**` fact strip, a
`· **13 सवाल आए · 1 व 5 अंक में**` trailer on a topic heading, the
`` `[1 अंक · 2026 · Set A/C]` `` question tag (marks, papers, notes — do
not normalise the `·` separators or the `Set A/C` spelling), and
`\boxed{…}` inside maths. Losing any of them downgrades a styled block to
a plain paragraph with no error anywhere.
