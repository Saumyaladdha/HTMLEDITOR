# -*- coding: utf-8 -*-
"""
REACTIONS — chemistry's two-dimensional notation, kept two-dimensional.

This module is to chemistry what `format/matrix.py` is to maths, and it exists
for the same measured reason. Every pass in `format/inline` scans text
LINEARLY for operands. A reaction is not linear:

    CH₃-CH₂-CH₂Br  ---- ऐल्कोहॉलीय ---->  CH₃-CH=CH₂  + KBr
    └ 1-ब्रोमोप्रोपेन ┘      KOH            └ 1-प्रोपीन ┘

Three of those four pieces of information sit ABOVE or BELOW the line of the
equation: the reagent, the condition, and the name of each species. Handed to
the linear converter, all three were destroyed. Measured on chapter 6
(हैलोऐल्केन तथा हैलोऐरीन) before this module existed:

    \\xrightarrow[below]{above}   107      arrow and both labels lost; the
                                          literal word "xrightarrow" printed
    \\underset{name}{formula}     217      name glued to the formula:
                                          `underset1-ब्रोमोप्रोपेनCH₃-CH₂-CH₂Br`
    \\overset{+}{C}                95      charge glued on: `overset+CH₃`
    \\substack{a \\\\ b}              12      both lines run together
                                  ---
                                  431 destroyed constructs in one chapter

and 81 more in chapter 4 (d- एवं f-ब्लॉक). Not one of them raised an error,
because an unlisted LaTeX command falls through printing its own name.

WHY EACH LOSS IS A WRONG ANSWER, not a cosmetic defect:

  * The reagent above the arrow IS what the question asks for. "निम्नलिखित
    रासायनिक समीकरण को पूर्ण कीजिए" is answered by `KOH (alc), Δ` — printed
    inside the equation instead of above the arrow, the answer is unreadable.

  * `overset+CH₃` is not a carbocation. `CH₃⁺` is a different species from
    `CH₃`, and the whole of SN1 turns on which one is drawn.

  * `underset` gluing a name to a formula makes both unreadable, and the name
    is how a student checks they have the right isomer — 1-ब्रोमोप्रोपेन and
    2-ब्रोमोप्रोपेन differ by nothing else in the answer.

The contract mirrors `matrix.py` exactly: this module never measures, never
escapes and never emits a page. The caller supplies `render(latex) -> html`
for the pieces, and `stash` hands back a string with one opaque token per
construct. It MUST run before `strip_latex` — see `inline.inline`.
"""
import re

# Arrow commands, and the glyph each falls back to when CSS cannot draw it.
# `x`-prefixed forms take labels; the plain forms do not, but appear as the
# BASE of an `\overset`, which is how the chapter writes a labelled
# equilibrium: `\overset{\text{मन्द}}{\rightleftharpoons}`.
ARROWS = {
    "xrightarrow": ("⟶", "fwd"),
    "xleftarrow": ("⟵", "back"),
    "xrightleftharpoons": ("⇌", "harpoon"),
    "xleftrightarrow": ("⟷", "both"),
    "xrightleftarrows": ("⇄", "harpoon"),
    "longrightarrow": ("⟶", "fwd"),
    "longleftarrow": ("⟵", "back"),
    "rightarrow": ("→", "fwd"),
    "leftarrow": ("←", "back"),
    "to": ("→", "fwd"),
    "rightleftharpoons": ("⇌", "harpoon"),
    "rightleftarrows": ("⇄", "harpoon"),
    "leftrightarrow": ("↔", "both"),
    "longrightleftharpoons": ("⇌", "harpoon"),
}

_CMD_RE = re.compile(r'\\([A-Za-z]+)')


