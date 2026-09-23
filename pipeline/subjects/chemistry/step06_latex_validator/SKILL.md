---
name: step06_latex_validator
description: Validate chemistry LaTeX — reaction commands (xrightarrow/underset/overset/overline) that print their own name when unhandled, Hindi text fused to a formula by a recursive tex() call, and a colligative-property array cell losing its subscript to an unreopened sentinel.
---

# Latex Validator — CHEMISTRY

> Read `pipeline/subjects/physics/step06_latex_validator/SKILL.md` first —
> the `backslash_command`/`passthrough`/`convert_failed` findings, the
> sentinel-range warning, and `tools/scan_render_defects.py` all apply
> unchanged. This file is chemistry's deltas, all found on real chapters.

## The validator's blind spot, and why it mattered here specifically

An unlisted LaTeX command falls through **printing its own name**, which is
fine for stray unknown Greek and catastrophic for a chemistry command that
only decorates position:

```
\xrightarrow[\Delta]{KOH}   ->   xrightarrow[Δ]KOH
\underset{नाम}{CH₃Br}       ->   undersetनामCH₃Br
\overset{+}{C}              ->   overset+C
```

**~500 of these across two chapters, none raising an error** — measured as
431 in chapter 6 (107 `\xrightarrow` + 217 `\underset` + 95 `\overset` + 12
`\substack`) and 81 in chapter 4, all before `book/format/reaction.py`
existed. `overset+CH₃` is not a typo-level defect: `CH₃⁺` is a *different
species* from `CH₃`, and the whole of an S_N1 mechanism turns on which one is
drawn — this is a wrong chemistry answer printed in a student's book, not a
cosmetic one.

The fix lives in `book/format/reaction.py`, which must run **before**
`strip_latex` (that pass deletes exactly the braces and commands `reaction.py`
reads) — see `book/format/inline.py:1142-1160`'s `_stash_reactions`. If a
`\xrightarrow`/`\underset`/`\overset` is printing its own name on a fresh
build, check import/call order before assuming the command needs adding to a
table; it is already handled, the usual failure is something running out of
order, not an unlisted command.

## `X\text{ और }Y` fusing a Hindi word to the formulae either side of it

`tex()`'s top-level call strips its own result — correct at the top level,
wrong on a **recursive** call handling one argument of a larger command.
`X\text{ और }Y` (X and Y, a reaction's reactants joined by "and") came back
`XऔरY` — the Hindi conjunction glued directly onto the formulae either side
with no spaces, unreadable. Chemistry writes 299 of these in one chapter —
this is not a rare edge case, it is a routine way of joining two species in
prose maths.

```text
IF a chemistry formula reads `<formula><Hindi-word><formula>` with NO SPACE
   anywhere in the run (e.g. `CH3औरC2H5`)
    THEN this is the recursive-strip bug — check whether the `\text{}`
    argument passed through a `tex()` call that stripped leading/trailing
    space it should have kept
IF the same shape has visible spaces (`CH3 और C2H5`)
    THEN the bug is already fixed for this instance — do not re-flag it
```

## Reaction cells inside an array/matrix need the sentinel reopened too

`_matrix_cell` (`book/format/inline.py:1096-1139`) converts a matrix/array
cell through the maths converter directly (it has no `$…$` delimiters,
having been cut out mid-expression, so `strip_latex` cannot find it). A cell
carrying `\Delta T_f` inside a chemistry `\begin{array}` stack of
colligative-property equations left a literal private-use sentinel character
(a **tofu box**) on the page instead of a `<sub>f</sub>`, because
`reopen_sentinels` was being called at the wrong point relative to when the
cell's own sub/superscript sentinel was produced. **This is the same failure
class as `_reaction_cell`**, and the fix is the same: reopen sentinels on the
cell's own string before it is spliced back into the parent, not after.

```bash
grep -o '\xe2\x80\xa2\|\ue0[0-9a-f][0-9a-f]' build/<stem>.html   # bare sentinel survivors, tofu boxes in the PNG
```

## `\overline{O}H` — the lone-pair/charge bar

The generic converter DROPS `\overline` everywhere else in the book, on the
principle that a bare rule under one equation in a chapter with no other
reads as a rendering error. In chemistry the bar is not decoration — it
distinguishes the hydroxide ion from the bare atom — so `format/reaction.py`'s
`overline()` draws it (`.ovl` span) specifically for chemistry, gated on the
`reactions` profile flag. If a `\overline` is silently vanishing on a
chemistry page, check that the block actually went through
`_stash_reactions` before `strip_latex` — the generic drop-rule still applies
to anything that bypasses it.

## Verify a fix

```bash
python3 -c "
import sys;sys.path.insert(0,'.')
from book.format import reaction
print(reaction.stash(r'\xrightarrow[\Delta]{KOH}', lambda h: h))
print(reaction.stash(r'\overset{+}{C}', lambda h: h))"
python3 tools/scan_render_defects.py build/<stem>.html
```

## Never

- Never hand-convert a reaction's LaTeX to Unicode in the markdown to dodge
  a `reaction.py` bug. The next chapter hits the same bug and now two files
  disagree about how a reaction is written.
- Never treat `\mathrm` volume as evidence a command needs adding to
  `reaction.py`'s `ARROWS` table — `\mathrm` is a unit-formatting command
  used by every subject; it is not a reaction construct at all (see
  FORMAT_SPEC §10's subject-detection warning about `\mathrm` false signal).
- Never trust the HTML alone for a sentinel-related defect. It is only
  visible as a tofu box in `build/<stem>/qa/page-NN.png` — open the picture.

---

## Reference edition

The design source of truth is `build/REFERENCE_chapter-02.html`
(source: `content/21_figures_final.md`). Read `docs/REFERENCE_EDITION.md`
before judging anything below — most of what changed is not visible from
this step alone. Where your output disagrees with the reference, the
reference wins.

**Three conversions that were broken and must not regress.**

- `\boxed{…}` is the author's own "this is the final answer" marker and
  becomes `.math-result`. Never strip it, and never try to infer the final
  answer from position instead.
- `\\[6pt]` — LaTeX's optional inter-row spacing after a row break — is
  part of the row-break delimiter, not content. Split on the bare `\\`
  and `[6pt]` lands inside the next row's first cell, which corrupted every
  step after it in a derivation.
- A fraction whose numerator and denominator are pure Devanagari
  (`\dfrac{कूलॉम}{वोल्ट}` — any unit written as a ratio) is **maths** and
  stacks. It used to be classified as prose and printed flat with a slash.

Test anything involving backslashes from a **script file**, never
`python3 -c "…"` — bash double quotes collapse `\\` to `\` before Python
sees it, which makes a working fix look broken.
