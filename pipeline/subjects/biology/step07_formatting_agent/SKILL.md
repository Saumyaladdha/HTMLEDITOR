---
name: step07_formatting_agent
description: Decide biology presentation — above all the flowchart's horizontal/vertical threshold and ploidy notation staying one token. Use when a process chain is italic, wraps mid-chain, has an arrow pointing at nothing, or step07 reports flow/figure_brief as unknown kinds (they permanently are, on every biology build — see below).
---

# Formatting Agent — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step07_formatting_agent/SKILL.md` — **read it
> first** for the four attributes (`atomic`, `density`, `accent`,
> `emphasis`) and how to choose each. The CODE is shared — one
> `pipeline/step07_formatting_agent/run.py` for both subjects.

## What this step is for

Deciding how each block is presented.

## A confirmed, standing gap: `flow` and `figure_brief` have no rule

**Every biology build's `step07` queue opens with exactly these two items,
and they will keep reopening until `book/format/rules.py` gets entries for
them** — checked directly: `book/format/rules.py`'s `RULES` dict (lines
19–56) has no `"flow"` key and no `"figure_brief"` key, so both kinds fall
back to `DEFAULT = dict(atomic=False, density=1.0, accent=False,
emphasis="normal")` (`rules.py:18`). The current build's actual open queue:

```json
{"kind": "flow", "detail": "no formatting rule; using DEFAULT"},
{"kind": "figure_brief", "detail": "no formatting rule; using DEFAULT"}
```

Writing a decision for THIS build closes the queue for this run, but the
next biology chapter hits the identical two items again unless the table
itself gets the rows. This is exactly the situation the physics file warns
about ("Never write the decision only into the decisions file") — here it
is not hypothetical, it is the queue's permanent steady state.

```text
FOR `flow`:
  atomic MUST be true — book/elements/flow's CSS already sets
  `.flow { break-inside: avoid }` (step13's CSS notes), so a chain
  currently gets DEFAULT's atomic=false from rules.py while its OWN
  stylesheet insists it must not split. The two disagree today; `atomic`
  in rules.py should match the CSS, not contradict it.
  density: a flow chip row needs more vertical room than body text once it
  wraps vertical (`.flow-down`) — treat similarly to `definition`'s 1.05.
  accent: false — a chain's stages are not section-coloured chips.
  emphasis: normal.

FOR `figure_brief`:
  Since it RENDERS TO NOTHING (`RENDERS_NOTHING` in
  book/format/assignment.py), its `atomic`/`density`/`accent`/`emphasis`
  values are inert — there is no box on the page for them to shape. A
  rules.py entry exists here purely to stop the same three review lines
  recurring; any DEFAULT-shaped values are fine, but see the check below.
```

**Correct**: propose the `flow` row above and land it in `rules.py`, so the
next biology chapter's `step07` queue opens empty for this kind instead of
re-litigating it.
**Incorrect**: writing `{"kind": "flow", "atomic": true, ...}` only into
`step07_formatting_agent.decisions.json` and considering the queue closed —
it closes THIS build; the next one reopens it.
**Edge case**: do not add a `rules.py` row for `figure_brief` that sets
`atomic: true` "to be safe" and then debug why a block with no rendered
box behaves oddly under a packer that tries to keep it whole — since it
renders nothing, `atomic` genuinely has no effect; do not let its presence
in the table imply it does.

## The flowchart

A `flow` block is a process chain, set with each stage as an upright chip
and arrows between them (`book/components/text.py`, `.flow` element).

**Horizontal while it fits, vertical once it does not**:
`FLOW_WRAP_STAGES = 4`, `FLOW_WRAP_CHARS = 62`
(`book/components/text.py:70-71`).

The reason is not aesthetic. This six-stage chain

```
गुरुबीजाणु मातृ कोशिका → अर्द्धसूत्री विभाजन → 4 गुरुबीजाणु → 1 क्रियाशील
→ 3 समसूत्री विभाजन → 8-केन्द्रकीय भ्रूणकोष
```

