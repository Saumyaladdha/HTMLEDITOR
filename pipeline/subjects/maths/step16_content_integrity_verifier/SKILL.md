---
name: step16_content_integrity_verifier
description: Prove no maths content was lost — strip the source's own production-note HTML comments before counting words, and expect matrix cells to be re-tokenised across spans by subscripting or fraction stacking (that is the renderer working, not loss). Use when step16 reports missing_text or notation_retokenised on a maths chapter.
---

# Content Integrity Verifier — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step16_content_integrity_verifier/SKILL.md` — the
> word-counting method (why it counts rather than diffs), the finding
> severities, and the `TRANSLATED`/`SCAFFOLD`/`_LATEX_CMD`/`_SUBSCRIPTED`
> categories all apply unchanged. This file is the two traps specific to a
> matrix-heavy source.

## Two traps, both measured on a real build

**1. The HTML comment.** A maths chapter's source can open with a block of
production notes — measured at 1084 characters on the reference chapter
(a step-19 "संकेतन-द्वार" conversion summary: how many expressions converted
to LaTeX, how many Unicode maths characters remain, how many matrix
environments opened/closed). Counted as source prose, these notes reported
**59 vanished words** — a hard failure on a document that had actually lost
nothing, and one that would have HIDDEN a real loss inside the noise.
`integrity._COMMENT` strips them before counting, the same way `_FIG_BRIEF`
strips a figure brief for biology. **If a new maths chapter's build reports
a wall of vanished words that read like a meta-commentary on the conversion
itself (mentions of "अंक", "व्यंजक", "रूपांतरित", set counts) rather than
chapter content, check for an unstripped comment block before treating it as
loss.**

**2. Matrix cells are re-tokenised, and this is correct.** A cell like
`10r_3`, `2cos`, or `3k` gets split across separate `<span>`/`<sub>`
elements by subscripting or fraction stacking — the reference build reported
63 `notation_retokenised` findings, all of this shape, all inside matrix
cells. **This is the renderer working as designed, not content loss** — the
word-counting method is specifically immune to element boundaries (see the
physics reference's rationale), and a matrix cell split into three spans
still contains every character, just no longer as one text node.

## Numbers to expect, and how to read a deviation

Reference build: `md_words=6327 html_words=6521 vanished=1`. The single
remaining "vanished" word was `0_corrected_ocr_file` — a filename fragment
the source mentions in passing prose, a source artefact rather than a
rendering loss.

**If `vanished` is meaningfully above 1 on a similar-sized maths chapter,**
check in this order before assuming new content loss:
1. Is the production-note comment block present and un-stripped? (trap 1)
2. Are the vanished words concentrated inside what should be matrix cells?
   (points at a step07 conversion failure eating cell text, not this step)
3. Only then treat it as a genuine dropped block, same as any subject.

## What to check before signing off

- [ ] `stats["vanished"]` accounted for — either 0, or every remaining word
      individually explained (a filename fragment, a translated label).
- [ ] `notation_retokenised` findings sampled and confirmed to be matrix
      cells or subscripted maths, not prose split oddly.
- [ ] If the source carries a production-note comment block, confirm
      `integrity._COMMENT` actually matches its exact delimiter shape —
      a differently-formatted note block from a different transcription
      pass could slip past the stripping regex.

## Never

- Never widen `_COMMENT`'s stripping pattern to swallow more than the
  actual production-note delimiter shape. Same discipline the physics
  reference demands of `TRANSLATED`/`SCAFFOLD`: every entry is a claim
  about what is NOT content, and a too-broad pattern can silently eat real
  prose that happens to start the same way.
- Never wave through a `notation_retokenised` finding without confirming it
  actually sits inside a matrix cell or a subscripted term. The category
  exists for a specific, verified shape — treating every retokenisation
  finding as automatically safe defeats the point of having the category
  at all.