def _group(s, i):
    """The balanced `{...}` starting at `s[i]` -> (index after it, inside).

    Balanced rather than greedy because these constructs NEST: the chapter
    writes `\\underset{name}{CH₃-\\underset{\\displaystyle |}{NH}}`, a
    substituent bond drawn below an atom that is itself below a name. A
    non-greedy `[^}]*` stopped at the inner brace and split the formula in
    half; a greedy one swallowed the rest of the equation.
    """
    if i >= len(s) or s[i] != '{':
        return i, ""
    depth, j = 0, i
    while j < len(s):
        if s[j] == '{':
            depth += 1
        elif s[j] == '}':
            depth -= 1
            if depth == 0:
                return j + 1, s[i + 1:j]
        j += 1
    return len(s), s[i + 1:]


def _bracket(s, i):
    """The optional `[...]` starting at `s[i]` -> (index after it, inside).

    `\\xrightarrow[\\Delta]{KOH}` puts the condition BELOW the arrow in the
    square bracket and the reagent above in the brace. Both are optional and
    either order of presence occurs in the chapter.
    """
    if i >= len(s) or s[i] != '[':
        return i, ""
    depth, j = 0, i
    while j < len(s):
        if s[j] == '[':
            depth += 1
        elif s[j] == ']':
            depth -= 1
            if depth == 0:
                return j + 1, s[i + 1:j]
        j += 1
    return len(s), s[i + 1:]


def _lines(text):
    r"""`\substack{a \\ b}` and a bare `a \\ b` -> the list of lines.

    A reaction condition is often two lines — a catalyst and its support, a
    solvent and a temperature. Both spellings appear, so both are read here
    rather than at either call site.
    """
    t = (text or "").strip()
    m = re.match(r'^\\substack\s*\{', t)
    if m:
        _, inner = _group(t, m.end() - 1)
        t = inner
    parts = [p.strip() for p in re.split(r'\\\\', t) if p.strip()]
    return parts or ([t] if t else [])


def arrow(above="", below="", glyph="⟶", kind="fwd", render=None):
    """One reaction arrow with its reagent above and its condition below.

    The arrow is drawn by CSS rather than set as a glyph so that it STRETCHES
    to whichever of its two labels is wider. Set as the character `⟶`, a
    six-word reagent overhung a fixed-width arrow on both sides and stopped
    reading as a label attached to it; the glyph stays as the no-CSS
    fallback.
    """
    r = render or (lambda x: x)
    top = "<br>".join(r(l) for l in _lines(above))
    bot = "<br>".join(r(l) for l in _lines(below))
    return ('<span class="rxn rxn-%s" data-g="%s">'
            '<span class="rxn-t">%s</span>'
            '<span class="rxn-a"></span>'
            '<span class="rxn-b">%s</span>'
            '</span>') % (kind, glyph, top, bot)


def species(body, under="", over="", render=None):
    """A formula with its name below it and/or a charge above it.

    Two different things wear this shape and they are NOT styled alike:

      * `\\underset{1-प्रोपीन}{CH₃-CH=CH₂}` — a NAME under a species. Small,
        set in the prose face, and allowed to be wider than the formula.

      * `\\overset{+}{C}` — a CHARGE over one atom. It must sit tight against
        the letter, because a carbocation's `+` drifting a line above the
        chain reads as a separate term in the equation.

    The caller decides which by passing `under` or `over`; `_stash` decides
    from what the construct wraps.
    """
    r = render or (lambda x: x)
    out = ['<span class="sp">']
    if over:
        out.append('<span class="sp-o">%s</span>' % r(over))
    out.append('<span class="sp-c">%s</span>' % r(body))
    if under:
        out.append('<span class="sp-u">%s</span>'
                   % "<br>".join(r(l) for l in _lines(under)))
    out.append('</span>')
    return "".join(out)


def overline(body, render=None):
    """`\\overline{O}H` — the bar that marks a lone pair or a charge.

    The generic converter DROPS `\\overline`, on the sound principle that a
    rule under one equation in a chapter that never draws another reads as an
    error. In chemistry the bar is not decoration: it is what distinguishes
    the hydroxide ion from the atom, so here it is drawn.
    """
    r = render or (lambda x: x)
    return '<span class="ovl">%s</span>' % r(body)


