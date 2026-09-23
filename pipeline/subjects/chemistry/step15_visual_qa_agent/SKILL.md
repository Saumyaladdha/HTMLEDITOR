---
name: step15_visual_qa_agent
description: Inspect chemistry pages for what geometry cannot catch — a reagent printed inline instead of above the arrow, a carbocation charge drifting off its atom, a reaction running past the column edge, a drawn structure too small to read at print zoom. Use after step15 renders screenshots on a chemistry chapter.
---

# Visual Qa Agent — CHEMISTRY

> Read `pipeline/subjects/physics/step15_visual_qa_agent/SKILL.md` first —
> the hard-fail `overflow`/`broken_math` findings, the soft findings, and
> the "route the fix to the right step" table apply unchanged. This file is
> chemistry's deltas.

## What to look at first, in order

1. **Does every arrow have its label above/below it, not inline?** An arrow
   with the reagent printed inline (`xrightarrow[Δ]KOH` or similar leaked
   text) is the single defect chemistry's reaction handling exists to fix —
   ~500 of these shipped across two chapters before `format/reaction.py`
   existed (see step06). If you see it now, it is a regression, not a
   discovery.
2. **Is any `+` sitting a line above its own carbon?** That is a carbocation
   charge (`\overset{+}{C}`) rendered as a separate term instead of tight
   against the atom — `CH₃⁺` misread as `CH₃` plus an unrelated `+` changes
   the chemistry, not just the layout.
3. **Does any reaction or drawn structure run past the right column edge?**
   `.page` is `overflow:hidden`, so this is invisible to the automated
   overflow check — the page's `scrollHeight` never grows when content is
   clipped sideways rather than vertically. Look at the rendered sheet, not
   the numbers.
4. **Legibility at PRINT size, not CSS size.** The gate measures `px ×
   0.734` (the print zoom). A reagent label or an IUPAC name set at a CSS
   size that looks fine unzoomed can print under the 11px floor — a nested
   fraction inside a reaction's condition line printed at 9.8px and passed
   an unzoomed check once; only the zoomed measurement catches it.
5. **Is a drawn ring or chain structure actually readable, not just
   present?** RDKit sizes a ring's canvas from the molecule's own 2D
   coordinate span at a fixed scale (`format/ring.py`'s `_SCALE`/`_PAD`) —
   check that a multi-ring structure (biphenyl, a fused system) is not
   visually smaller than a plain benzene ring elsewhere on the same page;
   that specific defect (rings shrinking to fit a size formula keyed on atom
   count rather than actual geometry) was the reason the canvas sizing was
   rewritten.

## What only you can find, chemistry-specific

- **A locant or substituent not lining up over its atom.** `.cst`'s grid
  puts a branch in the column directly above/below its carbon — if it reads
  as floating or offset, that is a real rendering defect, not a source one.
- **Two adjacent structures at visibly different scale.** Per point 5 above
  — a chapter with several ring sizes on one page (a Fittig coupling product
  next to its plain-ring reagent) should read as consistent, not as one
  drawn "bigger" for no chemical reason.
- **A reaction reading as one wall with no breathing room between mechanism
  steps** (`पद I`, `पद II`) — each step needs to read as its own line, not
  run together with the next.

## Route the fix to the right step

| Symptom | Step |
|---|---|
| reagent inline instead of above the arrow | `step06` (LaTeX validator — check `_stash_reactions` order) |
| charge/locant drifting off its atom | `step06` |
| drawn structure too small / inconsistent scale | report as a code gap — `format/ring.py`'s canvas sizing, not a content fix |
| reaction/structure past the column edge | `step09` |
| answer badge missing on a reaction-only answer | `step07b` |
| build crashed on a ring/reaction-SMILES node | `step08` — this is the `chem_ring`/`chem_rxn` export gap, not a visual finding at all |

## Never

- Never mark an inline-reagent leak "acceptable" for being a small chapter
  or a rare construct — every leaked `\xrightarrow`/`\underset`/`\overset`
  represents a real answer misread, and the historical count (~500 across
  two chapters) shows this is not rare once it happens.
- Never sign off a chemistry build from the HTML/JSON findings alone. Point
  3 above (sideways clipping) and point 5 (structure legibility) are both
  invisible to every automated check in this pipeline.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**Open the screenshots against the reference, block for block.** This is
the only step that sees what actually rendered, and most of the
reference-parity work is invisible to geometry. Check specifically:

| Block | Should look like |
|---|---|
| column gutter | one **solid** blue rule (`2px #6f97d2`), not dashed |
| Part 1 | two columns, dashed rule between topics, a red `.topic-frequency` seal beside a topic name |
| सूत्र panel, Part 1 | a flat purple card with a **bulleted** list — not a row of boxed results |
| सूत्र panel, Part 2 | boxed `.frow` results |
| callouts | **always** a bordered box, both halves — a boxless ⚠️ paragraph is a bug |
| त्रिक strip | green, two columns, one labelled fact per row |
| question head | `प्र. N` pill, `N अंक` chip at the far right, a gold `.paper-refs` band on its own row |
| a derivation | one centred line per step; `…(i)` on the step's own line; the final answer in a gold `.math-result` box |
| निगमन card | upright (not rotated), each step on its own line |

**Dead space is now measurable, so measure it.** The reference averages
**105px free per column** (worst 418px, on its last page). A build far
above that is packing wrong, not merely looking airy — say so and route it
to `step09`/`step10` rather than calling it acceptable.

Two failure modes worth naming because they are invisible in the markup:
words welded together (`लगभग2 अंक`) mean a `display:flex` row was fed mixed
inline content; a Hindi word inside maths in the wrong typeface means a
`.mt` run fell back from a serif with no Devanagari glyphs.

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
