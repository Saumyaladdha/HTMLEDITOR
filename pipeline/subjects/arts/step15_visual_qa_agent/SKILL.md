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
