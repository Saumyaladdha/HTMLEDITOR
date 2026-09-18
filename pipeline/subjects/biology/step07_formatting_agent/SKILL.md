---
name: step07_formatting_agent
description: Decide biology presentation — above all the flowchart's horizontal/vertical threshold and ploidy notation staying one token. Use when a process chain is italic, wraps mid-chain, has an arrow pointing at nothing, or step07 reports flow/figure_brief as unknown kinds (they permanently are, on every biology build — see below).
---

# Formatting Agent — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step07_formatting_agent/SKILL.md` — **read it
> first** for the four attributes (`atomic`, `density`, `accent`,
> `emphasis`) and how to choose each. The CODE is shared — one
> `pipeline/step07_formatting_agent/run.py` for both subjects.

## What this step is for

Deciding how each block is presented.

## A confirmed, standing gap: `flow` and `figure_brief` have no rule

**Every biology build's `step07` queue opens with exactly these two items,
and they will keep reopening until `book/format/rules.py` gets entries for
them** — checked directly: `book/format/rules.py`'s `RULES` dict (lines
19–56) has no `"flow"` key and no `"figure_brief"` key, so both kinds fall
back to `DEFAULT = dict(atomic=False, density=1.0, accent=False,
emphasis="normal")` (`rules.py:18`). The current build's actual open queue:

```json
{"kind": "flow", "detail": "no formatting rule; using DEFAULT"},
{"kind": "figure_brief", "detail": "no formatting rule; using DEFAULT"}
```

Writing a decision for THIS build closes the queue for this run, but the
next biology chapter hits the identical two items again unless the table
itself gets the rows. This is exactly the situation the physics file warns
about ("Never write the decision only into the decisions file") — here it
is not hypothetical, it is the queue's permanent steady state.

```text
FOR `flow`:
  atomic MUST be true — book/elements/flow's CSS already sets
  `.flow { break-inside: avoid }` (step13's CSS notes), so a chain
  currently gets DEFAULT's atomic=false from rules.py while its OWN
  stylesheet insists it must not split. The two disagree today; `atomic`
  in rules.py should match the CSS, not contradict it.
  density: a flow chip row needs more vertical room than body text once it
  wraps vertical (`.flow-down`) — treat similarly to `definition`'s 1.05.
  accent: false — a chain's stages are not section-coloured chips.
  emphasis: normal.

FOR `figure_brief`:
  Since it RENDERS TO NOTHING (`RENDERS_NOTHING` in
  book/format/assignment.py), its `atomic`/`density`/`accent`/`emphasis`
  values are inert — there is no box on the page for them to shape. A
  rules.py entry exists here purely to stop the same three review lines
  recurring; any DEFAULT-shaped values are fine, but see the check below.
```

**Correct**: propose the `flow` row above and land it in `rules.py`, so the
next biology chapter's `step07` queue opens empty for this kind instead of
re-litigating it.
**Incorrect**: writing `{"kind": "flow", "atomic": true, ...}` only into
`step07_formatting_agent.decisions.json` and considering the queue closed —
it closes THIS build; the next one reopens it.
**Edge case**: do not add a `rules.py` row for `figure_brief` that sets
`atomic: true` "to be safe" and then debug why a block with no rendered
box behaves oddly under a packer that tries to keep it whole — since it
renders nothing, `atomic` genuinely has no effect; do not let its presence
in the table imply it does.

## The flowchart

A `flow` block is a process chain, set with each stage as an upright chip
and arrows between them (`book/components/text.py`, `.flow` element).

**Horizontal while it fits, vertical once it does not**:
`FLOW_WRAP_STAGES = 4`, `FLOW_WRAP_CHARS = 62`
(`book/components/text.py:70-71`).

The reason is not aesthetic. This six-stage chain

```
गुरुबीजाणु मातृ कोशिका → अर्द्धसूत्री विभाजन → 4 गुरुबीजाणु → 1 क्रियाशील
→ 3 समसूत्री विभाजन → 8-केन्द्रकीय भ्रूणकोष
```

wraps across two lines in a 449px column when forced horizontal, and the
arrow at the end of the first line points at nothing — there is no visual
target for it. Stacked vertical, every arrow correctly points at the stage
below it.

**Correct**: a 3-stage, 40-character chain stays horizontal — it fits one
line, all arrows land on their target.
**Incorrect**: forcing a 6-stage chain horizontal because "it's only one
more than the threshold" — the wrap happens regardless, and a dangling
arrow at a line break is worse than the vertical layout it was avoided for.
**Edge case**: a chain right at the boundary (exactly 4 stages, 61
characters) — trust the measured thresholds, don't eyeball it; if it looks
wrong at the boundary, that's a signal to re-measure `FLOW_WRAP_CHARS`
against a real render, not to override one chain by hand.

Each stage is `inline()`d individually, so a count or ploidy inside it
keeps its own treatment — `8-केन्द्रकीय` keeps its digit upright and
`(3n)` is not torn apart mid-chain.

## What must NOT happen

- A stage set in italic — `.flow > .st` is `font-style: normal`
  deliberately; the original bug rendered a chain as a `definition` with a
  `.m` maths span inside it.
- An arrow inside a text run instead of between chips.

## Ploidy is one token, not algebra

`n`, `2n`, `3n`, `(3n)` name how many chromosome sets a cell has. Inside a
maths/upright run, digits and brackets are upright and letters are italic
by default — so `त्रिगुणित (3n)` came out as an upright `(3`, an italic
`n`, and an upright `)`: three pieces, as though `n` were a variable
multiplied by 3.

**Correct**: `(3n)` renders as one upright unit, no internal split.
**Incorrect (the actual original bug)**: `<span class="up">(3</span>n<span
class="up">)</span>` — visually reads as `(3` next to a variable `n` next
to `)`, implying multiplication.
**Edge case fixed for**: `2nd` (an ordinal) and `sin` (a trig function,
relevant if this profile is ever reused for a maths-adjacent chapter) must
NOT be caught by the same rule — `_UPRIGHT_RE` (`book/format/inline.py:1285`)
joins a trailing `n` into the upright run only when NO letter follows it,
so `2nd`'s `d` and `sin`'s surrounding letters keep the rule from firing.

Fixed in `_UPRIGHT_RE` itself, not as a separate wrapping pass — a separate
pass would tag the text first and then have the main scan process that tag
again, double-wrapping the digit
(`<span class="up"><span class="up">3</span>n</span>`).

## What to check before closing this step

- [ ] `flow` and `figure_brief` decisions are present for this build AND
      proposed as `rules.py` rows (see the standing-gap section above) —
      not just written into the decisions file.
- [ ] Every `flow` block in the rendered PNG has upright stages, arrows
      landing on a target, and correctly switches to `.flow-down` past the
      measured thresholds.
- [ ] Every `(Nn)` ploidy token in the rendered page is one visual unit —
      grep `build/<stem>.html` for `ploidy_split` via
      `tools/scan_render_defects.py`; it is a `high`-severity rule.

## Never

- Never set formatting from what a block looks like — two visually
  different blocks are different KINDS; go back to `step03`.
- Never write a `flow`/`figure_brief` decision only into the decisions
  file without also proposing the `rules.py` row — this queue is
  demonstrably permanent otherwise (see above).
