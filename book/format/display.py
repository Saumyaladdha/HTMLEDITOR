# -*- coding: utf-8 -*-
"""
DISPLAY — tell a displayed equation apart from an inline one.

The source writes derivations the way LaTeX does:

    अर्थात् $$\\sum i = 0 \\qquad \\ldots(i)$$
    किरचॉफ के नियम के अनुसार, $i_1 + i_2 - i_3 - i_4 - i_5 = 0$
    या $$i_1 + i_2 = i_3 + i_4 + i_5$$

`$…$` is inline maths, part of a sentence. `$$…$$` is a DISPLAY equation: a
step of a derivation, centred on a line of its own. The reference book renders
257 of them that way, each on its own line with the prose between, which is
what makes a two-page derivation readable.

`strip_latex` collapsed both forms to inline, so all 282 display equations in
chapter 3 came out mid-sentence and a derivation arrived as one dense
run-on paragraph — the answer body reading

    किरचॉफ के नियम के अनुसार, i₁+i₂−i₃−i₄−i₅=0 या i₁+i₂=i₃+i₄+i₅ अत: परिपथ के…

instead of a prose line, a centred equation, another prose line.

This module only SPLITS. What each piece becomes is the reader's decision
(`para` vs `formula`), and how a formula is set is the component's.
"""
import re

# `$$ … $$`, non-greedy, across line breaks — a display equation is often
# written on the line after the prose that introduces it.
_DISPLAY_RE = re.compile(r'\$\$(.+?)\$\$', re.S)

# An equation number as LaTeX writes it: `\qquad \ldots(i)`, `\ldots (ii)`,
# sometimes already converted to `…(i)`. Captured so it can be set in the
# handwritten face rather than the maths one — the reference has 226 of them.
# `\s*\$*\s*$` at the end because the text still carries its `$$` wrapper when
# this runs — matching only a bare end-of-string found 3 equation numbers out
# of 226.
_EQNO_RE = re.compile(
    r'(?:\\qquad\s*)?(?:\\ldots|\\dots|…|\.\.\.)\s*(\((?:[ivxlcdm]+|\d{1,3})\))\s*\$*\s*$',
    re.I)


def split_display(text):
    """-> [(kind, text)] where kind is "prose" or "display".

    A paragraph with no display maths comes back as a single prose segment,
    so callers can treat the no-op case without a special branch.

    Display segments keep their `$$…$$` wrapper: `strip_latex` is what turns
    LaTeX into Unicode, and it only looks inside the delimiters. Handing it
    bare LaTeX would leave `\\frac{E}{V}` printed literally.
    """
    out, pos = [], 0
    for m in _DISPLAY_RE.finditer(text or ""):
        if m.start() > pos:
            out.append(("prose", text[pos:m.start()]))
        out.append(("display", m.group(0)))
        pos = m.end()
    if pos < len(text or ""):
        out.append(("prose", text[pos:]))
    return out or [("prose", text or "")]


def has_display(text):
    return bool(_DISPLAY_RE.search(text or ""))


def split_eqno(text):
    """`Σi = 0 …(i)` -> ("Σi = 0", "…(i)"), or (text, "").

    An equation number is a label, not part of the maths, and the reference
    sets it in the handwritten face (`.k`) rather than the italic serif —
    which is also what stops it being fraction-stacked or italicised as if it
    were an operand.
    """
    m = _EQNO_RE.search(text or "")
    if not m:
        return text, ""
    # The `$$` closer belongs to the equation, not to the number, so it is put
    # back — otherwise `strip_latex` sees an unterminated `$$` and converts
    # nothing at all.
    head = text[:m.start()].rstrip()
    if text.rstrip().endswith("$$") and not head.endswith("$$"):
        head += "$$"
    return head, "…%s" % m.group(1)

# An equation number written AFTER the closing `$$`, which is how chapter 4
# writes them: `$$C\phi = NIAB$$ ...(ii)`.
_LEADING_EQNO_RE = re.compile(
    r'^\s*(?:\\qquad\s*)?(?:\\ldots|\\dots|\u2026|\.\.\.)\s*(\((?:[ivxlcdm]+|\d{1,3})\))',
    re.I)


def take_leading_eqno(prose):
    """`" ...(ii) yahan C ..."` -> ("\u2026(ii)", " yahan C ..."), else ("", prose).

    `split_eqno` looks only INSIDE the delimiters, so a number written after
    the closing `$$` stayed with the prose that followed it. That prose is a
    paragraph of its own, so the page read

        C\u03c6 = NIAB
        ...(ii) yahan C kamani ka ainthan niyatank hai ...

    with the number opening the next paragraph and appearing to label it
    rather than the equation above. 29 of them on one chapter. Pulled off
    here so the caller can hand it to the equation it belongs to.
    """
    m = _LEADING_EQNO_RE.match(prose or "")
    if not m:
        return "", prose
    return "\u2026%s" % m.group(1), (prose or "")[m.end():]

# `[1]` written after the closing `$$`, the way this chapter marks what a
# step is worth: `$$ \Rightarrow B = ... $$ [1]`.
#
# A THIRD SPELLING, and a decorative dash run in front of it.
#
# `20_dash_free.md` marks a step's worth as `-----------**[½ अंक]**` — a run
# of dashes (a divider the source author typed by hand, not a construct
# anything else here recognises), then the tag itself BOLDED, and the value
# inside the brackets is `½ अंक` / `1 अंक` — a fraction-or-digit followed by
# the WORD "अंक", not the bare `\d{1,2}` / `M` this regex only ever matched.
# `parse_chip`'s `RE_MARKS` (`book/taggers/classify.py`) already parses this
# exact value shape for a question's OWN marks chip — `½ अंक` there too —
# so the value-matching half is shared from there rather than re-derived.
# Unrecognised, none of it matched: the dashes, the brackets and the bold
# markers all reached the page as literal text, 40 times in one chapter,
# and the clean rounded `.qmarks` badge this tag exists to produce never
# appeared for any of them.
_LEADING_MARKS_RE = re.compile(
    r'^\s*(?:-{3,}\s*)?\**\s*'
    r'\[\s*((?:\d{1,2}\s*[Mm]?)|(?:(?:\d+\s*)?[½¼¾]|\d+(?:[/·]\d+)?)\s*अंक)\s*\]\**')


def take_leading_marks(prose):
    """`" [1] jahan i ..."` -> ("1", " jahan i ..."), or ("", prose).

    Same fault as `take_leading_eqno` and the same cause: written outside the
    delimiters, the marks tag became the first thing in the NEXT paragraph and
    read as body text — `[1] जहाँ, i आयताकार पथ …`. 19 of them on one chapter.
    """
    m = _LEADING_MARKS_RE.match(prose or "")
    if not m:
        return "", prose
    return m.group(1), (prose or "")[m.end():]