def _is_arrow_base(text):
    """Is this group just an arrow command? Decides overset's two meanings."""
    m = _CMD_RE.fullmatch((text or "").strip())
    return bool(m) and m.group(1) in ARROWS


def stash(s, build, render=None):
    r"""Replace every reaction construct in `s` using `build(html) -> token`.

    Returns the string with tokens in place of constructs. Runs BEFORE
    `strip_latex`, because that pass deletes exactly the braces and commands
    this one reads.

    Processed innermost-last: each construct's own arguments are handed back
    to the caller's `render`, which re-enters this function, so a nested
    `\underset` inside an `\underset` body resolves without this scanner
    having to model the nesting itself.
    """
    if "\\" not in s:
        return s
    out, i, n = [], 0, len(s)
    while i < n:
        m = _CMD_RE.search(s, i)
        if not m:
            out.append(s[i:])
            break
        out.append(s[i:m.start()])
        cmd, j = m.group(1), m.end()

        # ---- labelled arrow: \xrightarrow[below]{above}, either optional --
        if cmd in ARROWS and cmd.startswith("x"):
            glyph, kind = ARROWS[cmd]
            below = above = ""
            for _ in range(2):
                if j < n and s[j] == '[':
                    j, below = _bracket(s, j)
                elif j < n and s[j] == '{':
                    j, above = _group(s, j)
                else:
                    break
            out.append(build(arrow(above, below, glyph, kind, render)))
            i = j
            continue

        # ---- \overset{X}{base} — a label over an arrow, or a charge over
        # ---- an atom. Same command, two different objects.
        if cmd == "overset":
            j, top = _group(s, j)
            j, base = _group(s, j)
            if _is_arrow_base(base):
                bm = _CMD_RE.fullmatch(base.strip())
                glyph, kind = ARROWS[bm.group(1)]
                out.append(build(arrow(top, "", glyph, kind, render)))
            else:
                out.append(build(species(base, over=top, render=render)))
            i = j
            continue

        # ---- \underset{X}{base} — a name, or a bond, under a species ------
        if cmd == "underset":
            j, bot = _group(s, j)
            j, base = _group(s, j)
            if _is_arrow_base(base):
                bm = _CMD_RE.fullmatch(base.strip())
                glyph, kind = ARROWS[bm.group(1)]
                out.append(build(arrow("", bot, glyph, kind, render)))
            else:
                out.append(build(species(base, under=bot, render=render)))
            i = j
            continue

        if cmd == "overline":
            j, arg = _group(s, j)
            out.append(build(overline(arg, render)))
            i = j
            continue

        out.append(m.group(0))
        i = j
    return "".join(out)


# ==========================================================================
# BARE-TEXT REACTIONS
#
# Not every reaction in the chapter is written in LaTeX. Some arrive as prose
# with a unicode arrow and the condition in brackets after it, which is how a
# reader writing quickly puts one down:
#
#     CH₃Br + KOH (जलीय) → CH₃OH + KBr
#
# Those need no grid — the arrow is already an arrow and nothing sits above
# it. They are left alone deliberately. What is NOT left alone is a run of
# them separated by arrows, which is a synthesis PATHWAY and belongs in the
# flow component; `chain_steps` is what the reader uses to spot one.
# ==========================================================================

_STEP_SPLIT = re.compile(r'\s*(?:⟶|→|-->|─+>)\s*')


def chain_steps(text):
    """A bare arrow-separated pathway -> its steps, or [] if it is not one.

    Requires THREE or more steps. Two species joined by an arrow is a single
    reaction and reads correctly as one line; three or more is a synthesis
    route, and the chapter draws those as a numbered pathway rather than as a
    sentence that runs off the column.
    """
    if not text or "$" in text:
        return []
    parts = [p.strip() for p in _STEP_SPLIT.split(text) if p.strip()]
    return parts if len(parts) >= 3 else []

