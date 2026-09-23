---
name: step07b_answer_beautifier
description: Judge whether a rendered answer READS like a worked solution — steps on their own lines, maths set as maths, equation numbers attached, nothing clipped. Use when an answer looks crowded, a formula prints its own source, or a fraction is stacked where no division exists.
---

# step07b_answer_beautifier — agent

**The failure this step exists to catch is an answer that is CORRECT and
UNREADABLE.** Nothing errors. `step16` counts every word present. `step15`
finds no clipping. And the page still shows

    धारामापी को अमीटर में बदलने हेतु आवश्यक शंट प्रतिरोध S = I_g G/(I −
    I_g)

where a student needs

    S = I_g · G / (I − I_g)          ← G/(I−I_g) STACKED, on its own line

Every other step asks *is the content there?* This one asks *can it be read?*

---

## Input

| | |
|---|---|
| `build/<stem>/artifacts/07_formatted.json` | the answer nodes and their `fmt` |
| `build/<stem>.html` | what actually rendered |
| `build/<stem>/qa/page-NN.png` | **look at it** — most of these are invisible in the HTML |
| `build/<stem>/review/step07b_answer_beautifier.open.json` | what the code could not judge |

## Output → `build/<stem>/review/step07b_answer_beautifier.decisions.json`

```json
{"decisions": [
  {"id": "…",
   "defect": "unstacked_fraction | false_fraction | detached_eqno | run_on_steps |
              tofu_glyph | mid_formula_break | clipped_inline | prose_maths",
   "verdict": "real | by_design",
   "where": "p3.g2026.q11.ans",
   "why": "…",
   "fix": "book/format/inline.py: … | book/format/display.py: … | content/…md:933"}]}
```

A decision without a `fix` naming a FILE is not finished. See *The rule that
makes this step worth having*, below.

---

## Start here, always

```bash
python3 tools/scan_render_defects.py build/<stem>.html
```

Twelve rules, one per fault that has actually reached a page. `step15` runs it
on every build and fails on anything at `high`, so by the time you are reading
a queue the mechanical faults are already named. What is left for you is the
judgement: **is this the source's fault or the renderer's?**

If you find a fault the scanner missed, adding a rule to it is part of the
fix — not a follow-up.

## The eight defects, and how to see each one

Run these against a fresh build. Each one is a real fault found on a real
page, with the file that caused it.

### 1 `prose_maths` — a formula written outside `$…$` is never set as maths

```bash
grep -o '[A-Za-zα-ω_]* = [^<।]*/[^<।]*' build/<stem>.html | grep -v 'class=' | head
```

`stack_fracs`, `math_minus` and `integral_limit` only run on text the reader
marked as maths. A formula written as plain prose keeps its slash, its
hyphen-for-minus and its inline exponent. **This is a SOURCE defect** — the
fix is `$…$` in the markdown, not a looser renderer. Tell the author which
line.

### 2 `unstacked_fraction` — `a/b` inside maths that stayed flat

Only possible when the operand scan hit a stop character. Check `_FR_STOP`
in `book/format/inline.py` before blaming the source.

### 3 `false_fraction` — a slash that was never a division

```bash
grep -o '<span class="fr"><span>[^<]*</span><span class="dn">[^<]*</span>' build/<stem>.html \
  | grep -Ei '(set|reader|print|ready|edition)'
```

`` `2025/set_jv` `` is a paper reference, and backticks mean maths here, so
`2025` was stacked over `set_jv` like a fraction. `_is_slug` in
`book/format/inline.py` now refuses a lowercase identifier of three or more
characters on either side. **If you find a new shape it does not catch, widen
`_SLUG_RE` — do not special-case the string.**

### 4 `detached_eqno` — the number labelling the wrong thing

```bash
grep -o '<p class="q">\s*…\?([ivx]*)' build/<stem>.html | head
```

`split_eqno` looks INSIDE the delimiters. A chapter that writes
`$$C\phi = NIAB$$ ...(ii)` puts the number after the closing `$$`, so it
became the first thing in the NEXT paragraph and appeared to label that
instead:

    Cφ = NIAB
    ...(ii) यहाँ C कमानी का ऐंठन नियतांक है …

`take_leading_eqno` in `book/format/display.py` pulls it back onto the
equation's line. Both spellings must keep working — inside and after.

### 5 `run_on_steps` — a worked calculation set as one paragraph

```bash
python3 -c "import sys;sys.path.insert(0,'.');
from book.format.answer import split_steps
print(split_steps(open('/tmp/ans.txt').read()))"
```

