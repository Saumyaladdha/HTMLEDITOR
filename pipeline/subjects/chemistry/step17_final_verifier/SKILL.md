---
name: step17_final_verifier
description: Final chemistry gates — every gate step17 shares with physics, plus the leaked-LaTeX check that catches reaction commands, the questions==answers count including the H2-question-head counting gap, and the chem_ring/chem_rxn crash risk on rings and reaction-SMILES nodes. Use before declaring a chemistry build done.
---

# Final Verifier — CHEMISTRY

> Read `pipeline/subjects/physics/step17_final_verifier/SKILL.md` first —
> the ship/review/fail verdicts, what always blocks, what never blocks, and
> "read the queues together" doctrine apply unchanged. This file is
> chemistry's deltas.

## The gates, chemistry-specific

- **questions == answers.** Measured targets on the three supplied chapters:
  102/102, 78/78, 137/137. If this mismatches on a chapter whose question
  heads are written `## प्र. N` (H2/H3/H4, not bold), check step02's SKILL
  first — `book/validators/content.py:25`'s independent source counter does
  not yet recognise that spelling, so a mismatch here can be the COUNTER
  being wrong, not the parse. Verify by grepping the actual heading form in
  the source before treating it as content loss.
- **`vanished` == 0.** Chemistry's specific non-loss cases (a reaction label
  repositioned above its arrow, a structure's replaced sentence surviving in
  `data-desc`) are in step16's SKILL — read them before flagging a chemistry
  `missing_text` finding as blocking.
- **0 pages clipped.** Chemistry's atomic nodes (`structure`, `ring`,
  `rxn_smiles`, and every reaction display line) cannot partially clip
  without being either fully present or fully absent from a page — a
  clipped reaction is the same severity as a clipped physics formula.
- **0 elements under 11px printed, chips excepted.** A reaction's reagent
  label (`.rxn-t`/`.rxn-b`) and a structure's IUPAC name caption are exactly
  the small secondary text most likely to cross this floor — see step13 and
  step15.
- **No `\`-command printing its own name.** Run:

  ```bash
  python3 tools/check_leaks.py build/<stem>.html    # must exit 0
  ```

  This is the ONE check that would have caught all ~500 destroyed reaction
  constructs (`\xrightarrow`, `\underset`, `\overset`) on the first
  chemistry build — see step06. **Do not grep the raw HTML for this
  yourself**: two earlier ad-hoc versions of this check both lied —
  `grep 'mathrm'` reported 368 hits on a page with none actually visible
  (they were inside `data-desc` attributes and this project's own CSS
  comments), and `grep -c` counts LINES, of which this HTML file is exactly
  one — so it answers 1 regardless of how many matches exist. Use
  `check_leaks.py`, which strips `<style>` and every tag with its
  attributes before counting, because `data-desc` legitimately holds raw
  source text on purpose (see step16) and must not be mistaken for a leak.

- **Every `source_figures/*.png` referenced exists on disk.** Organic
  chapters are structure-image-dense (up to 78 in one measured chapter) —
  a missing scan here is a missing structure on the page, not a cosmetic gap.

## A build-blocking check specific to chemistry: did the build even finish?

If the pipeline run for this chapter failed with `AttributeError: module
'book.components' has no attribute 'chem_ring'` (or `chem_rxn`), **that is
not a review-queue finding, it is a build failure** — the chapter never
reached step17 at all. This happens whenever a chapter's IR contains a
`ring` or `rxn_smiles` node (from a ```रिंग``` fence or a drawn reaction —
see `step07_formatting_agent`) because `book/components/__init__.py:29`
exports `chem_structure` but not `chem_ring`/`chem_rxn` from
`book/components/math.py`. Verdict in this case is **`hold`**, and the
"why" is a code gap, not a content one — report it exactly as named here
rather than asking the content author to avoid drawing rings.

## Never

- Never sign off on the question/answer count alone for a chapter using
  H2-style question heads without checking step02's counter-gap note first
  — a real mismatch and a counter artifact look identical in the number
  alone.
- Never treat a `chem_ring`/`chem_rxn` crash as something to route back to
  content review. It blocks the build outright and needs a code fix.
- Never accept `check_leaks.py` exiting non-zero as "probably just
  `data-desc`, ignore it" — that attribute is explicitly excluded already;
  a non-zero exit here means a real leaked command reached visible text.

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
