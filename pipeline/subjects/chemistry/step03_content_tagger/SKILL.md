---
name: step03_content_tagger
description: Tag chemistry rubric labels (सूत्र, त्रिक, क्रियाविधि, पहचान) and decide what a "**सूत्र:**" panel actually contains — formulae, reactions, reagents or uses each need a different title and a different component shape.
---

# Content Tagger — CHEMISTRY

> Read `pipeline/subjects/physics/step03_content_tagger/SKILL.md` first — the
> `formula` vs `para` vs `callout` distinctions there apply unchanged. This
> file is chemistry's deltas: the rubric table, and one decision the code
> already makes that you need to be able to check and override.

## The rubric, pooled across all three areas

Pooled deliberately — chapter 1 (physical) uses `सूत्र`, `त्रिक` and `सीमा`
together in one section, so splitting the rubric by area would first require
detecting the area, and the three areas are not separable (see step00's
measured table: every chapter uses several rubric words from different areas
at once).

| label | component | why |
|---|---|---|
| `सूत्र`, `मानक परिणाम` | `formula_card` | a ` · `-separated LIST of formulae — three results on one line printed as one run-together definition otherwise |
| `त्रिक` | `trio` | quantity · symbol · unit, three fields on one line — same construct physics has |
| `सीमा`, `शर्त` | `condition` | where a formula stops being true — measured as the single commonest source of a lost mark |
| `अभिक्रिया`, `क्रियाविधि`, `पद` | `flow` | a mechanism IS an ordered sequence of steps |
| `पहचान`, `काइरलता` | `identify` | what to name in the answer |
| `संरचना`, `अनुनाद` | `structure` | resonance forms are a structure, plural |
| `क्रम`, `संबंध` | `flow` | a preparation route |

## The rubric label lies about what is on a `**सूत्र:**` line — 4 shapes, one heading

Chemistry writes four genuinely different things under the same `सूत्र:`
label, and the code (`_panel_title` in `book/readers/markdown.py:473-508`)
retitles the panel **from its content**, not from the label the author typed
— because calling all four "सूत्र" tells a student to memorise a reagent
list as though it were a set of formulae to derive from.

```text
IF ≥ half the panel's rows contain a reaction arrow (→ ⟶ ⇌ ⟷ or
   \xrightarrow / \longrightarrow)
    THEN retitle "अभिक्रिया" — this is a reaction list, not formulae

ELIF ≥ 2/3 of rows END in Devanagari text (after the formula)
    THEN retitle "उपयोग" — `CH₂Cl₂ पेन्ट हटाने में` is a compound and its
    USE, and rendering it as a boxed formula-to-memorise is wrong

ELIF every row is a bare chemical species (element symbols + digits/
   subscripts, e.g. `X₂/निर्जल FeX₃`) with NO `=` in any row
    THEN retitle "अभिकर्मक" — these are the reagents that DO the
    reaction, not an equation to solve

ELSE
    keep the author's own term (सूत्र, मानक परिणाम, …) — it really is a
    list of formulae to memorise
```

**Correct example** (retitled to अभिक्रिया):
```
**सूत्र:**
- `R—OH + HX/निर्जल ZnCl₂ → R—X + H₂O`
- `R—OH + HX ⎯⎯[निर्जल ZnCl₂]⟶ R—X + H₂O`
```
Two of two rows carry an arrow → retitled. Boxing these as formulae (the
literal label) would tell a student four reaction equations are things to
derive by algebra rather than reactions to complete.

**Incorrect (what NOT to do):** do not hand-tag a सूत्र panel's `ctype`/title
from the emoji or label alone when the code's content-based retitle already
ran — check what `_panel_title` actually decided (grep the built HTML for
`class="ft"` near the panel) before overriding it. The retitle looks at
row SHAPE, and overriding it back to the literal label because "the source
said सूत्र" reintroduces the defect this exists to fix.

**Edge case:** a `**सूत्र:**` line holding exactly ONE reaction (not a list)
never reaches the panel branch at all — a single result falls through to a
plain `definition` node whose `term` is "सूत्र", mislabelling one equation as
"formula". `markdown.py:1396-1401` catches this specific case too: a
`formula_card`-rubric term whose body contains an arrow gets its term
rewritten to "अभिक्रिया" even as a lone definition, not just inside a panel.

## `(A)` / `(B)` inside a reaction is not an options marker — see step01

If you are tagging a block that looks like it should be `options` because it
contains `(A)` and `(B)`, check first whether those letters sit **inside** a
`$...$`/backtick maths span (`(i) $C_2H_5Br \xrightarrow{...} (A) ...$`) — if
so it is a chemistry unknown-product label, not an option marker, and the
block is `formula` or `para`, not `options`. Full detail in step01's SKILL.

## Never

- Never tag a सूत्र panel's title by the literal source label once the code
  has retitled it by content — the retitle exists specifically because the
  label lies about the content in a quarter of cases.
- Never invent a new rubric word mapping without checking whether it already
  pools into an existing one (`flow`, `identify`, `structure`) — the pooled
  rubric is deliberate; a new per-word component multiplies the "98 elements
  differing only in column count" problem this design was built to avoid.
- Never retag `(A)`/`(B)` product labels as options because they "look like"
  MCQ letters. Position (inside vs outside a maths span) is the only signal
  that reliably distinguishes them — see step01.

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

### Chemistry

A REACTION is not a line of text: both sides of the arrow must stay one
object, or the line breaker splits a species mid-formula and drifts a
product away from the arrow that made it. Element symbols are set UPRIGHT
(`.subj-chemistry .m { font-style:normal }`) — a slanted `SOCl₂` is wrong.

A `**उपयोग:**`/`**अभिकर्मक:**` panel is a LIST, not formulas: it takes
`fcard--list` and loses the coloured boxes, which otherwise read as
results to memorise. Section a long answer by mechanism step, using the
standalone-bold-line heading above.