`book/format/answer.py` gives a line its own line when it is short, contains
`=`, and its right-hand side is ≥72% maths. Its two thresholds
(`MAX_STEP_CHARS`, `MIN_MATH_RATIO`) are the only knobs. A step that is
missed is usually over 150 characters — check before touching the ratio.

The test is about SHAPE, never vocabulary. `कुल गुणसूत्र = 23 × 2 = 46` is a
step for the same reason `कुल प्रतिरोध = 5 Ω` is. **Never add a physics word
to this module.**

**A run-on answer can bundle more than one calculation, not just one long
one.** `content/physics_new.md:2646-2651` answers "कूलॉम के नियम को
प्रतिपादित कीजिए…" with a general-case derivation (`F=\frac{Kq_1q_2}{r^2}`)
AND a separate माध्यम (dielectric-medium) sub-case (`F_m=\frac{F}{\epsilon_r}`),
each its own chained fraction/exponent, run together in one paragraph with no
line break between them. `split_steps` only sees the whole paragraph as a
single line, well over `MAX_STEP_CHARS`, and returns it whole as `prose` —
this is still the **source's** fault per the table below (each derivation
belongs on its own line), not a new renderer defect. No renderer change was
made for it; if it recurs across many answers rather than as an isolated
case, that would be the signal to reconsider, not this one instance.

### 6 `tofu_glyph` — a hollow box where a glyph should be

Only visible in the PNG. A combining mark that the face cannot compose —
`τ` + U+20D7 draws an empty rectangle above the tau. Vectors must go through
`.vec`, which draws its own arrow, rather than relying on the font.

```bash
grep -o '.\{6\}\xe2\x83\x97' build/<stem>.html | head    # bare U+20D7 survivors
```

### 7 `mid_formula_break` — an expression wrapping between its own tokens

Only visible in the PNG. `√(2 × 1.6 × 10⁻¹⁸ / 9.1 ×` on one line and
`10⁻³¹)` on the next. A maths span needs `white-space: nowrap` or a
non-breaking join; a display equation needs to be `atomic` in
`book/format/rules.py`.

### 8 `clipped_inline` — a glyph cut off at a column edge

Also PNG-only, and the leading character is the one that goes: `किसी` lost
its `क`. Usually a negative text-indent on a list marker, or an
`overflow:hidden` on the wrong box.

---

## How to decide

**Look at the rendered page, not the HTML.** Four of the eight defects above
are invisible in the markup — the tofu box, the mid-formula break, the
clipping, and the crowding that started this step. Open
`build/<stem>/qa/page-NN.png`.

**Then decide who is wrong: the source or the renderer.** This is the only
judgement that matters here, and it decides where the fix goes.

| Symptom | Source's fault when… | Renderer's fault when… |
|---|---|---|
| flat fraction | the formula has no `$…$` | it is inside `$…$` and still flat |
| stacked non-fraction | — | always; the guard is too narrow |
| detached eqno | — | always; both spellings are legal |
| run-on steps | the author put three steps on one line | each step is on its own source line |

**A source defect is still your finding.** Name the file and line so the
author can fix it once, rather than the renderer guessing forever.

---

## The rule that makes this step worth having

> A decisions file fixes THIS build. A rule in the code fixes every build.

Every defect above ends in a named file for exactly that reason. When you
resolve a finding:

1. Write the decision, so this chapter renders.
2. **Change the rule** — `_SLUG_RE`, `_FR_STOP`, `MAX_STEP_CHARS`,
   `take_leading_eqno`, `rules.py`.
3. **Add the case to this file**, under the defect it belongs to, with the
   command that shows it.

Step 3 is not paperwork. Chapter 3 nested its years as `### 2026` and chapter
4 wrote them as `## 2026`; chapter 3 separated formula rows with `·` and
chapter 4 with ` : `; chapter 3 wrote `अथवा` bare and chapter 4 as `*अथवा*`.
**Every one of those cost a full debugging pass that a line in an agent file
would have saved.** The next chapter will differ again, and this file is the
only thing that carries what we learned forward.

---

## Faults fixed here since, with their causes

Each cost a debugging pass. Every one is now a rule; the row is what stops it
recurring.

