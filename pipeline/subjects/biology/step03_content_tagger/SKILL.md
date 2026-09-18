---
name: step03_content_tagger
description: Decide the true semantic kind of biology blocks the deterministic tagger could not classify — above all a roman-numeral (i)/(ii) line that could be an options choice or one entry of a labelled definition list. Use when step03 reports uncertain_tag items on a biology chapter.
---

# Content Tagger — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step03_content_tagger/SKILL.md`, and the CODE
> the step runs is shared — one `pipeline/step03_content_tagger/run.py` for
> both subjects, so a fix lands once. **Read the physics file first** for
> the full kind list, the `ctype` contract, and the general
> confuse-with/not table; this file only adds biology's own confusions.

## What this step is for

Labelling each block with what it IS, so later steps can present it right.

## Biology's rubric — what the code actually does with it

Physics asks for a formula and what is given; biology asks what to
identify, in what order it happens, how it is built, and what relates to
what. `book/subjects/biology.py`'s `rubric` dict maps the lead-in label to
an intended kind:

| label | count in ch.1 | mapped to | **what markdown.py actually does with it** |
|---|---|---|---|
| `क्रम` | 7 | `flow` | Handled: `book/readers/markdown.py:1371` checks `rubric[term]=="flow"` and emits a real `flow` node — see step01. |
| `संबंध` | 1 | `flow` | Same branch, same handling. |
| `पहचान` | 8 | `identify` | **Not handled.** No branch in `markdown.py` checks for `"identify"`, `"identify"` is not in `book/core/ir.KINDS`, and `book/format/assignment.py`'s `MAP` has no `"identify"` entry either. The line falls through to the generic `node("definition", term=term, text=rest)` at `markdown.py:1402`. |
| `संरचना` | 4 | `structure` | **Also falls through to `definition`.** `"structure"` DOES exist in `ir.KINDS` (line ~39) but it means something unrelated — a chemistry organic-molecule grid (`atoms[]`, `bonds[]`, `branches[]`, drawn by `book/format/structure.py`). Nothing in `markdown.py` ever checks `rubric[term]=="structure"`, so biology's संरचना lines never reach that kind; they render as an ordinary `definition` too. |

**Practical consequence: as the code stands today, `पहचान:` and
`संरचना:` lines are tagged and render exactly like any other
`**label:** text` definition** — a left-rule strip with the term bold. That
is a reasonable default and nothing is lost, but do not describe these as
"their own component the way सूत्र is in physics" when deciding a queue
item; they are not, yet. If you want them to look different from a bare
definition (denser spacing for क्रम-adjacent identify lists, say), that is
a `step07`/`rules.py` change plus a new `markdown.py` branch, not something
this step can produce from a decision alone.

Everything else on a `**label:**` line is free-form — a term being defined
— and stays `definition`. Do not build a vocabulary for those; chapter 1
alone has seventeen distinct ones, most appearing once.

## Decision tree — the confusion that actually recurs: `(i)`/`(ii)` lines

The current build's `step03` queue (18 open items, every one at
`confidence: 0.3`) is almost entirely one shape: a line beginning
`(i)`/`(ii)`/`(iii)`/`(iv)` inside an ANSWER, where the deterministic tagger
cannot tell a `options` choice from one entry of a labelled definition list.
Chapter 1 has 95 such lines total.

```text
IF the `(i)…` line sits inside a QUESTION stem and offers something to
   choose between
    THEN it is `options` (FORMAT_SPEC §6)

IF the `(i)…` line sits inside an ANSWER, names a term, then an em-dash or
   colon, then a defining sentence — "(ii) बहुभ्रूणता — \"सिट्रस जैसे …\""
    THEN it is one entry of a definition list — tag `definition` if it
    stands alone, `numbered` if several such entries are meant to read as
    one ordered list

IF unsure which: read the line immediately BEFORE the group.
    A stem ending "…है?" or offering a choice → `options`.
    A lead-in reading "किन्हीं दो की परिभाषा लिखिए" / "निम्नलिखित को
    समझाइए" or similar → definition list, not options.
```

**Correct** — `queue item bdbcf634c667` from the live build: `(ii)
बहुभ्रूणता — "सिट्रस जैसे कुछ आवृतबीजियों के बीजों में एक से अधिक भ्रूण
उत्पन्न करने की परिघटना बहुभ्रूणता कहलाती है।"` sits in an answer whose
preceding line is `जल परागण में परागकण … लिख दो, और बहुभ्रूणता की परिभाषा
एक पंक्ति में` (asking for a definition) → tag `definition`, term
`बहुभ्रूणता`.
**Incorrect** — tagging the same line `options`: it would render as a
two-column choice grid (`.opts`) with nothing to choose between, and the
grid layout would visibly waste half the column.
**Edge case** — `queue item 8201c9292db8`: `(D) टेपिटम — …` inside an
ANSWER whose `before` field is literally `"answer"` (i.e. it is the first
line of the answer body, a lettered option being explained, not defined
from scratch) — here the roman/lettered marker is doing double duty as
BOTH the original question's option letter AND the answer's per-option
explanation. Tag it `definition` (it explains, it does not offer a choice)
but keep the `(D)` marker in the text — dropping it loses which option of
the original question this explanation is for.

## Callout density

Biology is callout-heavy: **214** in chapter 1, against physics chapter
4's 108, in a chapter with roughly 40% fewer total blocks (932 vs. 1538).
Most are `⚠️` traps. Expect this density; it is not a tagging error.

## Two dialects, one file

Part 1 uses older Hindi markers (`⚠️ मत भूलो`, `💡 टिप`); Part 2 uses
Hinglish (`⚠ Board ka jaal`, `🎯 Yahan 1 mark bachta hai`). Both normalise to
the same eight `ctype` families (FORMAT_SPEC §4) — judge by what the
sentence *does*, never by which dialect it is written in.

## What to check before closing this step's queue

- [ ] Every `(i)`/`(ii)`-prefixed decision states, in `why`, which line
      immediately before it justified the call — "stem ends in a question"
      or "lead-in asks for a definition." A decision without that
      justification is a guess, and the next chapter's ambiguous line will
      get a different, inconsistent answer.
- [ ] `ctype` is set for every `callout` decision, and is one of the eight
      families — an unset `ctype` on a callout puts the wrong icon and
      colour on the page (`book/components/callout.py` takes both from
      `ctype`, never from the source emoji).
- [ ] No decision retags a block purely to make it "look nicer" — that is
      `step07`'s job, not this step's.

## Never

- Never invent a kind. If a rubric target like `identify` genuinely needs
  its own presentation, propose it explicitly (new `ir.KINDS` entry, a
  `markdown.py` branch, a `rules.py`/`assignment.py` row) — do not tag a
  block `identify` today; nothing downstream knows what that means and the
  block will render through `DEFAULT`/fall through unpredictably.
- Never retag a block for appearance. Tags are semantic; appearance is
  `step07`'s decision, made from the tag `step03` assigns.
- Never resolve the `(i)/(ii)` ambiguity by rewriting the source's
  numbering. The shape is genuinely ambiguous without reading the line
  before it — that is a tagging judgement call, not a source defect.
