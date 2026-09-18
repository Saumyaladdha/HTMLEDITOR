---
name: step07_formatting_agent
description: Decide how an arts semantic kind should be set (atomic/density/accent/emphasis) — and know before touching a decision file that this table is not read by the renderer yet. Use when step07 reports an unknown kind, or when judging whether a `क्रम:`/`संबंध:` chain should have been the `flow` component.
---

# Formatting Agent — ARTS

> Subject profile: `book/subjects/arts.py`. Everything not contradicted here
> is in `pipeline/subjects/biology/step07_formatting_agent/SKILL.md`, and
> the CODE is shared.

## State

Clean on both chapters — `unknown=0 · overrides=0`. Arts has no reactions,
no matrices, no formula panels; its distinctive shapes (matching-type
questions, कथन–कारण / Assertion–Reason pairs, source-based callouts) all
mapped onto existing generic kinds (options, callout, refbox) without
needing a new one. Read the next section before treating "clean" as
"nothing to check here" — it changes what a clean state actually means.

## The `fmt` dict this step writes has no reader anywhere in the codebase

Verified by grepping the whole repository, not just guessed: `n["fmt"]` is
written exactly once, in `book/format/rules.py:71` (`n["fmt"] = rule_for(k)`),
and merged with agent overrides in `pipeline/step07_formatting_agent/run.py:20`.
Nothing else — not `book/assemble/render.py`, not `book/assemble/html.py`,
not `book/layout/pack.py`, not `book/layout/split.py`, not any `.js`/`.html`/
`.css` file in the repo — ever reads `n["fmt"]`, `node["fmt"]["atomic"]`, or
any of `density`/`accent`/`emphasis`. Confirmed on a real build too:
`build/bio-01-cols/artifacts/07_formatted.json` shows every node carrying a
populated `fmt`, but `book/assemble/render.py` never looks at it — the
"accent" it does use (`sec.get("accent", 0)`, `render_section`/
`render_question`) is a **different, unrelated** integer: which of the
book's rotating section colours a block belongs to, not the `fmt.accent`
boolean this step decides.

**What this means practically:** the atomicity, spacing and accent a block
actually gets on the page comes from kind-specific code baked directly into
`book/assemble/render.py`'s own functions (`render_block`, `render_section`,
`render_question`, …), independent of this table. A decision recorded in
`step07_formatting_agent.decisions.json` — say, `{"kind": "flow", "atomic":
true, …}` — updates a JSON field with **no consumer**, and the next build
looks exactly as it would have without that decision.

**What to do about it, without touching a `.py` file:** still write the
decision and still add the row to `book/format/rules.py` — that keeps the
table honest for the day someone wires it into the renderer, and losing the
record would be worse than an inert one. But do **not** report a decision
here as having fixed a *visible* symptom (a block still splitting, still
under-accented) — that fix, if one is needed today, has to go into
`book/assemble/render.py`'s per-kind code, and belongs to a step outside
this agent's remit (report it, do not silently reach into the renderer).

## The `क्रम:` chain gap — the formatting-kind call this step would face, if it ever saw one

`book/subjects/arts.py`'s `rubric` dict has no `"क्रम"` key (biology's maps
`क्रम` to `"flow"`; arts maps only `पहचान` and `तथ्य`, both to `"identify"`).
Consequence, in `book/readers/markdown.py` (~1371–1402): arts's five
`**क्रम:**` timeline lines — `content/arts_01_history_print_ready.md:58,63,69`
and `content/arts_02_geography_print_ready.md:66,78` — never become
`kind="flow"`. They arrive at this step already tagged `definition` by the
reader, a step upstream of step07, so **this step currently has nothing to
decide about them.** Verified on the correctly-profiled build
(`build/arts-01-history.html`, `body class="subj-arts"`):

```html
<!-- INCORRECT-reading example, but this is what the source actually IS today -->
<div class="deflead"><b class="dl">क्रम:</b></div><div class="def">
  <span class="m"><span class="up">1875</span> <span class="mt">कनिंघम की मुहर</span>
  -<span class="mt">रिपोर्ट</span> <span class="up">→</span> <span class="up">1921</span> …
```

