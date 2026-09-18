---
name: step04_content_namer
description: Resolve id collisions or unreadable ids produced by the content namer. Use when step04_content_namer reports duplicate ids, or when review queues are hard to read because ids are opaque.
---

# step04_content_namer — agent

Every block gets a stable, readable id so later steps — and you — can refer
to it: `p2.g2026.q4.answer`, `p1.s1-5.bul2`, `front.s2.tbl1`.

Three properties, in priority order:

1. **stable** — same content in the same place produces the same id on every
   run, so a decision written today still applies tomorrow;
2. **unique** — a collision silently makes two blocks share a decision;
3. **readable** — `p2.g2026.q4.answer` beats `blk_00417` when you are reading
   a diff or a review queue.

**Input** `build/<stem>/artifacts/04_named.json` → `_index`
**Output** → `build/<stem>/review/step04_content_namer.decisions.json`

```json
{"decisions": [
  {"id": "p2.g2026.q4", "rename": "p2.g2026.q4a",
   "why": "two questions numbered 4 in one group"}
]}
```

This step normally has an empty queue. It fails hard on a duplicate id,
because a collision corrupts every downstream decision that references it.

## When it does fail

A duplicate almost always means the *content* has a duplicate: two questions
numbered 4 in one group, two sections numbered 1.5, two groups labelled
`2025`. Fix the markdown — the renaming suffix in `book/taggers/naming.py`
is a safety net, not a solution, and a book with two "प्र. 4" in one year is
wrong on the page too.

If the ids are merely ugly (long Devanagari slugs, say), that is a naming
scheme change: edit `_ABBR` and `_slug` in `book/taggers/naming.py`. Do it
once, deliberately, and be aware it invalidates every stored decision that
references an old id.

## Never

- Never hand-edit `_index`. It is regenerated from the document every run.
- Never make an id depend on page number or position in the flow. Pagination
  moves; a decision that moves with it is worthless.
