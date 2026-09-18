---
name: step15_visual_qa_agent
description: Scan a biology build with the six biology-specific rules already in tools/scan_render_defects.py (devanagari_in_maths, chain_as_maths, fence_leaked, stray_backtick, ploidy_split, flow_italic — verified present, the current build is clean of all six), then look at the pages for what three still-missing rules (long_maths_run, figure_without_art, caption_orphan) cannot yet catch mechanically.
---

# Visual Qa Agent — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step15_visual_qa_agent/SKILL.md` — **read it
> first** for the code-found-vs-only-you-find split and the "route the fix
> to the right step" table; both apply unchanged. The CODE is shared — one
> `pipeline/step15_visual_qa_agent/run.py` for both subjects.

## What this step is for

Scanning the rendered HTML and looking at rendered pages for what geometry
checks cannot catch.

## The scanner already has biology rules — verify before assuming otherwise

`tools/scan_render_defects.py`'s `RULES`/`CODE_RULES` were extended after
the FIRST biology build — checked directly against the current file, these
six exist and run on every biology build:

| rule | severity | catches |
|---|---|---|
| `fence_leaked` | high | `चित्र-निर्देश`/`NCERT`/`ref:` in visible text |
| `stray_backtick` | high | a literal backtick reaching the page |
| `devanagari_in_maths` | high (code rule) | ≥6 Devanagari chars inside a `.m` run |
| `chain_as_maths` | high (code rule) | a `→` joining ≥4 Devanagari chars inside `.m` |
| `ploidy_split` | high | `2n`/`(3n)` split across spans, excluding legitimate `<sub>` digit+variable cases |
| `flow_italic` | high | a `.flow > .st` rendered italic |

Run it and expect (on a chapter of this shape) **clean**:

```bash
python3 tools/scan_render_defects.py build/<stem>.html
```

`build/bio-01-cols.html` (the current chapter 1 build) reports clean of all
six. **Do not describe the physics scanner as "blind to biology" going
forward** — that was true of the FIRST build and is the reason these six
rules exist; it is not true of the current code. If a future chapter trips
one, that is a real regression against a mechanism that already works, not
a gap to route around by eye.

## Three rules that are genuinely still missing — verified absent

`long_maths_run`, `figure_without_art` and `caption_orphan` are named in
older project notes as biology scanner rules but **are not present** in
`tools/scan_render_defects.py`'s `RULES` or `CODE_RULES` — checked directly,
only the six above exist. If you need one of these, write it (and add it to
the scanner in the same pass, per the physics file's "the rule that makes
this step worth having"):

```text
`long_maths_run`  — a `.m` span over ~40 chars is prose, not an equation;
                    the first build had one at 213 characters
`figure_without_art` — a plate whose data-ref names a file absent from
                    `source_figures/`; biology currently has 9 of these by
                    definition (see step11) — a rule here would make that
                    count mechanically checkable per-build instead of
                    read off step11's report each time
`caption_orphan`  — an italic `*चित्र N.M — …*` caption line separated from
                    its image by an intervening block
```

Until these exist, judge them BY EYE from the page PNGs — see below.

## What only you can find (biology-specific additions to the physics list)

Beyond the physics file's crowding/rag/balance/misplaced-art checklist,
open the PNGs and specifically check:

- **A reserved figure plate with no caption, or a caption on the wrong
  plate** — with 21 figures and 9 unique missing files repeated across
  multiple references, a caption/plate mismatch is easy to introduce when
  the same missing file backs several figure numbers.
- **A callout run that reads as a wall** — 214 callouts in this chapter
  (against physics's 108); several `⚠️` traps back-to-back with no
  breathing room between them is a biology-specific crowding shape that a
  physics-tuned eye may not flag on reflex.
- **A `flow` chain that switched to `.flow-down` unnecessarily** — check
  against `step07`'s measured thresholds (`FLOW_WRAP_STAGES=4`,
  `FLOW_WRAP_CHARS=62`); a chain right at the boundary is worth a second
  look in the actual render, not just the HTML.

## Route the fix to the right step

| Symptom | Step |
|---|---|
| leaked figure brief, stray backtick | `step01`/`step14` (render path) |
| Hindi noun in the maths face | `step01` (profile gate) |
| chain rendered italic or as `definition` | `step07`/`step14` |
| ploidy token split | `step07`'s `_UPRIGHT_RE` note |
| table hole/wrap | `step12` |
| slack column, undecorated or over-decorated | `step10`/`step11` |
| missing figure art | `step11` (report, cannot fix from here) |

## Never

- Never sign this step off without opening a screenshot — geometry passing
  and the scanner reporting clean are both necessary but not sufficient;
  the three missing rules above are exactly the gap between them.
- Never mark an `overflow` or a `fence_leaked`/`stray_backtick` finding
  acceptable — there is no by-design version of either.
- Never re-describe the scanner as blind to biology without first running
  it — that framing describes history, and treating it as current will
  waste effort re-solving an already-solved problem.