# ==========================================================================
# BARE-TEXT REACTIONS — the conventions the chapters use OUTSIDE LaTeX
#
# Two thirds of the reactions in the revision half of chapter 6 are not LaTeX
# at all. They are backtick runs of plain text, and they carry the reagent
# and the condition in two spellings of their own:
#
#   `R—OH + HX/निर्जल ZnCl₂ → R—X + H₂O`      56 of these
#   `R—OH + HX ⎯⎯[निर्जल ZnCl₂]⟶ R—X + H₂O`   32 of these
#
# Both were destroyed, and worse than the LaTeX ones were:
#
#   * The `/` reached the FRACTION parser, which stacked `HX` over `निर्जल`
#     inside a box — so a reagent and a solvent were set as a numerator and a
#     denominator, which reads as a quantity being divided.
#   * The bracketed form printed literally: `R—OH + HX ⎯⎯[निर्जल ZnCl₂]⟶`,
#     with the condition inline between two dashes.
#
# In `A + X/Y → B`, `X` is a REACTANT and `Y` is the CONDITION. That is the
# only reading that is chemically true: `R—OH + HX → R—X + H₂O` is the
# equation and anhydrous ZnCl₂ is the catalyst it needs. So `X` stays on the
# line and `Y` goes above the arrow, which is where a textbook puts it.
# ==========================================================================

_ARROW_CH = "→⟶⇌⟷⇄←⟵"

# `⎯⎯[निर्जल ZnCl₂]⟶` and `--[cond]->`. The dashes are decoration; the
# bracket holds the condition and the arrow is the arrow.
_BARE_BRACKET_RE = re.compile(
    r'[⎯—–\-]{1,6}\s*\[([^\]\n]{1,60})\]\s*[⎯—–\-]*\s*'
    r'([' + _ARROW_CH + r'])')

# `HX/निर्जल ZnCl₂ →` — a reagent, a slash, the condition, then the arrow.
# The reagent is kept; anything between the slash and the arrow is the
# condition. Bounded so it cannot reach back across a `+` or a space into
# the previous species.
_BARE_SLASH_RE = re.compile(
    r'(?<![\w/])([^\s/+' + _ARROW_CH + r']{1,24})/([^/+' + _ARROW_CH + r'\n]{1,44}?)'
    r'\s*([' + _ARROW_CH + r'])')


# `—शुष्क ऐसीटोन→` — the condition written between a dash and the arrow,
# with no brackets at all. Eleven of these. Requires the arrow to follow
# immediately and forbids a `+` inside, so an em-dash in prose that happens
# to precede an arrow cannot be swallowed.
_BARE_DASH_RE = re.compile(
    r'[⎯—–]{1,3}\s*([^⎯—–\[\]+' + _ARROW_CH + r'\n]{1,40}?)\s*'
    r'([' + _ARROW_CH + r'])')


def bare_text(s, build, render=None):
    """Turn the chapters' plain-text arrow conventions into arrow grids.

    Profile-gated by the caller — see `inline.REACTIONS`. A bare `→` in a
    biology process chain is a sequence, not a reaction, and must not be
    given a reagent rail.
    """
    if not s or not re.search('[' + _ARROW_CH + ']', s):
        return s

    def _br(m):
        g = {"→": "fwd", "⟶": "fwd", "⇌": "harpoon", "⟷": "both",
             "⇄": "harpoon", "←": "back", "⟵": "back"}.get(m.group(2), "fwd")
        return build(arrow(m.group(1).strip(), "", m.group(2), g, render))

    def _sl(m):
        g = {"→": "fwd", "⟶": "fwd", "⇌": "harpoon"}.get(m.group(3), "fwd")
        return (m.group(1)
                + build(arrow(m.group(2).strip(), "", m.group(3), g, render)))

    s = _BARE_BRACKET_RE.sub(_br, s)
    s = _BARE_SLASH_RE.sub(_sl, s)
    return _BARE_DASH_RE.sub(_br, s)


