---
name: step05_question_analyzer
description: Judge flagged chemistry questions — half marks, multi-paper chips, an MCQ options block that is really a numbered reaction/answer part, and product labels (A)/(B) misread as options. Use when step05 reports thin_options, no_marks or marks_unsorted on a chemistry chapter.
---

# Question Analyzer — CHEMISTRY

> Read `pipeline/subjects/physics/step05_question_analyzer/SKILL.md` first —
> the five `kind`s (`no_answer`, `no_marks`, `thin_options`, `empty`,
> `marks_unsorted`) and their usual verdicts apply unchanged. This file is
> chemistry's deltas.

## Marks and repeats

Chemistry writes half marks two ways — `[1/2]` and `[1 ½ अंक]` — and the
chip in three different field orders: `[1 अंक · 2026/set_a_ea · 347(EA)]`,
`[2026 · 1 अंक]`, `[2022 · 3 अंक | 2023 · 4 अंक | 2024 · 5 अंक]`. One chip
can name three papers with three different marks values for the *same*
question — that is a legitimate repeat, and it is the single most valuable
thing on the cover analytics page, not a formatting quirk to normalise away.

`inline.strip_trailing_marks` is the one place that knows every marks
spelling. **Do not add a second parser for it** — that specific mistake has
been made five times across this codebase's history; a marks chip fixed in
one place and not the other silently disagrees with itself on the next
build.

## `thin_options` on a chemistry MCQ — check WHY before assuming a parser bug

The physics SKILL says `thin_options` is usually the parser's fault. In
chemistry there is a THIRD real cause specific to this subject: an
`(i)…(ii)…(iii)…` run that is a **numbered answer part**, not an MCQ options
grid, being misread the other way around — or vice versa.

```text
IF the block has 2-4 short items (< 44 chars), no reaction arrow, and reads
   as alternatives to CHOOSE BETWEEN
    THEN it is a genuine `options` block — `thin_options` here usually
    means the splitter really did eat a marker; check `opt_tokens`
    (markdown.py:331) against the source

IF the block has exactly ONE item, and that item is LONG (> 62 chars) OR
   contains a reaction arrow (→ ⟶ ⇌ or \xrightarrow/\longrightarrow)
    THEN this is NOT options — it is an answer part that happens to open
    with "(ii)". markdown.py:961-965 already special-cases this and emits
    a `para` instead; if you still see it tagged `options` with one item,
    that guard did not fire — check the item's length/arrow test directly

IF the block's `(A)`/`(B)` markers sit INSIDE a `$...$`/backtick span
    THEN they are reaction-product labels, not options at all — see step01
    and step03. A `thin_options` finding here means the block should never
    have been routed to the options parser in the first place.
```

**Correct example:** `(i) चुम्बकीय गुण … प्रश्न 5 (ii) देखें।` — one long
item citing another question — correctly becomes one `para`, not a
`thin_options` finding.

**Incorrect (what a wrong fix looks like):** padding the source with extra
short alternatives to make a genuine one-item reaction answer "look like" a
proper options block. The item IS one answer part; the fix (if any) is
upstream in how the block was routed, never in rewriting the content to fit
the wrong shape.

## `no_answer` and reaction-only answers

An answer whose entire text is one reaction (`CH₃Br + KOH → CH₃OH + KBr`,
nothing else) is a real, complete answer — do not flag it `no_answer` because
it "looks short". Chemistry's `promote_reactions` pass specifically preserves
the `उत्तर` badge even when the reaction is all the answer has (see
`book/readers/markdown.py:2788-2796`'s `emitted_answer` handling) — if you
see an answer badge missing next to a reaction-only answer, that is a real
`step07b` finding (a regression in that guarantee), not a `no_answer` case
here.

## Never

- Never treat a `(A)`/`(B)` product-label collision as a `thin_options`
  parser bug to route around by rewriting the source's letters. The fix is
  recognising the maths-span boundary, and it already exists — verify it
  actually fired before assuming it is broken.
- Never mark a reaction-only answer `no_answer` for being short. A correct
  one-line chemical equation is a complete answer to "पूर्ण कीजिए".
- Never add a second marks-chip parser. `inline.strip_trailing_marks` is the
  only place that may know a marks spelling.

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

### Chemistry

A REACTION is not a line of text: both sides of the arrow must stay one
object, or the line breaker splits a species mid-formula and drifts a
product away from the arrow that made it. Element symbols are set UPRIGHT
(`.subj-chemistry .m { font-style:normal }`) — a slanted `SOCl₂` is wrong.

A `**उपयोग:**`/`**अभिकर्मक:**` panel is a LIST, not formulas: it takes
`fcard--list` and loses the coloured boxes, which otherwise read as
results to memorise. Section a long answer by mechanism step, using the
standalone-bold-line heading above.
