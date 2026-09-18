---
name: step07b_answer_beautifier
description: Judge whether a rendered biology answer READS like a worked answer — a numbered list stays numbered, a genuine calculation gets its own line, a term is bolded once, nothing about the physics fraction/eqno machinery is invoked on prose that has none of that shape. Use when an answer looks like a wall of text or a clean division step is buried mid-sentence.
---

# step07b_answer_beautifier — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step07b_answer_beautifier/SKILL.md` — **read it
> first**; it is the model for this step's shape (named defects, a command
> that proves each one, a source-vs-renderer table, a living regression
> table) and the CODE this step's mechanics run through
> (`book/format/answer.py`, `book/format/inline.py`) is shared, so a fix to
> `is_step()` or `split_steps()` lands for every subject at once.

## What this step is for, in biology specifically

Physics answers are equation chains with prose between them; the beautifier's
job there is mostly `=`-chain splitting and fraction stacking. **Biology's
138 answers are paragraphs of description, almost all of it Devanagari
prose with no maths in it at all** — chapter 1 has 15 `$...$` spans total
(`step06`) and only a handful of lines anywhere that even contain a bare
`=`. So most of physics's machinery — `stack_fracs`, `split_eqno`,
`take_leading_eqno` — has nothing to act on, and `run_on_steps` in the
physics file's sense (a *calculation* run together as one paragraph) is
rare here. What biology's beautifier queue actually has to judge is
narrower and different:

1. Did a genuine short calculation (a chromosome-count division, a ploidy
   sum) get its own line, the way `is_step()` is meant to give it?
2. Did a `(i)/(ii)/(iii)`-labelled definition list survive as a list, or did
   it collapse into one paragraph because `step03` tagged it `para`?
3. Is the term being defined bolded once, so the page is scannable?
4. Nothing invented a fraction box, an eqno, or a सूत्र panel where the
   source has none of those constructs — biology's first build had **zero**
   सूत्र panels; asserting one where the author wrote none is not
   beautification, it is fabrication.

## Start here, always

```bash
python3 tools/scan_render_defects.py build/<stem>.html
```

