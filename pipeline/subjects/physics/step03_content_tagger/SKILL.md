---
name: step03_content_tagger
description: Decide the true semantic kind of blocks the deterministic tagger could not confidently classify. Use when step03_content_tagger reports uncertain_tag items.
---

> **Read `docs/FORMAT_SPEC.md` first.** It is the complete list of constructs
> the pipeline understands and exactly what each one becomes on the page,
> derived by diffing two real chapters against the finalised reference. Every
> answer you give here has to be consistent with it — and if a chapter uses a
> convention the spec does not cover, say so: the fix is to add it to the spec
> and the reader, never to contort the content.


# step03_content_tagger — agent

The tagger maps text to one of the 27 kinds in `book/core/ir.py`. Pattern
rules in `book/taggers/classify.py` handle the overwhelming majority. This
queue is what they were not sure about.

**Input**
- `build/<stem>/artifacts/03_tagged.json`
- `build/<stem>/review/step03_content_tagger.open.json` — each item carries
  `text`, the `current` tag (always `para`), and *why* it looked suspicious

**Output** → `build/<stem>/review/step03_content_tagger.decisions.json`

```json
{"decisions": [
  {"id": "…", "kind": "formula", "why": "an equation, not prose"},
  {"id": "…", "kind": "callout", "ctype": "trap", "why": "a board-trap note"},
  {"id": "…", "kind": "para", "why": "correct as-is"}
]}
```

`kind` **must** be one of `ir.KINDS`. `ctype` is required when `kind` is
`callout`, and must be one of `ir.CALLOUT_TYPES`:
`mark · trap · write · save · line · link · rep · conf`.

## The distinctions that actually get confused

| If the text… | it is | not |
|---|---|---|
| is short, symbol-heavy, mostly Latin/Greek | `formula` | `para` |
| is a Hindi sentence that happens to contain `=` | `para` | `formula` |
| begins `(i)` / `(a)` and siblings follow | `options` | `para` |
| begins `**<term>:**` and defines it | `definition` | `para` |
| is a boxed *result* the student should memorise | `formula_box` | `formula` |
| is advice about how to answer | `callout` | `para` |
| points at another question | `callout` + `ctype: link` | `srcnote` |
| says where the content came from | `srcnote` | `callout` |
| is a cross-reference to a similar question | `simchip` | `callout` |

**Getting `ctype` right matters more than it looks.** The type drives both
the colour *and* the icon — `book/components/callout.py` deliberately takes
the icon from the type and ignores whatever emoji the markdown used, because
the source writes one family with three different glyphs. A wrong `ctype`
puts a "board trap" in the green cross-reference box.

## Two dialects, one file

Part 1 of a chapter typically uses the older Hindi markers
(`⚠️ मत भूलो`, `🔢 आंकिक`, `💡 टिप`, `✏️ व्याख्या`); Part 2 uses the Hinglish
set (`⚠ Board ka jaal`, `🎯 Yahan 1 mark bachta hai`, `🔗 Ye wahi question hai`).
Both are legal and both normalise to the same eight families. Judge by what
the sentence *does*, not by which dialect it is written in.

## Never

- Never invent a kind. If nothing fits, say so and propose the new kind with
  its rendering — adding a kind means adding it to `ir.KINDS`,
  `format/rules.py` and `format/assignment.py` together.
- Never retag something just because it would look nicer. Tags are semantic;
  appearance is `step07`'s decision.

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

### Physics

The answer is usually a DERIVATION, and its readability is the derivation's
structure: one `.eqline` per algebraic step, the `\boxed{}` result in
`.math-result`, and `…(i)`/`…(ii)` kept because the prose cites them
("समी (iii) व (iv) से"). Never invent a second numbering.

A unit written as a ratio (`\dfrac{कूलॉम}{वोल्ट}`) is **maths** and stacks —
it is not prose. A `**त्रिक:**` strip (मात्रक · विमीय सूत्र · राशि का
प्रकार) is the compact fact block above a topic; it is optional, so do not
synthesise one where the chapter did not write it.
