---
name: step01_md_reader
description: Resolve chemistry markdown structure the deterministic reader could not recognise — question heads, figure references, MCQ product labels vs option letters, chain-branch descriptions. Use when questions, figures, options or reaction arrows go missing or fall through to `para`.
---

# Md Reader — CHEMISTRY

> Read `docs/FORMAT_SPEC.md` first (§8 matrices, §9 figures, §10 subject
> detection, §11 LaTeX spacing) and `pipeline/subjects/physics/step01_md_reader/SKILL.md`
> — everything there applies unchanged. This file is only chemistry's deltas.
> The CODE is shared: one `pipeline/step01_md_reader/run.py` /
> `book/readers/markdown.py` for all four subjects, so a fix lands once — and
> every rule below names the line it lives at so you can go read it.

## Chemistry is three dialects, one profile — see step00's SKILL for the measured table

`book/subjects/chemistry.py`'s profile (`reactions: True`, `split_enumerations:
True`) is not chosen per-chapter; do not try to detect "which dialect is this"
before applying a rule below. All three areas need all of it.

## FOUR SPELLINGS THAT COST WHOLE CHAPTERS — all four now fixed, check for a fifth

Every defect below was one construct written two ways with code that knew
only one. None of these errored; each one silently deleted content. This is
the most productive check on a new chemistry chapter: **diff what the
chapter actually writes against the table below before trusting a parse.**

### 1. Question heads — bold vs H2/H3/H4 heading

`RE_QHEAD` (`book/readers/markdown.py:93`) accepts either:

```
**प्र. 1**  `[1 अंक · 2026/set_a_ea]`        ← chapters 4, 6 (organic/inorganic)
## प्र. 1  `[2026 · 1 अंक]`                   ← chapter 1 (physical), 102 times
```

**Correct:** both forms produce a `question` node.
**Incorrect (the bug that shipped):** matching only the bold form on
chapter 1 parsed **102 answers and zero questions** — every answer became an
orphan, the whole of Part 2 structurally vanished, and nothing errored.
**Edge case:** a table cell can *quote* a question head verbatim —
`| ★★★ | ## प्र. 8 \`[2017 · 2 अंक]\` … |`. `RE_QHEAD` is anchored at `^#`,
which is exactly what keeps it from firing mid-cell; do not loosen that
anchor to "catch more forms" without re-checking this table doesn't start
matching too.

```text
IF a line opens with `**प्र./Q./प्रश्न N**` OR `#{2,4} प्र./Q./प्रश्न N`
   (anchored at line start)
    THEN it is a question head, regardless of which chapter/dialect
IF the same text appears inside a table cell or mid-sentence
    THEN it is a citation, not a head — RE_QHEAD's `^` anchor already
    excludes this; do not remove the anchor
```

### 2. The trailing note after a question head

`*पूरा उत्तर यहीं*` (italic) in physics/maths; chemistry chapter 1 uses
marker-led **plain text** instead — `↩ बैंक में पहले से — वर्ष जुड़े`,
`☞ *बार-बार*  ⚠ अंक भिन्न` — on 23 of its 102 heads. `RE_QHEAD`
(`markdown.py:112-113`) tries the italic branch first, then a branch that
must open with one of `↩ ☞ ⚠ ★ ☆ →` — **deliberately not `.*`**. A permissive
tail would match ordinary prose that merely mentions a question number
(`**प्र. 5** का उत्तर देखिए`) and misread a sentence as a new question head.

### 3. Figures — three failure shapes, not one

See FORMAT_SPEC §9 for the full six-shape table; chemistry hits three of its
failure modes hardest:

- **The markdown-title spelling.** Chapters 4/6 write
  `![चित्र 6.1](source_figures/x.png)`. Chapter 1 instead adds a markdown
  TITLE after the path and puts the whole description in the alt text:
  `![चित्र 1.1 — प्रतिलोम परासरण …](figures/chitra_1_1.png "चित्र 1.1")`.
  Unsplit, the ref resolves to `figures/chitra_1_1.png "चित्र 1.1"` — a path
  with a quoted title glued on — which points at nothing, and the 200+
  character alt text becomes the caption instead of a short label.
- **A figure that answers a numbered part.** `(ii) ![चित्र 6.5](…)` — 30 of
  chapter 6's structures are literally an MCQ/short-answer part, not a
  standalone image. Keep the `(ii)` enumerator on the figure card (FORMAT_SPEC
  §9's decision tree, last branch) — dropping it makes several structures on
  one page indistinguishable as to which part they answer.
- **A figure that IS the whole answer.** `**उत्तर:** ![चित्र 6.40](…)` — 8 of
  these printed as literal markdown inside an answer paragraph before the
  answer branch learned to split the image out into its own figure node while
  keeping the `उत्तर` badge on the (now empty) text.

### 4. A body with no H3 at all — `_split_on`'s truthy empty case

`_split_on` (`markdown.py`) returns `[(None, body)]` when it finds no matching
heading — and that single-element list is **truthy**, so a caller testing
`if h3_titles:` took the "has sections" branch and ran the plain scanner,
which has no question handling. Chapter 1 parses each year as an H1 with
`## प्र. N` directly beneath and **no H3 anywhere** — so this bug alone left
91 of its 102 questions as loose paragraphs while their 102 answers parsed
fine: a chapter of answers with nothing to answer. Fixed by testing `h3` (the
actual split), not `h3_titles` — see `markdown.py:2318` vs `:2341`'s
`_is_question_part(body)` fallback, which is what chapter 1 now falls to.

