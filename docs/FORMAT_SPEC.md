# Chapter markdown — the format spec

Everything the pipeline knows how to read, and exactly what each construct
becomes on the page. Derived by diffing two real chapters
(`17_reader_edition.md`, `03_reader_edition.md`) against the finalised
reference edition.

**If a construct is not in this file, the reader will fall through to a plain
paragraph and the page will silently lose its formatting.** Adding a chapter
that uses a new convention means adding it here *and* to
`book/readers/markdown.py` — never contorting the content to fit.

Check any chapter against the spec with:

```bash
python3 pipeline/step01_md_reader/run.py --md content/<NN>_reader_edition.md
python3 pipeline/step02_content_validator/run.py --md content/<NN>_reader_edition.md
```

Step 02 counts each construct in the source with rules that share **no code**
with the parser, and fails if the two disagree. Two independent
implementations disagreeing is the point.

---

## 1 · Document skeleton

```markdown
# अध्याय N : <chapter name>

## 🎯 <front-matter heading>        ← analytics; H2 before any part
| टॉपिक | अंक |                      ← pipe tables allowed here
|---|---|

# PART 1 · QUICK REVISION
*भाग 1, त्वरित रिवीज़न*              ← italic line right under a part = subtitle

### 3.4 <title> (<English>)  ·  **[UP 2023 · 2 अंक] · [UP 2025 · 3 अंक]**

# PART 2 · QUESTIONS & ANSWERS
*भाग 2, प्रश्न एवं उत्तर*

## कैसे पढ़ें                        ← an H2 INSIDE a part is a container…
### 2026                            ← …and may hold H3 groups beneath it
```

| Level | Meaning |
|---|---|
| `#` | chapter title, or a part |
| `##` | a front-matter section, **or** a container inside a part |
| `###` | a numbered section (`N.M …`) **or** a question group |

**How the reader tells a section part from a question part:** if the body
contains any `**प्र. N**` head it is a question part, whatever the headings
look like. A section number must be *hierarchical* (`3.4`), because a Part 2
grouped by marks has headings like `### 1 अंक` that would otherwise be read
as sections — that bug silently deleted two whole years of questions.

---

## 2 · Part 1 constructs

| Write | Becomes |
|---|---|
| `### 3.4 title (English) · **[UP 2025 · 3 अंक]**` | `.sechead` — accent circle + hand-drawn underline + **exam stamps** |
| `★ **5 साल में 8 बार पूछा गया**; …` | `.starline` gold strip |
| `**परिभाषा:** text` | `.deflead` + `.def` with its left rule |
| `**त्रिक:** …` | same, as a compact fact strip |
| `**सूत्र:**` then a bullet list | **the सूत्र panel** (see §3) |
| `- text` | `ul.bl` with accent-coloured dots |
| `1. text` | `ol.nl` |
| `` `math` `` or `$math$` / `$$math$$` | `.m` / `.dm`, fractions stacked |
| `> #### 📌 <emoji> <Label>` + `> ✗ rows` | a **floated sticky note** (§5) |
| `<emoji> **Label:** text` | a `.po` callout (§4) |
| `[चित्र बनाना है] चित्र 3.1` + prose | figure card, mode `spec` (to be drawn) |
| `![चित्र 3.5](source_figures/x.png)` | figure card, mode `ref` (crop exists) |
| `[FIGURE: … \| ref: …]` / `[IMAGE: …]` | figure card (chapter-1 convention) |
| pipe table | `.tbl` inside `.tblwrap` |
| ` ``` ` fence | a **container** — its markers are dropped, contents parsed |

> A fence is not a code block here. Chapter 3 wraps figure briefs in one;
> skipping to the closing fence swallowed eight figures.

---

## 3 · The सूत्र panel — exact shape

```markdown
**सूत्र:**
- `v_d ∝ E` · अनुगमन वेग तथा क्षेत्र का संबंध · **शर्त:** नियत ताप
- `I = neAv_d` · धारा तथा अनुगमन वेग का संबंध · **शर्त:** n प्रति एकांक आयतन
```

Each bullet splits on ` · ` into **three** parts, each set differently:

| Part | Renders as |
|---|---|
| first segment, in backticks | `.fx` — the formula in a coloured bordered box |
| middle segments | `.fd` — the caption, plain, under the box |
| `**शर्त:** …` | `.fc` — condition on a coloured left rule |

The panel runs **two formulas side by side** on a full-width page and one
beside a floated note, via `columns:370px` — no layout switch to maintain.

Written as an ordinary bullet list instead, it renders as prose and the
page loses its most recognisable block.

---

## 4 · Callouts — 19 variants, one glyph each

`<emoji> **Label:** text`, all on one line. The **icon and colour come from
the type**, never from the markdown — the source writes one family with
several glyphs, and a page of a dozen callouts must read as one system.

| Emoji | Type | Emoji | Type |
|---|---|---|---|
| 🎯 | `mark` | 🛟 | `save` |
| 🧮 | `calc` | 🪜 | `step` |
| ⚠️ ⚠ | `trap` | ⭐ | `ratt` |
| 🔄 | `turn` | 🧠 | `line` |
| 🔍 | `opt` | 🔗 | `link` |
| ✍️ | `write` | 🔁 | `rep` |
| 🗝️ | `key` | 💪 | `conf` |
| 📝 | `num` | 💡 | `tip` |
| ✏️ | `fig` | ↔ | `sim` |

Labels may be Hinglish (`Board ka jaal`); the renderer prints the Hindi
equivalent from a lookup table. An unlisted marker degrades to `line`
rather than being dropped.

Three markers are **not** callouts:
`↔ **मिलता-जुलता:**` → dashed grey chip ·
`⚠ **पुस्तक से बाहर …**` / `⚠️ **स्रोत-नोट:**` → source note ·
`★ **5 साल में N बार …**` → star strip.

---

## 5 · Sticky notes float

```markdown
> #### 📌 ⚠️ Common Mistake
> ✗ first point
> ✗ second point
```

Becomes a rotated, pinned card in the right-hand `.stickycol`, **one per
page**. Colour comes from the label: *Common Mistake* / *Costly* → yellow;
*Most Asked* / *Sure-Shot* → pink; *Just Read* → green; *Derivation Steps*
→ blue; *Don't Mix* → purple. A leading `✗ ✓ ★ • ① –` becomes the row marker.

Never put load-bearing argument in a card — it floats into the margin and
can land a page away.

---

## 6 · Part 2 constructs

```markdown
### 2026

