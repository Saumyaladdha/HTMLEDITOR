---
name: step11_decorator_agent
description: Decide where decorators, illustrations or icons would genuinely improve a page rather than just fill it. Use when step11_decorator_agent proposes placements needing sign-off.
---

# step11_decorator_agent — agent

**The rule that keeps this from looking like scattered clip-art:**

> Decoration density is inversely proportional to content density.

In the reference book the 23 full Q&A pages carry **zero** doodles and
**zero** characters — the coloured question tags and dashed rules carry them.
Only pages with real slack get art. A decorator's job is to make a deliberate
piece of whitespace *read* as deliberate, not to fill every hole.

**Input**
- `build/<stem>/artifacts/11_decorators.json` → `proposals`, `outstanding`
- `build/<stem>/review/step11_decorator_agent.open.json`
- the rendered page: `build/<stem>/qa/page-NN.png` (from `step15`)

**Output** → `build/<stem>/review/step11_decorator_agent.decisions.json`

```json
{"decisions": [
  {"id": "…", "accept": true, "role": "doodle-md",
   "why": "end of Part 1, 420px of slack under a short section"},
  {"id": "…", "accept": false,
   "why": "this is a gap, not slack — fix the packing instead"}
]}
```

## The limits, enforced in `book/decorators/policy.py`

```
max 2 doodles per page          min 200px apart
max 1 character per page        at a natural pause, never in a text column
doodle  ≤200px native, transparent, 1–2 hues, 3–8 strokes
character 90–180px rendered
```

## How to judge one

**Look at the page**, not just the number. `step15` renders PNGs.

Ask three things:

1. **Is this slack or a gap?** A `gap` proposal arrives with
   `confidence: low` and it usually deserves `accept: false` — filling it
   hides a pagination bug that will recur on every chapter.
2. **Is the page already busy?** A page with a table, two callouts and a
   figure does not need a doodle, whatever the free-space number says.
3. **Would removing it be a loss?** If not, it is decoration for its own
   sake. Say no.

## Roles and where they belong

| Role | Where | Never |
|---|---|---|
| `doodle-sm/md/lg` | margin, foot of a column, beside a heading | over a diagram, beside running text |
| `character` | end of a section, foot of a cover page, end of book | inside a text column, near a diagram |
| `emblem` | beside the chapter title only | anywhere else |

## Nothing you accept can break the layout

Every slot is already rendered **at its final size**. Accepting a proposal
does not move the page and does not invalidate pagination — which is exactly
why art can be added later without a redesign. The corollary: never size a
slot "roughly, we'll fix it when the image arrives."

## Never

- Never accept more than the policy allows because a page "looks bare". Bare
  is a legitimate typographic choice; crowded is not.
- Never propose art for a full Q&A page. If the reference book puts none
  there, neither do we.
