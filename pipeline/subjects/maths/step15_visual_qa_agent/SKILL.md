---
name: step15_visual_qa_agent
description: Scan a maths build for defects the render scanner already catches (LaTeX commands printing their own name, bare backslashes, Devanagari inside the italic maths face), and look at the page for matrix faults geometry cannot see — a shrunk grid, misaligned columns, a bracket the wrong height. Use when matrices look wrong but no step reported an error.
---

# Visual Qa Agent — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step15_visual_qa_agent/SKILL.md` — the hard-fail
> kinds (`overflow`, `broken_math`), the soft ones, and the "route the fix to
> the right step" table all apply unchanged. This file is what the render
> scanner actually found on a maths build, and what still has to be checked
> by eye.

## What the physics rules found on the first maths build — measured, not hypothetical

| rule | first build | after the fix |
|---|---|---|
| `latex_command` | **68** | 0 |
| `bare_backslash` | **681** | 0 |
| `devanagari_in_maths` | 6 | 0 |

The 681 bare-backslash hits were almost entirely the source file's own
`<!-- … -->` production notes printing as visible content (see step16); the
68 `latex_command` hits were the `\frac`/`\sqrt`-inside-matrix-cell bug
covered in full in step06/step07b. Both are the SAME underlying subject
maths-specific rules exist for — the scanner did not need a new rule to
find either, only the fixes needed to land.

`devanagari_in_maths` had to be REFINED specifically for this subject: it
now ignores text already wrapped in `<span class="mt">`. A mixed statement
like `A'A = I ⇒ A लम्बकोणीय` is CORRECT once its Hindi word is set upright
inside the maths run — firing on correct output teaches people to ignore the
rule, which is worse than not having it.

## A real, currently-open gap in the scanner — check this by hand

**Neither `tools/scan_render_defects.py`'s `sentinel` rule nor
`book/validators/latex_check.py`'s `unreopened_sentinel` check covers the
matrix sentinel pair.** The scanner's `sentinel` rule matches a `SENTINELS`
character class that, as currently defined in the tool, is not the full
private-use range the matrix stash uses — a leaked matrix sentinel can pass
the automated scan silently. Until this is closed in the tool itself, check
by hand on every maths build:

```bash
python3 -c "
data = open('build/<stem>.html', encoding='utf-8').read()
print('leaked matrix sentinels:', data.count(chr(0xe040)) + data.count(chr(0xe041)))"
```

A nonzero count means a matrix was stashed and never restored — see step07's
account of the letters-vs-digits sentinel bug for the most common cause.

## What only a screenshot shows, maths-specific

Beyond the physics reference's crowding/rag/balance/accent checks, look
specifically for:

- **a matrix visibly smaller than its neighbours** — the font-shrink that
  was deliberately removed twice (step07/step07b); any occurrence now is a
  regression to report immediately, not a style choice to accept.
- **bracket height wrong for the row count** — a bracket drawn for 2 rows
  next to a 3-row grid's cells is a `.mx > i` stretch failure (step13).
- **a column of numbers not lining up** — missing `tabular-nums` on
  `.mxg > span` (step13); visible only at a glance, invisible in raw HTML.
- **a cell wrapping badly instead of the matrix shrinking** — this is the
  CORRECT behaviour (step07's "sizing" section) and should NOT be flagged;
  know the difference between an accepted wrap and a genuine overflow.

## What to check before signing off

- [ ] `python3 tools/scan_render_defects.py build/<stem>.html` — zero
      `latex_command`, `bare_backslash`.
- [ ] The by-hand matrix-sentinel grep above returns 0.
- [ ] At least one screenshot containing a multi-matrix derivation opened
      and checked for size/alignment consistency, not just clipping.

## Never

- Never sign off on a maths build from the scanner's report alone. Four of
  the defects above — shrunk matrix, wrong bracket height, misaligned
  columns, the sentinel leak — are invisible to it (three are visual-only,
  one is a documented scanner gap). Open the screenshot and run the
  by-hand grep.
- Never mark a wrapped matrix cell as a defect. Wrapping at a word/operator
  boundary is the accepted fix for a wide cell (step07) — flagging it sends
  someone back toward the font-shrink approach that was already tried and
  reverted twice.