**प्र. 7**  `[1 अंक · बहुविकल्पीय प्रश्न]`  ★★ *2024 में भी आया था*

किसी चालक तार की प्रतिरोधकता निर्भर करती है [2025, 24]

a) तार की लम्बाई पर          b) तार के प्रतिरोध पर
c) तार के पदार्थ पर          d) तार की मोटाई पर

**उत्तर:** (c) …

**दिया है :** ε = 10 वोल्ट, r = 1 Ω

🎯 **Yahan 1 mark bachta hai:** …
---

> ✅ **2026 का पेपर पूरा, 18 अंक cover।**
```

| Write | Becomes |
|---|---|
| `**प्र. N**` | `.qnum` pink marker pill |
| `` `[1 अंक · 2026/set_ds · खण्ड अ]` `` | `.chip`; the marks also drive the yellow band |
| `` `[3 अंक · पुस्तक]` `` | a book question rather than a board one |
| `★★` | `.stars` |
| `*note*` after the stars | `.starnote` in Caveat |
| `a) … b) …` / `i) … ii) …` / `(a) …` | `.opts` 2-col grid, `.opts.one` when long |
| `**उत्तर:**` | green `.anslabel` pill + `.anstext` |
| `**दिया है :**` or `**दिया है, **` | `.given` with its pink left rule |
| `---` between questions | `.qsep` dashed rule |
| `> ✅ **… cover।**` | the green closing `.banner` |

**Sort questions by ascending marks inside a group.** The yellow
`1 अंक` / `3 अंक` bands are *synthesised* wherever the value changes — they
are never written. Unsorted questions make the bands thrash.

---

## 7 · Maths

* `` `inline` `` backticks, or real LaTeX `$…$` / `$$…$$`. Both work.
* Units belong **outside** backticks: `` `q/e` `` is a fraction, `N·m²/C` is
  a unit. Write `\/` for a slash that must stay flat inside maths.
* `\begin{aligned}` / `\begin{array}` are stripped, `\\` becomes a line
  break, `&` alignment markers are dropped.
* Multi-character subscripts (`\tau_{अधिकतम}`) become real `<sub>` tags.
* **Digits, operators and π are set upright** inside maths; variables stay
  italic. This is applied mechanically — do not mark it up by hand.

---

## 8 · Matrices — five notations, one bracketed grid

A matrix is not six loose numbers. `A=\begin{bmatrix}1&2&3\\2&3&1\end{bmatrix}`
that reaches the page as `A= 1 2 3` / `2 3 1` has lost the object — a reader
cannot tell a 2×3 grid from two unrelated triples. `book/format/matrix.py`
exists entirely to keep the bracket. Every notation below is real, drawn from
maths chapters that actually shipped it; none is hypothetical.

### 8.1 Decision tree — which notation is this?

```text
IF the source has \begin{bmatrix} / \begin{pmatrix} / \begin{vmatrix}
    THEN it is LaTeX-matrix notation — see §8.2

