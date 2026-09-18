---
name: run_chapter
description: Build a chapter end to end and inspect it the way a human reviewer would before calling it done — every page looked at, every finding fixed at its real source, one rebuild to verify, not one per fix. Use whenever the user names a markdown file and asks to run/build/generate the pipeline for it.
---

# run_chapter — the closed loop

This is the procedure for "run the pipeline for `<file>`." It exists because
running `pipeline/run_all.py` and reporting `scan_render_defects.py: clean`
is NOT the same thing as the chapter being right — this session found real,
serious defects (a matching question rendering as an unpaired list, matrix
figures printing raw Mathpix URLs, sub-legible fraction denominators) that
every mechanical check passed. A human would have seen all three in ten
seconds of looking at the page. This skill is what makes that look happen
every time, without being asked.

**The loop, always in this order:**

```text
PRE-FLIGHT  →  BUILD  →  MECHANICAL VERIFY  →  FULL VISUAL REVIEW
    →  DIAGNOSE + FIX (batched)  →  ONE REBUILD  →  RE-VERIFY CHANGED PAGES
    →  repeat DIAGNOSE→REBUILD at most twice more if new issues appear
    →  REPORT
```

Never skip straight from BUILD to REPORT because the mechanical checks came
back clean. They are a floor, not a ceiling — see "Why mechanical checks are
not enough" below.

---

## 0. Pre-flight — before the pipeline even runs

Cheap, catches the corruptions that make everything downstream noisy:

```bash
python3 -c "
s = open('content/<FILE>.md', encoding='utf-8').read()
print('dollar', s.count('\$'), 'even' if s.count('\$')%2==0 else 'ODD')
print('bold **', s.count('**'), 'even' if s.count('**')%2==0 else 'ODD')
print('[', s.count('['), ']', s.count(']'))
print('begin', s.count(chr(92)+'begin'), 'end', s.count(chr(92)+'end'))
"
```

Any odd count or `[`≠`]` is a real source defect — find and fix it before
building; a build on top of it just produces confusing downstream findings
with the wrong root cause attached.

**Confirm the subject explicitly. Never let it auto-detect.** FORMAT_SPEC
§10 documents why: `book/subjects/detect()` has no signature at all for
`arts`/`economics`, and even physics/chemistry detection has been wrong
before (a physics chapter's 407 unit `\mathrm{}` commands once auto-detected
as chemistry). If the user named a subject, use it. If they didn't, ask —
guessing here corrupts the entire build silently (wrong rubric, wrong
splittable rules, wrong reaction handling) with no error anywhere.

## 1. Build

```bash
VIDYUT_PART1_COLUMNS=1 ~/.pyenv/versions/3.11.11/bin/python3 pipeline/run_all.py \
    --md content/<FILE>.md --stem <STEM> --mode a4 --subject <SUBJECT>
```

`VIDYUT_PART1_COLUMNS=1` is a standing requirement for every build in this
project — never omit it. Pick `<STEM>` to match the existing convention if
this chapter has been built before (check `build/*.html` for a name that
already corresponds to this content); do not invent a fresh stem for a
chapter that already has one, or you fork the chapter into two untracked
copies.

Large chapters (250+ questions) take several minutes, dominated by
`step09_layout_analyzer`'s Chrome-based measurement pass — this is normal,
not a hang. Confirm with `ps` and elapsed time before assuming something is
stuck.

## 2. Mechanical verification — fast, free, run first, always

Three checks, in this order, each catching what the last one cannot:

```bash
python3 tools/scan_render_defects.py build/<STEM>.html
```
Text-level: raw LaTeX that leaked through, unconverted `$`/`$$`, stray
backslashes, literal underscores, devanagari set in the maths face. Twelve
rules, each added because a specific real defect reached a page — see the
rule comments in the tool itself before assuming a finding is a false
positive.

```bash
~/.pyenv/versions/3.11.11/bin/python3 -c "
from book.layout.probe import page_overflow
print(page_overflow('build/<STEM>.html'))
"
```
Did any page get clipped — content silently deleted by `overflow:hidden`.
Must return `[]`.

```bash
~/.pyenv/versions/3.11.11/bin/python3 -c "
from book.qa import visual
for rec in visual.inspect('build/<STEM>.html'):
    print(rec)
"
```
**Do not skip this one — it catches what the other two structurally
cannot.** This renders the page in a real headless browser and measures the
actual DOM: `overflow`, `orphan_heading` (a heading stranded alone at the
bottom of a column), `tiny_text` (anything printing below the legibility
floor, correctly accounting for CSS transform scaling — e.g. a shrunk
cover — and print zoom, which a raw `font-size` read would miss), `empty_page`,
`broken_math` (a `.fr`/`.vec` that rendered with no content), and a
`tofu_sentinel` count (an un-restored private-use sentinel character). This
tool found 7 pages of sub-legible fraction denominators in a chapter that
`scan_render_defects.py` had called completely clean — text-based scanning
cannot see font size, DOM geometry can. Both checks are required; neither
substitutes for the other.

