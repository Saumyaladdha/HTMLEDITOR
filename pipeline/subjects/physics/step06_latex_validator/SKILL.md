---
name: step06_latex_validator
description: Correct maths that failed to convert from LaTeX to Unicode. Use when step06_latex_validator reports findings such as backslash_command, passthrough or convert_failed.
---

# step06_latex_validator — agent

`book/validators/latex_convert.py` converts `$…$` and `$$…$$` to Unicode.
This step checks the **result**, which is a different job — and the one that
caught a genuine bug.

> When the old engine was archived, `engine_qa` stopped importing. A bare
> `except: lambda x: x` in the caller passed LaTeX straight through, and
> `$$\tau = pE \sin\theta$$` printed as literal backslash commands in the
> middle of a physics book. Nothing errored anywhere.

A converter that silently returns its input is worse than no converter. The
checks look for exactly that.

**Input**
- `build/<stem>/artifacts/06_latex.json` → `_latex`
- `build/<stem>/review/step06_latex_validator.open.json` — each item has the
  source `src` and what it converted to, `got`

**Output** → `build/<stem>/review/step06_latex_validator.decisions.json`

```json
{"decisions": [
  {"id": "…", "corrected_source": "\\frac{q}{4\\pi\\varepsilon_0 r^2}",
   "why": "the source was missing a closing brace"},
  {"id": "…", "verdict": "converter", "command": "\\oint",
   "why": "not in _CMD; add it to book/validators/latex_convert.py"}
]}
```

## The findings

| `kind` | Means |
|---|---|
| `backslash_command` | a `\command` survived conversion — it will print as-is |
| `raw_frac` | `\frac` was not turned into a stacked fraction |
| `unclosed_brace` | the source LaTeX is malformed |
| `stray_dollar` | an unmatched `$` — probably a currency sign or a typo |
| `passthrough` | the converter returned its input unchanged — **check the import first** |
| `convert_failed` | the converter raised |

## Fix the source, or fix the table — decide which

If the command is legitimate LaTeX that the book will keep using, add it to
`_CMD` in `book/validators/latex_convert.py`. If the source is malformed,
fix the markdown. Say which in `verdict`.

`passthrough` on *everything* is not a content problem at all — it means the
converter is not being reached. Check the import in
`book/format/inline.py` before touching any content.

## FAULTS ALREADY FIXED HERE — check these before diagnosing anything new

Each one printed wrong on a real page while every automated check passed.
`step16` counts words, so a mangled formula still "has" its content; only the
PNG shows it. **Add a row when you fix another.**

| Symptom on the page | Cause | Guard now in place |
|---|---|---|
| `∫_a^<sup>b B· dl` — literal tag text | `integral_limit` matched ANY character after `∫`, including the private-use sentinels that already marked the limits, then later passes read that tag's own `<`/`>` as operators | `_INT_RE` excludes `\ue010`–`\ue013` **and** its subscript run is possessive (`*+`) — an ordinary `*` handed the `ₐ` back and superscripted the LOWER limit |
| `∫<sup> </sup>dB` | the same rule superscripted a SPACE | whitespace excluded from the same class |
| `B\,dl`, `a\,b\,c\,d` | `\,` `\;` `\:` `\!` are named with PUNCTUATION, so the `\[a-zA-Z]+` lookup never saw them and the backslash printed literally | `_SPACING` table in `latex_convert.py` |
| `B<sub>a</sub><sub>x</sub><sub>i</sub><sub>s</sub>` | `\text{axis}` converts one character at a time, so the word stopped existing as a word — `step16` counted `axis` as vanished | `_merge_scripts` joins adjacent runs |
| `2025` stacked over `set_jv` | a paper reference in backticks, and backticks mean maths | `_is_slug` refuses a lowercase identifier of 3+ chars either side |
| `...(ii)` opening the NEXT paragraph | `split_eqno` looks only INSIDE the delimiters; this chapter writes `$$…$$ ...(ii)` | `take_leading_eqno` in `display.py` |

| hollow box above `τ` | `_vectors` matched `[A-Za-z]` only, so a Greek vector kept a BARE combining arrow — and Kalam cannot compose U+20D7 over a tau | the class now covers `Α-Ω` `α-ω` |
| `2(x² + a²)^(3/2)` — caret and brackets printed | nothing handled `^` before a bracket; and `powers()` ran only inside `math_body`, so a formula in a bold callout was half-converted | `powers()` in `format/inline.py`, run on prose as well |
| `उत्तर :### …` | the source writes `**उत्तर:** ### heading` on ONE line, so the hashes were captured as answer text | the answer branch strips a leading `#{1,6}` |
| a whole sentence plus the formula after it fused into one broken highlight span, unclosed tags | `~` is LaTeX's own protected space (`\mathrm{~N}` = "10⁻⁴ N") but this pipeline ALSO reads bare `~text~` as swipe-highlight markup; a tilde left unconverted inside `$…$` survived into the later swipe pass, which paired the stray `~` after the FIRST unit with the stray `~` after a SECOND, unrelated unit later in the sentence | `tex()` in `latex_convert.py` converts every `~` to a plain space during LaTeX-to-Unicode conversion, before the swipe-markup pass ever sees the string (FORMAT_SPEC §11) |

Two lessons worth more than the table:

- **A sentinel is not a character.** `latex_convert` marks a resolved
  sub/superscript with a private-use codepoint that `format/inline.py` turns
  into a real tag LAST. Any rule that scans raw text must exclude
  `\ue010`–`\ue013` and `\ue020`, or it will process a mark that already
  means "done".
- **Order is load-bearing and the docstring says so.** `strip_latex` runs
  before `math_body`, which runs before `reopen_sentinels`. A rule added in
  the wrong place sees either LaTeX that should be Unicode or tags that
  should still be text.

## Find them all at once

Do not hunt these by eye. Every fault above has a grep, and they are all in
one place:

```bash
python3 tools/scan_render_defects.py build/<stem>.html
```

`step15` runs it on every build and fails on anything at `high`. A finding
there is a regression, not a discovery — the rule that should have caught it
already exists.

**When you fix a NEW one: add a rule to the scanner, add a row above, and
re-run `tools/install_agents.py`.** A fault found by eye that leaves no rule
behind will be found by eye again.

## Verify a fix

```bash
python3 -c "
import sys;sys.path.insert(0,'.')
from book.validators.latex_convert import tex
print(tex(r'\tau = pE \sin \theta'))
print(tex(r'E = \frac{1}{4\pi\varepsilon_0}\frac{p}{r^3}'))"
```

Then run `step06` again and confirm the finding is gone rather than assuming.

## Never

- Never hand-convert LaTeX to Unicode in the markdown to dodge a converter
  bug. The next chapter hits the same bug, and now two files disagree about
  how maths is written.
- Never wrap the converter in a fallback that returns its input. If it cannot
  convert, it must fail loudly.
- Never trust the HTML alone. Four of the faults above are invisible in the
  markup and visible only in `build/<stem>/qa/page-NN.png`. Open the picture.
- Never add a rule that scans raw maths text without excluding the sentinel
  range. That mistake produced the worst of the faults above.
