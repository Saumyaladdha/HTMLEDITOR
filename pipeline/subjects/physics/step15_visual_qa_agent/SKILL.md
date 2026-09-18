---
name: step15_visual_qa_agent
description: Look at rendered pages and judge visual problems geometry cannot detect — crowding, awkward rag, bad balance, art in the wrong place. Use after step15_visual_qa_agent renders screenshots.
---

# step15_visual_qa_agent — agent

Every other step reasons about numbers it computed. This one **looks at the
page that actually rendered**, which is the only way to catch failures that
live between the model and the browser.

**Input**
- `build/<stem>/artifacts/15_visual_qa.json` → `issues`, `by_kind`
- `build/<stem>/qa/page-NN.png` — rendered pages, **open these**

**Output** → `build/<stem>/review/step15_visual_qa_agent.decisions.json`

```json
{"decisions": [
  {"id": "…", "verdict": "real | acceptable",
   "fix": "step12: the table needs full_width", "why": "…"}
]}
```

Render more pages when you need them:

```bash
python3 pipeline/step15_visual_qa_agent/run.py --shots 7,14,22
```

## What the code already finds

| `kind` | Severity | Meaning |
|---|---|---|
| `overflow` | **hard fail** | the page is clipped — CONTENT IS DELETED |
| `broken_math` | **hard fail** | a `.fr` or `.vec` rendered with no content |
| `orphan_heading` | soft | a heading alone at the foot of a column |
| `tiny_text` | soft | something under 11px — illegible in print |
| `empty_page` | soft | a page with almost nothing on it |

## What only you can find

Open the PNGs and look for:

- **crowding** — technically fits, reads as a wall. Usually too many callouts
  in a row, or a decorator that should not be there.
- **awkward rag** — a Devanagari line broken at a bad point, or a single word
  alone on the last line of a block.
- **visual imbalance** — one column dense, the other airy, on a page where
  both should be full.
- **art in a silly place** — a doodle beside a diagram, a character mid-column.
- **inconsistent accent** — two adjacent sections in the same colour, or a
  section head whose circle and highlighter disagree.
- **broken formulas that still have content** — a fraction whose rule is the
  wrong width, a vector arrow sitting on the wrong glyph.

## Route the fix to the right step

Do not fix things here. Say where the fix belongs:

| Symptom | Step |
|---|---|
| clipped page | `step09` (layout) |
| table overflowing | `step12` |
| big hole mid-document | `step10` |
| decorator in a bad place | `step11` |
| tiny text, wrong colour | `step13` |
| formula rendered wrong | `step06` |
| wrong block type entirely | `step03` |

## Never

- Never sign this step off without opening a screenshot. Geometry passing is
  not the same as the page being good, and that gap is the entire reason this
  step exists.
- Never mark an `overflow` acceptable. There is no version of clipped content
  that is fine.
