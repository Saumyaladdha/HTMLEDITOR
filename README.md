# Vidyut Aavesh — agent-based document rendering system

One reader-edition markdown file → four HTML editions of a chapter, laid out
to match `Vidyut Aavesh Full Book A4.html`.

```bash
python3 pipeline/run_all.py
```

That runs all seventeen steps and writes `build/chapter-01.html`.
~60 s cold. You do not need to pick an interpreter — see *Bootstrap* below.

---

## The idea

**Content and design are separate layers, and everything in between is an
inspectable artifact.**

Every step reads one JSON file and writes the next. Nothing is passed in
memory, so any step can be re-run alone, its input read, its output diffed.

```
content/17_reader_edition.md
  step01_md_reader                 → 01_read.json          markdown → IR
  step02_content_validator         → 02_validated.json     did we get everything?
  step03_content_tagger            → 03_tagged.json        semantic kind per block
  step04_content_namer             → 04_named.json         stable readable ids
  step05_question_analyzer         → 05_questions.json     the question model
  step06_latex_validator           → 06_latex.json         will the maths render?
  step07_formatting_agent          → 07_formatted.json     how each kind is set
  step08_content_assignment        → 08_assigned.json      kind → component
  step09_layout_analyzer           → 09_layout.json        measure · pack · settle
  step10_empty_space_analyzer      → 10_space.json         where the whitespace is
  step11_decorator_agent           → 11_decorators.json    where art would help
  step12_table_formatter           → 12_tables.json        tables, independently
  step13_css_generator             → 13_css.json           tokens → stylesheet
  step14_html_assembler            → build/<stem>.html
  step15_visual_qa_agent           → 15_visual_qa.json     look at the real page
  step16_content_integrity_verifier→ 16_integrity.json     HTML vs the markdown
  step17_final_verifier            → 17_final.json         one verdict
```

## Every step is deterministic code *and* an agent

The code runs first and does everything it can decide confidently. Whatever
it cannot, it appends to a **review queue**:

```
build/<stem>/review/step03_content_tagger.open.json        ← questions for the agent
build/<stem>/review/step03_content_tagger.decisions.json   ← the agent's answers
```

On the next run the step reads the decisions and applies them. So an agent's
judgement is a **persisted artifact**, not something re-derived every build.
Builds stay reproducible, decisions show up in a diff, and a step never
blocks waiting on a model.

**Each agent is part of the codebase**, living next to the step it governs:

```
pipeline/step03_content_tagger/run.py       the deterministic core
pipeline/step03_content_tagger/AGENT.md     what its agent decides
```

That file states what the agent decides, its exact input/output JSON shape,
how to tell the two failure modes apart, and what it must never do. It is
versioned with the code and travels with the project.

An open queue is **not** a failure. It is work, and the build carries on so
you can look at the result.

## The format spec

**`docs/FORMAT_SPEC.md`** is the contract for what a chapter markdown may
contain and exactly what each construct becomes on the page. It was derived
by diffing two real chapters against the finalised reference, so it captures
the conventions that are easy to miss — the सूत्र panel's three-part bullet,
the nineteen callout glyphs, marks bands being synthesised rather than
written, fences as containers rather than code.

Adding a chapter that uses a new convention means adding it to the spec AND
to `book/readers/markdown.py`. Never contort the content to fit the parser.

Every construct is cross-checked: `step02_content_validator` counts each one
in the source with rules that share **no code** with the parser, and fails if
the two disagree.

## Reference edition

The design is defined by one file, kept outside this folder:

    ../Chapter 3 - Vidyut Dhara/Chapter 3 - Print A4.html

