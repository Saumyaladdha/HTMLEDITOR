---
name: step15_visual_qa_agent
description: Scan a maths build for defects the render scanner already catches (LaTeX commands printing their own name, bare backslashes, Devanagari inside the italic maths face), and look at the page for matrix faults geometry cannot see — a shrunk grid, misaligned columns, a bracket the wrong height. Use when matrices look wrong but no step reported an error.
---

# Visual Qa Agent — MATHS

> Subject profile: `book/subjects/maths.py`. This file covers what maths needs
> that physics and biology do not. Everything not contradicted here is in
> `pipeline/subjects/physics/step15_visual_qa_agent/SKILL.md` — the hard-fail
> kinds (`overflow`, `broken_math`), the soft ones, and the "route the fix to
> the right step" table all apply unchanged. This file is what the render
> scanner actually found on a maths build, and what still has to be checked
> by eye.

## What the physics rules found on the first maths build — measured, not hypothetical

| rule | first build | after the fix |
|---|---|---|
| `latex_command` | **68** | 0 |
| `bare_backslash` | **681** | 0 |
| `devanagari_in_maths` | 6 | 0 |

The 681 bare-backslash hits were almost entirely the source file's own
`<!-- … -->` production notes printing as visible content (see step16); the
68 `latex_command` hits were the `\frac`/`\sqrt`-inside-matrix-cell bug
covered in full in step06/step07b. Both are the SAME underlying subject
maths-specific rules exist for — the scanner did not need a new rule to
find either, only the fixes needed to land.

`devanagari_in_maths` had to be REFINED specifically for this subject: it
now ignores text already wrapped in `<span class="mt">`. A mixed statement
like `A'A = I ⇒ A लम्बकोणीय` is CORRECT once its Hindi word is set upright
inside the maths run — firing on correct output teaches people to ignore the
rule, which is worse than not having it.

## A real, currently-open gap in the scanner — check this by hand

**Neither `tools/scan_render_defects.py`'s `sentinel` rule nor
`book/validators/latex_check.py`'s `unreopened_sentinel` check covers the
matrix sentinel pair.** The scanner's `sentinel` rule matches a `SENTINELS`
character class that, as currently defined in the tool, is not the full
private-use range the matrix stash uses — a leaked matrix sentinel can pass
the automated scan silently. Until this is closed in the tool itself, check
by hand on every maths build:

```bash
python3 -c "
data = open('build/<stem>.html', encoding='utf-8').read()
print('leaked matrix sentinels:', data.count(chr(0xe040)) + data.count(chr(0xe041)))"
```

A nonzero count means a matrix was stashed and never restored — see step07's
account of the letters-vs-digits sentinel bug for the most common cause.

## What only a screenshot shows, maths-specific

Beyond the physics reference's crowding/rag/balance/accent checks, look
specifically for:

- **a matrix visibly smaller than its neighbours** — the font-shrink that
  was deliberately removed twice (step07/step07b); any occurrence now is a
  regression to report immediately, not a style choice to accept.
- **bracket height wrong for the row count** — a bracket drawn for 2 rows
  next to a 3-row grid's cells is a `.mx > i` stretch failure (step13).
- **a column of numbers not lining up** — missing `tabular-nums` on
  `.mxg > span` (step13); visible only at a glance, invisible in raw HTML.
- **a cell wrapping badly instead of the matrix shrinking** — this is the
  CORRECT behaviour (step07's "sizing" section) and should NOT be flagged;
  know the difference between an accepted wrap and a genuine overflow.

## What to check before signing off

- [ ] `python3 tools/scan_render_defects.py build/<stem>.html` — zero
      `latex_command`, `bare_backslash`.
- [ ] The by-hand matrix-sentinel grep above returns 0.
- [ ] At least one screenshot containing a multi-matrix derivation opened
      and checked for size/alignment consistency, not just clipping.

## Never

- Never sign off on a maths build from the scanner's report alone. Four of
  the defects above — shrunk matrix, wrong bracket height, misaligned
  columns, the sentinel leak — are invisible to it (three are visual-only,
  one is a documented scanner gap). Open the screenshot and run the
  by-hand grep.
- Never mark a wrapped matrix cell as a defect. Wrapping at a word/operator
  boundary is the accepted fix for a wide cell (step07) — flagging it sends
  someone back toward the font-shrink approach that was already tried and
  reverted twice.

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

### Maths

Every step IS the answer, so a short step (`= I`, `= O`) is still a display
line, never inline `.work` — one step set inline while its neighbours are
centred breaks the alignment a reader is following down the page.

A matrix must keep its bracket: losing it turns a 2×3 object into six loose
numbers, and a reader cannot recover the first from the second. `\tag{1}`
is a line number wherever it appears. A long cell WRAPS rather than shrinks
— a matrix in a smaller font beside one at full size reads as a mistake.
