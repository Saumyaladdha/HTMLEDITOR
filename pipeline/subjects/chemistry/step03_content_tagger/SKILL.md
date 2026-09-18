---
name: step03_content_tagger
description: Tag chemistry rubric labels (सूत्र, त्रिक, क्रियाविधि, पहचान) and decide what a "**सूत्र:**" panel actually contains — formulae, reactions, reagents or uses each need a different title and a different component shape.
---

# Content Tagger — CHEMISTRY

> Read `pipeline/subjects/physics/step03_content_tagger/SKILL.md` first — the
> `formula` vs `para` vs `callout` distinctions there apply unchanged. This
> file is chemistry's deltas: the rubric table, and one decision the code
> already makes that you need to be able to check and override.

## The rubric, pooled across all three areas

Pooled deliberately — chapter 1 (physical) uses `सूत्र`, `त्रिक` and `सीमा`
together in one section, so splitting the rubric by area would first require
detecting the area, and the three areas are not separable (see step00's
measured table: every chapter uses several rubric words from different areas
at once).

| label | component | why |
|---|---|---|
| `सूत्र`, `मानक परिणाम` | `formula_card` | a ` · `-separated LIST of formulae — three results on one line printed as one run-together definition otherwise |
| `त्रिक` | `trio` | quantity · symbol · unit, three fields on one line — same construct physics has |
| `सीमा`, `शर्त` | `condition` | where a formula stops being true — measured as the single commonest source of a lost mark |
| `अभिक्रिया`, `क्रियाविधि`, `पद` | `flow` | a mechanism IS an ordered sequence of steps |
| `पहचान`, `काइरलता` | `identify` | what to name in the answer |
| `संरचना`, `अनुनाद` | `structure` | resonance forms are a structure, plural |
| `क्रम`, `संबंध` | `flow` | a preparation route |

## The rubric label lies about what is on a `**सूत्र:**` line — 4 shapes, one heading

Chemistry writes four genuinely different things under the same `सूत्र:`
label, and the code (`_panel_title` in `book/readers/markdown.py:473-508`)
retitles the panel **from its content**, not from the label the author typed
— because calling all four "सूत्र" tells a student to memorise a reagent
list as though it were a set of formulae to derive from.

```text
IF ≥ half the panel's rows contain a reaction arrow (→ ⟶ ⇌ ⟷ or
   \xrightarrow / \longrightarrow)
    THEN retitle "अभिक्रिया" — this is a reaction list, not formulae

ELIF ≥ 2/3 of rows END in Devanagari text (after the formula)
    THEN retitle "उपयोग" — `CH₂Cl₂ पेन्ट हटाने में` is a compound and its
    USE, and rendering it as a boxed formula-to-memorise is wrong

ELIF every row is a bare chemical species (element symbols + digits/
   subscripts, e.g. `X₂/निर्जल FeX₃`) with NO `=` in any row
    THEN retitle "अभिकर्मक" — these are the reagents that DO the
    reaction, not an equation to solve

ELSE
    keep the author's own term (सूत्र, मानक परिणाम, …) — it really is a
    list of formulae to memorise
```

**Correct example** (retitled to अभिक्रिया):
```
**सूत्र:**
- `R—OH + HX/निर्जल ZnCl₂ → R—X + H₂O`
- `R—OH + HX ⎯⎯[निर्जल ZnCl₂]⟶ R—X + H₂O`
```
Two of two rows carry an arrow → retitled. Boxing these as formulae (the
literal label) would tell a student four reaction equations are things to
derive by algebra rather than reactions to complete.

**Incorrect (what NOT to do):** do not hand-tag a सूत्र panel's `ctype`/title
from the emoji or label alone when the code's content-based retitle already
ran — check what `_panel_title` actually decided (grep the built HTML for
`class="ft"` near the panel) before overriding it. The retitle looks at
row SHAPE, and overriding it back to the literal label because "the source
said सूत्र" reintroduces the defect this exists to fix.

**Edge case:** a `**सूत्र:**` line holding exactly ONE reaction (not a list)
never reaches the panel branch at all — a single result falls through to a
plain `definition` node whose `term` is "सूत्र", mislabelling one equation as
"formula". `markdown.py:1396-1401` catches this specific case too: a
`formula_card`-rubric term whose body contains an arrow gets its term
rewritten to "अभिक्रिया" even as a lone definition, not just inside a panel.

## `(A)` / `(B)` inside a reaction is not an options marker — see step01

If you are tagging a block that looks like it should be `options` because it
contains `(A)` and `(B)`, check first whether those letters sit **inside** a
`$...$`/backtick maths span (`(i) $C_2H_5Br \xrightarrow{...} (A) ...$`) — if
so it is a chemistry unknown-product label, not an option marker, and the
block is `formula` or `para`, not `options`. Full detail in step01's SKILL.

## Never

- Never tag a सूत्र panel's title by the literal source label once the code
  has retitled it by content — the retitle exists specifically because the
  label lies about the content in a quarter of cases.
- Never invent a new rubric word mapping without checking whether it already
  pools into an existing one (`flow`, `identify`, `structure`) — the pooled
  rubric is deliberate; a new per-word component multiplies the "98 elements
  differing only in column count" problem this design was built to avoid.
- Never retag `(A)`/`(B)` product labels as options because they "look like"
  MCQ letters. Position (inside vs outside a maths span) is the only signal
  that reliably distinguishes them — see step01.