Fix anything these three report before moving to the visual review — no
point spending review time on a page that's still clipped.

## 3. Full visual review — every page, actually looked at

**This is the step that is easy to skip and is the whole point of this
skill.** Screenshot every page and Read each PNG — genuinely look at it, the
way you would flip through a printed book checking for problems, not the
way a linter greps for a pattern.

```python
from book.qa.visual import screenshot
for pg in range(1, <PAGE_COUNT + 1>):
    screenshot('build/<STEM>.html', pg, '<scratch_dir>/p%02d.png' % pg)
```

For a chapter over ~40 pages, screenshotting and Reading every single one in
this same turn is expensive — batch the review across a few passes, or
delegate ranges to parallel Agent-tool subagents (each given the same
checklist below plus the relevant subject's `step07b_answer_beautifier` and
`step15_visual_qa_agent` SKILL.md as grounding), but do not silently drop to
"a representative sample" without saying so — an unchecked page is an
unchecked page, not a validated one.

### What "looks wrong" means — the checklist

Go through each page asking, in a human reviewer's own words:

- **Is any table-shaped content NOT a table?** A matching question, a
  comparison, a before/after — if the same semantic content already appears
  as a proper table ELSEWHERE in this same chapter (a strong signal it's the
  established convention), a flat list version of it is wrong, not just
  less pretty.
- **Is any formula/matrix broken, missing, or printing raw source?** Raw
  `\begin{...}`, a stray `$`, a matrix that's plain digits instead of a
  bracketed grid, a figure reference printing a URL.
- **Is the spacing consistent with the rest of the book?** Not "does this
  page have spacing" — does it match the density and rhythm of every other
  page of the same kind.
- **Is anything crowded or excessively empty?** A page that's 90% white
  space right after a page that's overflowing is a packing problem, not
  content.
- **Are headings sized and positioned consistently?** A heading stranded
  alone at the bottom of a column (orphan), a heading bigger or smaller than
  its siblings elsewhere in the chapter.
- **Does each answer's STRUCTURE match its question type?** A process →
  steps. A comparison → a table. A calculation → given/formula/substitution/
  answer, each on its own line. A definition → short, not artificially
  stretched into steps. If an answer's shape doesn't match what the
  question is actually asking for, that's a real defect even if every line
  of text is individually well-formatted.
- **Would you be comfortable handing this exact page to someone else?** If
  the honest answer is "well, it's technically correct but it looks a bit
  off," that is a finding — write it down. Do not wait for it to be broken
  enough to fail a mechanical check.

Log every finding with its page number and a one-line description before
moving to fixes — reviewing all pages first, then fixing, is what makes
batching possible (see step 4).

## 4. Diagnose and fix — batched, at the real source

For each finding, in this order:

```text
IS this the SAME kind of issue as something already fixed and documented
in a SKILL.md's "Faults fixed here" / regression table for this subject?
    YES → apply the SAME fix pattern already established. Do not
    re-diagnose from scratch or invent a slightly different approach.

IS this a ONE-OFF CONTENT SHAPE — this exact question, written this exact
way, and the SAME chapter already has the correct convention for this
content type elsewhere (a working table, a working options block, etc.)?
    YES → fix the SOURCE MARKDOWN directly, using judgment to normalize
    it to the convention that already works elsewhere in the SAME book.
    Do NOT write a new regex/parser rule for this exact punctuation
    shape. A rule is justified only once you have seen the SAME
    structural shape recur — count it, don't guess it — across enough
    content that a human rewriting it by hand every time would be the
    real cost, not "this looked like the kind of thing that might recur."

IS this a RENDERER or CSS bug that would affect EVERY chapter hitting the
same shape, in ANY subject — not just this one question?
    YES → fix the shared `book/` code. Document the root cause and the
    fix in the relevant SKILL.md's regression table so it becomes
    permanent knowledge, the same way this session's `~`-tilde /
    RE_REPEAT_STARS / subject-detection fixes were documented, not just
    patched silently.

IS the fix ambiguous — could change what the content MEANS, not just how
it looks?
    STOP. Flag it for the user instead of guessing. "Formatting is
    fine" does not extend to changing values, results, or claims.
```