wraps across two lines in a 449px column when forced horizontal, and the
arrow at the end of the first line points at nothing — there is no visual
target for it. Stacked vertical, every arrow correctly points at the stage
below it.

**Correct**: a 3-stage, 40-character chain stays horizontal — it fits one
line, all arrows land on their target.
**Incorrect**: forcing a 6-stage chain horizontal because "it's only one
more than the threshold" — the wrap happens regardless, and a dangling
arrow at a line break is worse than the vertical layout it was avoided for.
**Edge case**: a chain right at the boundary (exactly 4 stages, 61
characters) — trust the measured thresholds, don't eyeball it; if it looks
wrong at the boundary, that's a signal to re-measure `FLOW_WRAP_CHARS`
against a real render, not to override one chain by hand.

Each stage is `inline()`d individually, so a count or ploidy inside it
keeps its own treatment — `8-केन्द्रकीय` keeps its digit upright and
`(3n)` is not torn apart mid-chain.

## What must NOT happen

- A stage set in italic — `.flow > .st` is `font-style: normal`
  deliberately; the original bug rendered a chain as a `definition` with a
  `.m` maths span inside it.
- An arrow inside a text run instead of between chips.

## Ploidy is one token, not algebra

`n`, `2n`, `3n`, `(3n)` name how many chromosome sets a cell has. Inside a
maths/upright run, digits and brackets are upright and letters are italic
by default — so `त्रिगुणित (3n)` came out as an upright `(3`, an italic
`n`, and an upright `)`: three pieces, as though `n` were a variable
multiplied by 3.

**Correct**: `(3n)` renders as one upright unit, no internal split.
**Incorrect (the actual original bug)**: `<span class="up">(3</span>n<span
class="up">)</span>` — visually reads as `(3` next to a variable `n` next
to `)`, implying multiplication.
**Edge case fixed for**: `2nd` (an ordinal) and `sin` (a trig function,
relevant if this profile is ever reused for a maths-adjacent chapter) must
NOT be caught by the same rule — `_UPRIGHT_RE` (`book/format/inline.py:1285`)
joins a trailing `n` into the upright run only when NO letter follows it,
so `2nd`'s `d` and `sin`'s surrounding letters keep the rule from firing.

Fixed in `_UPRIGHT_RE` itself, not as a separate wrapping pass — a separate
pass would tag the text first and then have the main scan process that tag
again, double-wrapping the digit
(`<span class="up"><span class="up">3</span>n</span>`).

## What to check before closing this step

- [ ] `flow` and `figure_brief` decisions are present for this build AND
      proposed as `rules.py` rows (see the standing-gap section above) —
      not just written into the decisions file.
- [ ] Every `flow` block in the rendered PNG has upright stages, arrows
      landing on a target, and correctly switches to `.flow-down` past the
      measured thresholds.
- [ ] Every `(Nn)` ploidy token in the rendered page is one visual unit —
      grep `build/<stem>.html` for `ploidy_split` via
      `tools/scan_render_defects.py`; it is a `high`-severity rule.

## Never

- Never set formatting from what a block looks like — two visually
  different blocks are different KINDS; go back to `step03`.
- Never write a `flow`/`figure_brief` decision only into the decisions
  file without also proposing the `rules.py` row — this queue is
  demonstrably permanent otherwise (see above).

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**The answer's shape changed.** Judge against these, not against the older
build:

- `उत्तर:` is a floated `.anslabel` and the answer text wraps **around** it
  (`.ansrow` is `display:block` with `:after{clear:both}`). It was a flex
  row, which forced the answer into a narrow column beside the label and
  dropped the space between them.
- a display equation is one `.eqline > .math-line` **per row** — never a
  `<br>`-joined run;
- `…(i)` rides inside the last `.eqline` as a `.k` run; only a **marks
  chip** becomes a separate right-aligned `.eq-tail` row;
- `\boxed{…}` is the final-answer highlight.

Never put mixed inline content straight into a `display:flex` row — flex
discards the whitespace between children, which welds words together.

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
