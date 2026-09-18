---
name: step16_content_integrity_verifier
description: Judge whether text missing from or duplicated in the final HTML is real content loss or a legitimate rendering difference. Use when step16_content_integrity_verifier reports missing_text or duplicated_text.
---

# step16_content_integrity_verifier — agent

Everything upstream can pass and the book can still be wrong: a block the
packer dropped, an answer under the wrong question, a paragraph rendered
twice. This is the last line, and it compares the **final HTML** against the
**original markdown** — not against the IR, which shares the parser's blind
spots.

**Input**
- `build/<stem>/artifacts/16_integrity.json` → `findings`, `stats`
- `build/<stem>/review/step16_content_integrity_verifier.open.json`

**Output** → `build/<stem>/review/step16_content_integrity_verifier.decisions.json`

```json
{"decisions": [
  {"id": "…", "verdict": "loss | by_design",
   "words": ["…"],
   "why": "the renderer prints this label in Hindi (CALLOUT_LABEL_HI)",
   "fix": "add to TRANSLATED in book/validators/integrity.py | none"}
]}
```

## Why it counts words rather than diffing text

Two earlier designs failed the same way: **the design restructures text**, so
any sequence comparison drowns in false positives.

- fixed word-windows — a window spanning two markdown lines has no
  counterpart in HTML that renders those lines as two elements;
- per-line probes — a heading like `1.7 कूलॉम नियम (Coulomb's Law) · [UP 2022]`
  is legitimately reflowed into three elements, and `n = q/e` becomes a
  stacked fraction whose numerator and denominator live in different spans.

None of that is loss. What **is** loss is a word that occurs in the source
and occurs fewer times on the page. So: count words on both sides, report the
deficit. Immune to reflow, fraction stacking, element boundaries and order —
and it still catches a dropped block, because a dropped block takes all of
its words with it.

## The findings

| `kind` | Severity | Read it as |
|---|---|---|
| `missing_text` | **high** | prose words present in the source and absent from the page. Assume a dropped block until proven otherwise. |
| `reduced_occurrences` | medium | a word appears fewer times — a partial drop |
| `duplicated_text` | medium | a word appears far more often — a block rendered twice |
| `notation_retokenised` | info | maths fragments split across spans by the renderer. **Expected**, not loss. |

## Categories you will legitimately see

These are already declared in `book/validators/integrity.py`. If you find a
new one, add it there rather than waving it through:

- **`TRANSLATED`** — the renderer prints callout labels in Hindi while the
  source writes most in Hinglish. That swap shows as simultaneous loss *and*
  duplication; both halves are by design.
- **`SCAFFOLD`** — `FIGURE`, `ref`, `png`, `source_figures` and friends are
  markup, not content.
- **`_LATEX_CMD`** — `\varepsilon` vanishing means the converter *worked*.
- **`_SUBSCRIPTED`** — `f_1` correctly stops existing once it renders as
  `f<sub>1</sub>`.

## When it is real loss

Find where the word lives:

```bash
grep -n '<word>' content/<name>_reader_edition.md
grep -c  '<word>' build/<stem>.html
```

Then work back: is the block in `01_read.json`? in `08_assigned.json`? Did
the packer place it? The artifact chain exists precisely so you can bisect
this in four commands instead of guessing.

## Never

- Never widen `TRANSLATED` or `SCAFFOLD` to make a number look better. Every
  entry is a claim about the design, and a wrong entry blinds the check
  permanently.
- Never accept a `missing_text` finding without locating the words. A physics
  book that quietly drops a paragraph is the exact failure this whole
  pipeline is built to prevent.