The scanner already carries six biology-specific rules (`RULES` /
`CODE_RULES` in `tools/scan_render_defects.py`, added after the first
biology build printed all eleven `चित्र-निर्देश` fences, 100 stray
backticks and 14 Hindi-prose maths runs): `fence_leaked`, `stray_backtick`,
`ploidy_split`, `flow_italic`, `devanagari_in_maths`, `chain_as_maths`.
Running it against the current build (`build/bio-01-cols.html`) reports
**clean** — those six defects are fixed and stay fixed as regressions, not
open questions. If you find a NEW biology render fault, add a rule to the
scanner in the same pass you fix it (see physics's step07b file, "the rule
that makes this step worth having") — do not diagnose it by eye every time.

**Three rules the biology comment inside the scanner names as its
motivation are not actually rules there yet**: `long_maths_run`,
`figure_without_art` and `caption_orphan` are described in older docs as
if implemented; they are not present in `tools/scan_render_defects.py`'s
`RULES`/`CODE_RULES` (checked directly — only the six named above exist).
If you need one of these three, write it; do not assume the scanner already
catches it.

## The defects that actually apply here, and how to see each one

### 1 `buried_calculation` — a real division/sum step not given its own line

`book/format/answer.py:54` `is_step()` requires the line to contain `=`, be
under `MAX_STEP_CHARS` (150), and have the text AFTER the first `=` at least
`MIN_MATH_RATIO` (0.72) mathish characters (digits, Latin/Greek, operators,
`()`, whitespace — see `_MATHISH` at `answer.py:34`). This is subject-blind
by design (see *Where a lexicon is allowed*, in the physics file) and it
does correctly catch a biology calculation:

```bash
PYTHONIOENCODING=utf-8 python3 -c "
import sys; sys.path.insert(0,'.')
from book.format.answer import is_step
print(is_step(u'108 ÷ 4 = 27'))"          # -> True: this is a step
```

**But a bold-wrapped result fails the ratio.** `content/bio_01_print_ready.md:723`
and `:1189` both write the result in `**…**`:

```
108 ÷ 4 = **27**
```

```bash
PYTHONIOENCODING=utf-8 python3 -c "
import sys; sys.path.insert(0,'.')
from book.format.answer import is_step
print(is_step(u'108 ÷ 4 = **27**'))"      # -> False
```

The `*` characters are not in `_MATHISH`, so the right-hand side
` **27**` scores 3 mathish characters out of 7 (`0.43 < 0.72`) and the line
is judged prose — it stays glued into its paragraph instead of standing on
its own line as the clean division it is. **This is a real, reproducible
gap in `answer.py`, confirmed against the two actual lines that trip it**
(run the command above against each). It is a code-level fix
(`_MATHISH` would need `*` added, or the ratio measured after bold-marker
stripping), not something this step can patch from the decisions file —
report it with the file:line above; do not silently rewrite the two source
lines to dodge it, the next chapter's bold-wrapped result hits the same gap.

**Correct** — a source line the mechanism already handles right:
`108 ÷ 4 = 27` (no bold) renders as its own line, exactly as intended.

**Edge case — do not "fix" by removing the bold in the markdown.** The bold
is the author's own emphasis on the answer and is legitimate; the fix
belongs in `answer.py`, never in the content.

### 2 `collapsed_definition_list` — an `(i)/(ii)/(iii)` list read as one paragraph

Chapter 1 has 95 lines starting `(i)`/`(ii)`/`(iii)`/`(iv)`, and the current
build's `step03` review queue (18 open items, all at `confidence: 0.3`) is
almost entirely this ambiguity: a line like

```
(ii) बहुभ्रूणता — "सिट्रस जैसे कुछ आवृतबीजियों के बीजों में एक से अधिक
भ्रूण उत्पन्न करने की परिघटना बहुभ्रूणता कहलाती है।" …
```

looks like an `options` choice (`(i)`/`(ii)` is the options marker per
`docs/FORMAT_SPEC.md` §6) but is actually one entry of a labelled
definition list inside an answer — the student was asked to define two of
several terms, and each is its own paragraph under its own roman numeral.

```text
IF a `(i)…`/`(ii)…` line is immediately followed by an em-dash or colon
   and a definition-shaped sentence (a term, then "—" or "कहलाती है" /
   "कहते हैं"), AND the surrounding text is an ANSWER, not a question stem
    THEN it is a definition list entry — tag it `definition` (or `numbered`
    if there is no term to bold), never `options`

IF the same `(i)…`/`(ii)…` shape sits inside a QUESTION stem, offering
   choices to pick from
    THEN it is `options` — see FORMAT_SPEC §6

IF unsure which, read the line BEFORE it: an options block's stem ends in
   a question mark or "है?"; a definition list's lead-in says "किन्हीं दो
   की परिभाषा लिखिए" / "निम्नलिखित को समझाइए" or similar
```

This is `step03`'s classification, not this step's to retag — but it is
this step's business to check that the DOWNSTREAM effect is right: once
correctly tagged `definition`/`numbered`, does the answer actually print as
a list with each item on its own line, or did a decision get written for
`step03` and never propagated? Verify by re-running the build and checking
the item is no longer one run-on paragraph in the PNG.

### 3 `unbolded_term` — the term being defined is not the scannable part

Biology answers name a structure, then describe it (`रेड डाटा बुक (Red
Data Book) वह अभिलेख है जिसे…`). The source already bolds most of these
(`**रेड डाटा बुक**`) — check for the ones that were not, since an unbolded
term in the middle of 138 answers is the one a student skimming for the
right entry will miss.

**Correct**: `**स्तन ग्रंथि** (Mammary gland) मादा स्तनियों की …` — bolded
once, at first mention, then plain.
**Incorrect**: bolding the term every time it recurs in the same answer —
the physics answer style bolds a RESULT once; repeating it past the first
mention reads as shouting, not scanning.
**Edge case**: a definition-list ANSWER inside a `(i)/(ii)` group (defect 2
above) — bold the term inside each numbered entry, not the roman numeral.

### 4 `invented_formula_box` — never fabricate a सूत्र panel

There are zero सूत्र panels in chapter 1 (`book/subjects/biology.py`'s
comment on `splittable`, and confirmed by `step01`'s block-kind report:
0 `formula_card` blocks). If a wall of prose looks like it would read
better boxed, that reads as a genuine problem — **the fix is `step03`
retagging it `definition`/`numbered` with the right emphasis, never
wrapping it in a formula box that asserts a formula the source never
wrote.** A formula box says "memorise this equation"; a biology descriptive
answer is not one.

## Never

- **Never invoke `split_steps`/`is_step` reasoning on a line that has no `=`
  in it.** Biology answers are overwhelmingly prose; treating a sentence
  that merely contains a number as a calculation step is the physics
  failure mode in reverse — it would centre a sentence as if it were
  arithmetic.
- **Never put a biology word in `answer.py`.** The module's whole value is
  that `MAX_STEP_CHARS`/`MIN_MATH_RATIO` are shape-only; `कुल गुणसूत्र = 23
  × 2 = 46` already works today because the rule does not know the word
  "गुणसूत्र". Adding one starts the same regression physics already avoided.
- **Never invent a सूत्र panel, a fraction, or an equation number for
  biology prose.** See defect 4. There is nothing here to number or stack.
- **Never mark `buried_calculation` `by_design` without checking `answer.py`
  first.** The two real instances at `content/bio_01_print_ready.md:723`
  and `:1189` are a genuine converter gap, not a stylistic choice — verify
  with the command in defect 1 before writing a verdict.
- **Never fix defect 2 by rewriting the source's `(i)/(ii)` numbering.**
  The ambiguity is real (the same shape means two different things in a
  question stem vs. an answer) and belongs to `step03`'s tagging rules, not
  to renumbering content that was written correctly.
