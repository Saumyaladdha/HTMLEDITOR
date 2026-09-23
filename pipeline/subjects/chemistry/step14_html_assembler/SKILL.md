---
name: step14_html_assembler
description: Chemistry's body class scopes reaction CSS; the real risk here is the page-drafting parse silently re-detecting the subject instead of using the one step01 already resolved. Use when subject-scoped CSS does not apply, or a chapter builds as the wrong subject despite an explicit --subject flag.
---

# Html Assembler — CHEMISTRY

> Read `pipeline/subjects/physics/step14_html_assembler/SKILL.md` first —
> the "bytes out ≥ bytes in", slot-filling, and "assembler must not change
> content" doctrine apply unchanged. This file is chemistry's deltas.

## Body class

`class="subj-chemistry"` — the reaction CSS (`.rxn`, `.sp`, `.cst`, `.cring`,
`.ovl`) is scoped to it, so physics, biology and maths pages are untouched by
it. If `.rxn` rules are not applying on a chemistry build, check this class
actually landed on `<body>` before touching any CSS.

## A REAL, ALREADY-FIXED BUG worth checking for on every build: subject must be THREADED, never re-detected

`book/assemble/html.py:230`'s `build()` calls `md_parser.parse(md_path,
report=True, subject=subject)`. This is the ACTUAL page-drafting parse every
later step (including this one) works from — and it used to call `parse()`
with no `subject=` argument, silently re-running `book/subjects/detect()`
from scratch even when the CLI had already been given an explicit
`--subject`. A physics chapter that typesets units as `\mathrm{N/C}` 407
times (zero reactions anywhere) scored above the chemistry auto-detect
threshold via the `\mathrm` tie-breaker and **silently built as chemistry**
— wrong rubric, wrong splittable rules, reaction handling switched on for a
chapter with no reactions — while step01's own report still said "physics"
and looked correct. See FORMAT_SPEC §10 for the full detection order and the
`\mathrm`-gating rule this bug violated.

```text
IF a chemistry chapter's assembled HTML shows `.rxn`/`.sp` styling, reaction
   CSS, or `formula_card` panels retitled "अभिक्रिया"/"अभिकर्मक"/"उपयोग" on
   content that has NO actual reactions (physics/maths content wrongly
   profiled as chemistry)
    THEN suspect this exact class of bug: `subject` was not threaded through
    to whichever call actually drafted the page HTML. Check that function's
    signature accepts and forwards `subject`, and that it is never called
    with `subject=None` when the CLI (or step01) already resolved one.

IF the opposite happens — a genuine chemistry chapter loses reaction
   handling, formula panels render untitled, `\xrightarrow` prints its own
   name everywhere
    THEN the same bug, the other direction: `--subject chemistry` was given
    but a downstream re-parse dropped it and auto-detection failed to
    recognise the chapter (see FORMAT_SPEC §10's "no signature for arts/
    economics" warning — the same class of silent fallback can happen for
    any subject whose chapter is unusually light on its own signature).
```

`book/assemble/render.py` reads the resolved profile from
`doc["meta"]["subject"]` (`R.set_profile(doc["meta"].get("subject"))`,
`html.py:235`) rather than re-detecting — this is the fix, and the general
rule it establishes: **any new function that calls `markdown.parse()` must
accept and forward a `subject` parameter; it must never call `parse()` with
`subject=None` if the caller already knows the answer.** Check any new code
path added to this step against that rule before assuming a subject-mismatch
symptom is a content problem.

## Never

- Never assume `subj-chemistry` on `<body>` means the WHOLE build used the
  chemistry profile — the class is applied where `build()` finishes, which
  is downstream of the exact re-detection bug above; a chapter can carry the
  right body class while an earlier stage parsed it under the wrong profile.
- Never let the assembler transform content to "fix" a wrong-profile
  symptom — if the profile was wrong, the fix is upstream (thread `subject`
  correctly), never a content rewrite here.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**The page shell and both halves changed.**

- every page is `.page > .sheet-body`, with an always-on
  `<footer class="page-bottom"><span class="page-number">`;
- both halves are two-column `.acols`; a page holding a Part-1 item is
  `.acols.revision-flow` and each such item is `.u.revision-unit`;
- a part banner opening a page is hoisted out of the left column into the
  page header, so it spans the sheet;
- `.qhead` carries `id="q-N"`; the dashed rule between questions is its
  `border-top`, not a `.qsep` element;
- the cover is a LINEAR stack — `.source-front-title` then one
  `.source-front-section` per `##` heading, in source order. It is not a
  role-classified card grid.
