---
name: step00_extract
description: Fetch the source plates a biology chapter needs, and write every figure reference in a form step01 can actually resolve. Use when figures are missing on disk, when a figure reference reaches the page as un-rendered text, or before writing a new biology chapter's markdown.
---

# Extract — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not — everything not contradicted here is in
> `pipeline/subjects/physics/step00_extract/SKILL.md`, and the CODE the step
> runs is shared (there is one `pipeline/step00_extract/run.py` path for both
> subjects), so a fix to the underlying reader lands once for every subject.
> **Read `docs/FORMAT_SPEC.md` §9 (figure dialects) and §10 (subject
> detection) before writing anything.** Those sections are the exhaustive
> contract for every figure shape the reader understands and how a chapter's
> subject profile is chosen; this file only adds what is BIOLOGY-specific.

## What this step is for

This is the **only judgment step in the pipeline** — every step from
`step01_md_reader` on is deterministic (same bytes in, same bytes out).
There is no `run.py` here to defer to: the agent IS the implementation.
Two responsibilities:

1. Turn the raw source (a Word doc, PDF, or a rough transcript) into ONE
   reader-edition markdown file, `content/<NN>_reader_edition.md`, matching
   the shape `docs/FORMAT_SPEC.md` defines.
2. For every figure that chapter references, either locate the real source
   plate on disk, or write a brief a human illustrator could draw from —
   there is no third option, and no figure may be silently skipped.

## Why it matters more here than in physics

Biology is figure-led, not equation-led. Measured on chapter 1: **21 image
references resolving to 9 unique files** under `source_figures/`, against
physics chapter 4's zero image references. Physics can lose a plate and the
derivation still teaches the concept from the equations alone; a biology
answer that says "नामांकित चित्र बनाइए" (draw and label the figure) has
**no other content** — losing the figure loses the entire answer.

Eleven of chapter 1's figures also carry a ` ```चित्र-निर्देश``` ` fence
naming the NCERT plate they came from (see `book/readers/markdown.py`'s
handling of this construct). That fence is the ONLY description of the
artwork that exists anywhere in the source, so it MUST be retained on the
figure's `figure_brief` IR block even when it renders to nothing visible —
deleting it because "it doesn't render" destroys the one record of what the
picture was supposed to show.

## Decision tree — for every figure reference found in the source

```text
FOR EACH figure mentioned in the raw source:

  IS there a scanned/cropped image file that already exists on disk
  under source_figures/ (or is named in a ref: tail)?

    YES → write `![चित्र N](source_figures/<exact-filename>.png)`
          (chapter-1-style: `[FIGURE: चित्र N — <caption> | ref: <path> —
          <full description>]` is ALSO valid and preferred when the
          caption and the illustrator's description need to stay
          separate — pick ONE convention per chapter and use it
          consistently throughout, never mix both for the same figure)
          → CONTINUE to "path must resolve" check below

    NO, but a URL from the extraction tool (Mathpix, or similar) names
    where the crop WOULD be, with no local file saved
        → DO NOT invent a `![...](url)` reference pointing at that
          external URL. It will never be fetched at build time (see
          FORMAT_SPEC §9's rule against hotlinking) and will print
          literally if the exact `चित्र N — ![](url)` shape is not used.
        → Either (a) actually save the crop under `source_figures/`
          and reference it locally, per FORMAT_SPEC §9's real-scan
          row, or (b) write it as a reserved-plate reference the
          reader already knows how to drop the URL from — see
          FORMAT_SPEC §9's "crop reference with no local asset" row —
          and NEVER write it as prose with the raw URL inline.

    NO real image exists, and none will be created for this build
        → write `[चित्र बनाना है] चित्र N.M` followed by a full
          prose brief: every object to draw, every label, every
          arrow, in enough detail that an illustrator who has NEVER
          seen the source could draw it correctly. See "Writing a
          brief" below.

  PATH MUST RESOLVE: after writing the reference, confirm the exact
  filename exists at that exact path (case-sensitive, extension
  included) — see "What to check" below. A path that does not resolve
  is indistinguishable, on the rendered page, from a figure nobody
  ever asked for: both show an empty box with no error.

  DOES the figure illustrate a MULTI-PART question (`(i)` / `(ii)`
  each with its own figure, or an enumerated sub-answer)?

    YES → keep the enumerator attached to the image reference on the
          same line — `(ii) ![चित्र 6.5](source_figures/x.png)`.
          Dropping the enumerator makes several structures on one
          page indistinguishable; this is not decoration, it is the
          only thing that says which part of the question this is
          answering.

  DOES this figure ALSO carry a ```चित्र-निर्देश``` fence citing an
  NCERT plate number?

    YES → keep the fence intact even though it renders to nothing —
          it is retained on `figure_brief`, the chapter's only
          surviving record of which real textbook plate this was.
          Never delete a चित्र-निर्देश fence because "the content
          looks unused."
```

## Writing a brief — "as if the artist cannot see the source"

```markdown
[चित्र बनाना है] चित्र 3.1

मानव वृक्क की अनुदैर्ध्य काट। बाहरी वल्कुट (cortex) और भीतरी मध्यांश
(medulla) दोनों दिखाएँ। वृक्क से निकलते हुए वृक्क धमनी (renal artery),
वृक्क शिरा (renal vein) और मूत्रवाहिनी (ureter) — तीनों नामांकित। मध्यांश
में 3–4 वृक्क पिरैमिड दिखाएँ, प्रत्येक की नोक श्रोणि (pelvis) की ओर।
```

**Correct** — every structure named, every label given, spatial relationships
stated (which side, which direction). A brief this specific could be handed
to an illustrator who has never opened the source book and they would
produce a usable plate.

**Incorrect — do not write this:**

```markdown
[चित्र बनाना है] चित्र 3.1

वृक्क की संरचना दिखाइए।
```

"Show the structure of the kidney" tells an illustrator nothing they did not
already know from the question text itself. If the brief adds no
information beyond what the surrounding prose already says, it has failed
at the one thing this step exists to do — **never write a brief you would
not be willing to see printed in place of the actual figure**, because for
every reader who cannot access the original NCERT plate, that brief IS the
figure.

## What to check before finishing this chapter

- [ ] Every `![...](source_figures/...)` path resolves to a real file —
      run `ls source_figures/` and diff against every path the markdown
      references; a typo'd extension or filename fails silently at render
      time, not at write time.
- [ ] Every plate named in a `| ref:` tail is ALSO fetched, not just
      mentioned.
- [ ] No figure reference points at an external URL (Mathpix or otherwise)
      that was never saved locally — see the decision tree above.
- [ ] Every ` ```चित्र-निर्देश``` ` fence is still present in the output,
      even for figures that render as an empty reserved plate.
- [ ] The missing-plate list is REPORTED, not silently absorbed into
      reserved-plate references — a reserved plate reads as deliberate; an
      unreported gap reads as nobody noticed. If N figures have no source
      and no brief was written, say so explicitly in the step's own report
      rather than letting `step01_md_reader`'s block count be the only
      evidence something is missing.
- [ ] Run the reconciliation check before handing off:
      `python3 pipeline/run_all.py --md content/<NN>_reader_edition.md --stem chapter-<NN> --to step05`
      — if the source has N figure references and step02 counts a
      different number of `figure` blocks, at least one reference used a
      shape the reader does not recognise (see FORMAT_SPEC §9's dialect
      table) and needs rewriting, not a code change.