`book/design/css.py` holds that file's two stylesheets VERBATIM, comments
and all. Those comments record real rendering bugs and the exact shape of
their fixes (`.fr` stretch, `sup/sub` zero leading, `.sqb` collapsed onto
the text, `.u`'s hair-thin padding), so they are copied rather than
paraphrased — rewriting them reintroduces the bug.

Two things the pipeline ADDS to the reference:

* `print-color-adjust:exact`, without which every background colour drops
  on most printers. The reference works around it by telling the reader in
  its README to switch "Background graphics" on by hand.
* the full figure brief in `data-desc`, untruncated.

The previous reference (`Vidyut Aavesh Adhyay 1 - FINAL/`) has been
removed. Its only unique asset, `17_reader_edition.md`, lives in
`content/`.

## Giving this to someone else

Zip `HTML_Automation/` and send it. On the other machine:

```bash
python3 tools/install_agents.py     # wire the agents into their Claude Code
python3 pipeline/run_all.py         # build
```

`install_agents.py` copies every `pipeline/<step>/AGENT.md` into a
`.claude/skills/<step>/SKILL.md`, which is where Claude Code discovers
skills. Nothing is tied to a machine or an account.

```bash
python3 tools/install_agents.py             # into this project
python3 tools/install_agents.py --user      # into ~/.claude/skills, all projects
python3 tools/install_agents.py --target .. # into a parent repo root
python3 tools/install_agents.py --check     # has an installed copy drifted?
```

`.claude/skills/` ships in the folder already, so an unzip-and-open works
with no setup — the installer is for updating it, for `--user`, and for
`--check`. **The canonical copy is always `pipeline/<step>/AGENT.md`.** Edit
that, re-run the installer; never edit the installed copy.

## Run it

```bash
python3 pipeline/run_all.py                                  # all 17 steps
python3 pipeline/run_all.py --md content/02_reader_edition.md --stem chapter-02
python3 pipeline/run_all.py --from step09 --to step14        # re-run a slice
python3 pipeline/run_all.py --only step12                    # one step
python3 pipeline/run_all.py --page-numbers                   # header + page numbers
./tools/selftest.sh                                          # every chapter
```

Outputs land in `build/`:

| | |
|---|---|
| `chapter-01.html` | full book, A4 — **43 pages** |
| `chapter-01/artifacts/` | the chain, one JSON per step |
| `chapter-01/review/` | what each step could not decide |
| `chapter-01/qa/page-NN.png` | rendered pages for visual review |
| `chapter-01/bundle.css` | the generated stylesheet |

### Bootstrap

`book/util/bootstrap.py` runs first in every entry point. It forces UTF-8
stdout (3.6 defaults to ASCII and dies on the first Hindi title) and, if
`python3` is older than 3.8, finds a newer interpreter and re-execs into it.
Pin one with `PIPELINE_PYTHON=…`. Chrome comes from `PIPELINE_CHROME_BIN` or
the usual macOS paths. No network at any point — the fonts are in the repo.

---

## The modules

Granular on purpose: change one kind of thing, touch one file.

```
book/
  core/        ir.py           27 block kinds — the contract between the layers
               artifact.py     the chain + the review-queue mechanism
  readers/     markdown.py     line grammar → structure
  taggers/     classify.py     text → semantic kind  ← new dialect goes HERE
               naming.py       stable readable ids
               questions.py    the question model
  validators/  content.py      source counts vs IR counts
               latex_convert.py  LaTeX → Unicode
               latex_check.py  did it actually convert?
               integrity.py    final HTML vs original markdown
  format/      inline.py       inline markup → HTML (maths, bold, subscripts)
               rules.py        how each kind is set   ← spacing/density HERE
               assignment.py   kind → component
  layout/      probe.py        ALL headless-Chrome interaction
               measure.py      real heights + cache
               pack.py         packers + the settle loop
               space.py        where the whitespace is
  design/      tokens.py       colours, geometry, type — VALUES
               css.py          the stylesheet             ← re-skin HERE
               fonts.py        embedded Kalam + Caveat
  components/  slot.py inline.py heading.py text.py math.py
               callout.py question.py table.py figure.py
                                            ↑ change the table design HERE
  decorators/  policy.py       where art may go, and how much
               slots.py        fill reserved slots from a manifest
  assemble/    render.py       IR → components
               html.py         the finished document
  qa/          visual.py       inspect + screenshot the real page
  util/        bootstrap.py

pipeline/
  step01_md_reader/   run.py + AGENT.md      ← code and its agent, together
  step02_…/           run.py + AGENT.md
  …                   (18 of them)
  _step.py            the small amount of shared plumbing
  run_all.py

tools/
  install_agents.py   AGENT.md → .claude/skills/ for any Claude Code
  selftest.sh         build every chapter, fail on any hard failure
  shot.py             screenshot pages while developing
```

---

## Things worth knowing before changing anything

**`.page` is `overflow:hidden`.** Content that does not fit is *clipped, not
reflowed* — a packing error deletes content and nothing errors. Every number
the layout trusts is measured in a real browser, and `settle()` checks the
packer's guess against a real render. Heights only ratchet up; letting one
shrink makes the loop oscillate.

**Kalam is embedded at weight 400 only.** Every bold in the book is
*synthetic*, and that is the look. Loading Kalam 700 gives real bold and
shifts every measured height. The same CSS must be used to measure as to
render.

**Some CSS values must stay irregular** — `.secno`'s
`border-radius:50% 46% 52% 48%`, `.sticky`'s `rotate(1.6deg)`, `.swipe > i`'s
`left:-6px; right:-6px`. Tidying them removes the hand-drawn quality.

**Callout icons come from the type, never the markdown.** The source writes
one family with three different glyphs; taking the icon from the type is what
makes a page of callouts read as one system.

**It is content-driven, not chapter-driven.** Nothing knows this chapter has
16 sections or that Part 2 is grouped by year. `tools/selftest.sh` builds one
chapter grouped by year and one grouped by marks, through the same code.

**Two old laws are deliberately broken.** NIYAM #3 (never float on a
two-column page) — Part 1 *is* a float. NIYAM #19 (emoji never) — emoji carry
the callout iconography. The rules that still hold are enforced by the steps,
including `print-color-adjust:exact`, which the reference file itself is
missing and would lose every background colour on many printers.

## Art: reserved now, filled later

No chapter art is generated yet. Every place art will go already renders as a
slot **at its final size**, so dropping an image in later cannot move the page
or invalidate pagination. `assets/manifest.json` maps slot keys to files;
`step14` fills whatever it can resolve. Currently outstanding: 32 figure
crops, 10 diagrams, 7 arrow doodles, 4 decorative slots.
