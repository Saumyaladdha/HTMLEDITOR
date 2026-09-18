---
name: step04_content_namer
description: Resolve arts (history/geography) id collisions — geography's current build carries three real `प्र. N` collisions inside its "पुस्तक से — N अंक" book-sourced buckets, already auto-suffixed; history has none because its numbering never resets. Use when step04 reports a duplicate id, or a review queue id is unreadable.
---

# Content Namer — ARTS

> Subject profile: `book/subjects/arts.py`. Everything not contradicted here
> is in `pipeline/subjects/biology/step04_content_namer/SKILL.md` and
> `pipeline/subjects/physics/step04_content_namer/SKILL.md` (read that one
> first — the stable/unique/readable priority order, and the `~n` collision
> suffix as a backstop, are defined there). The CODE is shared:
> `book/taggers/naming.py`.

## The step reports clean, and that is NOT the same as "no collisions occurred"

`_reports.json` on both current builds: `step04_content_namer: status ok,
open_items 0` (history `named=479`, geography `named=480`). The step never
fails on a collision — `naming.assign()`'s `if qid in index: qid = "%s~%d"`
resolves it before the duplicate-key check ever runs, so `open_items` stays
0 whether or not a collision happened underneath. Read the actual `_index`,
not just the pass/fail line, before assuming every `प्र. N` in a build is
uniquely numbered.

## Geography's current build has 3 real collisions — verified in `04_named.json`

```
p3.gपुस्तक-से-4-अंक.q1~15   p3.g6-अंक.q1~9   p3.g6-अंक.q2~10
```

Trace to the source, via `01_read.json`'s question numbers per group:

```
'पुस्तक से — 4 अंक'  [9, 10, 11, 1, 2, 3, 4, 5, 1]   <- two प्र.1
'6 अंक'              [4, 1, 2, 1, 2]                  <- two प्र.1, two प्र.2
```

Both are book-sourced ("पुस्तक से") or plain-marks-bucketed ("6 अंक")
groups — the chapter pools the book's own exercise questions under a
nominal marks label, and the book's own exercises restart their own
internal numbering. "6 अंक" opens with `4` (the tail of the PRECEDING
run), then a first book exercise `1, 2`, then a second book exercise also
`1, 2` — two unrelated numbering sequences sharing one group.

**This is not a source typo.** History, by contrast, has ZERO collisions
because its Part 2 runs ONE global count start to finish —
`'2026':[1..5]`, `'2025':[6..18]`, …, `'महत्वपूर्ण प्रश्न':[43..66]`, every
group picking up exactly where the last left off, never resetting. Geography
does the opposite: even its year groups restart (`'2026':[1]`, `'2025':[1,
2]`), and its marks-buckets restart again inside themselves. **Whether a
chapter's question numbers reset is a per-chapter authoring choice, not
something the pipeline enforces** — check a new arts chapter's own
`01_read.json` group-by-group before assuming either pattern.

## Why the `~n` suffix is the RIGHT outcome here, not a symptom to chase

`book/taggers/naming.py`'s question id is `"%s.q%s" % (cid, q.get("num",
qi))`, where `cid` is the group's OWN id (`p3.gपुस्तक-से-4-अंक`, not a bare
part prefix) — so a number reused ACROSS groups (history's `प्र. 1` existing
only once globally is moot; geography's `2026`'s `प्र.1` and `2025`'s
`प्र.1` never collide, since they're `p3.g2026.q1` and `p3.g2025.q1`). The
collision only fires when the SAME group reuses a number, which is exactly
what the two pooled-exercise buckets above do. The suffix (`q1~15`) keeps
both questions addressable and stable across rebuilds; nothing here needs a
human decision unless the pattern below fails.

## Decision tree

```text
IS the colliding id's group label a source/marks bucket
   ("पुस्तक से — N अंक", a bare "N अंक")?
    YES → check the group's question-number list (see above) for a clean
    RESTART pattern — one run ending, a new one beginning near 1.
        Clean restart (like 9,10,11,1,2,3,4,5,1 or 4,1,2,1,2) → expected
        pooling. No decision needed; the `~n` suffix already gives both
        questions a stable id. Do NOT renumber the source to make the
        group strictly ascending — the numbers are the book's/board's own
        reference numbers, and other blocks cite them directly (`🔗 Ye wahi
        question hai: यही सूची 2023 · प्र. 6 और 2025 · प्र. 9 में भी…`);
        renumbering breaks those citations for no benefit, since the `~n`
        suffix already solves uniqueness.
        No clean restart (numbers jump with no visible pattern) → treat as
        a genuine duplicate per physics's SKILL.md — read both source
        instances, confirm whether one is a stray re-typed question number.

IS the colliding id's group label a single year ("2026", "2025", …)?
    A repeat WITHIN one year's own group is real duplication — a single
    year's paper/answer-key does not ask the same numbered question twice.
    Fix the markdown numbering, not the namer.
```

## What to check before closing this step

- [ ] Pull `_index` (or `04_named.json`) and grep for `~` — do this even
      when `open_items: 0`, since a resolved collision never surfaces there.
- [ ] For each `~`-suffixed id, look up its group's question-number list in
      `01_read.json` and classify it against the tree above before writing
      any decision.
- [ ] `प्र. N` heading TITLES (`### प्र. N · <title>`, the shape
      `step01`'s FAULT 1 fixed the reader for) play no role in naming —
      confirmed in `naming.py`: the id is built from `q.get("num", qi)`
      only. A future wording change to an existing question's title will
      not move its id.

## Never

- Never hand-edit `_index` — regenerated from the document every run, per
  physics's SKILL.md.
- Never renumber a pooled book-bucket's questions to make the group
  strictly ascending. The `~n` suffix already makes the id unique; changing
  the source numbers instead breaks the chapter's own year/number
  cross-references and gains nothing.
- Never assume `open_items: 0` means no collision happened — it means every
  collision that DID happen was already silently resolved. Read the id
  list itself, as this file does above, before reporting a chapter clean.
