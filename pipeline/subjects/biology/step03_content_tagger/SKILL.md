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

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**The element catalogue grew.** New ids you may route a block to:
`revision-flow` (Part 1's whole skin), `formula-list` (the bulleted सूत्र
panel), `trio` fact strips, `paper-refs`, `topic-frequency`,
`display-math` (`.eqline`/`.math-result`), `zz-reference-parity`.

**Three old shapes no longer exist and must never be chosen:**

- `.poflat` — a flat, boxless callout. The reference has none; **every**
  callout is the bordered `.po` box, in Part 1 as well as Part 2.
- `.qsep` between consecutive questions — the rule is `.qhead`'s own
  `border-top` now. `qsep` remains only where the SOURCE writes `---`.
- `.examchip` — the exam stamp is `.topic-frequency`.

Part 1 and Part 2 are different designs, not one design with different
content, so the same IR kind can legitimately want a different element in
each half — see §1 of the shared doc.

## Worked examples — answer presentation

Taken from `build/REFERENCE_chapter-02.html`. These are the shapes to
judge against — not a style you may vary.

### A short question: the stem is a HEADING

```markdown
**प्र. 3**  `[1 अंक · 2023 · Set A]`

वैद्युत विभव का मात्रक है
(a) जूल/कूलॉम  (b) जूल × कूलॉम  (c) कूलॉम/जूल  (d) न्यूटन/कूलॉम

**उत्तर:** (a) जूल/कूलॉम
```

```html
<div class="qhead" id="q-3"><span class="qnum"><i></i><b>प्र. 3</b></span>
  <span class="qmarks">1 अंक</span>
  <div class="question-meta"><span class="paper-refs">
    <span class="paper-ref">2023/set_a</span></span></div></div>
<div class="subhead"><b>वैद्युत विभव का मात्रक है</b></div>
<div class="opts">…</div>
<div class="ansrow"><span class="anslabel"><i></i><b>उत्तर:</b></span>
  <div class="anstext">(a) जूल/कूलॉम</div></div>
```

A stem this short is a **`.subhead`** — blue, 20px, bold. Measured on the
reference: its `.subhead` stems run to a median of 25 characters, its
bold-body stems to a median of 108. Set as ordinary body text a one-line
stem disappears into the options beneath it.

### A long question: the stem is BOLD BODY TEXT

A stem past ~46 characters stays a paragraph and is wrapped in `<b>`:
`<p class="q"><b>दो बिन्दु आवेशों को वायु में … होगा</b></p>`. **All 79**
of the reference's question stems are emphasised one way or the other;
none is plain. A stem at the same weight as the answer under it makes a
question and its answer read as one undifferentiated block.

### A long answer: sectioned, not a wall

```markdown
**उत्तर:**

**परावैद्युत ध्रुवण**
परावैद्युत पदार्थों में इलेक्ट्रॉन नाभिक से दृढ़तापूर्वक बँधे रहते हैं। …

**वैद्युत संधारित्र**
संधारित्र एक ऐसा समायोजन है, जिसमें … संचित की जा सकती है।
```

```html
<div class="subhead"><b>उत्तर:</b></div>
<div class="subhead"><b>परावैद्युत ध्रुवण</b></div>
<p class="q">परावैद्युत पदार्थों में …</p>
<div class="subhead"><b>वैद्युत संधारित्र</b></div>
<p class="q">संधारित्र एक ऐसा समायोजन है …</p>
```

Two rules, both load-bearing:

1. **A bare `**उत्तर:**` opens a long answer as a `.subhead`, not as the
   green pill.** The pill is an INLINE label — it works because the
   answer's first line sits beside it. Alone on a row it reads as an
   answer that has gone missing.
2. **A standalone bold line inside an answer is a section heading.** The
   author already marked where the breaks go; honour them. Run together
   into the prose (`<b>धारिता</b> धारिता (Capacitance) …`) a
   five-paragraph answer becomes one wall of text, which is the single
   biggest difference between a rebuilt page and the reference's.

A lead-in with a trailing colon (`**सूत्र:**`) is **not** a heading — the
rubric claims it long before this.

### A derivation inside an answer

```html
<div class="dm">
  <div class="eqline"><span class="math-line">E = <span class="fr">…</span></span></div>
  <div class="eqline"><span class="math-line">= <span class="math-result">…</span></span></div>
</div>
<div class="eq-tail"><span class="qmarks">2 अंक</span></div>
```

One `.eqline` per step. `…(i)` rides **inside** the last line as a `.k`
run; only the marks chip becomes a separate `.eq-tail` row. The final
answer is boxed **only** where the source wrote `\boxed{…}` — never
guessed from position. `.dm` carries no left hairline and no left padding.

### Biology

Biology has no सूत्र panels at all, so its long answers are prose and
TABLES — which is why tables are splittable here and not in physics. The
sectioning heading above matters more here than anywhere: a labelled-diagram
or process answer runs to many paragraphs.

A `→` is a PROCESS STAGE, not a reaction arrow. A chain past four stages or
~62 characters is set vertically, so every arrow points at the stage below
it rather than off the end of a wrapped line. The bracketed technical term
— `(Sporopollenin)`, `(exine)` — is what carries the weight in an answer;
the author's blanket `**bold**` does not.
