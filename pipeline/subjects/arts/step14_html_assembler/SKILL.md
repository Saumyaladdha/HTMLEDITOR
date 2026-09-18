---
name: step14_html_assembler
description: Assemble arts HTML. Use when a cover card renders as the wrong shape, or content is lost between draft and final.
---

# Html Assembler — ARTS

> Subject profile: `book/subjects/arts.py`. Everything not contradicted here
> is in `pipeline/subjects/biology/step14_html_assembler/SKILL.md`, and the
> CODE is shared.

## Fault fixed here: a genuine step-table rendered as a meaningless bars chart

**Symptom**: geography's "✅ किस क्रम में पढ़ना है" cover card — a five-row
`| क्रम | क्या करना है | कहाँ |` table, a numbered procedure to follow in
order — rendered as a BARS chart: five coloured progress bars under each
row, representing no value at all, instead of the green circled-number
steps card every other subject's version of this exact card gets (compare
chemistry's `✅ किस क्रम में पढ़ना है`, which correctly renders as steps).

**Root cause**: `_card_role()` in `book/assemble/render.py` checks
`_numeric_col(rows)` — "does the LAST column hold short numeric values" —
BEFORE the `numbered`-first-column check, specifically so a genuine
value-distribution table (marks-by-count) is not mistaken for a numbered
procedure (this priority itself was a prior fix, made against chemistry's
own marks-distribution card — see `book/assemble/render.py`'s own history).
`_numeric_col`'s test was `len(cell) <= 26 and any digit anywhere in it`.
Chemistry's two-column step table (`क्रम | क्या करना है`) has no third
column for this to false-positive on. Geography's THREE-column version adds
a `कहाँ` (location) column — `भाग 1 · 1.8`, `भाग 2 · 2025 · प्र. 9` — a
reference, not a value, but short (12–21 chars) and containing a digit
somewhere, so it satisfied the old test and the whole table got
bar-charted.

**Fix**: `_numeric_col` now requires the cell to START with a digit
(`re.match(r'\s*[0-9०-९]', cell)`), not merely contain one. `22`, `5 अंक`,
`1.8` — genuine values — still match. `भाग 1 · 1.8` — opens with a word —
no longer does. Verified: chemistry's own bars/steps cards unaffected (its
value columns already started with the digit); geography's step card now
renders as green numbered circles.

**The general lesson for a new arts chapter**: a `कहाँ`/location reference
column is common in arts's own step-table convention (chemistry and
physics's step tables tend to be two-column). If a NEW three-column
variant appears and still misclassifies, check whether the LAST column's
cells open with a digit before assuming `_numeric_col` needs another
change — the fix here is specifically about column POSITION of the digit,
not its presence.

## Figure cards survive assembly untouched — verified, not assumed

Per FORMAT_SPEC §9, a figure reference becomes a reserved plate or an image
card during `step01`, well before this step runs; `step14`'s job is only to
not lose it on the way to `build/<stem>.html`. History carries 7 real
figure references (4 `[FIGURE:`, 3 `[IMAGE:`), geography carries **0** —
confirmed by grep against both content files, not by profile assumption.
The byte-count invariant (`bytes >= draft bytes`) holds on both real builds:
history assembles to 2,594,201 bytes across 21 pages, geography to
2,584,899 bytes across 20 pages, both `>=` their `09_layout` draft — so
nothing in `_card_role()`, slot-filling or placement application is eating
a figure card on its way through. If a future arts chapter's figure count
drops between `01_read.json` and the final HTML, that is this step's
problem to bisect (`14_assembled.json`'s byte count vs `09_layout`'s), not
step16's — content lost inside a component the assembler already had.

## State otherwise

Slot-filling and placement application are subject-agnostic; nothing else
arts-specific found (0 art slots reserved so far, since no decorator
placement has been accepted yet — see `step11`).