IF the source has \begin{array}{ccc|ccc} … \end{array} inside \left[ \right]
    THEN it is an AUGMENTED matrix [A | I] — see §8.3

IF the source has \begin{aligned} … \end{aligned}
    THEN it is NEVER a matrix, regardless of & count — see §8.4

IF the source has \begin{array}{l} … \end{array} with NO & in any row
    THEN it is a STACK of lines, not a matrix — see §8.4

IF a line is nothing but bracketed value groups side by side
   (`[ 3 -2 1 ] [ 3 -2 1 ]`), across 2+ consecutive lines
    THEN it is MULTI-LINE ASCII notation — see §8.5

IF one bracket pair contains semicolon-separated rows on ONE line
   (`[ a b ; c d ]`)
    THEN it is SEMICOLON notation — see §8.6

IF none of the above, and the line is still prose with an incidental
   bracket (a marks tag `[2]`, a reference `[NCERT | 4 अंक]`)
    THEN it is NOT a matrix — leave it as prose, do not force a grid
```

### 8.2 LaTeX matrix environments

```markdown
$A=\begin{bmatrix}1 & 2 & 3 \\ 2 & 3 & 1\end{bmatrix}$
```

`&` separates columns, `\\` separates rows. Renders as a CSS-grid bracketed
box — the brackets are DRAWN, not typed, so they always match the row count
exactly (a typed `[`/`]` around a 3-row matrix ends a line and a half short).

| Environment | Bracket style |
|---|---|
| `bmatrix` | square `[ ]` |
| `pmatrix` | round `( )` |
| `vmatrix` / `Vmatrix` | bars — a determinant |
| `matrix` | none |

**Several in one expression is normal**, not an edge case: `A³ − 6A² + 7A +
2I = [..] − 6[..] + 7[..] + 2[..]` — every `\begin{bmatrix}` in the string
gets its own grid, in place, left to right.

**Sizing: every matrix renders at the SAME size, always.** A long cell such
as `\cos x \cos y - \sin x \sin y + 0` is wider than a two-column page can
hold at normal size — the fix is letting it WRAP at its own word/operator
boundary (`.mx>.mxg>span` allows this), never shrinking the font. Shrinking
was tried twice (per-matrix, then shared across one expression) and both
read as worse than wrapping: a visibly smaller matrix next to normal ones on
the same page reads as a bug, even when the shrink is "consistent."
**Counterexample — do not do this:** do not add per-matrix or per-page font
scaling to fit a long cell. If a cell still will not fit after wrapping,
that is a §8.1 case to re-examine (is it really one cell, or should the
source break the expression into a numbered step?), not a font-size problem.

### 8.3 Augmented matrices — `[A | I]`

```markdown
$$\left[\begin{array}{ccc|ccc} 2&0&-1 & 1&0&0 \\ 5&1&0 & 0&1&0 \\ 0&1&3 & 0&0&1 \end{array}\right]$$
```

The column-spec argument (`{ccc|ccc}`) is REQUIRED — the `|` inside it is
what places the augment rule. Without a spec, or with `array` misread as a
plain matrix, the bar vanishes and the row-reduction steps that follow read
as commentary on nothing.

### 8.4 NOT a matrix, even with `\begin{...}`

Two shapes use matrix-looking LaTeX for something else entirely. Getting
this wrong either boxes plain sentences in brackets or drops the alignment
`\begin{aligned}` exists to create.

| Environment | What it actually is | Rule |
|---|---|---|
| `\begin{array}{l} X \\ Y \end{array}` with **no `&` in any row** | A stack of independent lines (e.g. a species next to its ion) | Render each row as its own line, no bracket. A row needs a SECOND column (an `&`) before it is data worth bracketing. |
| `\begin{aligned} … &= … \\ … &= … \end{aligned}` | An alignment block — `&` marks where `=` lines up, not a second column | Recombine each row's cells with NOTHING between them; the join is what puts the `=` back. `aligned` is **never** a matrix regardless of how many `&` it has. |

**Counterexample:** `\begin{array}{l} Ti = 1s^2\ldots \\ Ti^{3+} = 1s^2\ldots
\end{array}` rendered as a bracketed grid puts a `[` and `]` around two
unrelated electron configurations, implying a mathematical object that was
never there — and the matrix cell's font (sized for one short numeric entry)
shrinks two full equations to fit.

### 8.5 Multi-line ASCII notation — position, not reading order, pairs the rows

```markdown
[ 3  −2   1 ] [ 3  −2   1 ]   [ 1   12    8 ]
[ 4   2   1 ] [ 4   2   1 ]   [ 14   6   15 ]
```

Each **source line is one matrix row**; the Nth bracketed group on every
line belongs to the Nth matrix, sitting side by side. This is genuinely
"undetermined by reading order, determined by column position" — do not
try to linearise it into prose.

An opening line may carry prose before, between, or after its matrices:

```markdown
AB = [ 2  3 ][ 2  -3 ] = [ 1  0 ] = I।  ← पहला गुणनफल I है।
     [ 1  2 ][ -1  2 ]   [ 0  1 ]
