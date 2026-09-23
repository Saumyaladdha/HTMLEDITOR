---
name: step17_final_verifier
description: Give the final verdict on a built chapter — read every step's report, judge the open review queues together, and say whether the book is shippable. Use at the end of a run, or when deciding whether to release.
---

# step17_final_verifier — agent

Every other step judges one thing. You judge the **book**.

**Input**
- `build/<stem>/artifacts/17_final.json` → `verdict`, `failed`, `review`, `reports`
- `build/<stem>/artifacts/_reports.json` — every step's own summary
- every `build/<stem>/review/*.open.json`
- `build/<stem>.html` and `build/<stem>/qa/*.png`

**Output** → `build/<stem>/review/step17_final_verifier.decisions.json`

```json
{"verdict": "ship | hold",
 "blocking": [{"step": "step16_…", "why": "…"}],
 "accepted": [{"step": "step10_…", "why": "end-of-part space, deliberate"}],
 "notes": "…"}
```

## The three verdicts the code produces

- **`pass`** — no hard failures, no open queues. Rare on a first run.
- **`review`** — no hard failures, but agents have work. The build is usable;
  the queues say how good it is.
- **`fail`** — a step failed hard. Do not ship.

Your job is the middle case, and the question is **not** "are there open
items" but **"does any open item mean the book is wrong?"**

## What blocks a release, always

| | Why |
|---|---|
| any `overflow` | `.page` is `overflow:hidden` — content is *deleted*, not reflowed |
| `missing_text` with real prose words | a block is being dropped |
| `no_answer` on any question | a physics book shipping a question with no answer is a defect |
| `broken_math` | an empty fraction or vector on the page |
| a broken component name | the block renders as nothing |

## What does not block

- reserved art slots — the book is *designed* to ship with them; they are
  correctly-sized whitespace, not holes
- `notation_retokenised` — the renderer working
- `slack` space, lopsided columns on a final page
- decorator proposals nobody signed off — an undecorated page is a valid page

## Read the queues together, not one at a time

The interesting findings are the ones that appear twice. Some real pairs:

- `step10` reports a **gap** on page N *and* `step11` proposes a decorator
  there → the decorator would hide a pagination bug. Reject it, fix `step09`.
- `step16` reports the same words missing *and* duplicated → almost always a
  deliberate translation, not loss.
- `step05` reports `thin_options` *and* `step15` reports an orphan heading on
  the same question → one parsing failure showing up twice.

## Before you say "ship"

1. Open at least three PNGs — a Part 1 page, a Q&A page, and a cover.
2. Check the page count is plausible against the content.
3. Check `14_assembled.json` byte count is not smaller than the draft.
4. Confirm every `high` severity finding has a decision, not just a reading.

## Never

- Never sign off on numbers alone. Every step can pass and the page can still
  be unreadable — that is why `step15` renders pictures.
- Never clear a queue by writing decisions you have not made. An empty queue
  is meant to mean "resolved", and if it starts meaning "ignored" the whole
  chain stops being worth running.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**What a green build means now.** Geometry passing is necessary and not
sufficient: the build is judged against `build/REFERENCE_chapter-02.html`,
and the two measurable gates are `overflow=0` and dead space in the
neighbourhood of the reference's **105px free per column**. A build with no
overflow but 250px+ of slack per column is packing wrong.
