---
name: step08_content_assignment
description: Assign a component to an arts semantic kind that has none — matching-type (सूची I/II), कथन–कारण (Assertion–Reason) and source-based questions all already reuse an existing component; know why before proposing a new one, and know this step is NOT where the open क्रम/flow gap lives. Use when step08 reports unassigned kinds or a broken component name.
---

# Content Assignment — ARTS

> Subject profile: `book/subjects/arts.py`. Everything not contradicted here
> is in `pipeline/subjects/biology/step08_content_assignment/SKILL.md` and
> `pipeline/subjects/physics/step08_content_assignment/SKILL.md` (read that
> one first — the semantic-kind-to-component table, the "prefer reuse" rule
> and the `verify()` hard-fail contract are defined there and apply
> unchanged). The CODE is shared: `pipeline/step08_content_assignment/run.py`,
> `book/format/assignment.py`. `MAP` carries no subject gating at all
> (confirmed by reading the file in full) — one flat `kind -> component`
> table shared by every chapter in the corpus, so a row added here is
> available to every other subject too.

## What this step decides, and how it differs from step07

Both steps read `07_formatted.json`/`08_assigned.json` and both can report an
unhandled kind, but they answer different questions:

| | step07 (`rules.py`) | step08 (`assignment.py`) |
|---|---|---|
| decides | attributes: atomic / density / accent / emphasis | which literal component renders the kind |
| gets it wrong, silently | falls back to `DEFAULT` — no error anywhere (and, per `step07_formatting_agent`'s SKILL.md, `fmt` is not read by the renderer today regardless) | **cannot** fail silently — `component_for()` returns `None`, `apply()` reports it `unassigned`, and a component name not in `book/components/__init__.py` fails `verify()` and the whole build **fails hard** |

A missing formatting rule degrades a block's look. A missing assignment
degrades it to **nothing rendering at all**, or a build that does not
finish — which is why this step is the higher-priority one to keep clean.

## State, measured on both chapters

`unassigned=0 · broken=0 · overrides=0` — verified against
`build/arts-01-history/review/step08_content_assignment.open.json` and the
geography equivalent (`"count": 0, "items": []` in both). Every kind arts's
reader actually emits already has a `MAP` row:

| kind | history | geography |
|---|---|---|
| `para` | 184 | 165 |
| `question` | 66 | 56 |
| `callout` | 56 | 76 |
| `answer` | 66 | 58 |
| `options` | 35 | 32 |
| `definition` | 11 | 12 |
| `bullets` | 18 | 8 |
| `athava` | 3 | 12 |
| `table` | 5 | 3 |
| `figure` | 7 | 0 |
| `given` | 0 | 0 |

No `flow`, no `matrix_art`, no `formula*`, no `marks_band`, no `simchip`, no
`starbadge` — arts has none of biology's process chains or physics's maths
kinds today (see below for why `flow` specifically is absent). **`given` is
a real, expected zero, not a gap**: it is physics's "data provided" line for
a numeric problem (`ε = 10 वोल्ट, r = 1 Ω`); arts has no numeric problems to
supply data for, so the row sits in `MAP` unused rather than missing.

## This step is NOT where the open `क्रम:` gap lives — checked, worth recording why

`step01_md_reader` and `step07_formatting_agent`'s SKILL.md files document a
real, currently-shipping gap: `book/subjects/arts.py`'s `rubric` dict has no
`"क्रम": "flow"` entry, so all five of arts's excavation/philosophy timelines
(`content/arts_01_history_print_ready.md:58,63,69`,
`content/arts_02_geography_print_ready.md:66,78`) arrive at the reader
already tagged `kind="definition"`, never `kind="flow"`. It would be
reasonable to guess this step is a second place that gap needs fixing — it
is not. `book/format/assignment.py:21` already maps `"flow": "flow"`
(inherited from biology, unconditional, not subject-gated). **If
`"क्रम": "flow"` is ever added to `arts.py`'s rubric, this step needs NO
change at all** — a `flow`-kind node would be assigned the `flow` component
correctly on the very next build. The two places that DO need a `.py` edit
for that fix are the rubric dict (`arts.py`) and the missing `RULES` row in
`book/format/rules.py` (`step07`'s gap, a formatting default, not an
assignment one) — do not duplicate effort by looking here too.

## Arts's distinctive question shapes all reuse an existing component

FORMAT_SPEC §6 does not name any of these three; they are genuinely arts's
own, and none of them needed a new row.

**कथन–कारण (Assertion–Reason)** — `content/arts_01_history_print_ready.md:127-135`:

```markdown
कथन – हड़प्पा सभ्यता के अन्य समकालीन सभ्यताओं में व्यापक व्यापार सम्बन्ध थे।
कारण – कांस्ययुगीन सभ्यतायें विस्तृत विनिमय नेटवर्क से प्रवालित थीं।
(i) A और B दोनों सही हैं और B, A का सही स्पष्टीकरण है।
(ii) A और B दोनों सही हैं, परन्तु B, A का सही स्पष्टीकरण नहीं है।
(iii) A सही, परन्तु B गलत है।
(iv) A गलत, परन्तु B सही है।
```

The कथन/कारण pair is plain prose (`para`), and `(i)…(iv)` already matches
FORMAT_SPEC §6's `i) … ii) …` options shape — no A-R-specific markup needed.
Verified in the built page: `<div class="opts one">` with the four choices,
the same component every MCQ in the corpus uses.

**सुमेलित (matching, List I / List II)** — `content/arts_01_history_print_ready.md:1031-1041`:
a two-column pipe table followed by a `कूट` answer-code block:

```markdown
| सूची I (प्राप्त साक्ष्य) | सूची II (स्थल) |
|---|---|
| A. मिट्टी के हल | 1. मोहनजोदड़ो |
| B. जुते हुए खेत | 2. बनावली |
...
कूट
    A B C D       A B C D
(a) 2 3 4 1   (b) 2 3 1 4
```

The List I/II grid is an ordinary pipe table → `table` kind → `table`
component, unmodified. **Edge case, and it is genuinely minor:** the `कूट`
line and its two-column `A B C D` header collapse into one plain
`<p class="q">कूट A B C D       A B C D</p>` (verified in
`build/arts-01-history.html`), literal internal spacing and all — nothing in
the reader recognises a matching-question's answer-key header as its own
shape. Not worth a components fix: it degrades to readable prose, and the
actual `(a)…(d)` answer codes render correctly through `options` right below
it. Recorded here so a future agent recognises the shape rather than
mistaking it for corruption.

**Source-based questions** (`*(स्रोत-वर्ग: बोर्ड)*` / `*(स्रोत-वर्ग: पुस्तक)*`
tags, both chapters, dozens of occurrences) are a plain italic line — `para`
— tagging where a question came from, not a distinct question type with its
own layout. Do not confuse this with `⚠ **स्रोत-नोट:**` (FORMAT_SPEC §4), a
genuine callout with its own row already.

## Decision tree

```text
IS a new arts kind flagged `unassigned`?
    Check `book/format/assignment.py`'s `MAP` first — arts has introduced
    zero genuinely new kinds so far; every distinctive shape (matching,
    कथन-कारण, source-based) reused an existing kind at the TAGGING stage
    (step03), not here. An `unassigned` finding on an arts chapter most
    likely means step03 assigned a genuinely novel kind name, not that
    this step's table is behind.

IS the flagged kind semantically close to an existing mapped kind
   (e.g. a hypothetical arts-specific "comparison table" kind)?
    Reuse the nearest component (`table`, `refbox`, `definition`) per the
    physics SKILL's "prefer reuse" rule — every arts shape measured so far
    has passed this test; a matching table is still a table, an A-R MCQ is
    still an MCQ.

IS `broken` non-zero (a component name in MAP that book/components
   doesn't actually export)?
    A codebase-wide integrity failure, not an arts-specific one —
    `verify()` checks every subject's MAP the same way. Report it; it is
    not something a per-subject SKILL file would ever cause on its own.
```

## What to check

- [ ] `count: 0` in `step08_content_assignment.open.json` for both chapters
      — if a finding appears, confirm which stage introduced the new kind
      (step03's tagger, not this step) before proposing a fix.
- [ ] `assignment.verify()`'s `broken` list is empty.
- [ ] If the `क्रम: → flow` rubric fix ever lands upstream, re-run this step
      once and confirm `unassigned` stays 0 — it should, per the `MAP` row
      already existing; if it does NOT stay 0, that would itself be a new,
      real finding worth investigating.

## Never

- Never add a component mapping here to work around a kind mis-tagged
  upstream (like `क्रम:` chains arriving as `definition`). The kind is
  wrong before it reaches this step; mapping the WRONG kind only cements
  the wrong classification further downstream.
- Never point a kind at a component whose markup does not fit — a सुमेलित
  List I/II table rendered through `para` would print a literal
  pipe-delimited string instead of a grid.
- Never build a dedicated component for the `कूट A B C D` header shape on
  the strength of one occurrence. It degrades to readable prose today; a
  new component is worth it only once a real chapter shows the header
  losing information plain text cannot carry.
- Never assume "clean here" means "no arts formatting gap exists" — as the
  `क्रम:` case shows, a gap can be entirely upstream (the reader's rubric)
  or downstream (`render.py` never reading `fmt`, per `step07`) while this
  step's own table is completely correct and uninvolved.
