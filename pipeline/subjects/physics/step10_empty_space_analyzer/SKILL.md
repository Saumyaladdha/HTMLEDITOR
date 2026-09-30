---
name: step10_empty_space_analyzer
description: Decide whether a large empty area on a page should stay empty, be filled by repacking, or take a decorator. Use when step10_empty_space_analyzer reports gaps.
---

# step10_empty_space_analyzer — agent

Not all whitespace is a fault. The end of a part, the foot of a cover page
and the last page are all legitimately short. What matters is space that
reads as a **mistake**.

**This file's own numbers are physics's, not universal.** Biology's worst
hole went from 1,026px to 422px when table-splitting landed for it (see
`pipeline/subjects/biology/step10_empty_space_analyzer/SKILL.md`) — a
different subject with a different content mix has its own current
baseline, not physics's. Judging a new subject's first chapter against
these thresholds without first checking whether that subject has its own
delta file (and, if it doesn't yet, treating its numbers as a fresh
baseline rather than a physics-shaped target) is how a genuinely fine
build reads as a regression, or a genuine regression reads as "that subject
is just like that."

**Input**
- `build/<stem>/artifacts/10_space.json` → `findings`, `summary`, `raw`
- `build/<stem>/review/step10_empty_space_analyzer.open.json` — only `gap`
  items; `slack` is informational

**Output** → `build/<stem>/review/step10_empty_space_analyzer.decisions.json`

```json
{"decisions": [
  {"id": "…", "action": "leave | repack | decorate",
   "why": "end of Part 1 — a deliberate breath before the Part 2 cover"}
]}
```

## The thresholds

| Level | Free space | Reading |
|---|---|---|
| `ok` | < 120px | nobody notices |
| `slack` | 380–620px | noticeable, harmless, a decorator could sit here |
| `gap` | > 620px | reads as a mistake |
| `lopsided` | columns differ > 35% | one column stopped early |

## Choosing the action

**`leave`** — the space is doing work. The end of a part, before a cover, the
last page of a section. Silence on a page is allowed to be deliberate.

**`repack`** — this is the default suspicion for a `gap`. A large hole
mid-document usually means the packer met an atomic block it could not fit
and closed the column early. Look at what comes *next*:

```bash
python3 -c "
import json;d=json.load(open('build/<stem>/artifacts/10_space.json'))
print(json.dumps([r for r in d['raw'] if r['page']==<N>],indent=1))"
```

If the next block is a tall table or figure, the fix is in `step12` (make the
table fit) or in the figure's reserved size — not here.

**`decorate`** — only for `slack`, and only when the page has genuine breathing
room. Hand it to `step11`, which owns the density rules.

## The trap

**A `gap` filled with a decorator is a hidden pagination bug.** The page now
looks fine and the packer is still giving up early — and it will do it again
on every chapter. Fix the packing first; decorate only what is already
correct.

## Never

- Never flag the last page of a document. It is meant to end short.
- Never treat lopsided columns as a defect on its own. The packer fills
  column 1 before column 2 by design, and the final page of a run is
  legitimately uneven.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**There is now a measured benchmark.** Probing the reference edition the
same way this step probes a build:

| | pages | avg free / column | worst column |
|---|---|---|---|
| reference | 35 | **105px** | 418px (on the last page) |

So ~105px of slack per column is what a good build looks like — not zero.
A column far above that wants explaining; the whole book far above it means
the packer is stopping early, which is what a wrong `GAP` did (it charged
9px a boundary against a real 0.22px and cost ~100px a column).

Judge the **worst hole** as well as the total: one column two-thirds empty
reads as a mistake, the same slack spread over six does not.
