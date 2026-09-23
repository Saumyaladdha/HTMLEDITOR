---
name: step08_content_assignment
description: Chemistry's asides (trap callouts, source-defect notes, marking-scheme margin notes) and why `structure`/`ring`/`rxn_smiles` legitimately show up in the "unassigned kind" queue without being broken — they bypass assignment.py's table by design. Use when trap callouts are dropped, or step08 flags these three kinds.
---

# Content Assignment — CHEMISTRY

> Read `pipeline/subjects/physics/step08_content_assignment/SKILL.md` first
> — the "reuse vs new component" doctrine and the `MAP`/`verify()` mechanics
> apply unchanged. This file is chemistry's deltas.

## What goes in the margin

Chemistry's asides are the trap callouts (`⚠️`), the source-defect notes
(`⚠ स्रोत-दोष`) and the `🎯 Yahan 1 mark bachta hai` marginalia — roughly 212
across the three measured chapters by direct count (70 + 62 + 80 emoji-led
labelled lines), more than any other subject. They carry the marking scheme
a student needs, so they must not be silently dropped to fit a page.

## `structure`, `ring`, `rxn_smiles` are NOT in `assignment.MAP` — this is by design, do not "fix" it

`book/format/assignment.py:13-47`'s `MAP` is the one-table kind→component
mapping `apply()` walks the whole document against, flagging any kind with
no entry as `"no component assigned; it will not render"`. **The three
chemistry-drawing kinds have no entry**, so a chemistry chapter that uses
```संरचना```/```रिंग``` fences (see `step07_formatting_agent`) will show
`structure`, `ring` and/or `rxn_smiles` in step08's unassigned-kind queue.

```text
IF step08 flags `structure`, `ring` or `rxn_smiles` as unassigned
    THEN do NOT add them to `assignment.MAP`. `book/assemble/render.py`
    already special-cases all three BEFORE it ever consults MAP —
    `if k == "structure": ... if k == "ring": ... if k == "rxn_smiles": ...`
    (render.py:211-226) — each renders through its own dedicated component
    call. Adding them to MAP would not change how they render (the
    special-case branches run first and never fall through to the
    MAP-driven path) — it would only hide a real signal (see below) behind
    a false "handled" entry.
```

**This is a genuine wart in the pipeline, not a bug to route around.** The
correct decision for these three findings is `verdict: false_positive, fix:
none needed — see book/assemble/render.py:211-226, these kinds render
outside the MAP dispatch by design`. Do not spend a review cycle debating
component names for them.

## The finding that IS real underneath the false positive

`structure` renders correctly (`C.chem_structure` is genuinely exported —
`book/components/__init__.py:29`). **`ring` and `rxn_smiles` do not** —
`chem_ring` and `chem_rxn` are defined in `book/components/math.py` but never
imported into `book/components/__init__.py`, so `render.py`'s
`C.chem_ring(b)` / `C.chem_rxn(b)` raise `AttributeError` at build time on
any chapter that actually reaches those branches. Verify:

```bash
python3 -c "
import sys, os
sys.path.insert(0, os.path.join(os.path.abspath('.'), 'book', 'util')); import bootstrap
sys.path.insert(0, os.path.abspath('.'))
from book import components as C
print('chem_structure', hasattr(C, 'chem_structure'))   # True
print('chem_ring',      hasattr(C, 'chem_ring'))         # False — the gap
print('chem_rxn',       hasattr(C, 'chem_rxn'))           # False — the gap
"
```

If a build crashes with this `AttributeError` rather than merely showing
`ring`/`rxn_smiles` as unassigned, that is this same gap surfacing at
render time instead of at step08's review stage — report it the same way:
`book/components/__init__.py:29` needs `chem_ring, chem_rxn` added to its
import line. This is a code fix and out of scope for a step08 decision file.

## Never

- Never add `structure`/`ring`/`rxn_smiles` to `assignment.MAP` to clear the
  unassigned-kind queue. It does not change how they render and it hides
  the real, separate `chem_ring`/`chem_rxn` export gap behind a false
  "resolved" entry.
- Never drop a trap callout or source-defect note to reclaim page space —
  see step10/step11: chemistry's margin notes carry the marking scheme, not
  decoration.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**Part 1 and Part 2 both pack into two columns now.** There is no
single-column `flowwrap` half and no 300px floated note column; a sticky
note is assigned INLINE, into the column its section sits in. A Part-1
item carries `revision`, which is what gives it `.revision-unit` and its
page `.revision-flow`.
