---
name: step03_content_tagger
description: Decide the true semantic kind of blocks the deterministic tagger could not confidently classify. Use when step03_content_tagger reports uncertain_tag items.
---

> **Read `docs/FORMAT_SPEC.md` first.** It is the complete list of constructs
> the pipeline understands and exactly what each one becomes on the page,
> derived by diffing two real chapters against the finalised reference. Every
> answer you give here has to be consistent with it — and if a chapter uses a
> convention the spec does not cover, say so: the fix is to add it to the spec
> and the reader, never to contort the content.


# step03_content_tagger — agent

The tagger maps text to one of the 27 kinds in `book/core/ir.py`. Pattern
rules in `book/taggers/classify.py` handle the overwhelming majority. This
queue is what they were not sure about.

**Input**
- `build/<stem>/artifacts/03_tagged.json`
- `build/<stem>/review/step03_content_tagger.open.json` — each item carries
  `text`, the `current` tag (always `para`), and *why* it looked suspicious

**Output** → `build/<stem>/review/step03_content_tagger.decisions.json`

```json
{"decisions": [
  {"id": "…", "kind": "formula", "why": "an equation, not prose"},
  {"id": "…", "kind": "callout", "ctype": "trap", "why": "a board-trap note"},
  {"id": "…", "kind": "para", "why": "correct as-is"}
]}
```

`kind` **must** be one of `ir.KINDS`. `ctype` is required when `kind` is
`callout`, and must be one of `ir.CALLOUT_TYPES`:
`mark · trap · write · save · line · link · rep · conf`.

## The distinctions that actually get confused

| If the text… | it is | not |
|---|---|---|
| is short, symbol-heavy, mostly Latin/Greek | `formula` | `para` |
| is a Hindi sentence that happens to contain `=` | `para` | `formula` |
| begins `(i)` / `(a)` and siblings follow | `options` | `para` |
| begins `**<term>:**` and defines it | `definition` | `para` |
| is a boxed *result* the student should memorise | `formula_box` | `formula` |
| is advice about how to answer | `callout` | `para` |
| points at another question | `callout` + `ctype: link` | `srcnote` |
| says where the content came from | `srcnote` | `callout` |
| is a cross-reference to a similar question | `simchip` | `callout` |

**Getting `ctype` right matters more than it looks.** The type drives both
the colour *and* the icon — `book/components/callout.py` deliberately takes
the icon from the type and ignores whatever emoji the markdown used, because
the source writes one family with three different glyphs. A wrong `ctype`
puts a "board trap" in the green cross-reference box.

## Two dialects, one file

Part 1 of a chapter typically uses the older Hindi markers
(`⚠️ मत भूलो`, `🔢 आंकिक`, `💡 टिप`, `✏️ व्याख्या`); Part 2 uses the Hinglish
set (`⚠ Board ka jaal`, `🎯 Yahan 1 mark bachta hai`, `🔗 Ye wahi question hai`).
Both are legal and both normalise to the same eight families. Judge by what
the sentence *does*, not by which dialect it is written in.

## Never

- Never invent a kind. If nothing fits, say so and propose the new kind with
  its rendering — adding a kind means adding it to `ir.KINDS`,
  `format/rules.py` and `format/assignment.py` together.
- Never retag something just because it would look nicer. Tags are semantic;
  appearance is `step07`'s decision.
