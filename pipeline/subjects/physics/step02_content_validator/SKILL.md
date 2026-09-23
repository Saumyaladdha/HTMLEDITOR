---
name: step02_content_validator
description: Judge whether a count mismatch between the markdown and the IR is real content loss or a legitimate modelling difference. Use when step02_content_validator reports a count_mismatch finding.
---

# step02_content_validator — agent

**The failure this step exists to catch is SILENT LOSS.** A block the reader
did not recognise does not appear on the page and nothing errors anywhere.
The book just quietly has fewer questions in it.

The code counts what the SOURCE contains using grep-level rules that share no
code with the parser, and compares. Two independent implementations
disagreeing is the whole point — a shared helper would agree with itself.

**Input**
- `build/<stem>/artifacts/02_validated.json` → `_validation.stats.source` vs `.parsed`
- `build/<stem>/review/step02_content_validator.open.json`

**Output** → `build/<stem>/review/step02_content_validator.decisions.json`

```json
{"decisions": [
  {"id": "…", "verdict": "loss | by_design",
   "element": "question",
   "why": "…",
   "fix": "book/readers/markdown.py: … | content/…md:412 | none needed"}
]}
```

## How to decide

Go and look. For every mismatched element, find the specific instances.

```bash
grep -n '^\*\*प्र' content/<name>.md | wc -l
python3 -c "import json;d=json.load(open('build/<stem>/artifacts/02_validated.json'));
print(sum(1 for p in d['parts'] for c in p['children']
          for q in (c.get('children') or []) if q['kind']=='question'))"
```

Then diff the two lists and name the missing ones. "Roughly right" is not an
answer — the point of this step is an exact reconciliation.

**parsed < source** is almost always real loss and is `high` severity. Treat
it as a bug until you have shown otherwise.

**parsed > source** means something is being split or duplicated. Usually the
source rule is too loose (counting a line twice), occasionally the parser is
emitting a block twice.

**by_design** is legitimate but rare. Example: a source line carrying two
figures in one marker becomes two `figure` nodes. If you use it, say exactly
which construct causes it, and add the tolerance to `SOURCE_RULES` in
`book/validators/content.py` so it stops recurring.

## Never

- Never widen a tolerance to make a finding go away. The tolerance is a
  statement about the content model, not a way to silence the check.
- Never accept "the totals are close". The old pipeline's height estimates
  were within 4% overall and 100% wrong per block. Aggregates hide exactly
  the failures this step is looking for.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**Count the new constructs independently.** The whole point of this step is
that it shares no code with the parser, so add a counter for anything the
reader learned: `**त्रिक:**` lines, `· **N सवाल आए …**` heading trailers,
`\boxed{…}` markers, and the three field kinds inside a `` `[…]` ``
question tag (marks / year+Set / note).

A tag naming several papers is **one** tag: `1 अंक · 2025 · Set H · 2023 ·
Set A` is two papers, not four facts. Counting `·` rather than parsing will
disagree with the reader for the right reason and the wrong one at once.
