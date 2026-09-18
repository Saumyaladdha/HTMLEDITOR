---
name: step07_formatting_agent
description: Decide how a semantic kind should be set — atomic, density, accent, emphasis — when it has no formatting rule. Use when step07_formatting_agent reports unknown kinds.
---

# step07_formatting_agent — agent

Formatting is decided from the **semantic tag**, never from what the text
looks like. `book/format/rules.py` holds the whole mapping as a table, so
changing how definitions are set, or making bullets tighter, is a one-line
edit rather than a hunt through the renderer.

This queue is a kind with no rule. It is currently falling back to `DEFAULT`,
which renders as a plain paragraph.

**Input**
- `build/<stem>/artifacts/07_formatted.json` → every node carries `fmt`
- `build/<stem>/review/step07_formatting_agent.open.json`

**Output** → `build/<stem>/review/step07_formatting_agent.decisions.json`

```json
{"decisions": [
  {"id": "…", "kind": "worked_example",
   "atomic": true, "density": 1.1, "accent": false, "emphasis": "strong",
   "why": "a worked example must not split across a column"}
]}
```

Then **add it to `book/format/rules.py`** — the decisions file keeps this
build correct; the table keeps every future build correct.

## The four attributes

| | Meaning | Get it wrong and… |
|---|---|---|
| `atomic` | may this block split across a column/page boundary? | a boxed formula gets cut in half, or a long answer refuses to break and leaves a dead column |
| `density` | vertical room relative to body text (0.8–1.2) | the block crowds its neighbours or floats in space |
| `accent` | does it take the section's accent colour? | the page stops reading as one system |
| `emphasis` | `normal` / `strong` / `quiet` | a source note shouts louder than the answer |

## How to choose `atomic`

Ask: *if a reader saw only the top half of this, would it still make sense?*

- A bullet list, a paragraph, an options grid — **not** atomic. Splitting is
  fine and the reference book does it constantly.
- A boxed result, a callout, a sticky note, a table, a figure — **atomic**.
  Half a box is not a box.
- A whole question — **not** atomic. Insisting a question stay whole is what
  produces half-empty columns; only its *head* must not be orphaned.

## How to choose `accent`

`accent: true` means the block takes the colour of the section it lives in —
the same colour as that section's number circle and highlighter. Use it for
things that *belong to* a section (bullets, section heads). Do not use it for
things with their own semantic colour (callouts, answer tags): a `po-trap`
is amber because it is a trap, not because of which section it is in.

## Never

- Never set formatting from what a block looks like. If two blocks need to
  look different, they are different *kinds* — go back to `step03`.
- Never write the decision only into the decisions file. Without the table
  entry, the next chapter hits the same gap.
