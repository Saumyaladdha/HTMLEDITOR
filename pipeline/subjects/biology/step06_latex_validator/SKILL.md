---
name: step06_latex_validator
description: Confirm the physics LaTeX rules are correctly inert on a biology chapter, and judge the handful of stray $...$ spans that are transcription leftovers, not real maths. Use when step06 reports on a biology chapter — it should almost always have nothing to do.
---

# Latex Validator — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step06_latex_validator/SKILL.md` — **read it
> first**, especially the *FAULTS ALREADY FIXED* table and the sentinel
> warning; those bugs are in shared code (`book/validators/latex_convert.py`)
> and can in principle still fire on biology's 15 `$...$` spans even though
> there is almost nothing here to convert. The CODE is shared — one
> `pipeline/step06_latex_validator/run.py` for both subjects.

## What this step is for

Checking LaTeX renders correctly before the page is committed to.

## In biology, there is almost nothing to check — but verify, don't assume

Chapter 1 contains **zero** `\frac`, **zero** `\vec`, **zero** `$$` display
blocks, and 15 `$...$` inline spans. `book/subjects/biology.py` sets
`latex: False`.

```text
IF the chapter's profile has `latex: False`
    THEN do not run the physics notation checks (backslash_command,
    raw_frac, unclosed_brace) as if a finding of zero were suspicious —
    zero is the CORRECT outcome for a chapter that genuinely has no LaTeX

    BUT still open `tools/scan_render_defects.py`'s output — a `passthrough`
    or `convert_failed` finding on even ONE of the 15 `$...$` spans is real,
    because the converter is shared code and a bug there affects every
    subject's spans identically, biology's included
```

**Correct**: a biology chapter's `step06` report shows `findings: 0` and
the step passes — this is expected, not a sign nothing was checked; the
physics rules genuinely have no true positives available on a chapter with
no LaTeX commands.
**Incorrect**: treating `findings: 0` on a biology chapter as evidence the
step "didn't run" and re-triggering it with looser thresholds — there is
nothing to loosen; the rules are tuned for physics's 583 LaTeX commands and
running against biology they would only ever produce false positives.

## What to check instead: the 15 `$...$` spans that DO exist

They are mostly single italic letters left over from the source PDF/OCR
extraction — `$i$`, `$\vec{B}$`-style fragments that belong to a diagram's
original labelling, not to biology's own notation.

```text
IF a `$...$` span appears inside a `figure_brief` or a figure caption
    THEN it is very likely an OCR/transcription artefact naming a diagram
    label from the source plate — leave it; it is metadata, not body text

IF a `$...$` span appears in BODY TEXT (a definition, an answer, a flow
   stage) as a single italic Latin letter in an otherwise Hindi sentence
    THEN ask whether it should be plain Devanagari or a plain Latin
    abbreviation instead — a lone italic Latin letter set in the maths
    face, mid-Hindi-sentence, is nearly always a transcription artefact,
    not intentional notation
```

**Edge case**: a real biology use of Latin notation — `2n`/`3n` ploidy, or
a gene symbol conventionally italicised — is NOT this defect. The test is
whether the letter is doing algebraic/notational work (ploidy, a named
variable in a rare biology formula) or is simply an orphaned OCR fragment
with no referent in the surrounding sentence.

## What to check before closing this step

- [ ] `findings: 0` (or a small number matching exactly the 15 `$...$`
      spans) — not a larger number, which would mean the profile gate
      failed to suppress the physics rules.
- [ ] `python3 tools/scan_render_defects.py build/<stem>.html` reports no
      `latex_command`, `bare_backslash`, or `math_delimiter` hits — these
      would mean a `$...$`/`\command` genuinely failed to convert, which
      matters regardless of subject (see the physics file's sentinel
      warning).
- [ ] Each of the 15 `$...$` spans has been read, not just counted — an
      orphaned OCR letter left in body text is worth a content fix even
      though it will never trip an automated rule.

## Never

- Never run the physics-tuned checks (raw_frac balance, `\frac`/`\vec`
  presence assertions) as pass/fail gates on a `latex: False` chapter — see
  the decision tree above.
- Never assume "no LaTeX" means "nothing to check." The converter is
  shared code; verify the 15 spans convert cleanly rather than skipping
  this step because the chapter has few of them.
- Never hand-convert one of the 15 spans to plain text in the markdown to
  sidestep a converter bug — if the converter is wrong, the same bug will
  recur in the next chemistry or maths chapter that shares this code path.
