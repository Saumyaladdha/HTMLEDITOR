---
name: step07_formatting_agent
description: Set chemistry reactions and draw organic structures. Use when a reaction arrow loses its reagent, a carbocation loses its charge, or a branched molecule is described in words instead of drawn.
---

# Formatting Agent — CHEMISTRY

> Subject profile: `book/subjects/chemistry.py`. This file covers what
> chemistry needs that physics, biology and maths do not. Everything not
> contradicted here is in
> `pipeline/subjects/physics/step07_formatting_agent/SKILL.md`, and the CODE
> each step runs is shared — one `pipeline/step07_formatting_agent/run.py` for
> all four subjects, so a fix lands once.

## YOUR MAIN JOB: DRAW THE STRUCTURES THE CHAPTER ONLY DESCRIBES

This is the one task in this pipeline that **cannot** be done by code, and the
attempt to do it by code is what proves it.

The chapter writes a branched molecule as a straight chain plus a sentence:

    $\mathrm{CH}_3-\mathrm{CH}{=}\mathrm{CH}-\mathrm{CH}-\mathrm{CH}_3$
    (चौथे कार्बन से ऊपर की ओर $\mathrm{Br}$ जुड़ा है)

There are **47** such descriptions in chapter 6. A regex grammar over the
Hindi — ordinals, directions, `जुड़ा है` — was written and measured: it drew
**3 of the 47**. The other 44 are not harder patterns, they are a different
kind of problem. Most describe a species sitting *inside a reaction*:

    दोनों केन्द्रीय कार्बनों से ऊपर तथा नीचे एक-एक $\mathrm{CH}_3$ जुड़ा है।

"Both central carbons" — of which species, in an S_N1 step that has a
reactant, a carbocation and a product? Deciding that is comprehension. A
pattern match that guessed would put a branch on the wrong carbon, and **a
branch on the wrong carbon is a different compound**. That is a wrong answer
printed in a student's book, which is worse than the sentence it replaced.

LaTeX cannot express it either. `\underset` and `\overset` bind ONE thing to
ONE atom; a quaternary carbon with a branch above and below, numbered, inside
one arm of a reaction, has no LaTeX spelling that survives a linear pass —
which is why `format/reaction.py` had to exist at all.

So: **you** read the markdown and write the structure down explicitly. The
code renders exactly what you write and infers nothing.

## THE NOTATION

Replace the chain-plus-sentence with a fence:

````
```संरचना
chain: CH3-CH=CH-CH-CH3
no:    1 2 3 4 5
up:    4=Br
name:  4-ब्रोमो-पेन्ट-2-ईन
```
````

| field | meaning |
|---|---|
| `chain` | **required.** The main chain, atoms joined by `-`, `=` or `≡`. Plain text, no LaTeX. |
| `no` | the locants, in **atom order**, space separated |
| `up` | `position=group`, `;`-separated for several |
| `down` | same, below the chain |
| `name` | the IUPAC name; printed under the structure |

`position` is the atom's **place in `chain`, 1-based** — not its locant. A
chain numbered from the right still has its third atom at position 3.

`book/format/structure.py` renders this as a grid whose columns are the atoms,
so a substituent sits exactly over its own carbon and its bond meets it.

## WORKED EXAMPLES, from the chapter

A quaternary carbon — a branch above **and** below the same atom:

````
```संरचना
chain: CH3-C-CH2Br
up:    2=CH3
down:  2=CH3
name:  1-ब्रोमो-2,2-डाइमेथिलप्रोपेन
```
````

Two different branches on two different carbons — the case the regex got
wrong, reading both as belonging to carbon 2:

````
```संरचना
chain: CH3-CH-CH-CH2-CH3
no:    1 2 3 4 5
up:    2=Cl
down:  3=CH3
name:  2-क्लोरो-3-मेथिलपेन्टेन
```
````

## RULES

1. **Never invent a branch.** Only write what the source states. If the
   sentence is ambiguous about which carbon or which species, **leave the
   prose alone** — a correct sentence beats a wrong picture. Say in your
   report which ones you left and why.
2. **Count the chain yourself.** `केन्द्रीय` / `बीच के` is the middle atom of
   the chain as written. Check the valency: a carbon with four bonds drawn
   cannot take a fifth.
