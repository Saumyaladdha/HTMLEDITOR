---
name: step07b_answer_beautifier
description: Judge whether an arts answer reads as prose or as a wall of text — arts has zero maths (latex=False), so none of the top-level skill's stacked-fraction/false-fraction/run-on-step defects apply here; the failure mode is an unbroken long-answer paragraph, not a crowded formula.
---

# Answer Beautifier — ARTS

> Subject profile: `book/subjects/arts.py`. Everything not contradicted here
> is in `pipeline/subjects/biology/step07b_answer_beautifier/SKILL.md`
> (biology's own `run.py` is shared with this step), and the general defect
> taxonomy — `unstacked_fraction`, `false_fraction`, `detached_eqno`,
> `run_on_steps`, `tofu_glyph`, `mid_formula_break`, `clipped_inline`,
> `prose_maths` — is in the top-level `step07b_answer_beautifier` skill.

## Why most of that taxonomy does not apply here

`book/subjects/arts.py`'s profile sets `"latex": False` — zero `$…$`, `$$`,
`\frac`, `\vec` in either chapter (measured, both at 0/0/0/0). Five of the
eight named defects exist specifically to catch maths that renders wrong:
there is no fraction to stack or unstack, no formula to detach an equation
number from, no worked calculation whose steps need splitting. Do not go
looking for these — an arts chapter with `run_on_steps` findings would mean
someone wrote LaTeX into arts content, which is the wrong fix at the source,
not a defect for this step to beautify around.

What is left, and genuinely arts's own: **prose readability** — does a long
answer read as connected sentences with the source's own structure intact,
or as one unbroken block a student has to re-parse themselves.

## Input / Output

Same shape as every subject (shared `run.py`):

| | |
|---|---|
| `build/<stem>/artifacts/07_formatted.json` | the answer nodes and their `fmt` |
| `build/<stem>.html` | what actually rendered |
| `build/<stem>/qa/page-NN.png` | look at it |
| `build/<stem>/review/step07b_answer_beautifier.open.json` | what the code could not judge |

Output → `build/<stem>/review/step07b_answer_beautifier.decisions.json`, same
`{"decisions": [...]}` shape as the top-level skill.

## Start here, always — and mind which build file you point it at

```bash
python3 tools/scan_render_defects.py build/arts-01-history.html
python3 tools/scan_render_defects.py build/arts-02-geography/draft.html
```

Both come back `clean: no render defects found` (run this session). **Use
`build/arts-02-geography/draft.html`, not the top-level
`build/arts-02-geography.html`** — the top-level file predates this
session's rebuild and carries `body class="subj-biology"` (it was built
without `--subject arts`; `book.subjects.detect()` on this chapter's
markdown returns `"biology"`, not the `"physics"` default FORMAT_SPEC §10
describes, because both चापters' `पहचान`/`तथ्य` rubric pushes the
bio-signal past its threshold — see `step07_formatting_agent`'s SKILL.md for
the full evidence). Scanning the stale file still comes back clean, but it
is not the arts build, so a finding against it would be worthless — a fresh
`build/arts-02-geography.html` should be regenerated from the current draft
before this file is used as the reference build going forward.

## What "readable" means for arts

Not a crowded formula — a **wall-of-text long-answer**. 5–6 (and up to 10)
अंक questions run 6–10 sentences; the failure mode is the same paragraph
with no internal structure, forcing a student to re-derive where one point
ends and the next begins.

**Incorrect shape — a real 5-अंक answer, unbroken** (`content/arts_01_history_print_ready.md:162`):

```markdown
**उत्तर:** हड़प्पा सभ्यता से प्राप्त साक्ष्यों के अनुसार 1800 ई. पू. तक
क्षेत्रों में हड़प्पा स्थलों का पतन हो गया था, जबकि गुजरात, हरियाणा तथा
पश्चिमी उत्तर प्रदेश की ओर नई आबाद हुई बस्तियों में जनसंख्या बढ़ने लगी थी।
1900 ई. पू. के पश्चात् भी उत्तर हड़प्पा के क्षेत्र अस्तित्व में रहे। कुछ चुने
हुए हड़प्पा स्थलों की भौतिक संस्कृति में परिवर्तन आया था; जैसे—मुहर, बाट तथा
मनकों जैसी विशिष्ट पुरावस्तुएँ समाप्त हो गई थीं। लेखन के साथ-साथ हस्तशिल्प
तथा लम्बी दूरी के व्यापार भी समाप्त हो गए थे। … (7 sentences, one paragraph)
```

Six distinct causes (settlement shift, lost artefacts, decline of crafts,
decline of housing technology, end of public construction, urban→rural
shift) run together with no separator. Renders as a single `<p class="q">`
— correctly, since nothing marks a break — but it is genuinely harder to
study from than it needs to be.

