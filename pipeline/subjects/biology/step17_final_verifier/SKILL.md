---
name: step17_final_verifier
description: The one summary that says whether a biology build is publishable. Hard gates — no brief text, no stray backticks, no Hindi in the maths face — are mechanically checked by tools/scan_render_defects.py; the current build passes all six biology rules clean. Use for the final ship/hold call.
---

# Final Verifier — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step17_final_verifier/SKILL.md` — **read it
> first** for the `ship`/`pass`/`review`/`fail` verdicts, the "what blocks a
> release, always" table, and "read the queues together, not one at a
> time" method; all apply unchanged. The CODE is shared — one
> `pipeline/step17_final_verifier/run.py` for both subjects.

## What this step is for

The one summary that says whether the build is publishable.

## Biology's hard gates, and where each is actually checked

```text
IF `चित्र-निर्देश`/`ref:`/`NCERT चित्र` appears in visible text
    → HARD FAILURE. Checked by `tools/scan_render_defects.py`'s
    `fence_leaked` rule. Puts a production note in front of a student.

IF a literal backtick reaches visible text
    → HARD FAILURE. `stray_backtick` rule, same scanner.

IF ≥6 Devanagari characters sit inside a `.m` maths span
    → HARD FAILURE. `devanagari_in_maths` code rule, same scanner.

IF a `→` joins ≥4 Devanagari characters inside a `.m` span
    → HARD FAILURE. `chain_as_maths` code rule, same scanner — a process
    chain rendered as maths instead of book/elements/flow.

IF a ploidy token (`2n`, `(3n)`) is split across spans
    → HARD FAILURE. `ploidy_split` rule, same scanner.

IF a `.flow > .st` stage renders italic
    → HARD FAILURE. `flow_italic` rule, same scanner.
```

All six are `python3 tools/scan_render_defects.py build/<stem>.html` — run
it and read `high`-severity output before anything else; do not
re-derive these by reading the HTML by eye when a command already answers
the question exactly. **The current build (`build/bio-01-cols.html`)
reports clean of all six** — verify this stays true rather than assuming
it from this file; a new chapter reporting a hit here is an automatic
`hold`.

## What to report rather than fail on

```text
IS the finding "9 of 21 figure references have no local art"?
    → REPORT, do not fail. A reserved plate is a legitimate shipped state
    (see step11); the gate is that the count is REPORTED honestly, not
    that art exists. Hiding "9 missing" inside "21 figures, all handled"
    language would be the actual failure.

IS the finding dead space / hole size?
    → Compare against the CURRENT baseline (422px worst hole, 0 gap-tier
    findings — see step09/step10), not the historical 1,026px figure.
    Table splitting has landed; a new chapter significantly worse than
    422px with a comparable table/options mix is worth investigating
    before shipping, not an accepted biology ceiling.

IS the finding step07's permanently-reopening `flow`/`figure_brief`
"no formatting rule" queue items?
    → Confirm a decision was written for THIS build (required), but do
    not treat their reappearance on the NEXT chapter as a new defect — it
    is the known standing gap in book/format/rules.py until those two
    rows are added (see step07). Note it, don't re-litigate it every
    chapter.
```

## Before you say "ship"

1. Run `tools/scan_render_defects.py` and confirm the six biology rules
   above are clean.
2. Open at least three PNGs — a Part 1 page, a Q&A page, and the cover.
3. Check the page count is plausible (41 for a chapter of this shape) and
   `worst_free_px` is near the 422px baseline, not near 1,026px.
4. Check `16_integrity.json`'s `vanished == 0` and that every
   `reduced_occurrences` word has been individually checked (see
   `step16`), not waved off as a batch.
5. Confirm every `high`-severity finding across every step's queue has an
   actual decision, not just a reading.

## Never

- Never sign off on numbers alone — `step15` renders pictures precisely
  because a page can pass every count and still be wrong.
- Never treat the 1,026px/17-gap historical figures as biology's ceiling —
  they describe a build from before table splitting existed (see step09);
  a new chapter should be compared against the 422px/0-gap baseline.
- Never clear a queue by writing decisions you have not made — an empty
  queue is meant to mean "resolved."

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**What a green build means now.** Geometry passing is necessary and not
sufficient: the build is judged against `build/REFERENCE_chapter-02.html`,
and the two measurable gates are `overflow=0` and dead space in the
neighbourhood of the reference's **105px free per column**. A build with no
overflow but 250px+ of slack per column is packing wrong.
