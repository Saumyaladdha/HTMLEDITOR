---
name: step15_visual_qa_agent
description: Scan a biology build with the six biology-specific rules already in tools/scan_render_defects.py (devanagari_in_maths, chain_as_maths, fence_leaked, stray_backtick, ploidy_split, flow_italic — verified present, the current build is clean of all six), then look at the pages for what three still-missing rules (long_maths_run, figure_without_art, caption_orphan) cannot yet catch mechanically.
---

# Visual Qa Agent — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not. Everything not contradicted here is in
> `pipeline/subjects/physics/step15_visual_qa_agent/SKILL.md` — **read it
> first** for the code-found-vs-only-you-find split and the "route the fix
> to the right step" table; both apply unchanged. The CODE is shared — one
> `pipeline/step15_visual_qa_agent/run.py` for both subjects.

## What this step is for

Scanning the rendered HTML and looking at rendered pages for what geometry
checks cannot catch.

## The scanner already has biology rules — verify before assuming otherwise

`tools/scan_render_defects.py`'s `RULES`/`CODE_RULES` were extended after
the FIRST biology build — checked directly against the current file, these
six exist and run on every biology build:

| rule | severity | catches |
|---|---|---|
| `fence_leaked` | high | `चित्र-निर्देश`/`NCERT`/`ref:` in visible text |
| `stray_backtick` | high | a literal backtick reaching the page |
| `devanagari_in_maths` | high (code rule) | ≥6 Devanagari chars inside a `.m` run |
| `chain_as_maths` | high (code rule) | a `→` joining ≥4 Devanagari chars inside `.m` |
| `ploidy_split` | high | `2n`/`(3n)` split across spans, excluding legitimate `<sub>` digit+variable cases |
| `flow_italic` | high | a `.flow > .st` rendered italic |

Run it and expect (on a chapter of this shape) **clean**:

```bash
python3 tools/scan_render_defects.py build/<stem>.html
```

`build/bio-01-cols.html` (the current chapter 1 build) reports clean of all
six. **Do not describe the physics scanner as "blind to biology" going
forward** — that was true of the FIRST build and is the reason these six
rules exist; it is not true of the current code. If a future chapter trips
one, that is a real regression against a mechanism that already works, not
a gap to route around by eye.

## Three rules that are genuinely still missing — verified absent

`long_maths_run`, `figure_without_art` and `caption_orphan` are named in
older project notes as biology scanner rules but **are not present** in
`tools/scan_render_defects.py`'s `RULES` or `CODE_RULES` — checked directly,
only the six above exist. If you need one of these, write it (and add it to
the scanner in the same pass, per the physics file's "the rule that makes
this step worth having"):

```text
`long_maths_run`  — a `.m` span over ~40 chars is prose, not an equation;
                    the first build had one at 213 characters
`figure_without_art` — a plate whose data-ref names a file absent from
                    `source_figures/`; biology currently has 9 of these by
                    definition (see step11) — a rule here would make that
                    count mechanically checkable per-build instead of
                    read off step11's report each time
`caption_orphan`  — an italic `*चित्र N.M — …*` caption line separated from
                    its image by an intervening block
```

Until these exist, judge them BY EYE from the page PNGs — see below.

## What only you can find (biology-specific additions to the physics list)

Beyond the physics file's crowding/rag/balance/misplaced-art checklist,
open the PNGs and specifically check:

- **A reserved figure plate with no caption, or a caption on the wrong
  plate** — with 21 figures and 9 unique missing files repeated across
  multiple references, a caption/plate mismatch is easy to introduce when
  the same missing file backs several figure numbers.
- **A callout run that reads as a wall** — 214 callouts in this chapter
  (against physics's 108); several `⚠️` traps back-to-back with no
  breathing room between them is a biology-specific crowding shape that a
  physics-tuned eye may not flag on reflex.
- **A `flow` chain that switched to `.flow-down` unnecessarily** — check
  against `step07`'s measured thresholds (`FLOW_WRAP_STAGES=4`,
  `FLOW_WRAP_CHARS=62`); a chain right at the boundary is worth a second
  look in the actual render, not just the HTML.

## Route the fix to the right step

| Symptom | Step |
|---|---|
| leaked figure brief, stray backtick | `step01`/`step14` (render path) |
| Hindi noun in the maths face | `step01` (profile gate) |
| chain rendered italic or as `definition` | `step07`/`step14` |
| ploidy token split | `step07`'s `_UPRIGHT_RE` note |
| table hole/wrap | `step12` |
| slack column, undecorated or over-decorated | `step10`/`step11` |
| missing figure art | `step11` (report, cannot fix from here) |

## Never

- Never sign this step off without opening a screenshot — geometry passing
  and the scanner reporting clean are both necessary but not sufficient;
  the three missing rules above are exactly the gap between them.
- Never mark an `overflow` or a `fence_leaked`/`stray_backtick` finding
  acceptable — there is no by-design version of either.
- Never re-describe the scanner as blind to biology without first running
  it — that framing describes history, and treating it as current will
  waste effort re-solving an already-solved problem.

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
