---
name: step05_question_analyzer
description: Judge flagged questions — missing answers, unparsed marks, swallowed options, unsorted marks. Use when step05_question_analyzer reports problems.
---

# step05_question_analyzer — agent

The parser finds question *heads*. This step works out what each question
actually **is**: its parts, its marks, its options, its answer, and how the
questions in a group relate. Then it flags what looks wrong.

**Input**
- `build/<stem>/artifacts/05_questions.json` → `_questions.records / .groups / .problems`
- `build/<stem>/review/step05_question_analyzer.open.json`

**Output** → `build/<stem>/review/step05_question_analyzer.decisions.json`

```json
{"decisions": [
  {"id": "…", "verdict": "content | parser",
   "fix": "content/…md:1204 — add **उत्तर:** | book/readers/markdown.py:RE_OPT_TOKEN",
   "why": "…"}
]}
```

## The five problems, and what each usually means

| `kind` | What it means | Usually |
|---|---|---|
| `no_answer` | no `**उत्तर:**` block | **content** — the question really has no answer written |
| `no_marks` | the chip has no parsable marks | **content** — a malformed `[… अंक · …]` chip |
| `thin_options` | fewer than 2 options parsed | **parser** — the splitter ate the stem or the first option |
| `empty` | a question head with no body | **content** — a stray `**प्र. N**` |
| `marks_unsorted` | marks descend inside a group | **content** — reorder the questions |

`thin_options` deserves particular suspicion. Anchoring the option splitter
on `^` once dropped option **(i)** of every question in the book while the
answer key still said "(iii)" — visible only if you counted.

`marks_unsorted` is not cosmetic. The yellow **1 अंक / 3 अंक** bands are
*synthesised* wherever the marks value changes, so unsorted questions make
the bands repeat and the page stops making sense. Sort the source.

## How to check one

```bash
python3 -c "
import json;d=json.load(open('build/<stem>/artifacts/05_questions.json'))
for r in d['_questions']['records']:
    if r['id']=='<id>': print(json.dumps(r,ensure_ascii=False,indent=1))"
```

Then open the markdown at that question and read it. The record tells you
what the parser saw; only the source tells you what is true.

## Never

- Never mark a `no_answer` as acceptable without reading the question. A
  physics book that ships a question with no answer is a defect, not a style.
- Never "fix" `thin_options` by rewriting the source into a shape the parser
  happens to like. If the source follows the convention, the parser is wrong.
