---
name: step14_html_assembler
description: Diagnose assembly problems — content lost between draft and final, slots not filling, decorator decisions not applied. Use when step14_html_assembler reports unexpected output.
---

# step14_html_assembler — agent

The assembler takes the settled page plan and the accepted decisions from
steps 10–13 and writes the finished document. **It must not change content** —
its only job is to put already-decided things together.

**Input**
- `build/<stem>/draft.html` — the settled layout from `step09`
- `build/<stem>/artifacts/11_decorators.json` — accepted placements
- `assets/manifest.json` — art that exists
**Output**
- `build/<stem>.html`
- `build/<stem>/artifacts/14_assembled.json`

## The one invariant

> Bytes out ≥ bytes in, and no source word count drops.

Assembly only *adds* (filled slots, decorators). If the final file is
smaller than the draft, something was dropped and `step16` will confirm it.
Check that first.

## Filling slots

```bash
python3 pipeline/step05_assets/run.py --html build/<stem>.html   # legacy helper
python3 -c "
import sys;sys.path.insert(0,'.')
from book.decorators import slots; import io
print(slots.report(io.open('build/<stem>.html',encoding='utf-8').read()))"
```

A slot is filled by adding its key to `assets/manifest.json`:

```json
{
  "fig:1.13":     "assets/ch01/fig-1.13.png",
  "fig:1.13@svg": "assets/ch01/fig-1.13.svg",
  "doodle-sm":    "doodles/star.png",
  "character":    "decorators/cropped/teacher-callouts/keep-going.png",
  "emblem":       "assets/emblem-atom.svg"
}
```

Lookup order for a figure: `fig:<num>@svg` → `fig:<num>` → the bare role.
Anything unresolved stays a reserved empty box, which is a valid state.

**Filling a slot cannot move the page.** Every slot renders at its final size
from the first build, so substitution is safe at any time and pagination does
not have to be re-run. This is the whole reason art can be added later.

## If decorator decisions are not appearing

Check that `step11`'s decisions file actually has `accept: true`. Proposals
are not placements — the agent has to sign off, and an unsigned proposal is
correctly ignored.

## Never

- Never let the assembler transform text. If something needs rewording, it
  belongs upstream in the content, not here.
- Never write the final HTML anywhere but `build/`. The source tree stays
  clean; `build/` is disposable and gitignored.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**The page shell and both halves changed.**

- every page is `.page > .sheet-body`, with an always-on
  `<footer class="page-bottom"><span class="page-number">`;
- both halves are two-column `.acols`; a page holding a Part-1 item is
  `.acols.revision-flow` and each such item is `.u.revision-unit`;
- a part banner opening a page is hoisted out of the left column into the
  page header, so it spans the sheet;
- `.qhead` carries `id="q-N"`; the dashed rule between questions is its
  `border-top`, not a `.qsep` element;
- the cover is a LINEAR stack — `.source-front-title` then one
  `.source-front-section` per `##` heading, in source order. It is not a
  role-classified card grid.