```

**The operator between two matrices may sit on ANY row, not just the
first** — a source laid out as if printed vertically centres its `+`/`=`
on the whole matrix, which lines it up with the MIDDLE row of three, not
the top: `A + B = [row1][row1][row1]` / `[row2] + [row2] = [row2]` /
`[row3][row3][row3]`. Reading only the first line's gaps silently drops
every operator; every line must be checked.

**A cell may be highlighted or set as maths** — `[ **2x + 3** ]`,
`[ $0 - 14+22$ ]` — the author marking which entry an answer came from.
This is still a value cell, not prose; a matrix-row detector that only
accepts bare digits/letters will wrongly reject the whole row and leave it
as literal bracket text.

**Counterexample — do not widen operator-gap detection to accept
`$…$`-wrapped text between groups.** A `$-$`-wrapped operator between two
groups is character-for-character identical to the gap in an unrelated
STANDALONE line that happens to hold two semicolon matrices in one
expression (`X = 1/3 ([10 -10; 20 10; -25 5] + [-16 0; -8 4; -6 -12])`).
Loosening the gap rule to admit `$` fuses two unrelated lines into one fake
matrix purely because each held two bracket groups. If a `$…$`-wrapped
operator needs handling, unwrap it AFTER a row is already confirmed to
belong to a real multi-row block — never as part of deciding whether it is
one.

### 8.6 Semicolon notation — a matrix on one line

```markdown
[ -23  -46  -69 ; -69  46  -23 ]
```

`;` separates rows inside ONE bracket pair, for a matrix that has to fit
inline (often inside `**bold**`, which the ASCII-block reader cannot
enter). Rows separated on `;`, cells split on whitespace within a row.

- A cell may itself be `$…$` maths, spaces and all — `[ 2  $- 1$  2 ; 1  2
  4 ]`. Splitting on whitespace naively would cut `$- 1$` into two cells
  (`$-` and `1$`); the `$…$` span must be masked as one token before the
  split and restored after.
- A **bare** backslash outside any `$…$` span means this is real LaTeX the
  simple splitter does not understand — leave the whole bracket
  UNCONVERTED rather than mangle it. A backslash **inside** a `$…$` cell
  (`$\sqrt{3}$`) is fine; it is one atomic maths value.
- `\;` (LaTeX's thin space, used for row vectors like `[-1 \; 2 \; 1]`) is
  NOT this notation's separator — it is the tail of an escaped command. The
  separator is a bare `;`; the semicolon-detector must not fire on `\;`.

### 8.7 Mixed notation on one line

Chapter 3 mixes ASCII and semicolon notation ON THE SAME LINE — an ASCII
row, then a whole semicolon matrix written inline:
`[ 3  −2   1 ]   [ -23 -46 -69 ; -69 46 -23 ; -92 -46 -23 ]`. A semicolon
inside ANY bracketed group means "this group holds multiple rows," in
every context, ASCII or standalone — the two readers must agree on that
meaning rather than one of them treating `;` as a literal cell character.

---

## 9 · Figure references — every dialect the reader accepts

Six shapes reach the page. Missing shape = the raw markdown and its URL
print as literal text — this happened in a physics chapter carrying
Mathpix-exported crop URLs, 21 times, before the reader learned the
convention below.

| Write | Means | Becomes |
|---|---|---|
| `[चित्र बनाना है] चित्र 3.1` + prose brief | No scan exists; describe it for an artist | Reserved empty plate, captioned, brief kept as the figure's only record |
| `[चित्र: <brief>]` | Same as above, brief written inside the brackets | Reserved empty plate |
| `![चित्र 3.5](source_figures/x.png)` | A real local scan exists | Figure card showing the image |
| `[FIGURE: चित्र N — <caption> \| ref: <path> — <description>]` | Chapter-1-style: scan exists, description is separate from caption | Figure card, `ref` mode |
| `[IMAGE: चित्र N — <description>]` | Chapter-1-style: nothing exists, must be drawn | Reserved empty plate, `spec` mode |
| `चित्र N — ![](<url>)` | **A crop reference with NO local asset** — e.g. a Mathpix `cdn.mathpix.com/cropped/...jpg?height=…&width=…` URL that was never saved to disk | Reserved empty plate captioned "चित्र N" — **the URL is dropped, never printed** |

**On the last row — read the number OUTSIDE the brackets, not inside.**
`![चित्र 3.5](path)` puts the caption INSIDE `![…]`; the Mathpix-export
convention puts "चित्र N —" BEFORE an empty `![]()`. These are different
shapes and need different regexes — one is not a malformed version of the
other.

**A line may carry an extra "चित्र (मूल स्रोत): " prefix before the real
reference** (`चित्र (मूल स्रोत): चित्र 1.25 — ![](url)`) — a source-editor
artifact meaning "figure, original source:". Strip the prefix; it is not
part of the figure's identity.

**A single line may hold MORE THAN ONE crop reference** — `चित्र 1.26 —
![](url1) चित्र 1.27 — ![](url2)`. Split before matching; each reference
becomes its own card. Do not let a regex anchored to line-start silently
match only the first and drop the second.

### Decision tree

```text
IF the line matches `![<caption>](<local-path>)` with चित्र INSIDE brackets
    THEN it is a real scan — render the image, caption from the alt text

