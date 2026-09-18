---
name: step16_content_integrity_verifier
description: Words that are not missing in chemistry — a reaction label repositioned above its arrow, and a chain-description sentence replaced by a drawn structure but preserved in data-desc. Use when step16 reports missing_text or duplicated_text on a chemistry chapter.
---

# Content Integrity Verifier — CHEMISTRY

> Read `pipeline/subjects/physics/step16_content_integrity_verifier/SKILL.md`
> first — the word-count method (not sequence diffing), the
> `TRANSLATED`/`SCAFFOLD` categories, and the "assume loss until proven
> otherwise" doctrine all apply unchanged. This file is chemistry's deltas.

## Words that are not missing

A reaction's reagent or condition, moved above/below its arrow by
`format/reaction.py`, is still in the document — it is simply no longer
ADJACENT to the words it sat between in the source sentence. A naive
adjacency check reports it as vanished. Count it as present: the word-count
method (count on both sides, report the deficit) is immune to this by
construction, which is exactly why it replaced the two earlier
sequence-based designs — see the physics SKILL's explanation of why.

## A drawn structure's replaced sentence survives in `data-desc` — check there before flagging it lost

When `step07_formatting_agent` replaces a chain-description sentence
(`(चौथे कार्बन से ऊपर की ओर Br जुड़ा है)`) with a drawn `.cst` grid, the
sentence's words leave the visible page — a naive text check would call
every one of them vanished. `format/structure.py`'s `parse_fence` carries
the original sentence through as `src`, and `components/math.py`'s
`chem_structure` (`math.py:249-274`) attaches it as a `data-desc` attribute
on the rendered `.cst` element. `book/validators/integrity.py:214`'s
`_ATTR` regex explicitly reads `data-desc` (along with `data-fig`, `data-ref`,
`alt`, `title`) as content — so these words are correctly counted as present,
not vanished, **as long as the structure fence actually carried `src:`**.

```text
IF a chain-description's words show as `missing_text` after it became a
   drawn structure
    THEN check the ```संरचना``` fence for a `src:` field. If it is missing,
    that is the real defect — the agent who drew the structure did not
    carry the replaced sentence forward (see step07_formatting_agent's
    SKILL — `src` is documented as required precisely so this check has
    something to find). Fix: add `src:` to the fence, not a tolerance here.
IF `src:` IS present and the words still show missing
    THEN this is a genuine `_ATTR`/integrity regression — the attribute
    scan is not finding them; escalate as a code finding, not a content one.
```

## `vanished` must still be 0 for prose

Same as every subject: figure descriptions and HTML comments are not prose
and are already excluded from the count (`SCAFFOLD`), which is what keeps
this check honest rather than noisy — counting them gave a false 49 in
biology and 59 in maths before the exclusion existed. For chemistry
specifically, a structure's `data-desc` sentence is prose that DID move into
an attribute on purpose (see above) and correctly counts as present rather
than being excluded like a figure caption would be.

## Never

- Never widen `SCAFFOLD` to exclude a `data-desc` chain-description sentence
  "to make the count cleaner" — those words are deliberately still counted,
  via the attribute scan; excluding them would blind the check to a real
  loss if a future structure fence drops its `src` field.
- Never accept a `missing_text` finding on a chemistry chapter without
  checking whether the missing words belong to a reaction (repositioned,
  not lost) or a drawn structure (moved to `data-desc`, not lost) before
  concluding it is real.
