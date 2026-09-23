---
name: step07b_answer_beautifier
description: Judge whether a chemistry answer reads as a worked solution — a reaction on its own display line with its reagent above the arrow, a drawn structure that actually rendered, the उत्तर badge preserved when the answer IS the equation. Use when an answer is a structure, a reaction, or is over-bolded.
---

# Answer Beautifier — CHEMISTRY

> Read `pipeline/subjects/physics/step07b_answer_beautifier/SKILL.md` in
> full first — it is the reference model for this step (named defects, a
> proof command per defect, a source-vs-renderer table, a living regression
> table). Everything there applies unchanged; this file is chemistry's own
> defects on top of it, and the CODE is shared
> (`pipeline/step07b_answer_beautifier/run.py`).

## Chemistry answers are reactions and drawings, not prose

The physics defect list (`unstacked_fraction`, `false_fraction`,
`detached_eqno`, `run_on_steps`, `tofu_glyph`, `mid_formula_break`,
`clipped_inline`, `prose_maths`) all apply unchanged — check those first with
`tools/scan_render_defects.py`. Chemistry adds its own failure shapes, all
found on real chapters:

### 9 `image_answer_as_text` — an answer that IS a drawing, printed as markdown

An answer to "इसकी संरचना बनाइए" **is a drawing**, written
`**उत्तर:** ![चित्र 6.40](…png)`. Eight of chapter 6's answers printed as
literal markdown text — `![चित्र 6.40](source_figures/...)`  — inside the
answer paragraph before the answer branch learned to split the image out
into its own `figure` node while keeping the `उत्तर` badge on the (now
empty) answer text.

```bash
grep -o '<p class="anstext">[^<]*!\[' build/<stem>.html    # a literal ![ inside rendered answer text = this defect
```

**Source's fault** always: the markdown correctly says "the answer is this
image", the renderer's job is to recognise that shape and split it, which it
now does — if you see this defect, either the split regressed, or the source
wrote the image reference in a fourth shape the split does not recognise yet
(see FORMAT_SPEC §9's six shapes).

### 10 `dropped_answer_badge` — the उत्तर badge missing when the answer IS the reaction

`promote_reactions` (`book/readers/markdown.py:2747-2818`) pulls a complete
reaction out of an `answer` block onto its own display line. When the
answer's ENTIRE text is one reaction, the first (only) piece IS the reaction
— and a naive rewrite that emits a `formula` node for it and moves on drops
the `answer` node itself, silently. **This actually cost four of chapter 6's
answers their उत्तर badge** before `emitted_answer` (line 2797) was added to
guarantee the badge is always emitted, with empty text if the reaction was
all the answer had.

```bash
grep -c 'class="anslabel"' build/<stem>.html   # vs count of **उत्तर:** in source — must match
```

**Renderer's fault**, always, if it recurs: the question/answer count
invariant this whole pipeline checks hardest (step02, step17) depends on
every answer keeping its badge.

### 11 `reaction_missed_by_delimiter` — a backtick reaction never promoted to a display line

`promote_reactions` used to check only `$`-delimited text for a reaction to
promote — through a string concatenation that could never actually match —
so every reaction written in **backticks** (which is most of the revision
half of chapter 6: `` `R—OH + HX/निर्जल ZnCl₂ → R—X + H₂O` ``) was skipped,
left inline in a sentence where the line breaker puts one species on the
next line.

```bash
grep -o '`[^`]*[→⟶⇌][^`]*`' content/<name>_reader_edition.md | wc -l   # backtick reactions in source
grep -c 'class="rxn-eq"' build/<stem>.html                              # display-line reactions actually built
```

A large gap between these two numbers on a chapter that uses backtick
reactions is this defect. **Source is fine; renderer's fault** if it recurs
— `_split_reactions` (`markdown.py:2402`) must check either delimiter.

## Do not bold whole answers

The rule settled for biology holds here unchanged: only Latin parentheticals
get `<b class="term">`; everything else stays normal weight. A dark-bold
paragraph reads as an error, not emphasis.

## A LIVE CODE GAP: `ring`/`rxn_smiles` answers can crash the build, not just render wrong

If an answer (or a structure you draw per `step07_formatting_agent`'s
```रिंग``` fence) produces an IR node of kind `ring` or `rxn_smiles`,
`book/assemble/render.py:220` and `:226` call `C.chem_ring(b)` /
`C.chem_rxn(b)` — but **`book/components/__init__.py:29` imports only
`chem_structure` from `book/components/math.py`, not `chem_ring` or
`chem_rxn`**. Verified: `hasattr(book.components, "chem_ring")` is `False`.
Any chapter that reaches either branch raises `AttributeError: module
'book.components' has no attribute 'chem_ring'` at build time — a hard
crash, not a rendering defect this step can decide `real`/`by_design` about.

```text
IF the build fails with `AttributeError: ... has no attribute 'chem_ring'`
   (or `chem_rxn`)
    THEN this is NOT your content's fault. Do not remove the ```रिंग``` fence
    or avoid drawing rings to work around it — report the gap exactly as
    named here: book/components/__init__.py:29 needs `chem_ring, chem_rxn`
    added to its `from .math import ...` line. This is a code fix outside
    this step's scope (do not edit .py files as part of an answer-beautifier
    decision) — flag it to whoever owns the pipeline code.
```

## Never

- Never mark an `image_answer_as_text` or `dropped_answer_badge` finding
  `by_design`. Both are always real — a literal markdown image or a missing
  उत्तर badge is never the intended page.
- Never "fix" a `ring`/`rxn_smiles` crash by having the agent avoid the
  notation `step07_formatting_agent`'s own SKILL instructs. The gap is in
  the component export, not in the fence.
- Never judge a reaction's readability from the HTML alone — a `.rxn-eq`
  that built successfully can still have its reagent glued inline if
  `promote_reactions` missed it (defect 11); render and look.

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

### Chemistry

A REACTION is not a line of text: both sides of the arrow must stay one
object, or the line breaker splits a species mid-formula and drifts a
product away from the arrow that made it. Element symbols are set UPRIGHT
(`.subj-chemistry .m { font-style:normal }`) — a slanted `SOCl₂` is wrong.

A `**उपयोग:**`/`**अभिकर्मक:**` panel is a LIST, not formulas: it takes
`fcard--list` and loses the coloured boxes, which otherwise read as
results to memorise. Section a long answer by mechanism step, using the
standalone-bold-line heading above.