An 8-stage excavation timeline rendered as one dense maths-styled span, with
every year and place name run together — exactly the "chain rendered as a
`definition` with a `.m` span in it" failure biology's own step07 file names
as **the original bug** it exists to prevent.

**What the fix would look like, if `"क्रम": "flow"` were ever added to
`arts.py`'s rubric (a `.py` edit, out of scope here — report it, don't make
it):** captured from a real build of the *same* geography source under
biology's profile (`body class="subj-biology"` — see the staleness warning
below; this HTML is real, just from the wrong subject):

```html
<!-- What the identical text renders as once क्रम maps to "flow" -->
<div class="flow"><div class="ft"><span>क्रम</span></div>
  <span class="st">प्रकृति का दबदबा</span><span class="ar">→</span>
  <span class="st">तकनीक</span><span class="ar">→</span>
  <span class="st">मानव का दबदबा</span></div>
```

Each stage its own upright chip, arrows between — the shape the `.flow`
component (`book/components/text.py:139`) exists to draw.

**Edge case, if that fix ever lands and this step starts seeing `kind="flow"`
nodes:** `"flow"` has **no row in `book/format/rules.py`'s `RULES` table**
either — a second, independent gap, and NOT hypothetical: verified against
biology's own real build (`build/bio-01-cols/artifacts/07_formatted.json`),
every `flow` node's `fmt` is bit-for-bit `DEFAULT`
(`atomic:false, density:1.0, accent:false, emphasis:normal`) even though the
process chain is biology's own signature construct. The right call, per the
"half a box is not a box" reasoning physics's file gives for callouts and
tables, is `atomic: true` — an 8-stage timeline split across a column
boundary mid-chain is precisely that failure. Make the call and add the row
to `rules.py` regardless — but per the section above, it will not visibly
change anything until `render.py` is wired to read `fmt` at all.

A `**संबंध:**` chain does not currently occur in either arts chapter (only
biology uses it); if a future arts chapter introduces one, the same gap
applies and the same two-part fix (rubric key, then a `rules.py` row) would
be needed.

## The `arts-02-geography.html` staleness this section relies on

`build/arts-02-geography.html` (top level, mtime predates this session's
rebuild) carries `body class="subj-biology"` — it was built WITHOUT
`--subject arts`, so `book.subjects.detect()` ran and returned `"biology"`
(verified: `detect(open('content/arts_02_geography_print_ready.md').read())
== "biology"`, since both `पहचान`/`तथ्य` push the bio-signal over threshold
and arts has no detector signature at all — FORMAT_SPEC §10). A same-session
rebuild, `build/arts-02-geography/draft.html`, correctly carries
`subj-arts` and — once under the right profile — renders both of geography's
`क्रम:` lines as plain `deflead`/`def`, matching history exactly, confirming
the gap is real under the correct profile and was not an artifact of the
wrong one. **The top-level `.html` needs a rebuild from that draft before
being trusted as "the arts geography build."**

## What to check

- [ ] `unknown` is 0, or every new kind has a `rules.py` row proposed.
- [ ] Before citing a decision here as fixing a page, confirm `render.py`
      actually reads `fmt` for that kind — today it does not, for any kind.
- [ ] Any chapter using `--subject` implicitly (no explicit flag) is
      rejected outright for arts — see the staleness note above.

## Never

- **Never assume a decision recorded here is visible on the page.** The
  `fmt` dict has no reader anywhere in this codebase today — verify against
  `render.py`'s actual per-kind code before claiming a fix.
- **Never patch the visible symptom by editing `render.py` from this step.**
  That fix belongs to whichever step owns the renderer path for that
  component; report the gap between `rules.py` and `render.py` instead.
- **Never treat "unknown=0" as "arts has no formatting gaps."** It can also
  mean the reader tagged the block as something else before this step ever
  saw it — the `क्रम:` chain is exactly that case.
