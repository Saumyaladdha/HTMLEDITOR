---
name: step13_css_generator
description: Bundle the stylesheets including book/elements/flow. Use when a flow stage renders italic, a chain breaks across a column it should avoid, or step07's flow/figure_brief rules.py gap (see step07) produces a mismatch between the CSS's break-inside:avoid and the atomic flag actually applied.
---

# Css Generator — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step13_css_generator/SKILL.md` — **read it
> first** for the five load-bearing checks (print-color-adjust, A4 page
> rule, print zoom, swipe strokes, embedded fonts) and the "measure with the
> same CSS you render with" rule; all apply unchanged. The CODE is shared —
> one `pipeline/step13_css_generator/run.py` for both subjects.

## What this step is for

Bundling the element stylesheets.

## Biology's addition: `book/elements/flow`

`.flow` is the process-chain element. Its rules live in `base.rules.json`
and `a4.rules.json` like every other element.

```text
IF a rule is added ONLY to `style.css`
    THEN it will NOT reach the page — `bundle(mode)` reads
    `base.rules.json` + `a4.rules.json` + `extra.css`; it does NOT read
    `style.css`. This has caught people out before; check which file a new
    `.flow` rule actually landed in before assuming it's live.
```

The flow element's own invariants:

- `.flow > .st` is `font-style: normal` — the whole point is a stage is not
  italic (see `step07`'s ploidy/flow-italic notes).
- `.flow` is `break-inside: avoid` in a4 — half a chain at the foot of a
  column is worse than a hole. **Cross-check against `step07`**: `rules.py`
  currently has no `"flow"` entry, so the `atomic` flag `step07` reports
  for a flow block is `DEFAULT`'s `false` — the CSS says "never split
  this," the format rule (until fixed, per `step07`'s standing-gap note)
  says "you may." When judging a flow block that DID split at the foot of
  a column, check whether this is the cause before assuming a CSS bug.
- `.flow-down` switches to a vertical column layout with `↓` connectors
  once `FLOW_WRAP_STAGES`/`FLOW_WRAP_CHARS` are exceeded (`step07`).

## Elements biology never uses

`formula-card`, `given`, `display-math`, `math-inline` are physics's. They
stay in the bundle regardless — an unused rule costs nothing to ship, and a
subject-conditional stylesheet would be a new axis for the two subjects'
output to silently diverge on. Do not propose stripping them "since
biology doesn't use them" — the cost of keeping them is zero and the cost
of a conditional bundling path is a new class of bug.

## What to check before closing this step

- [ ] A new `.flow`-related rule is confirmed present in the BUNDLED
      output (`13_css.json`'s emitted CSS, or the page's actual
      `<style>`), not just in `style.css`.
- [ ] `.flow > .st`'s `font-style: normal` survives the bundle — grep the
      final CSS for it directly rather than trusting the source rule file.
- [ ] `.flow { break-inside: avoid }` and `step07`'s `atomic` value for
      `flow` blocks are cross-checked against each other (see above) if a
      chain is ever found split mid-column.

## Never

- Never add a colour or size directly in `css.py` — add the token in
  `book/design/tokens.py`, then use it, or the next re-scale misses it.
- Never fix a print problem by changing the screen layout — print scaling
  has exactly one lever, `zoom`.
- Never assume a `.flow` rule is live because it exists in `style.css` —
  verify it reached `base.rules.json`/`a4.rules.json`, per the bundle
  source list above.