**Collect every fix from the whole review pass before rebuilding.** Editing
`build/<STEM>.html` directly is not the fix — it is thrown away by the next
build. The fix always lands in `content/<FILE>.md` or `book/`; the batching
is what avoids paying a multi-minute rebuild cost per finding instead of
once for the whole pass.

## 5. Rebuild once, re-verify only what changed

```bash
VIDYUT_PART1_COLUMNS=1 ~/.pyenv/versions/3.11.11/bin/python3 pipeline/run_all.py \
    --md content/<FILE>.md --stem <STEM> --mode a4 --subject <SUBJECT>
```

Re-run the three mechanical checks (step 2) on the whole file — cheap, so
run them in full. For the visual review, re-screenshot and re-look at ONLY
the pages that had findings, to confirm each fix actually landed as
intended (not just "the code changed," the RENDERED page).

**Bounded loop.** If the re-check surfaces new issues (a fix introduced a
regression, or exposed a second layer of the same problem), repeat step 4→5
— but at most twice more. If real issues remain after three total
build-and-check cycles, stop and report them plainly rather than continuing
to iterate; a genuinely stuck case needs the user's judgment, not more
silent attempts.

## 6. Report

Tell the user, concretely: what was reviewed (page count, whether it was
exhaustive or sampled and why), what was found (grouped by kind, not one
line per page), what was fixed and where (content vs. shared code, with
file:line for code changes), and anything left open that needs their call.
Screenshots of the specific before/after for anything visually significant
are worth more than a paragraph describing it.

---

## Why mechanical checks are not enough

`scan_render_defects.py` and `page_overflow()` both operate on TEXT or on a
single geometric property. Neither can see: a matching question rendered as
an unpaired list (structurally valid HTML, wrong SHAPE for the content); a
figure card sitting where a URL used to print (the URL is gone, but is the
card itself the right size, in the right place, captioned right?); a page
that is technically un-clipped but crowds its last three lines against the
margin. `book.qa.visual.inspect()` closes some of this gap (real DOM
geometry — see step 2) but still cannot judge whether an answer's STRUCTURE
matches its question, or whether a table's proportions read well. That
judgment is why step 3 exists and is not optional.

## Examples from this session — recognize the shape, not the syntax

**Correct — normalize at the source, no new parser rule.** A history
chapter had the same matching-question TYPE written two different ways:
once as `(a) हड़प्पा – (i) शिल्प उत्पादन` on four separate lines (renders as
an unpaired flat list), once as a proper `| सूची I | सूची II |` pipe table
(renders correctly, because pipe tables already work). The fix is rewriting
the first one to match the second — using judgment to recognize "this is
the same content type, already solved elsewhere in this exact chapter" —
not adding a regex keyed to the exact dash character and bracket style of
the broken version. The next chapter will write it slightly differently
again; the regex would not have survived contact with it.

**Incorrect — the thing this skill exists to stop.** Writing
`RE_MATCH_PAIR = re.compile(r'^\(([a-dA-D])\)\s*(.+?)\s*[–—-]\s*\(([ivx]{1,4})\)\s*(.+)$')`
into `book/readers/markdown.py` to catch this one shape. It only matches
this exact punctuation (this en-dash, these bracket styles, this letter
range) and teaches the parser nothing that generalizes — exactly the
regex-per-shape pattern that has produced dozens of narrow, one-off fixes
in this codebase's history and that the project's own standing instruction
says to stop doing.

**When a parser rule WAS the right call.** The Mathpix-crop-URL figure
dialect (`चित्र N — ![](url)`) recurred 21 times in ONE chapter, in a
completely mechanical, unambiguous shape (Mathpix's own export format,
not an author's free-hand writing) — a real, countable, recurring pattern,
not a one-off. That earned a rule in `book/readers/markdown.py` (documented
in FORMAT_SPEC §9). The difference from the matching-question case: this
shape will reappear byte-for-byte identical in the next Mathpix-sourced
chapter, because a tool generated it, not a person improvising punctuation.

## Never

- Never report a build as done because the mechanical scanner came back
  clean. It is the floor, not the finish line — see above.
- Never write a new regex/parser rule for a shape you have seen exactly
  once. Fix that one instance at the source with judgment; write the rule
  only once the same shape is confirmed to recur.
- Never treat `build/<STEM>.html` as an editable target. Any fix that only
  changes the built file is gone the next time anyone rebuilds — it was
  never actually fixed.
- Never rebuild after every single finding during a review pass. Collect
  the findings, batch the fixes, rebuild once.
- Never loop the diagnose→fix→rebuild cycle unboundedly. Three cycles,
  then report what's left.
- Never skip step 3 (the full visual review) because steps 1 and 2 passed.
  They check different things; passing one says nothing about the other.