# ==========================================================================
# THE REACTION AS A STRUCTURED OBJECT
#
# Everything above builds the ARROW. This builds the equation around it, and
# it is the change that matters most on the page.
#
# A reaction rendered as a run of inline text is at the mercy of the line
# breaker. Measured on chapter 6 before this existed: species split across a
# line break in the middle of a formula, products drifting a whole line away
# from the arrow that produced them, a substituent's vertical bond landing
# under the wrong carbon because the chain wrapped, and the Hindi sentence
# after an equation joining onto it because nothing separated the two.
#
# None of that is a styling problem. It is that the equation had no STRUCTURE
# in the DOM to style:
#
#     <p>CH3-CH2-Cl aq. KOH → CH3-CH2-OH + KCl</p>
#
# What it needs to be, conceptually:
#
#     Reaction
#      |- reactants        one unbreakable unit
#      |- arrow            with its reagent above and condition below
#      |- products         one unbreakable unit
#      '- annotation       kept OUT of the equation
#
# `structure` turns the first into the second. It runs on HTML that already
# holds the arrow grids, splitting at them — so it never re-parses chemistry
# and cannot disagree with the pass that built the arrows.
# ==========================================================================

_SPAN_RE = re.compile(r'<span\b|</span>')
_M_WRAP_RE = re.compile(r'^(\s*<span class="m">)(.*)(</span>\s*)$', re.S)


def _grid_spans(html):
    """(start, end) of every arrow grid, found by BALANCING span tags.

    A regex cannot do this. The first attempt matched
    `<span class="rxn rxn-[a-z]+".*?</span></span>`, which stops at the first
    doubled close — and an arrow's labels contain their own spans
    (`<span class="up">`), so it cut the grid in the wrong place and left the
    surrounding `.m` wrapper unbalanced. The second side of every equation
    then fell outside `.m` and lost the maths face entirely.
    """
    out, i = [], 0
    while True:
        a = html.find('<span class="rxn rxn-', i)
        if a < 0:
            return out
        depth, j = 0, a
        for m in _SPAN_RE.finditer(html, a):
            if m.group(0) == '</span>':
                depth -= 1
                if depth == 0:
                    j = m.end()
                    break
            else:
                depth += 1
        else:
            return out
        out.append((a, j))
        i = j


def structure(html):
    """Wrap each side of a reaction so the equation becomes one object.

    Returns `html` unchanged when it holds no arrow — an ordinary display
    equation is not a reaction and must not be given a reaction's geometry.

    IDEMPOTENT ON PURPOSE. `inline()` already calls `structure_inline` on
    every string that holds an arrow grid, inline or display — see
    `format/inline.py`'s `REACTIONS` branch. `components.math.eq` then calls
    `structure` a second time on the same html for a DISPLAY equation, which
    used to find the grid still present (now one layer deeper, inside the
    `.rxn-eq` the first call had already built) and wrap it again:
    `.rxn-eq>.rxn-side>.rxn-eq>.rxn-side`. That doubled wrapper is what
    broke the flex layout — a `.rxn-side` measures the WRONG box when it is
    itself sitting inside another `.rxn-side`, so labels lost their width
    and a reactant's name (`\\underset{name}{...}`) rendered glued or
    dropped. Chapter 6 hit this 132 times and was cleaned with a one-off
    script; the script fixed that build, not the next one, because the
    duplicate CALL was never removed. Returning early when a `.rxn-eq` is
    already present removes the duplicate at its source instead.

    The `.m` maths wrapper is kept OUTSIDE the structure, not split by it:
    both sides of the arrow are chemistry and both need that face.
    """
    if not html or 'class="rxn rxn-' not in html or 'class="rxn-eq"' in html:
        return html
    m = _M_WRAP_RE.match(html)
    pre, body, post = (m.group(1), m.group(2), m.group(3)) if m else ("", html, "")
    grids = _grid_spans(body)
    if not grids:
        return html
    out, last = [], 0
    for a, b in grids:
        side = body[last:a]
        if side.strip():
            out.append('<span class="rxn-side">%s</span>' % side)
        out.append(body[a:b])
        last = b
    tail = body[last:]
    if tail.strip():
        out.append('<span class="rxn-side">%s</span>' % tail)
    return '%s<span class="rxn-eq">%s</span>%s' % (pre, "".join(out), post)