**Correct shape — the very same *topic*, three lines later in the same file**
(`content/arts_01_history_print_ready.md:164–169`), because the source
itself chose to bullet it:

```markdown
### हड़प्पा सभ्यता के पतन के कारण

पुरातत्त्वविदों ने हड़प्पा सभ्यता के पतन के निम्नलिखित कारण बताए थे

- **प्राकृतिक परिवर्तन** कुछ विद्वान मानते हैं कि जलवायु परिवर्तन, वनों का
  विनाश, … ने इस सभ्यता के पतन का मार्ग प्रशस्त किया …
- **प्रशासनिक शिथिलता** इस सभ्यता के पतन का एक महत्त्वपूर्ण कारण केन्द्रीकृत
  हड़प्पा राज्य का अन्त होना था। …
```

Renders as `ul.bl` with an accent dot per point — each cause its own line,
bold lead phrase first. **The distinction is never yours to make.** Nothing
in `book/format/answer.py` or the reader restructures arts prose into
bullets — that would be inventing structure the author never wrote, which is
exactly the vocabulary trap `step07b`'s own "Never put vocabulary in
`answer.py`" rule warns against, generalised to structure. If an answer is a
wall of text, the finding is a **source** defect (the author should have
bulleted it, the way the very next `प्र.` does for the same topic) — not a
renderer gap to patch here.

**Edge case — a 10-अंक answer with a sub-heading is not "wrong," it is the
reference edition's own convention.** `content/arts_01_history_print_ready.md:184`
writes `**उत्तर:** **हड़प्पा सभ्यता की विशेषताएँ**` — a bold phrase
immediately after the label. `book/readers/markdown.py`'s `RE_ANSWER` branch
(~1174) takes only that first line as `.anstext`; everything after is
ordinary `<p class="q">` prose. This is deliberate and documented in the
reader itself ("the reference's `.anstext` is never longer than its opening
statement") — do not flag a short `.anstext` followed by plain paragraphs as
`detached` or `truncated`. It only becomes a real finding if the *opening
statement itself* is the wrong length for what follows (e.g. a one-word
label on a one-sentence answer, or — the genuine bug class — the label
swallowing content that was meant to stay in the answer, as `RE_ANSWER`'s
own comments document happening with tables, images and LaTeX openers on
other subjects' chapters, none of which arts has hit yet).

## Cross-references, not duplicated here

- The one defect actually found in arts so far — a citation filename
  (`` `0_corrected_ocr_file.md` ``) that `protect_slugs`/`_tick()` mishandled
  because it starts with a digit — is filed in `step16`'s SKILL.md
  (`book/format/inline.py`: `protect_slugs`'s digit-led-token gap, `_tick()`
  missing a "this is a filename, not maths" branch). It is a shared
  inline-rendering gap, not specific to how an *answer* is beautified.
- The `क्रम:` chain rendering as a dense `.def`/`.m` span instead of the
  `flow` component is a **formatting-kind** decision, not a readability one
  — filed in `step07_formatting_agent`'s SKILL.md with the reader-rubric
  evidence. It would make a wall-of-text worse if it ever reached this step,
  but the fix (a rubric key in `arts.py`) is upstream of both.

## Never

- **Never invent a defect this corpus does not have.** `scan_render_defects.py`
  is clean on both chapters; do not report `unstacked_fraction` or
  `run_on_steps` findings because the taxonomy lists them — arts has no
  maths for either to apply to.
- **Never restructure prose into bullets from this step.** That decision
  belongs to whoever writes the source markdown; adding structure the
  author did not write is indistinguishable, a chapter later, from
  "beautifying" a wrong answer into a plausible-looking right one.
- **Never judge `build/arts-02-geography.html` without checking its `body`
  class first.** A stale, wrong-subject build looks identical to a correct
  one in every way except that one attribute and the `क्रम:` rendering.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**Answer structure follows the reference.** `उत्तर:` floats and the text
wraps around it; a long derivation may instead open with a standalone
`.subhead`. A display step is one `.eqline` per row, its number inline as a
`.k` run, its marks chip a separate `.eq-tail` row, and its final line
marked by the author's own `\boxed{…}` → `.math-result`.

Consistency is the goal the reference is judged on: the same kind of step
should look the same everywhere in the chapter. Prefer leaving a shape
alone to inventing a second one for the same thing.

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

### Arts / humanities

Answers are prose, so nearly all of the presentation budget goes on the
sectioning heading above: a long answer broken into named sections is the
difference between a readable page and a wall. There are no formulas to
box and no derivations to number, so do not reach for `.dm` or
`.math-result` — a quoted source or a date list is not maths.

Keep the author's paragraph breaks; they are the argument's structure.
