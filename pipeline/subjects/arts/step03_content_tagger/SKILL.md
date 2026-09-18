---
name: step03_content_tagger
description: Decide the true kind of the arts (history/geography) blocks the tagger could not confidently classify — almost all of them are a confidence-threshold artifact (bare years, the "कूट" legend header) rather than real ambiguity, and one genuine judgment call (long descriptive prose under roman-numeral labels vs a real MCQ options block). Use when step03 reports uncertain_tag items on an arts chapter.
---

# Content Tagger — ARTS

> Subject profile: `book/subjects/arts.py`. Everything not contradicted here
> is in `pipeline/subjects/biology/step03_content_tagger/SKILL.md` and
> `pipeline/subjects/physics/step03_content_tagger/SKILL.md` (read that one
> first — the kind list, the `ctype` rules and the "never invent a kind"
> constraint are defined there and apply unchanged). The CODE is shared:
> `book/taggers/classify.py` + `book/taggers/confidence.py`.

## Rubric labels mapped so far

```python
"rubric": {"पहचान": "identify", "तथ्य": "identify"}
```

Both attested in the source — `**पहचान:** भूगोल के जनक इरेटोस्थनीज …`,
`**तथ्य:** रैटजेल — «संश्लेषित अध्ययन» …`. Same mapping biology uses for
पहचान; तथ्य ("a named fact/quote attributed to a scholar") gets the
identical treatment because it behaves the same way on the page — a
lead-in kept together, not folded into an ordinary definition paragraph.

## SHIPPED BUG: `क्रम:` chains tag as `definition`, not `flow` — the rubric has no entry for it

**This is not hypothetical. It is in both built pages today.** `grep
'\*\*क्रम:\*\*'` finds 5 occurrences — history lines 58, 63, 69; geography
lines 66, 78 — every one a `` `stage → stage → stage` `` chain, exactly
biology's process-chain shape (biology maps `क्रम`/`संबंध` to the dedicated
`flow` component, drawing a numbered vertical timeline — see
`book/components/text.py:139` and `book/subjects/biology.py`). **Arts's own
`rubric` dict above has no `"क्रम"` key at all.**

Trace, `book/readers/markdown.py` ~line 1371: a `**क्रम:**` line only
becomes `node("flow", …)` when
`_PROFILE.get("rubric", {}).get(term) == "flow"` AND the text matches
`_flow_chain()`. For arts that lookup is always `None` (never `"flow"`), so
every `क्रम:` line falls through ~30 lines later to
`node("definition", term=term, text=rest)` (line ~1402) instead. The
backtick-wrapped chain inside that `definition` then goes through
`book/format/inline.py`'s `_tick()`: because the chain mixes Devanagari
names WITH digits (years — `1875`, `1921`…), it fails the "pure Devanagari,
no digit" plain-text rescue (~line 1419) and falls to the final branch,
`<span class="m">…</span>` — **the MATHS face**, the exact mistake
biology's own `क्रम` mapping exists to prevent.

**Confirmed in the actual built HTML** —
`grep -o 'कनिंघम.\{80\}' build/arts-01-history.html`:

```html
<div class="deflead"><b class="dl">क्रम:</b></div><div class="def">
<span class="m"><span class="up">1875</span> <span class="mt">कनिंघम की
मुहर</span>-<span class="mt">रिपोर्ट</span> <span class="up">→</span> …
```

A plain `.deflead`/`.def` definition box, chain wrapped in `<span
class="m">`, not the `.flow`/`.flow-down` timeline `flow()` renders for
biology. **Mitigating factor, so this isn't as broken as it looks**: the
built CSS rule `.m .mt, .mt { font-style:normal; font-family:inherit;
font-weight:inherit; }` (`book/elements/math-inline/base.rules.json:56`)
already neutralises the italic-Georgia maths face for the Devanagari
portions — so the page does not show broken-looking italic Hindi the way
biology's pre-`flow` bug did. It is still the WRONG component: no
numbered/stepped timeline layout, no `.ft` title chip, inconsistent with
every other chain construct in the corpus.

**What YOU do if step03 flags a `क्रम:`/`संबंध:` line as `uncertain_tag`**:
tag it `definition` (that is genuinely what the current rubric produces and
the current CSS keeps legible) and say so in `why` — **do not** invent a
`flow` decision here to route around it; the tagger applies your `kind`
verbatim, and forcing `kind: flow` through a decisions file without the
`"क्रम": "flow"` rubric entry existing will not reliably reproduce
`_flow_chain()`'s own gating logic, since the flow-vs-definition branch in
`markdown.py` is evaluated by the READER at `step01`, before `step03` ever
sees the node — by the time a block reaches this step it is already
`definition`, and retagging it `flow` here only changes the *label*, not
which renderer or CSS class the assembler actually applies downstream.
**The real fix is a human code change**: add `"क्रम": "flow"` (and likely
`"संबंध": "flow"`, unattested in these two chapters but biology maps both)
to `book/subjects/arts.py`'s `rubric` dict. **You must not make that
change** — no `.py` edits from this step. Record the gap in your decision's
`why` field with the file:line evidence above so a maintainer with `book/`
write access can land it; do not silently resolve it as if `definition`
were the correct semantic kind, because it is not — it is only the correct
kind given the current code.

## Live queue, both chapters — read the actual JSON, not this table, before deciding

`build/arts-01-history/review/step03_content_tagger.open.json`: 4 items.
`build/arts-02-geography/review/step03_content_tagger.open.json`: 7 items
(one is a `stat_tiles_candidate`, not an `uncertain_tag` — different kind of
finding, see the bottom of this file). **Three of every four items in both
queues are the SAME confidence-threshold artifact, not three different new
constructs** — check which bucket a new item actually falls into before
proposing a fix.

