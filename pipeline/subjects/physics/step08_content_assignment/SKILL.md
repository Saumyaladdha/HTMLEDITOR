---
name: step08_content_assignment
description: Assign a component to a semantic kind that has none, or override a mapping. Use when step08_content_assignment reports unassigned kinds or a broken component name.
---

# step08_content_assignment — agent

One table, one direction: **semantic kind → component**. It lives in
`book/format/assignment.py` and it is explicit rather than an if-chain inside
the renderer, so the whole mapping fits on one screen and a kind with no
component is a loud gap instead of a paragraph that silently swallowed a
table.

**Input**
- `build/<stem>/artifacts/08_assigned.json` — every node carries `component`
- `build/<stem>/review/step08_content_assignment.open.json`

**Output** → `build/<stem>/review/step08_content_assignment.decisions.json`

```json
{"decisions": [
  {"id": "…", "kind": "worked_example", "component": "refbox",
   "why": "nearest existing component; a dedicated one is not worth it yet"}
]}
```

`component` **must** be a name exported by `book/components/__init__.py`.
`assignment.verify()` checks this and the step fails hard if it is wrong —
better a build failure than a block that renders as nothing.

## What exists

```
slot      swipe  chip   marktag  starbadge  athava
para      bullets  numbered  definition  trio
eq        fbox
pointer   sticky   simchip   srcnote  refbox  fullnote
qhead     options  answer    given    qsep
table     figure
chapter_header  section_head  year_banner  part_cover
```

## Deciding between "reuse" and "new component"

Reuse when the new kind is the same *shape* with different content — a
"worked example" and a "reference box" are both a bordered block of prose.

Build a new component when the kind needs markup the existing ones cannot
express: a different internal structure, its own sub-parts, its own break
behaviour. Then create `book/components/<family>.py`, export it from
`__init__.py`, and add the row here.

**Prefer reuse.** The previous system had 98 elements, eight of them tables
that differed only in column count, and the cost was that nobody could hold
the library in their head. This design has one table.

## Never

- Never point a kind at a component whose markup does not fit. A `figure`
  rendered through `para` produces a paragraph containing a filename.
- Never add a component without adding it to `__init__.py`'s `__all__` —
  `verify()` will catch it, but only after you have wasted a build.
