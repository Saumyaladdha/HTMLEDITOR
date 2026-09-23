---
name: step15_visual_qa_agent
description: Look at rendered arts pages for problems geometry cannot detect. Use after step15 renders screenshots or reports a render defect.
---

# Visual Qa Agent — ARTS

> Subject profile: `book/subjects/arts.py`. Everything not contradicted here
> is in `pipeline/subjects/biology/step15_visual_qa_agent/SKILL.md`, and the
> CODE is shared — `tools/scan_render_defects.py` is subject-agnostic.

## Fault: a short citation-trailer line was tagged `formula` and sent through the maths pipeline twice

**Symptom** (`scan_render_defects.py`, HIGH `stray_backtick`): a literal,
unconverted `` ` `` reached the page, inside a "आईना" preview-list item that
had been truncated with `…`. Tracing the SAME citation format elsewhere
found the real defect: `— स्रोत: `2025/set_c_in` · Set C · 322(IN) · #1`
rendered as `2025` STACKED OVER `set_c_in` — a fraction, division sign and
all — while three other, longer citation-trailer lines on the same page
(each chaining 3–4 `` `YYYY/slug` `` codes) rendered correctly as plain
upright text.

**Root cause**: `_looks_like_formula(t)` in `book/readers/markdown.py` — "a
short line that is mostly symbols and Latin → display equation" — length
≤160, contains a formula-ish char, Devanagari count under ~18% of the
line. A ONE-citation trailer (`— स्रोत: `2025/set_c_in` · Set C · 322(IN)
· #1`, ~48 chars, ~5 Devanagari chars in "स्रोत") clears both thresholds
easily and was tagged `formula`. The multi-citation trailers a few lines
away are long enough (4 codes chained) to fail the 160-char cutoff FIRST,
so they fell through to `para` instead and never hit this path — the bug
was invisible on the longer, more common case and only bit the short,
single-citation questions.

A `formula`-kind node is rendered as a DISPLAY EQUATION, which reprocesses
its text through the display/fraction pipeline. The `` `2025/set_c_in` ``
backtick span had ALREADY been correctly wrapped `.ref` by `_tick()` inside
that same pass, but the surrounding display-equation logic doesn't know
`.ref` content is protected — it saw the `/` between `2025` and the
now-plain-text `set_c_in` and stacked them as a fraction anyway.

**Fix**: `_looks_like_formula` now excludes any line matching
`^[—–-]?\s*स्रोत\s*[:：]` before doing the symbol/Devanagari check, so
EVERY citation-trailer line — one code or four — falls through to `para`
the same way. This is a general fix, not arts-specific: any subject
citing `` `YYYY/slug` `` in a short trailer would have hit the same bug had
one ever been short enough.

## Fault: `क्रम:` chain trailing punctuation glued to the closing backtick

Two occurrences, geography only. The chain-extraction logic
(`_split_chain_text`, see biology's SKILL.md) takes ONLY the backticked
span and re-emits whatever follows as its own paragraph. Geography wrote
punctuation directly against the closing backtick with no space:

```
**क्रम:** `प्रकृति का दबदबा → तकनीक → मानव का दबदबा`।
**क्रम:** `पर्यावरणीय निश्चयवाद → संभववाद → नव-निश्चयवाद`, और यही क्रम उत्तर है।
```

The first left a lone `।` as an orphaned one-character paragraph, glued
onto whatever rendered next. The second left `, और यही क्रम उत्तर है।` —
meaningful content, but starting with a stray comma, since the extraction
never sees what came before the backtick span. **Fix**: pure punctuation
adjustment — dropped the standalone `।` (carries no information beyond
closing a sentence the chain already closes), and dropped the leading `,`
before "और" (the clause reads as a complete sentence on its own once the
comma is gone: "और यही क्रम उत्तर है।"). Zero wording changed either time.

**Rule for a future arts chapter**: never let punctuation touch a `` ` ``
that closes a `क्रम:`/`संबंध:` chain directly. A trailing clause needs at
minimum a leading capital-equivalent word or its own clean sentence
opening — never a bare comma or lone danda.

## State after fixes

`scan_render_defects.py` clean on both chapters (`0` occurrences, all
severities) as of the rebuild after these two fixes plus the `RE_QHEAD`
and `# चैप्टर मैप` fixes in `step01`.

## Open — none currently

The `orphan_heading` this file used to flag as open (a heading alone at the
foot of a column, seen in an earlier build) is gone: re-verified against the
current build —
`build/arts-01-history/review/step15_visual_qa_agent.open.json` and the
geography equivalent both read `count: 0`, and `tools/scan_render_defects.py`
comes back `clean: no render defects found` on both
`build/arts-01-history/draft.html` and `build/arts-02-geography/draft.html`.
As guessed above, the pagination shift from the `RE_QHEAD` fix (Part 2's
page breaks moved once every question stopped forcing its own oversized
group) resolved it without any dedicated fix. **Still open the screenshots
before signing off a future arts build** — geometry-clean is not the same
as page-good, per this file's own "Never" rule below; a clean `open.json`
here only means the code-detectable checks passed.

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

### Arts / humanities

Answers are prose, so nearly all of the presentation budget goes on the
sectioning heading above: a long answer broken into named sections is the
difference between a readable page and a wall. There are no formulas to
box and no derivations to number, so do not reach for `.dm` or
`.math-result` — a quoted source or a date list is not maths.

Keep the author's paragraph breaks; they are the argument's structure.