3. **Keep the name.** `4-ब्रोमो-पेन्ट-2-ईन` is usually the answer to the
   question. Put it in `name`, not in a separate paragraph.
4. **Do not touch a description inside a reaction** unless you split the
   reaction first so the species is on its own. A structure has to be one
   indivisible object; half of one inside a reaction arm is worse than the
   sentence.
5. **Rings are not `chain`** — a ring has no "row of atoms with substituents
   above/below" to grid, every atom bonds to two neighbours plus whatever
   sits off it. Two options, in order of preference:
   - **A simple ring the source only NAMES** (a plain benzene, or one with
     a couple of named substituents — `o`-क्लोरोटॉलूईन, `p`-डाइक्लोरोबेन्जीन):
     draw it for real with a ` ```रिंग ` fence (below). RDKit places the
     atoms; you only decide the connectivity, same judgement call as a
     `chain` branch.
   - **A reaction mechanism drawn as a diagram** — curved arrows, an
     attack happening ON the ring, anything the chapter already supplies
     as one of its 79 structure images — is still an image. Do not
     redraw a mechanism in SMILES; RDKit places atoms, it does not draw
     curved electron-pushing arrows.

## THE RING NOTATION

    ```रिंग
    smiles: c1ccccc1
    name:   बेन्जीन
    ```

| field | meaning |
|---|---|
| `smiles` | **required.** Standard SMILES. `book/format/ring.py` hands it to RDKit unchanged — get the connectivity right, the drawing follows. |
| `name` | printed under the ring, same convention as `संरचना`'s `name`. |

Substituents go IN the SMILES, not as separate fields — `Clc1ccc(C)cc1` is
p-chlorotoluene, RDKit places Cl and CH₃ on the correct ring carbons from
the string alone. Multi-ring/fused systems, stereochemistry (`/`, `\`, `@`)
all work the same way — write correct SMILES, RDKit draws it.

**If RDKit is not installed or the SMILES fails to parse**, `chem_ring`
falls back to the plain `◯` + name the chapter already used — never to a
blank space, and never a reason to force a bad guess through. This needs
`pip install rdkit` in whatever environment actually builds the book; it
is not in the standard toolchain yet.
6. **A 2-atom chain is refused, not drawn wrong.** `split_chain` requires
   **at least 3 atoms** — `CH3-NH` with one branch comes back `[], []` and
   the fence silently fails to parse (leaked as a paragraph of literal fence
   text — see *How to check your work*). This is not a bug to work around by
   padding the chain: if the two things either side of the branch are the
   SAME group (`CH3-NH(CH3)` — a symmetric secondary amine, both sides
   methyl), it is not a branch at all, it is a straight 3-atom chain written
   sideways. Rewrite it as one: `CH3-NH-CH3` (डाइमेथिल ऐमीन), plain inline
   maths, no fence, no grid. Only reach for `संरचना` when the branch is
   asymmetric — genuinely a side-shoot off a chain of 3+.
7. **When the drawn formula is ambiguous but a NAME is given, derive the
   structure from the name, not from the formula.** A chapter transcription
   can garble which carbon a branch sits on ("इसके नीचे", "उस C से नीचे") in
   a way that admits two readings — but an IUPAC name is unambiguous by
   construction. `4-आयोडो-2,2-डाइमेथिल-3-प्रोपिल हेक्सेन` fixes the chain at
   6 carbons with locants 2 (two methyls), 3 (one propyl) and 4 (iodine)
   *by definition* — decode the name into `chain`/`no`/`up`/`down` fields
   directly and check the RESULT against the source formula for a sanity
   match, rather than trying to parse the formula's prose literally. If
   there is no name to anchor it and the formula reads two ways, THAT is
   when rule 1 applies and you leave it as prose.

## A SPECIES INSIDE A REACTION — worked example

Rule 4 says split the reaction before drawing. Chapter 6's SN1 example is the
shape this happens in over and over (4 repeats of this exact one, 3 more of a
Markovnikov addition): a branched species sits on one arm of an arrow, named
with `\underset{name}{formula}`, and the branch note covers BOTH arms because
one `जुड़ा है` closes the whole sentence.

    $\mathrm{CH}_3-\mathrm{C}-\mathrm{Br} + \overline{\mathrm{O}}\mathrm{H}
      \longrightarrow \mathrm{CH}_3-\mathrm{C}-\mathrm{OH} + \mathrm{Br}^-$
    (दोनों केन्द्रीय कार्बनों से ऊपर तथा नीचे एक-एक $\mathrm{CH}_3$ जुड़ा है।)

Do NOT try to put a `संरचना` fence on one arm of a live arrow — a structure is
one indivisible grid, and half of one inside `\longrightarrow …` is worse than
the sentence. Instead:

1. **Draw the STABLE species** (the ones with no charge) as their own fences,
   ahead of the mechanism, using the name the source already gives each one:

    ```संरचना
    chain: CH3-C-Br
    up:    2=CH3
    down:  2=CH3
    name:  t-ब्यूटिल ब्रोमाइड
    ```

    ```संरचना
    chain: CH3-C-OH
    up:    2=CH3
    down:  2=CH3
    name:  t-ब्यूटिल ऐल्कोहॉल
    ```

2. **Leave the charged intermediate flat**, in the book's OWN condensed
   style — it already writes symmetric branched groups this way elsewhere in
   this same chapter (`(CH₃)₃CCl`, `(CH₃)₂CH`): `(CH₃)₃C⁺`. A carbocation is
   symmetric and short-lived; a grid this module would have to invent a new
   charge-on-atom rule for is not worth it when the flat form is already
   self-explanatory and needs no footnote.
3. **The mechanism steps (`पद I`, `पद II`) keep their arrows exactly as
   written** — `\xrightarrow`, the charge, the condition below it are already
   correctly handled by `format/reaction.py`. Only the BRANCHED FORMULA moves;
   the reaction keeps using the species' name or the flat `(CH₃)₃C⁺` form so
   it reads as one line, same as before.
4. **Delete the now-redundant `(… जुड़ा है)` note** — the structure fence
   already says it, once, above the mechanism. Repeating it after every step
   is where the original duplication came from.

Applies just as well to a reaction whose PRODUCT is branched and nothing else
is (`CH₃-CH=CH₂ + HBr → CH₃-CH(Br)-CH₃`, Markovnikov addition, 3 repeats in
this chapter): draw the product once, right after the equation, instead of
appending a footnote to it.

## A DRAWN STRUCTURE CHANGES HEIGHT, AND THAT MOVES EVERY PAGE AFTER IT

This step normally runs **before** `step09_layout_analyzer`, which measures
every block for real and packs pages from scratch — so a fence you add here
simply gets its correct height baked into that pack, and nothing downstream
can be surprised by it.

The failure mode below is for the situation this chapter needed: fixing
fences directly against an **already-built** `build/<stem>.html`, with
`step09` not re-run (e.g. re-running the full pipeline is blocked, or you are
patching a shipped build). In that situation the page boundaries are FROZEN
HTML, not a live pack — and a `.cst` grid is almost never the same height as
the paragraph-plus-footnote it replaced. Swap four occurrences of a 3-line
footnote for a 7-row grid and the page that held them can go from 1432px of
content to 3300px, silently, because `.page` is `overflow:hidden` — the
excess is not pushed to a new page, it is **clipped and gone**.

This is not rare — it happened on the very first real edit in this chapter
(replacing a mechanism's footnotes with two drawn structures took one page
from fully-used to 231% over, and a second page 655px over from an unrelated
edit 20+ pages later, because a pack is one continuous stream and a height
change anywhere can resurface as overflow much further down).

**So: after editing a built HTML directly, always re-measure, never assume.**

    python3 -c "
    import sys, os
    sys.path.insert(0, os.path.join(os.path.abspath('.'), 'book', 'util'))
    import bootstrap
    sys.path.insert(0, os.path.abspath('.'))
    from book.layout import probe
    print(probe.page_overflow(os.path.abspath('build/<stem>.html')))
    "

An empty list is the only acceptable result. Anything else names the exact
page and how many px over.

**If it overflows**, the fix is the same one `book/layout/pack.py`'s
`settle()` does for a live build, done by hand:

1. Extract every `<div class="u" data-it="N">` from the overflowing page
   onward (each `.page` is `<div class="acols">` of two `<div class="acol">`
   columns of `.u` items — parse with a balanced-tag walk, not a regex, the
   content contains nested `<div>`s).
2. Re-measure each item's real height: `book.layout.measure.measure(items,
   int(theme.COL_W), mode="a4")` — this hits a Chrome-backed cache, so it is
   cheap for anything already measured and exact for what changed.
3. Re-pack with `book.layout.pack.pack_columns(items, cols=2)`.
4. **This alone is not enough** — `pack_columns` is a predictive first pass
   (see its own docstring), and isolated-cell measurement can be a few
   dozen px off real in-page rendering. Splice the result back in, run
   `page_overflow` again, and if a column is still over, pop that column's
   LAST item and push it to the front of the next column — repeat against
   the REAL probe until it reports empty. This converges in single digits
   of iterations; it does not need to be clever, it needs to trust the
   measurement over the prediction every time.
5. Stop extracting where the content you are NOT touching begins — moving
   thousands of untouched items through this loop for no reason is how a
   30-second fix becomes an hour. Chapter 6's fixes each needed at most the
   run from the edit to where the next few pages naturally re-settled, not
   the rest of the book.

**Where to place the fence relative to the reaction**, once you've drawn it:

- If the branched species is the FIRST thing named in a worked example
  ("तृतीयक ब्यूटिल ब्रोमाइड पर…"), draw it immediately under that heading,
  before any equation uses it — the reader meets the shape before the
  symbol.
- If it is the PRODUCT of a single equation and nothing upstream needs it
  (Markovnikov addition, a substitution answer), draw it directly under
  that equation, in the position the deleted footnote occupied — do not
  move it to the top of the answer or the "here's a diagram" pull it out of
  its equation's context.
- If it appears on BOTH sides of a multi-step mechanism (SN1's alkyl
  halide → carbocation → alcohol), draw only the STABLE bookend species
  once each, before the steps begin, and let the steps reference them by
  name or by the flat condensed form — never redraw the same molecule
  twice on one page, and never leave a live arrow's arm holding half a
  fence (rule 4).

## WHAT THE CODE ALREADY DOES — do not redo it by hand

- **Reaction arrows.** `\xrightarrow[below]{above}` becomes a drawn arrow that
  stretches to its widest label, reagent above and condition below. 151 of
  them. Bare-text forms too: `HX/निर्जल ZnCl₂ →` and `⎯⎯[निर्जल ZnCl₂]⟶`.
- **The equation as a unit.** Each side of an arrow is wrapped `nowrap`, so a
  species never splits across a line and a product never drifts from its
  arrow.
- **Charges and locants.** `\overset{+}{C}` is a carbocation; `\overset{3}{C}`
  is a locant. Both are positioned absolutely over their own atom so they
  cannot drift — the atom stays on the baseline and the bond dashes meet it.
- **Formulae are upright.** An element symbol is roman; italic is for a
  physical quantity.
- **Symbols.** `\uparrow` (gas evolved), `\downarrow` (precipitate),
  `\ominus`, `\ddot` (lone pair), `\bigcirc` (benzene ring) all render. Every
  one of them printed its own name before it was listed — grep the built HTML
  for a backslash command name; silence is not a pass.

## HOW TO CHECK YOUR WORK

    python3 tools/check_leaks.py build/<stem>.html    # MUST exit 0
    grep -o 'class="cst"' build/<stem>.html | wc -l   # chain structures drawn
    grep -o 'class="cring"' build/<stem>.html | wc -l # rings drawn

Use the checker, not a bare `grep`. `grep -c 'chain:'` reported a leaked
fence that was a CSS comment reading "A `=` chain: left-hand side, sign,
expression", and `grep -c` counts LINES — this HTML is one line, so it
answers 1 for any number of hits. `check_leaks.py` strips `<style>` and every
tag WITH its attributes first, because `data-desc` holds raw source text on
purpose and is not on the page.

A fence you got wrong is rendered as a paragraph of its own text rather than
dropped, so a mistake shows up on the page instead of vanishing.

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

### Chemistry

A REACTION is not a line of text: both sides of the arrow must stay one
object, or the line breaker splits a species mid-formula and drifts a
product away from the arrow that made it. Element symbols are set UPRIGHT
(`.subj-chemistry .m { font-style:normal }`) — a slanted `SOCl₂` is wrong.

A `**उपयोग:**`/`**अभिकर्मक:**` panel is a LIST, not formulas: it takes
`fcard--list` and loses the coloured boxes, which otherwise read as
results to memorise. Section a long answer by mechanism step, using the
standalone-bold-line heading above.