**Final measured counts after all four fixes: 102/102, 78/78, 137/137
question/answer pairs; 76 of 78 chapter-6 figures resolved** (the remaining
two are genuinely missing source scans, not a parser gap).

## Two more shapes that look like markers and are not

Both found by the same symptom: an options or answer block splitting into
more pieces than the source actually has.

### `(A)` / `(B)` as reaction PRODUCTS, not MCQ option letters

Organic chemistry's commonest question form names its unknown products with
exactly the letters an MCQ uses for options:

```
(i) $C_2H_5Br \xrightarrow{KOH(aq)} (A) \xrightarrow[\Delta]{...} (B)$
```

`opt_tokens` (`markdown.py:331`) used to match `(A)` and `(B)` here and cut
this ONE reaction option into three pieces — with the cut falling **inside**
the `$...$` pair, leaving an unclosed `$` in the first fragment and an
unopened one in the last, so neither half converted: literal
`$\mathrm{C}_2\mathrm{H}_5\mathrm{Br}` printed on the page next to a
correctly-rendered arrow.

```text
IF a `(LETTER)` token sits INSIDE a maths span ($...$ or `...`)
    THEN it is chemistry notation for an unknown species — never an option
    marker, whatever letter is used
IF a `(LETTER)` token sits OUTSIDE any maths span
    THEN it is a candidate option marker — subject to the family check below
```

`_math_spans` masks every `$...$`/backtick run before `opt_tokens` even looks
for markers (`markdown.py:373-375`) — this is the general mechanism, not a
chemistry special case, so do not add a chemistry-only guard on top of it.

### An enumerated citation is not an options list

`प्रश्न 5 (ii) देखें` cites *another* question's part, not this answer's own
next part. `_RE_QREF_BEFORE` (`markdown.py:401`) excludes any marker
immediately preceded by `प्रश्न \d+` — this is generic citation notation
(any subject says "see question N part X"), not chemistry vocabulary; do not
special-case it as one.

## Enumerated reactions on ONE source line — `split_enumerations`

`निम्नलिखित अभिक्रियाओं के अभिकारक लिखिए : i) … ii) … iii) … iv) …` arrives
as one line carrying four complete reactions. `_split_enumerated_run`
(`markdown.py:2616`) requires **3 or more** markers of the same family, in
order with no repeats — two could be a citation (`समी (i) व (ii) से`), three
or more of a genuine enumeration is not. Gated on `_PROFILE.split_enumerations`
(`chemistry.py`'s profile flag) because a 2-marker run is legal prose in every
subject and must not be torn apart.

```text
IF a paragraph/answer contains ≥3 markers of ONE family (i)(ii)(iii)... or
   A. B. C. ..., all distinct, in ascending order
    THEN split into one block per marker — each is a separate reaction/part
IF fewer than 3, or the labels repeat, or they are out of order
    THEN leave as one paragraph — it is prose citing markers, not a list
```

## Chain-plus-description → drawn structure is a step07 job, not step01's

A line like `$CH_3-C-CH_2Br$` followed by `(केन्द्रीय कार्बन से ऊपर तथा नीचे
एक-एक $CH_3$ जुड़ा है।)` is TWO source blocks that must be read together before
either can become a drawing. `draw_structures` (`markdown.py:2449`) only
recognises the grammar `_CHAIN_DESC_RE` / `_DESC_ONLY_RE` describes (an
ordinal, a direction, `जुड़ा है`) — when it does not match, the text is left
exactly as written, because a branch drawn on the wrong carbon is a
*different compound*, not a formatting defect. Do not try to widen this
regex to catch more phrasing; see `pipeline/subjects/chemistry/step07_formatting_agent/SKILL.md`,
which is where the remaining ~44 of 47 descriptions (the ones inside a live
reaction arm, needing comprehension the regex cannot do) actually get handled.

## What to check on a new chemistry chapter, in one pass

```bash
grep -c '^\*\*प्र\.\|^#\{2,4\}\s*प्र\.' content/<name>.md   # vs "question" in 01_read.json
grep -c '^\*\*उत्तर' content/<name>.md                       # vs "answer"
grep -c '\\xrightarrow\|\\underset\|\\overset' content/<name>.md   # vs reaction constructs in inline HTML
grep -c '!\[चित्र\|\[FIGURE:\|\[IMAGE:' content/<name>.md    # vs "figure"
```

A mismatch is the finding. Report the number, not an impression — that is
how all four defects above were actually found.

## Never

- **Never assume the bold question-head form is the only one.** A chapter
  written by a different transcriber uses H2/H3/H4 just as validly — check,
  don't assume.
- **Never widen `_CHAIN_DESC_RE`/`opt_tokens` to catch a new phrasing without
  re-testing the cases that already work.** Both regexes were tuned against
  real defects (the `(A)`/`(B)` product-label collision, the reference-chain
  false positive) and a naive widening reintroduces one of them.
- **Never contort chemistry content to fit the reader.** If the source
  follows a documented convention and still parses wrong, the fix is
  `book/readers/markdown.py`, never the markdown.
- **Never treat a drawn-structure description as this step's job.** A chain
  description that does not match the grammar stays prose here; deciding
  whether to hand-draw it is `step07_formatting_agent`'s call, not step01's.
