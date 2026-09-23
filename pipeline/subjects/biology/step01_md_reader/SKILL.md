---
name: step01_md_reader
description: Resolve biology markdown structure the deterministic reader could not recognise — above all a backtick run read as maths instead of a process chain, or a चित्र-निर्देश brief that leaks into the page. Use when step01 reports high para share on a biology chapter, or a chain/figure-note construct is new.
---

# Md Reader — BIOLOGY

> Subject profile: `book/subjects/biology.py`. This file covers what biology
> needs that physics does not — everything not contradicted here is in
> `pipeline/subjects/physics/step01_md_reader/SKILL.md`, and the CODE the
> step runs is shared (one `pipeline/step01_md_reader/run.py` for both
> subjects), so a fix to the underlying reader lands once for every subject.
> **Read `docs/FORMAT_SPEC.md` §1–2, 10 before anything else** — it is the
> exhaustive contract for document structure and subject detection; this
> file only adds what is BIOLOGY-specific.

## What this step is for

Turning the markdown into the JSON IR. The reader auto-detects the subject
(`book/subjects.detect`, FORMAT_SPEC §10) from notation signatures, and for
biology this is not a close call — chapter 1 carries **50** `→` process
chains against physics chapter 4's 11, and zero `\frac`/`\vec`/`$$` against
physics's 422/161/490.

## Decision tree — is this backtick run a chain or maths?

```text
IF `book/subjects/biology.py`'s "backticks" key is "sequence" (it is, for
   biology) AND the backtick run's content is mostly Devanagari nouns
   joined by `→`
    THEN it is a `flow` block — book/readers/markdown.py's `_flow_chain()`
    gate, keyed on _PROFILE.get("rubric",{}).get(term)=="flow" for a
    `**क्रम:**`/`**संबंध:**` lead-in

IF the backtick run is a short symbolic expression (`v = u + at`) — this
   only happens when `--subject physics` or auto-detection chose physics
    THEN it is `formula` — never fires for a chapter whose profile is
    biology, because the profile gate comes first

IF a chain's last stage runs directly into a NEW lead-in or an icon line
   with no blank line between them (a `⚠️` trap directly under `**क्रम:**`)
    THEN _split_chain_text() must take ONLY the backticked span as the
    chain and re-emit the remainder as its own paragraph — relying on the
    backtick run having "stopped in the right place" is the fragile
    version of this and has already failed once (see below)
```

**Correct**: `` **क्रम:** `बीजाणुजन ऊतक → पराग मातृ कोशिका → लघुबीजाणु चतुष्क → परागकण` `` → one `flow` block, four upright stages.
**Incorrect (what the first build actually produced)**: the same line
rendered through the physics maths path put five Hindi nouns in an italic
Georgia maths face with the arrows as upright operators — measured as
**14 of the first build's 29 inline-maths runs being Hindi prose**, the
longest 213 characters.
**Edge case**: `RE_ICON_LINE` only breaks a run that has ALREADY started,
so a `⚠️` line directly beneath a `**क्रम:**` lead-in is still absorbed into
the run before the chain-splitter ever sees it — `_split_chain_text()`
exists specifically to peel the chain back out rather than depend on the
run having stopped correctly.

## A named fence is a note, not content

` ```चित्र-निर्देश``` ` holds instructions for whoever draws the figure —
sometimes naming the NCERT plate (`ref:`). It is consumed whole into a
`figure_brief` node (`RENDERS_NOTHING` in `book/format/assignment.py`), and
in the first build **all eleven leaked into the student's page**, printing
the words चित्र-निर्देश, NCERT and `ref:` plus 100 stray backticks.

An UNNAMED ``` fence is different: it is still a plain container and its
contents are KEPT — physics chapter 3 wraps figure briefs in a bare fence,
and skipping to the closing fence swallowed eight figures there. Do not
generalise "a fence is metadata" to every fence; only a NAMED
`चित्र-निर्देश` fence renders to nothing.

## Faults already fixed — do not reintroduce

All of the following traced to one function, `_para_run()`, gluing every
following line into one text blob before `_starts_block()` learned to treat
a ``` fence and a `**label:**` lead-in as boundaries (gated on the profile:
`fence_breaks`, `leadin_breaks` — turning both on for physics moved it from
1538 to 1543 blocks, an incidental fix there too):

| symptom | cause |
|---|---|
| Hindi nouns in italic maths | backtick run treated as maths (profile gate now prevents it) |
| `चित्र-निर्देश`, `NCERT`, `ref:` printed in the book | named fence treated as a plain container |
| 100 stray backticks in visible text | same fence leak |
| one `definition` swallowed a whole section | three `**label:**` lines in a row read as one continuation |
| a chain's last stage carried two labels and a brief inside it | same run-on |

## What to check before trusting a new biology chapter

```bash
python3 pipeline/run_all.py --md content/<NN>_reader_edition.md --stem chapter-<NN> --to step02
grep -c '→' content/<NN>_reader_edition.md                       # vs. `flow` count in 01_read.json
grep -c '```चित्र-निर्देश' content/<NN>_reader_edition.md         # vs. `figure_brief` count
grep -c '!\[' content/<NN>_reader_edition.md                     # vs. `figure` count
python3 tools/scan_render_defects.py build/<stem>.html            # must stay clean of fence_leaked/stray_backtick/devanagari_in_maths/chain_as_maths — see step15
```

A mismatch on any count is the finding, not an impression. The current
build (`build/bio-01-cols.html`, chapter 1) reports 932 IR blocks: 10
`flow`, 11 `figure_brief`, 21 `figure`, 214 `callout`, 138 `question`/`answer`
each — check a new chapter's report against shapes like these, not exact
equality.

## Never

- Never send a backtick run down the maths path for a biology-profiled
  chapter. The profile gate (`_PROFILE.get("backticks") == "sequence"`) is
  what prevents this — never bypass it by special-casing a chapter.
- Never delete a `चित्र-निर्देश` fence because "it doesn't render." It is
  the only surviving description of the artwork; `step11` reads it later.
- Never widen `_flow_chain()`'s "looks like a chain" heuristic without
  checking it does not now also swallow physics's `v = u + at` — the gate
  is per-profile precisely so a fix for one subject cannot silently change
  the other's output.
- Never trust a construct is absent because this chapter lacks it. Run the
  one-pass count check above; a zero is information, an unchecked
  assumption is how physics's "147 questions → 0" bug happened.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**New constructs to read.** Four shapes the reader now understands; none
is mandatory, so a chapter that omits one simply has none — never
synthesise them:

| Source | IR |
|---|---|
| `**त्रिक:** मात्रक: … · विमीय सूत्र: … · राशि का प्रकार: …` | `trio` — one fact per ` · ` segment, each `label: value` |
| `### 2.3 नाम · **13 सवाल आए · 1 व 5 अंक में**` | section title + a frequency trailer split off it |
| `` `[1 अंक · 2026 · Set A/C]` `` | the question tag — marks, papers, notes (see §3 of the shared doc) |
| `\boxed{…}` | kept verbatim; the renderer turns it into the final-answer highlight |

If a construct is not in `docs/FORMAT_SPEC.md`, it falls through to a plain
paragraph and the page silently loses its formatting. Adding a convention
means adding it to the spec **and** here.
