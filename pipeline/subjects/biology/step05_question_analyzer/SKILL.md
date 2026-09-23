---
name: step05_question_analyzer
description: Judge flagged biology questions — above all no_marks chips, since biology's front-matter frequency tags pack a count AND a marks list into one chip and are 5x denser than physics's. Use when step05 reports problems on a biology chapter.
---

# Question Analyzer — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step05_question_analyzer/SKILL.md` — **read it
> first** for the five problem kinds and the general triage table
> (`content` vs. `parser`). The CODE the step runs is shared — one
> `pipeline/step05_question_analyzer/run.py` for both subjects.

## What this step is for

Reading the question bank: marks, years, how often each topic is asked.

## Biology differences, measured

| | physics ch.4 | biology ch.1 |
|---|---|---|
| `अथवा` (alternate-question marker) | 43 | 1 |
| `[n अंक]` marks tags | 12 | 60 |
| questions / answers | — | 138 / 138 |

- **`अथवा` is almost absent** (1 occurrence). A parser expecting
  alternate-question pairs will correctly find almost nothing to pair —
  that is right, not a miss. Do not flag a chapter with near-zero `अथवा` as
  under-parsed on that basis alone.
- **Marks tags are far denser and combine two facts in one chip**:
  `**[21 बार · 5, 3, 2, 1 अंक]**` is a frequency count (asked 21 times)
  AND a marks list (has appeared worth 5, 3, 2 or 1 marks) in ONE tag —
  ten of these in chapter 1's front matter alone. A parser tuned only for
  physics's simple `[n अंक]` chip will see the `बार` count and the marks
  list as one unparsable blob.
- **`★★`/`★★★`** mark a question asked in two, or three-or-more, papers —
  declared in the chapter's own front matter legend. Carry the meaning
  through as-is; do not invent a different badge scheme.

## Decision tree — the current live queue's `no_marks` finding

The current build's `step05` queue has **5 open items, all `no_marks`**
(`chip has no parsable marks; the marks band will not open`).

```text
FOR EACH `no_marks` finding:

  Open the source at the reported location and read the chip.

  IS it a genuinely malformed `[… अंक …]` chip — e.g. a typo, a missing
  digit, an inconsistent separator?
      THEN verdict `content` — fix the markdown chip; this is the common
      case (per the physics file's table)

  IS it one of biology's COMBINED frequency+marks chips
  (`[21 बार · 5, 3, 2, 1 अंक]`) where the parser's marks regex expects a
  SINGLE number, not a comma-separated list?
      THEN verdict `parser` — the physics-shaped marks extractor does not
      know biology's list-of-marks shape; the fix is widening the marks
      regex in book/readers/markdown.py (or wherever _CHIP is parsed) to
      accept a comma-separated list, NOT rewriting ten front-matter chips
      to a single-number shape they were never meant to have

  IS the chip a BOOK question tag (`[3 अंक · पुस्तक]`, FORMAT_SPEC §6)
  with no board year attached?
      THEN it should still parse its marks value fine — a `no_marks` here
      is more likely a genuine chip typo (verdict `content`)
```

**Correct** — `[2 अंक · UP 2023]` parses cleanly, one number, one verdict:
no finding.
**Incorrect (the real failure mode here)** — `[21 बार · 5, 3, 2, 1 अंक]`
reaching this step as `no_marks` because the extractor split on the first
comma and choked, when the intent is "this topic has appeared worth 5, or
3, or 2, or 1 marks across 21 sittings" — a real finding, verdict `parser`.
**Edge case** — a chip missing the marks number ENTIRELY (`[· UP 2024]`),
which is a genuine content typo — verdict `content`, and point at the exact
source line.

## How to check one

```bash
python3 -c "
import json;d=json.load(open('build/<stem>/artifacts/05_questions.json'))
for r in d['_questions']['records']:
    if r['id']=='<id>': print(json.dumps(r,ensure_ascii=False,indent=1))"
```

Then open the markdown at that location and read the actual chip text —
the record tells you what the parser saw; only the source tells you
whether it was written wrong or read wrong.

## What to check before closing this step

- [ ] Every `no_marks` finding's decision states which of the two causes
      (content typo vs. parser gap on the frequency+marks combined chip)
      it is, and names the exact chip text.
- [ ] 138 questions still have 138 answers after any content fix — a
      biology answer is prose and cannot be re-derived if a fix
      accidentally drops one.
- [ ] `marks_unsorted` is genuinely absent, not just unflagged — biology's
      marks-band synthesis is identical to physics's and unsorted marks
      inside a group will make the yellow bands thrash the same way.

## Never

- Never mark a `no_answer` acceptable without reading the question — a
  biology answer is prose; there is no equation to fall back on to imply
  the answer, unlike a physics numeric that a reader could rederive.
- Never "fix" a combined frequency+marks chip by splitting it into two
  separate tags in the source. It is ONE fact written compactly by design;
  the fix belongs in the parser, per the decision tree above.
- Never treat biology's near-absence of `अथवा` as evidence of parser
  failure. A near-zero count that matches the source is correct, not a bug.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**The question tag is three kinds of fact, not one chip.** `split_qtag` in
`book/components/question.py` is the parser; §3 of the shared doc is the
grammar. Marks become `.qmarks`; each year (+ optional `Set A/C`) becomes
one `.paper-ref` in a gold `.paper-refs` band; anything else is an
`.inline-tag`. A year with no `Set` is itself one reference.

When judging a question's marks, read the **first** field only — a tag may
carry several years, and a four-digit number in it is a paper, not a score.

Every `.qhead` now carries `id="q-N"`, so a cross-reference in prose
(`पूरा निगमन ☞ प्र. 73`) has a real anchor to reach.

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