IF the line matches `चित्र <N> — ![...](...)` with चित्र OUTSIDE brackets
   (with or without a "चित्र (मूल स्रोत): " prefix, with or without a
   trailing (a)/(b) marker, possibly more than one per line)
    THEN there is no local asset — DROP the url/markdown entirely,
    render a reserved plate captioned "चित्र <N>" only

IF the caption text is over ~60 characters
    THEN it is a DESCRIPTION, not a label — keep it as the plate's brief,
    derive a short caption from any quoted title or a "N.M" number found
    inside it, do not print the whole description as the card's heading

IF an enumerator precedes the image on the same line — `(ii) ![...]`
    THEN keep the enumerator and show it: it says WHICH part of a
    multi-part question this figure answers, and dropping it makes
    three structures on one page indistinguishable
```

**Never fetch or embed an external image URL at build time.** Every figure
this pipeline ships is either a real local file under `source_figures/` or
a reserved plate. A remote URL in the source is evidence of what the
original crop was, not something to hotlink into the final page.

---

## 10 · Which subject a chapter gets — `book/subjects/__init__.py`

Every step's behaviour — maths handling, backtick meaning, reaction-arrow
support, splittable block types, the rubric words a lead-in label maps to —
comes from ONE profile, chosen once per chapter. Two ways a chapter gets
one:

1. **Explicit** — `--subject physics` on the CLI. This must always win.
2. **Auto-detected** — `book/subjects/detect(md_text)`, used only when no
   `--subject` was given. Counts notation signatures; see the order below.

```text
detect() decision order (first match wins):

1. \begin{bmatrix} / pmatrix / vmatrix  ≥ 4 total   → "maths"
   (checked FIRST: a maths chapter's Greek letters and fractions also
   look like physics, but nothing else has 496 bmatrix environments)