## Decision tree

```text
IS the flagged text a bare 1–4 character token (a year: "2024", "2023",
"2022", "2020"; a legend word: "कूट") with confidence 0.3 and reason
"too short to classify from shape alone"?
    THEN it is `book/taggers/confidence.py:68-69`'s own threshold firing
    (`len(text) < 12` -> UNSURE), not a real ambiguity. Check the node in
    03_tagged.json first:
      - a bare year carries `"subhead": true` already (verified:
        parts[2].children[6].children[8].blocks[10] in geography's
        03_tagged.json is `{"kind": "para", "text": "2024", "subhead":
        true}`) — this IS the year-group banner, already correctly
        structured; the low confidence is purely the length rule.
      - "कूट" sits between a `numbered` block (the statement list) and an
        `options` block (the `(a)…(d)` answer combinations) in BOTH
        chapters, every single occurrence (history line 1018/1038,
        geography line 983/1006/1023) — it is the "Code:" legend header a
        matching/statement MCQ always prints right before its lettered
        combinations. Semantically identical to `RE_AMONG_LEADIN` in
        `book/readers/markdown.py` (which already recognises `कूट` as an
        among-these lead-in inside an active options collector) — this is
        the same word appearing as a block of its own, outside that
        collector.
    VERDICT: `para`, correct as-is, for both. Do not invent a `legend` or
    `yearhead` kind for a 3-4-character label that already renders right —
    see physics's "never invent a kind" rule.

IS the flagged text long (60+ words), starts with a roman-numeral marker
`(i)`/`(ii)`, bold-labelled, and its sibling immediately follows the SAME
shape (history: "(i) **सामान्य जीवन** …" / "(ii) **विलासी जीवन** …",
both 60-90 Hindi words of full explanatory prose)?
    Compare against FORMAT_SPEC.md §6's actual options shape: `a) तार की
    लम्बाई पर    b) तार के प्रतिरोध पर` — short, parallel, 4-8 words each,
    laid out for a 2-col MCQ grid. This arts pair is two paragraph-length
    sub-answers under a "life-style divided into two parts" lead-in — an
    answer classifying evidence into two categories, not a question
    offering the reader a choice between them.
    VERDICT: `para` (or the reader's existing structure — do not force
    `options`). Rendering 70-word paragraphs into `.opts`'s 2-col grid
    would visually announce "pick one of these two," which is the wrong
    signal for an answer that asserts BOTH categories exist. This is the
    genuine judgment call in this queue — the other three items are not.
```

## Example triad — the genuine call (roman-numeral prose vs options)

**Correct**: tag `(i) **सामान्य जीवन** …` as `para`, noting in the decision
`why` that its sibling is equal-length descriptive prose, not a short
parallel choice — matching FORMAT_SPEC.md §6's options shape only in
having a marker, not in structure.

**Incorrect**: tag it `options` because `RE_OPT_TOKEN` would technically
match the `(i)`/`(ii)` markers if a splitter ran over it — confusing "the
reader COULD parse this as options" with "this IS options." The physics
distinction table (`begins (i)/(a) and siblings follow -> options`)
assumes short, parallel, mutually-exclusive siblings; length and content
still matter, not just the leading glyph.

**Edge case**: if a future arts answer uses the SAME `(i)/(ii)` shape for
genuinely short parallel items (e.g. a two-part definition answer, each
part one line), that one probably IS `options` — the length/content
distinction above is not "roman markers are never options in arts," it is
"check what's actually between the markers before trusting the shape
alone."

## The `कूट` / Devanagari-option context worth knowing before touching either chapter's options blocks

Not a step03 decision, but background any triage here should know:
`book/readers/markdown.py` recognises TWO different Devanagari option
alphabets across the two arts chapters — history's `(क)(ख)(ग)(घ)(ङ)` and
geography's `(अ)(ब)(स)(द)` — both mapped to the same `"devanagari"` family
by `_marker_family()` (`book/readers/markdown.py:412-417`). Geography line
449 goes further: the options are lettered `(अ)(ब)(स)(द)` but the answer at
line 451 cites `(c)` — a Latin letter against a Devanagari-lettered option
list. That is a real source inconsistency, not a tagging question; if it
resurfaces, it belongs in `step05_question_analyzer`'s queue (a
misreferenced answer letter), not here.

## What to check before closing this step

- [ ] For every `too short to classify` item, check `03_tagged.json` for a
      `subhead: true` flag or its position relative to a `numbered`/
      `options` sibling before assuming it needs a new kind.
- [ ] For every `starts with an option marker` item, read the FULL text of
      both the flagged block and its stated sibling (`before`/`after` in
      the review JSON) — a marker alone does not decide the kind, length
      and parallelism do.
- [ ] Do not run this step's decisions against `formula`/`formula_box`
      distinctions from physics's table — `book/subjects/arts.py` has zero
      LaTeX and no सूत्र panels; neither kind is expected to appear.

## Never

- Never invent a kind for a bare year or "कूट" — both already render
  correctly as `subhead`-flagged `para` blocks; the low confidence score is
  `confidence.py`'s length threshold, not evidence of a rendering bug.
- Never retag long explanatory prose to `options` just because it opens
  with a roman-numeral marker `RE_OPT_TOKEN` would also match — check the
  actual word count and whether the siblings are mutually exclusive
  choices or, as here, both-true classification labels.
- Never treat `stat_tiles_candidate` (geography's `cover_tiles` item,
  `current: list`) as an `uncertain_tag` needing the same triage — it is a
  different finding kind (a cover-layout suggestion, not a mis-tag); don't
  force it through this step's decision shape.
