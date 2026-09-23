---
name: step11_decorator_agent
description: Decide arts decorator placements — reject any proposal that is really a pagination gap in disguise, and never decorate over a figure plate. Use when step11 proposes placements needing sign-off.
---

# Decorator Agent — ARTS

> Subject profile: `book/subjects/arts.py`. Everything not contradicted here
> is in `pipeline/subjects/biology/step11_decorator_agent/SKILL.md`, and the
> CODE is shared (`pipeline/step11_decorator_agent/run.py`,
> `book/decorators/policy.py`).

## The one thing arts adds: figures exist on ONE of the two chapters, not both

`book/subjects/arts.py` sets `"figures": "inline"` — figure cards are real,
declared `[FIGURE: …]` / `[IMAGE: …]` blocks, not decoration. Measured on the
actual content:

| | history | geography |
|---|---|---|
| `[FIGURE:` / `[IMAGE:` count | 4 + 3 = **7** | **0** |

Geography's six proposals below can never collide with a figure plate —
there is nothing to collide with. History's one proposal can. `free` on a
proposal is a column-end pixel count from `step10`'s probe; it does not know
whether a figure card sits directly above the gap it measured. **Before
accepting a placement on any page a figure could plausibly be on (check
`step01`'s IR dump or grep the page number in `draft.html` for
`class="figwrap"`), look at the actual PNG from `step15` — don't accept on
the number alone.**

## Read the proposal against `step10`'s OWN findings before judging it

`policy.propose()` tags a candidate `confidence: "low"` and spells out why
whenever it came from a `level: "gap"` column rather than `"slack"` — see
`book/decorators/policy.py`'s own comment: *"a `gap` is first a PAGINATION
problem: filling it with a doodle hides the fact that the packer gave up
early."* This is not hypothetical for arts — it already happened on the
geography build:

```
step10 (10_space.json):  page 1, col 0, 708px, level=gap
                          page 10, col 0, 715px, level=gap
step11 (11_decorators.json): page 1, character, free=708, confidence=low
                              page 10, character, free=715, confidence=low
```

Same page, same pixel count, both flagged by `step10` as an unexplained
mid-document gap and by `step11` as "probably a PAGINATION problem; fix the
packing before decorating it." **Reject both.** Accepting either would
paper over whatever made `step09`'s packer leave 700+px empty mid-column —
exactly the corollary in physics's own SKILL.md, now with real numbers
behind it instead of a hypothetical.

## Decision tree

```text
IS the proposal's `why` a "…px gap — this is probably a PAGINATION
problem" line (confidence: low)?
    YES → reject. Cross-check step10's own open queue for the SAME
          page/col — if it also reports `level: gap` there, the number
          is confirmed real and the fix belongs in step09, not here.

IS the page carrying a figure card (history only — geography has none)?
    YES → open the step15 PNG for that page before accepting anything.
          A doodle or character placed where it visually abuts or
          overlaps a figure plate reads as clutter around the one
          element on the page that is real content, not decoration.

IS the page a full Q&A page — dense options, tight answer blocks, no
real slack?
    YES → reject regardless of the free-px number. Policy exists
          specifically so a busy page stays busy.

OTHERWISE → judge by the free-px thresholds below.
```

## The limits, enforced in `book/decorators/policy.py`

```
max 2 doodles per page          min 200px apart (MIN_SEPARATION_PX)
max 1 character per page
character needs  >= 520px free  (900px+ still resolves to "character")
doodle-lg needs  >= 380px free
doodle-md needs  >= 260px free  (below this, role_for() returns nothing)
```

## State on the two real chapters

- **history**: 1 proposal — page 18, `doodle-lg`, 394px, confidence medium
  (genuine slack, not a gap). 0 accepted.
- **geography**: 6 proposals — 4 genuine slack (pages 3, 4, 6, 8; medium
  confidence), 2 gap-flagged low-confidence (pages 1, 10 — see above). 0
  accepted.

Nothing has gone through `book/decorators/place.py` yet for either chapter
(`accepted: []` on both) — that module is the code that actually draws
accepted art onto the page at the foot of its column, measuring free space
fresh on the live HTML rather than trusting the `step10` number (layout can
shift between steps). Until a placement is accepted here, it stays entirely
theoretical; nothing in `place.py`'s logic is arts-specific.

## Never

- Never accept a `confidence: low` / "gap" proposal without first checking
  `step10`'s own queue for the same page — a gap accepted as decoration
  hides a pagination bug that will recur on every future arts chapter, and
  by the time anyone notices, the "deliberate whitespace" story is on
  record and harder to unwind than the original bug would have been.
- Never accept more than the policy allows because a page "looks bare."
  Bare is a legitimate typographic choice for this design; crowded is not.
- Never propose or accept art for a full Q&A page — the reference book's
  own Q&A pages carry zero doodles and zero characters; the pink question
  tags and dashed rules already carry the page.

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