| Symptom | Cause | Rule |
|---|---|---|
| `∫<sup>_</sup>a<sup>b</sup>`, literal `θ_1` | `protect_slugs` matched `int_a` and `theta_1` as identifiers — three-plus lowercase letters then `_something` — and mangled the LaTeX before the converter saw it | `_SLUG_TOKEN_RE` has a `(?<![\w\\])` lookbehind. **Both halves matter**: without `\w` the regex just restarted at `heta_1` |
| `θ` with a subscript inside a subscript | `\int_{\theta_1}` resolves to a `<sub>` holding `θ₁`, and converting that `₁` in turn nested a script in a script | `unicode_scripts_to_tags` tracks depth and leaves a Unicode small form alone inside a script |
| flat `न्यूटन/(ऐम्पियर·मीटर)`, `l/r`, `μ₀I/2r` | `stack_fracs` ran only on maths-marked text, so the identical expression stacked inside `$…$` and stayed flat in prose | `prose_fracs`, guarded by `_fraction_worthy` |
| `(Introduction)` on a line of its own | the English gloss was a `<div>` after the heading, so it took a whole line per section | `section_head(..., en=...)` sets it inside the row |
| a vector arrow missing over a boxed formula | `.vec` draws its arrow with a pseudo-element above the letter, and `.fx` sits tight to its text — the arrow was clipped by the box's own top edge | `.fx { padding-top:8px; overflow:visible }` |
| five sticky notes stacked at the end of a part | `hoist_cards` flattens every note into one part-level pool and discards which section it came from — invisible in the single-column layout, where the packer deals them down the margin column | each card carries `_home`, the index of the part child it was found in |

| a vector printed with no arrow at all | `tex()` rendered `\vec{X}` as `**X**` — bold, no arrow. Only vectors written `X⃗` in the source got one, so 36 `\vec{}` were unmarked while the literal-arrow ones worked | `\vec` emits `**X⃗**`; `_vectors` turns the arrow into `.vec`, which draws it |
| `d\vec{l}` marking only the `l` | the `d` sits OUTSIDE the braces, so marking what is inside them left half a differential element plain | the `\vec` handler absorbs a bare single letter before it; `_vectors` matches up to two letters |
| a `[2]` closing a sentence printed as text | `RE_MARKS_ONLY` caught only a standalone line; `… है। [2]` is the commoner form | `RE_MARKS_TRAILING`; marks chips went 19 → 62 |
| a derivation reading as one wall | `.dm` was centred with EQUAL margins, so every gap was the same and nothing grouped a step with the sentence introducing it | inset + left hairline + asymmetric space (tight above, open below); the number floats right so a column of them lines up |

### Where a lexicon is allowed, and where it is not

`prose_fracs` needs to tell `मीटर/सेकंड` from `और/या`, and does it with an SI
unit list. That is not a contradiction of *never put vocabulary in
`answer.py`*: SI unit names are **notation**, a closed set, and the same list
serves a biology or chemistry chapter unchanged. The test is whether the rule
would have to grow to cover a new subject. `answer.py` knowing "प्रतिरोध"
would; `_UNIT_WORDS` knowing "मीटर" would not.

Measured on chapter 4: 179 prose slashes, 106 carrying a Latin or Greek
letter or digit, 71 unit names, **zero** word-alternatives. The guard still
exists because "zero in this chapter" is not a rule.

## Never

- **Never judge by eye alone.** "Looks crowded" is where this step starts, not
  where it ends. Name the defect, run its command, cite the file.
- **Never loosen a threshold to clear a queue.** `MIN_MATH_RATIO` at 0.72
  separates a calculation from a sentence that mentions a number. Lower it
  and prose starts getting centred as maths.
- **Never put vocabulary in `answer.py`.** The moment it knows the word
  "प्रतिरोध" it stops working for biology.
- **Never fix a symptom in the source when the renderer is wrong.** Rewriting
  one markdown line hides a fault that every other chapter still has.
- **Never mark a defect `by_design` without saying which construct causes
  it**, the way `step02` requires for its tolerances.

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

### Physics

The answer is usually a DERIVATION, and its readability is the derivation's
structure: one `.eqline` per algebraic step, the `\boxed{}` result in
`.math-result`, and `…(i)`/`…(ii)` kept because the prose cites them
("समी (iii) व (iv) से"). Never invent a second numbering.

A unit written as a ratio (`\dfrac{कूलॉम}{वोल्ट}`) is **maths** and stacks —
it is not prose. A `**त्रिक:**` strip (मात्रक · विमीय सूत्र · राशि का
प्रकार) is the compact fact block above a topic; it is optional, so do not
synthesise one where the chapter did not write it.