# ==========================================================================
# WIDOW CONTROL
#
# A structured display equation cannot wrap at all. An equation set INLINE in
# a sentence still can, and what wrapped was almost always the smallest piece
# of it: `+ H₂O` or `+ KCl` alone on the next line, with the rest of the
# reaction on the line above. One orphaned by-product reads as a new
# statement, and it is the commonest thing on these pages that looks broken.
#
# The fix is the typesetter's one, not a layout one: bind the LAST operand to
# what precedes it with non-breaking spaces. Only the last, so a long
# equation can still break somewhere sensible instead of overflowing the
# column — binding every `+` would make the whole thing unbreakable and push
# it off the sheet, which is worse than a wrap.
# ==========================================================================

# The operator arrives DOUBLE-wrapped —
# `<span class="up"><span class="up">+</span></span>` — because `upright`
# runs over its own output. A single-span pattern matched nothing on real
# output, so the nesting is tolerated rather than assumed away.
_OP_SPAN_RE = re.compile(
    r'(\s)((?:<span class="up">)+\s*[+\u2212-]\s*(?:</span>)+)(\s)')
_TAG_RE = re.compile(r'<[^>]+>')


def bind_widow(html, max_tail=26):
    """Make the final `+ X` of a reaction unbreakable.

    Operates on the FINISHED html, where the operator is already wrapped
    (`<span class="up">+</span>`) — the first attempt matched a bare `+` and
    never fired on real output, because by the time this runs there is no
    bare `+` left in the string.

    Only the LAST operator, and only when what follows it is short: that is
    the piece that gets orphaned. Binding every operator would make the whole
    equation unbreakable and push a long one off the sheet, which is worse
    than a wrap.
    """
    if not html:
        return html
    last = None
    for m in _OP_SPAN_RE.finditer(html):
        tail = _TAG_RE.sub("", html[m.end():]).strip()
        if 0 < len(tail) <= max_tail:
            last = m
    if last is None:
        return html
    return (html[:last.start()] + " " + last.group(2) + " "
            + html[last.end():])


_M_SPAN_OPEN = '<span class="m">'


def structure_inline(html):
    """Apply `structure` to every INLINE `.m` run that holds an arrow.

    `components.math.eq` structures a DISPLAY equation. An inline reaction —
    one sitting inside a question stem or an answer sentence — was left as a
    plain run of text, so the line breaker was free to put any part of it on
    the next line. Measured on chapter 6: 43 of 151 arrows had their species
    split across two lines, and what landed alone was usually the smallest
    piece — `+ CO2`, `+ H₂O`, `+ KCl`.

    Structured, each side becomes a `nowrap` unit, so a break can only fall
    between the sides — at the arrow, where a textbook breaks one too. A
    single by-product can no longer be orphaned.
    """
    if not html or 'class="rxn rxn-' not in html:
        return html
    out, i = [], 0
    while True:
        a = html.find(_M_SPAN_OPEN, i)
        if a < 0:
            out.append(html[i:])
            break
        # the matching close of this `.m` span
        depth, j = 0, a
        for m in _SPAN_RE.finditer(html, a):
            if m.group(0) == '</span>':
                depth -= 1
                if depth == 0:
                    j = m.end()
                    break
            else:
                depth += 1
        else:
            out.append(html[i:])
            break
        out.append(html[i:a])
        out.append(structure(html[a:j]))
        i = j
    return "".join(out)
