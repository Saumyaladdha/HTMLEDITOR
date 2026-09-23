---
name: step04_content_namer
description: Resolve chemistry id collisions — sections keep the same shape physics uses; the three drawn-chemistry kinds (structure, ring, rxn_smiles) fall back to a generic 4-letter abbreviation because they are not in naming.py's table.
---

# Content Namer — CHEMISTRY

> Read `pipeline/subjects/physics/step04_content_namer/SKILL.md` first — the
> stable/unique/readable priority and "fix the content, not the suffix"
> doctrine apply unchanged. This file is chemistry's deltas.

## Sections name themselves the same way as physics

A chemistry section is `1.3 विलयनों की सांद्रता को व्यक्त करना ☞ *बार-बार* ·
**[19 बार · 5, 3, 2, 1 अंक]**` — the same shape physics and maths use, so
`_section_meta` handles it unchanged once step01 has correctly recognised the
heading as a section rather than a question head (chemistry's H2/H3/H4
question-head ambiguity is step01's problem, not this step's — see its
SKILL).

## Species names carry real meaning here

`1-ब्रोमोप्रोपेन` and `2-ब्रोमोप्रोपेन` differ by nothing else in an answer —
the locant is the entire content of the distinction — and that name is
carried by `\underset{name}{formula}` under the formula it labels (see
`book/format/reaction.py`'s `species()`), not by the id. Do not try to fold
the species name into a block's id to "make it more readable"; the id's job
is structural position (`p2.g2026.q4.answer`), and the chemistry content that
actually distinguishes two answers belongs in the rendered `.sp-u` name, not
in the id string.

## The three drawn-chemistry kinds are not in `_ABBR`

`book/taggers/naming.py:23-29`'s `_ABBR` table maps `formula → eq`,
`table → tbl`, and so on for every kind the OTHER three subjects use. It has
**no entries for `structure`, `ring` or `rxn_smiles`** — the three IR kinds
`step07_formatting_agent` produces from a ```संरचना```/```रिंग``` fence (see
that step's SKILL and `book/core/ir.py:39-42`). They still get a stable,
unique id — the fallback is `kind[:4]` (`assign()` in `naming.py:49`), so a
drawn structure becomes `...stru1`, a ring `...ring1`, a reaction-SMILES
`...rxn_1`. This is not broken — ids are still stable and unique — but it is
noticeably less readable than the rest of the table (`eq`, `fbox`, `tbl`), and
worth being aware of when reading a review queue full of `p2.g...stru2`
entries: they are drawn organic structures, not a typo.

## Never

- Never hand-edit `_index`; it is regenerated every run.
- Never fold chemistry-specific content (a species name, a locant) into an
  id string. The id is positional; the content belongs in the rendered node.
- Never make an id depend on page number or pack position — pagination
  moves, and chemistry chapters with heavy structure-image density
  (organic, ~78 images in one measured chapter) repaginate more than most
  when a figure's actual asset size differs from its reserved slot.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below.

Naming is unchanged by the reference work, with one thing to know: a
`.qhead` now carries `id="q-N"`, so a question's number is an ANCHOR that
prose links to (`#q-73`). Whatever you name a question, the number itself
has to keep matching what the markdown wrote, or a cross-reference in an
answer points at nothing.
