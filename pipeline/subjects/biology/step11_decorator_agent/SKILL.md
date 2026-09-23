---
name: step11_decorator_agent
description: Choose and place biology artwork from the चित्र-निर्देश briefs, and judge slack-column doodle proposals now that table splitting has shrunk biology's dead space to 4 slack columns (from 17). Use when a figure is empty, a brief has leaked into the page, or a doodle proposal needs sign-off.
---

# Decorator Agent — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step11_decorator_agent/SKILL.md` — **read it
> first** for the density-inverse-to-content rule, the role/placement table,
> and "decoration cannot break the layout." The CODE is shared — one
> `pipeline/step11_decorator_agent/run.py` for both subjects.

## What this step is for

Choosing and placing artwork.

## Biology is figure-led, and the figures are missing — this has not changed

21 image references, 9 unique files, **all 9 absent from disk**, confirmed
in the current build's artifacts. No code change fixes this — the plates
have to be supplied. Until then, every figure renders as a reserved plate.
This is a content/asset gap, not a pipeline defect; `step17`'s gate is to
report it honestly, never to hide it behind a decorator (see below).

## The briefs are the only description that exists

Each `figure_brief` block carries the text of a ```चित्र-निर्देश``` fence
— what to draw, what to label, sometimes a `ref:` naming the NCERT plate.
Example:

> NCERT चित्र 1.1 — एक प्ररूपी परागकोश की अनुप्रस्थ काट; द्विपालित (bilobed)
> परागकोश जिसकी प्रत्येक पालि में दो कोष्ठ (द्विकोष्ठी) तथा चतुष्कोणीय काट
> के चार कोनों पर चार लघुबीजाणुधानी नामांकित।

That is a complete specification for an illustrator. Use it to choose or
commission art; **never render it as text.** It reached the printed page in
the first build (11 fences, verbatim) and read as gibberish mid-paragraph
— `tools/scan_render_defects.py`'s `fence_leaked` rule exists specifically
to catch a regression of this, and the current build is clean of it.

## Current live proposals — a real example of the judgement this step makes

The current build's queue has 4 open decorator proposals, all `doodle-lg`,
all `confidence: medium`, all at the FOOT of column 1 on their page:

| page | free px | why |
|---|---|---|
| 3 | 392 | slack at foot of column 1 |
| 16 | 388 | slack at foot of column 1 |
| 20 | 422 | slack at foot of column 1 |
| 22 | 380 | slack at foot of column 1 |

```text
FOR EACH of these:
  IS the free space `slack`-tier (380-620px, per step10's thresholds), not
  `gap`-tier?
      YES for all 4 — confirmed in step10's current findings (0 gap-tier,
      4 slack-tier). This clears the FIRST bar: a doodle here does not
      hide a pagination bug, because there is no pagination bug to hide.

  IS the page ALREADY busy — a table, two callouts, a figure?
      Check the actual page PNG for each of the 4 before accepting. A
      slack column at the foot of an otherwise dense Part 1 page (running
      prose, one callout) is a good candidate; the same free space on a
      page that already carries a सूत्र-equivalent flow diagram plus two
      callouts is not — biology's callout density (214 in this chapter)
      means "does the page already have enough happening" is a real
      question here more often than in physics.

  WOULD REMOVING the doodle be a loss?
      If the honest answer is "no, the page reads fine either way," decline
      it — decoration for its own sake is still decoration for its own
      sake, `confidence: medium` or not.
```

## Plate sizing

A biology plate is usually a labelled diagram, needing more room than a
physics vector sketch, and must not be shrunk to fit a gap.
`fitSlotToImage` only ever SHRINKS a plate to the art inside it — safe.
Growing a plate after pagination has settled clips the page, because the
column heights were measured against the plate's ORIGINAL reserved size.

## What to check before closing this step

- [ ] Every `figure_brief` text is used to choose/commission art, never
      rendered — spot-check the page PNGs, not just the HTML, since a
      leaked brief is a `high`-severity `fence_leaked` finding either way.
- [ ] Each of the 4 current `doodle-lg` proposals has an explicit accept/
      reject with a reason tied to the page's actual content density, not
      just the free-px number.
- [ ] The 9 missing plates are reported as missing, not silently absorbed
      into "reserved plate, looks deliberate" language that reads as if
      nothing is outstanding.

## Never

- Never accept more decorators than the policy allows because a page
  "looks bare" — bare is a legitimate choice; crowded is not.
- Never propose art for a full Q&A page — the reference book carries none
  there, and neither should this pipeline's output.
- Never treat a `figure_brief`'s text as renderable content, even
  partially — it is a production note in every case, not sometimes.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**There is no floated note column any more.** The reference carries zero
`.stickycol`: a note is set inline, in the column it belongs to. A
निगमन (derivation) card additionally gets `.derivation-note`, which drops
the rotation and puts each step on its own line — those cards are read
down, not glanced at.

So "move it to the margin" is no longer an available fix. A note that does
not fit belongs earlier or later in its own column.