2. chem_signal = 4×\xrightarrow + 3×\underset + 3×\overset
                 + 4×\xrightleftharpoons + 2×\rightleftharpoons
   IF chem_signal > 0:
       chem = chem_signal + (\mathrm count // 8)
       IF chem >= 12 → "chemistry"
   (mathrm is a TIE-BREAKER ONLY, gated on chem_signal being nonzero —
    see the warning below)

3. latex = \frac + \vec + $$ + \int + \theta + \mu   (counts)
   bio   = 4×```चित्र-निर्देश + 3×**क्रम:** + 3×**पहचान:** + 2×**संरचना:**
   IF latex >= 20 and latex > bio → "physics"
   IF bio >= 6 and bio > latex   → "biology"

4. otherwise → DEFAULT ("physics")
```

**⚠ `\mathrm{}` is NOT, on its own, a chemistry signal.** A physics chapter
that typesets units as `\mathrm{N/C}`, `\mathrm{m}`, `\mathrm{~N}` can carry
hundreds of them — one measured chapter had 407 — with ZERO reaction
arrows anywhere in it. `\mathrm` counting toward the chemistry score
WITHOUT the `chem_signal > 0` gate silently misclassified that whole
chapter as chemistry: wrong rubric, wrong splittable rules, reaction
handling switched on for a chapter with no reactions in it. The gate exists
specifically so `\mathrm` can only ever push an ALREADY-chemistry chapter
further into certainty, never manufacture chemistry out of nothing.

**⚠ Auto-detection has NO signature for `arts` or `economics`.** A chapter
in either subject, run without an explicit `--subject`, silently falls
through step 4 to `physics`/biology-adjacent defaults — this has actually
happened, shipping three chapters under the wrong profile before it was
caught. **Any pipeline invocation for `arts` or `economics` content MUST
pass `--subject` explicitly; never rely on detection for these two.**

**Every code path that builds the final page HTML must receive and use the
resolved subject — not re-derive it.** `book/assemble/html.py`'s `build()`
once called `md_parser.parse(md_path, report=True)` with no `subject=`
argument, meaning the ACTUAL page-drafting parse silently re-ran
`detect()` from scratch even when the CLI had already been told the right
answer at step01. The fix: `subject` is now threaded through `build()` and
every step that calls it (`pipeline/step09_layout_analyzer/run.py`
included) — but this is exactly the class of bug that recurs when a new
code path reads the raw markdown a second time. **Any new function that
calls `markdown.parse()` must accept and forward a `subject` parameter; it
must never call `parse()` with `subject=None` if the caller already knows
the answer.**

---

## 11 · LaTeX spacing and escape characters

| Write | Means | Becomes |
|---|---|---|
| `~` (bare tilde) | LaTeX's own non-breaking space/tie | A plain space |
| `\,` `\;` `\:` `\ ` | LaTeX thin/medium/thick space | One thin space (the width distinction does not survive this font anyway) |
| `\!` | LaTeX negative thin space | Nothing (it only closes up a gap) |
| `\{` `\}` `\(` `\)` `\[` `\]` | Escaped literal bracket | The literal character, unescaped |
| `\%` | Escaped literal percent | `%` |
| `\\` (inside prose, not inside a matrix body) | A forced line break | A space |

**⚠ `~` is easy to get wrong because the SAME character means something
else in plain prose.** `\mathrm{~N}` is how a source writes "10⁻⁴ N" with a
protected space before the unit — ordinary LaTeX usage, extremely common
wherever units follow a superscript. But `~text~` elsewhere in this
pipeline's own markup means SWIPE-HIGHLIGHT. A sentence using two
`\mathrm{~N}`-style units — `$10^{-4}\mathrm{~N}$ से प्रतिकर्षित करते
हैं…बल $2.5\times10^{-5}\mathrm{~N}$` — left a stray literal `~` after each
"N" if the tilde was not converted during LaTeX processing, and the FIRST
stray tilde paired with the SECOND across the entire sentence: everything
between the two units — the whole sentence, the second formula — ended up
wrapped in one broken highlight span with unclosed tags. **The rule: `~`
must be converted to a plain space during LaTeX-to-Unicode conversion,
BEFORE the swipe-markup pass ever sees the string** — never leave a bare
tilde from inside `$…$`/`\mathrm{}` to survive into the general inline
pass.

---

## 12 · What the writer must never do

- No HTML, CSS or inline styles.
- No component names, colours or page breaks — accents rotate automatically,
  pagination is measured in a real browser.
- No hand-written marks bands.
- No load-bearing content inside a sticky card.
- Never contort content around a parser bug. If the source follows this spec
  and the parser gets it wrong, fix `book/readers/markdown.py`.
