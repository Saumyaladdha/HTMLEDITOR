---
name: step14_html_assembler
description: Emit biology HTML. Use when a figure_brief appears in the output, a flow block renders through definition instead of C.flow, or a table's split continuation is missing its header row.
---

# Html Assembler — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step14_html_assembler/SKILL.md` — **read it
> first** for the "assembler must not change content" invariant and the
> slot-filling mechanism (`assets/manifest.json`, lookup order). The CODE is
> shared — one `pipeline/step14_html_assembler/run.py` for both subjects.

## What this step is for

Emitting the final HTML.

## Decision tree — three biology-specific invariants to verify

```text
IS a `figure_brief` block's text present ANYWHERE in the assembled output?
    IT MUST NOT BE. `render._render_block` returns `[]` for this kind
    unconditionally. Any appearance is the original leak (11 fences, 100
    stray backticks in the first build) recurring — a hard failure, verify
    with `python3 tools/scan_render_defects.py build/<stem>.html`'s
    `fence_leaked`/`stray_backtick` rules, not by eye.

IS a `flow` block rendered through `C.flow`?
    IT MUST BE — never through `definition`. A flow rendered as a
    definition with a `.m` maths span inside it IS the original bug
    step01/step07 exist to prevent; if you see italic stage text or an
    arrow set as an operator, the block took the wrong render path, not
    just the wrong CSS class.

DID a split `table` block's continuation repeat its header row?
    IT MUST. Unlike a सूत्र panel's continuation (which must NOT repeat its
    heading — two headings cost about what the split reclaims), a table
    without its header row on the continuation page is unreadable: the
    reader cannot tell which column is which. See `book/assemble/render.py`
    `split_payload`'s `table` branch, which carries `head` in the payload
    for exactly this reason.
```

**Correct**: a 6-row table split across a column boundary shows its header
row at the TOP of both the original block and the continuation.
**Incorrect**: a continuation with only data rows and no header — visually
looks like a second, unrelated table with no column labels.
**Edge case**: do not conflate this with the सूत्र-panel rule from physics —
a सूत्र panel repeating its title on both halves is a bug (wastes space);
a table NOT repeating its header on the continuation is the opposite bug
(loses meaning). The two constructs are handled oppositely on purpose.

## No `formula_card` in biology — inert code paths are fine

Biology chapter 1 has zero `formula_card` blocks (`step01`'s block-kind
report: no `formula_card` entry), so `MERGE_MIN_H`, the `clears` logic and
the `fcard-wide` two-column rule never fire on biology output. Leave them —
they cost nothing to carry, and a subject-conditional assembler path would
be a new way for physics and biology output to silently diverge.

## Verify against physics: the subject profile must not change physics's output

The check is a REBUILD AND DIFF of `build/chapter-19b-cols.html`, never an
assertion — physics was 61 pages with `vanished=0` and 0 clipped before
subjects existed, and must be byte-for-byte identical in shape after any
biology-motivated change to shared code (`render.py`, `markdown.py`,
`assignment.py`).

## What to check before closing this step

- [ ] `python3 tools/scan_render_defects.py build/<stem>.html` reports
      clean of `fence_leaked`, `stray_backtick`, `flow_italic`,
      `chain_as_maths`, `devanagari_in_maths`, `ploidy_split` — these six
      rules exist precisely to catch this step's regressions
      mechanically; do not eyeball the HTML for them.
- [ ] Every split `table`'s continuation carries its header row, verified
      in the rendered PNG.
- [ ] `14_assembled.json`'s byte count is not smaller than the draft's —
      assembly only ADDS.
- [ ] A rebuild of a physics chapter (`chapter-19b-cols`) still produces
      61 pages, `vanished=0`, 0 clipped, after any shared-code change made
      while working on biology.

## Never

- Never let the assembler transform text — reword upstream in the content,
  not here.
- Never write the final HTML anywhere but `build/` — the source tree stays
  clean; `build/` is disposable and gitignored.
- Never accept a biology-motivated change to shared code (`render.py`,
  `markdown.py`) without rebuilding and diffing a physics chapter first.
