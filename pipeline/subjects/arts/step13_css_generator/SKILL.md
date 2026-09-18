---
name: step13_css_generator
description: Generate arts CSS. Use when subject-scoped (subj-arts) styles do not reach the page — and to know which of the shared stylesheet's rules arts actually exercises versus carries as dead weight.
---

# Css Generator — ARTS

> Subject profile: `book/subjects/arts.py`. Everything not contradicted here
> is in `pipeline/subjects/biology/step13_css_generator/SKILL.md`, and the
> CODE is shared — `pipeline/step13_css_generator/run.py`,
> `book/design/css.py`.

## `.subj-arts` scoping

`book/assemble/render.py:508` sets `classes = ["subj-" + (_PROFILE.get("name")
or "physics")]` on the page wrapper — confirmed reaching `subj-arts` on both
builds once `pipeline/step01_md_reader/run.py` was fixed to actually forward
`--subject` into `markdown.parse()` (see `step01`'s SKILL.md; this was a
pre-existing pipeline bug, not arts-specific, just never exercised because
every other subject's auto-detect happened to be correct without it).

## `css.py` builds ONE stylesheet, not a per-subject one

`book/design/css.py`'s `stylesheet()` takes `mode`, not `subject` — there is
no subject-gated code path, and both arts builds confirm it: **78878 bytes**,
byte-identical in length to every other subject's build (`13_css.json`'s
`css_bytes` on both `build/arts-01-history` and `build/arts-02-geography`).
This means step13's five checks (`print-color-adjust`, `A4 page rule`,
`print zoom`, `marker strokes`, `fonts embedded`) either all pass or all
fail together for arts — there is no arts-specific check to add, because
there is no arts-specific rule for it to gate.

## What's actually load-bearing for arts, measured — vs. dead weight

Arts has `latex=False`, no सूत्र panels, no formula lists. The stylesheet
still ships the formula-panel rules (they are not subject-conditional), but
they render nothing:

```
grep -c '\.fx\b\|\.fc\b\|\.dm\b' build/*/bundle.css   ->  38 rule references
grep -c 'class="fx"\|class="fc"\|class="dm"' build/arts-*.html  ->  0, 0
```

**38 formula-panel selectors, zero uses, on both chapters.** This is exactly
the same situation as `step06_latex_validator` being trivial-by-design for
arts (see that SKILL.md) — not a bug, not something to "fix" by trimming
`css.py` for one subject, just dead weight that ships because the sheet is
generated once for every subject rather than tree-shaken per chapter.

Everything else genuinely renders and is exercised on both chapters —
confirmed by grep against the actual HTML, not assumed from the profile:

| Class | history | geography |
|---|---|---|
| `.opts` (MCQ option grid) | 13 | 11 |
| `.callout` | 1 | 1 |
| `.sticky` | 1 | 1 |
| `.tblwrap` | 2 | 1 |
| `.qnum` / `.anslabel` | 19 / 19 | 18 / 18 |
| `.secno` | 1 | 3 |
| `.swipe` (highlighter) | 1 | 1 |

So the callout, sticky-note, options-grid, table and marker-stroke rules the
five checks protect are not theoretical for arts — every one of them is on
the page. Only the maths/formula-panel rules (`.fx`, `.fc`, `.dm`, and by
extension anything gated behind a `$…$`/backtick-as-maths render path,
since arts's own profile sets `"backticks": "sequence"`) are dead weight
here.

## If a check fails for arts specifically

It won't be arts-specific in cause — see above, there is no arts branch in
`css.py` to break independently of every other subject. Treat a failing
check on an arts build exactly as physics's own SKILL.md does: check
`book/design/tokens.py` for the value, `book/design/css.py` for where it is
emitted, and confirm the SAME sheet was used to measure (`step09`) as to
render — a token changed after the layout pass invalidates every arts
chapter's pagination just as surely as any other subject's.

## Never

- Never add a colour or size directly in `css.py` for an arts-only need.
  Add the token in `tokens.py`, then use it — arts has never needed a
  subject-specific value yet, and the day it does, this is still the rule.
- Never read the "0 formula-panel uses" fact above as license to strip
  `.fx`/`.fc`/`.dm` from the generated sheet. The sheet is subject-agnostic
  by design (see `step13` physics reference file); trimming it for arts
  would require gating `css.py` per subject, which is a real change to a
  shared file, not a step12/13-scoped decision.
