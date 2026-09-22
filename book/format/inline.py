# -*- coding: utf-8 -*-
"""
INLINE — inline markup -> Vidyut Aavesh inline HTML.

Ported from `engine.py`'s `ix()` / `stack_fracs()` (that logic was correct
and hard-won), with the OUTPUT MARKUP retargeted at the new design system:

    .frac / .frac__n / .frac__d   ->  .fr  /  <span>  /  .dn
    .math-inline                  ->  .m
    .bold                         ->  <b>
    .highlight                    ->  .swipe .sw-*
    (new)                         ->  .vec        vector arrow
    (new)                         ->  .k          Kalam-upright inside math

ORDER IS LOAD-BEARING — see `inline()`'s docstring. It has been broken
before: putting <sub> conversion before fraction-stacking makes the <sub>
tag swallow the fraction parser's operand scan and the denominator eats
the rest of the line.
"""
import html as _html
import re

from . import matrix as _matrix
from . import reaction as _reaction

# Set by `assemble.render.set_profile` from the subject profile's `reactions`
# key. Off by default, so no subject gets reaction handling it did not ask
# for.
REACTIONS = False


def set_reactions(on):
    global REACTIONS
    REACTIONS = bool(on)


# Where an operand ends. Anything NOT here is treated as part of the
# operand (Δ, superscript minus, ^, _ all stay inside).
_FR_STOP = set(' \t =+×·⇒⇐∝≪≫≤≥≠<>,;∮Σ∑√±→←−-')

# Private-use sentinel: stands in for a literal `\/` while the fraction
# parser runs, so units like `N·m²/C` are never split.
_FR_MARK = ''
# A `$` INSIDE BACKTICKS IS A CHARACTER, NOT A DELIMITER.
#
# `inline` converts backtick runs at step 8 and then runs the maths pass
# over the WHOLE string at step 9 — including the HTML step 8 just built.
# A `$` that was inside a code span is still literal text by then, so a
# note ABOUT the delimiter, `` `$…$` ``, was eaten as if it were maths:
# physics chapter 9 writes "पुस्तक इसे … एक ही `$…$` खंड के भीतर छापती है;
# काटने पर `$` दोनों ओर …" six times, and the sentence lost the very thing
# it was describing and dropped a stray backtick on the page. Swapping the
# dollar for a sentinel inside the run hides it from step 9; the final
# `return` puts it back.
_DL_MARK = ''


def _quotes_markup(inner):
    r"""Is this backtick run SHOWING notation rather than USING it?

    The test is whether the `$` wraps the run or merely appears inside it:
    maths chapter 1 writes a formula the source already wrapped twice,
    `$a^{m} 	imes a^{n}=a^{m+n}$`, and that has to convert; physics
    chapter 9 writes notes ABOUT the markers — `$…$`, a bare `$`, or the
    book's own line quoted "ज्यों की त्यों" as `v=rac{13}{15}` — and
    those have to print the characters they are describing.
    """
    bare = (inner[1:-1] if len(inner) > 2 and inner.startswith('$')
            and inner.endswith('$') else None)
    if bare is not None and re.search(r'[A-Za-z0-9]', bare):
        return False
    return '$' in inner or re.search(r'\\[a-zA-Z]{2,}', inner) is not None
# Sentinel for an already-emitted fragment that must not be re-processed.
_RAW_OPEN, _RAW_CLOSE = '', ''

_COMBINING_ARROW = '⃗'          # E⃗
_US_MARK = '\ue021'            # an underscore that is part of a slug


def _dot(s, i):
    """Is `·` at i a decimal point (digit·digit) rather than a times sign?"""
    return (i > 0 and i + 1 < len(s)
            and s[i - 1].isdigit() and s[i + 1].isdigit())


def _fr_bare(s):
    """Strip wrapping ( ) when the whole operand is one bracket group."""
    s = s.strip()
    if len(s) >= 2 and s[0] == '(' and s[-1] == ')':
        depth = 0
        for i, ch in enumerate(s):
            if ch == '(':
                depth += 1
            elif ch == ')':
                depth -= 1
                if depth == 0 and i != len(s) - 1:
                    return s
        return s[1:-1]
    return s


def _fr_left(s, i):
    depth, j = 0, i
    while j > 0:
        ch = s[j - 1]
        if ch in ')]':
            depth += 1
        elif ch in '([':
            if depth == 0:
                break
            depth -= 1
        elif depth == 0:
            if ch == '·' and _dot(s, j - 1):
                pass
            elif ch in _FR_STOP:
                break
        j -= 1
    return j, s[j:i]


def _fr_right(s, i):
    depth, j, n = 0, i, len(s)
    while j < n:
        ch = s[j]
        if ch in '([':
            depth += 1
        elif ch in ')]':
            if depth == 0:
                break
            depth -= 1
        elif depth == 0:
            if ch == '·' and _dot(s, j):
                pass
            elif ch in _FR_STOP:
                break
        j += 1
    return j, s[i:j]


def _last_group(text, start):
    """`(1)/(4πε0)(q)/(r2)` — the numerator of the SECOND fraction is `(q)`,
    not `(4πε0)(q)`. The backward scan happily swallows both adjacent groups
    because depth returns to zero between them, which merged two consecutive
    \\frac's into one and dropped a denominator. Keep only the final
    top-level group."""
    t = text.strip()
    if not (t.endswith(")") and t.count("(") > 1):
        return start, text
    depth = 0
    for j in range(len(t) - 1, -1, -1):
        if t[j] == ")":
            depth += 1
        elif t[j] == "(":
            depth -= 1
            if depth == 0:
                if j == 0:
                    return start, text
                return start + (len(text) - len(t)) + j, t[j:]
    return start, text


def _first_group(text, end_index, start_index):
    """Mirror of `_last_group` for the denominator: in `(1)/(4πε0)(q)/(r2)`
    the denominator of the FIRST fraction is `(4πε0)`, not `(4πε0)(q)`."""
    t = text
    # ANY trailing factor is trimmed, not only a second bracketed group.
    #
    # The guard used to require two `(`, so `(2)R₃` — from
    # `\frac{1}{2}R_3`, a row operation — passed through whole and `R₃`
    # ended up inside the denominator: the page read "1 over 2R₃" where the
    # author wrote "half of R₃". Once the operand opens with a bracket, the
    # balanced group IS the operand; whatever follows it is a separate
    # factor, whether that is `(q)` or `R₃`.
    if not t.startswith("("):
        return end_index, text
    depth = 0
    for j, ch in enumerate(t):
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth == 0:
                if j == len(t) - 1:
                    return end_index, text
                return start_index + j + 1, t[:j + 1]
    return end_index, text


# A lowercase identifier of three or more characters — `set_jv`, `reader`,
# `print_ready`. Physics operands are short and carry capitals or Greek:
# `qB`, `NAB`, `mv`, `Il`, `4π`, `मीटर`. So this separates a slug from a
# denominator without needing to know any vocabulary.
# Either spelling of the separator: a literal `_`, or the sentinel that
# `protect_slugs` swaps in so the subscript pass leaves it alone. The
# guard has to know both, or protecting the underscore un-protects the
# fraction — `2025/set_ju` stopped stacking, then started again.
_SLUG_RE = re.compile('^[a-z]{3,}[a-z0-9]*(?:[_\ue021][a-z0-9]*[a-z][a-z0-9]*)+$|^[a-z]{3,}$')


def _is_slug(t):
    return bool(_SLUG_RE.match((t or "").strip()))


def _top_slash(s):
    """The first `/` that sits outside every bracket.

    `_fr_one` used to take `s.find('/')` — the first slash anywhere — which
    for a nested fraction is one of the INNER ones:

        (1 - (tan²(α))/(2))/(1 + (tan²(α))/(2))
                         ^ found this
                                  ^ meant this

    Stacking the inner slash first left the outer one flat, so the reference's
    tidy two-level fraction came out as a stacked fragment with a stray `/`
    beside it. The outermost division is the one that structures the
    expression; the ones inside it belong to its operands.
    """
    depth = 0
    for i, ch in enumerate(s):
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        elif ch == "/" and depth == 0:
            return i
    # NO TOP-LEVEL SLASH MEANS NOTHING TO STACK AT THIS LEVEL.
    #
    # This used to `return s.find("/")` — the first slash ANYWHERE — which is
    # the very bug the docstring above says this function exists to fix, left
    # in as a fallback. For `(1/4πε₀)` there is no depth-0 slash, so it handed
    # back the one inside the brackets and `_fr_one` split the string across
    # them: numerator `(1`, denominator `4πε₀)`. On the page that is an open
    # bracket, then `1` stacked over `4πε₀)` — a fraction bar in the wrong
    # place and a stray bracket in the denominator, which is why it read as a
    # product with no division in it at all.
    return -1


# A string that is ONE bracketed group: `(1/4πε₀)`, `[a/b]`.
_WRAPPED_RE = re.compile(r'^\s*([(\[{])(.*)([)\]}])\s*$', re.S)


def _paren_groups(s):
    """Every top-level `(...)` span in `s`: [(start, end_exclusive), …].

    A group nested inside another is not listed on its own — recursing into
    the outer group's own text (below) reaches it."""
    out, depth, start = [], 0, None
    for i, ch in enumerate(s):
        if ch == '(':
            if depth == 0:
                start = i
            depth += 1
        elif ch == ')':
            depth -= 1
            if depth == 0 and start is not None:
                out.append((start, i + 1))
                start = None
    return out


def _fr_one(s, _depth=0):
    i = _top_slash(s)
    if i < 0:
        # A WHOLE EXPRESSION IN BRACKETS still has a fraction in it; the
        # brackets belong AROUND the stack, not split across it. `\left(\frac
        # {1}{4πε₀}\right)` is written exactly this way, so recursing inside
        # and putting the brackets back is what keeps `(1/4πε₀)` a quotient.
        m = _WRAPPED_RE.match(s) if _depth < 3 else None
        if m and _top_slash(m.group(2)) >= 0:
            return (m.group(1) + _fr_one(m.group(2), _depth + 1)
                    + m.group(3))
        # A BRACKETED FRACTION BURIED MID-EXPRESSION, not the whole string —
        # one FACTOR of it. `(fof)(x)` composed with a rational function
        # gives a numerator like `4(\frac{4x+3}{6x-4})+3`: the `\left(…
        # \right)` around the inner `\frac` adds an outer paren the inner
        # fraction's OWN parens sit inside, so its `/` is one level deeper
        # than this string's top, and the `4` before / `+3` after mean
        # `_WRAPPED_RE` above (whole-string-is-one-bracket) never matches
        # either. The inner fraction stayed flat text inside the outer
        # fraction's already-correctly-stacked `.fr`/`.dn` box: `4((4x+3)
        # /(6x-4))+3` printed as one crowded line instead of two levels.
        # Recursing into every top-level bracket span (not only a span
        # that happens to be the WHOLE string) reaches it the same way.
        if _depth < 3:
            parts, last, changed = [], 0, False
            for gstart, gend in _paren_groups(s):
                grp = s[gstart:gend]
                fixed = _fr_one(grp, _depth + 1)
                if fixed != grp:
                    changed = True
                parts.append(s[last:gstart])
                parts.append(fixed)
                last = gend
            parts.append(s[last:])
            if changed:
                return ''.join(parts)
        return s
    # THE SAME CHEMICAL-SLASH GUARD THE PROSE PATH HAS.
    #
    # `_fraction_worthy` protects `HX/ZnCl₂` in ordinary text, but the MATHS
    # path comes through here instead and had no such check — so inside a
    # backtick run `X₂/निर्जल FeX₃` still came out with `X₂` stacked over
    # `निर्जल` in a box, in a सूत्र panel of reagents. A reagent and its
    # condition are a pair, not a quotient, wherever they are written.
    if REACTIONS and _both_formulae(s[:i].strip().split()[-1] if s[:i].strip()
                                   else "",
                                   (s[i + 1:].strip().split() or [""])[0]):
        return s
    # SPACES around the slash are not operand boundaries.
    #
    # `_FR_STOP` contains the space, so `(4π × 10⁻⁷ × 100) / (2 × 2·0 × 10⁻²)`
    # stopped the backward scan on the space before the `/`, found an empty
    # numerator and gave up — the division printed flat and wrapped across two
    # lines. A space next to the operator is typesetting, not structure.
    a, b = i, i + 1
    while a > 0 and s[a - 1] == ' ':
        a -= 1
    while b < len(s) and s[b] == ' ':
        b += 1
    if a != i or b != i + 1:
        return _fr_one(s[:a] + '/' + s[b:], _depth)
    left_start, left = _fr_left(s, i)
    left_start, left = _last_group(left, left_start)
    right_end, right = _fr_right(s, i + 1)
    right_end, right = _first_group(right, right_end, i + 1)
    left, right = _fr_bare(left), _fr_bare(right)
    if not left.strip() or not right.strip():
        return s[:i + 1] + _fr_one(s[i + 1:], _depth)
    if _is_slug(left) or _is_slug(right):
        # Not a division — a path or an identifier. The chapter writes its
        # paper references as `2025/set_jv`, in backticks, and backticks mean
        # maths here: the source note came out with 2025 stacked over set_jv
        # like a fraction. Left as a slash.
        return s[:i + 1] + _fr_one(s[i + 1:])
    # A TALL BOXED FRACTION FOR "1/2" IS A SLEDGEHAMMER.
    #
    # `stack_fracs` gives `q/4\pi\epsilon_0 r^2` the full bordered `.fr`/
    # `.dn` box it needs — that quotient IS the content. `1/2` sitting in
    # the same answer as a coefficient does not: two plain digits, no
    # variable, no unit, and the reference sets it as a compact `¹⁄₂`
    # the same way running prose sets a half. Boxing it stacked it as tall
    # as the real fraction two words later, so a one-character number read
    # as visually as important as the physics next to it.
    #
    # Both sides, not one — `1/r` is still a real quotient (r varies), and
    # `3/x` is an unknown over a variable, not a numeral pair.
    if _SIMPLE_DIGITS_RE.fullmatch(left) and _SIMPLE_DIGITS_RE.fullmatch(right):
        compact = (''.join(_SUP_DIGIT_MAP[c] for c in left)
                   + '\u2044' + ''.join(_SUB_DIGIT_MAP[c] for c in right))
        return s[:left_start] + compact + _fr_one(s[right_end:], _depth)
    # NESTED FRACTIONS.
    #
    # Each operand is stacked in its own right, so a fraction whose numerator
    # and denominator each contain a fraction sets as two levels — which is
    # what the reference does and what the trigonometric-substitution answers
    # in this chapter are made of. Bounded, because a malformed expression
    # should come out flat rather than spin.
    if _depth < 3:
        left = _fr_one(left, _depth + 1)
        right = _fr_one(right, _depth + 1)
    frac = ('<span class="fr"><span>%s</span><span class="dn">%s</span></span>'
            % (left, right))
    return s[:left_start] + frac + _fr_one(s[right_end:], _depth)


# SI unit names, in Hindi and as symbols. A closed set, and the reason a
# lexicon is acceptable here where `answer.py` forbids one: these are
# NOTATION, not subject matter. The same list serves a biology or chemistry
# chapter unchanged, which is exactly the test `answer.py` is protecting.
_UNIT_WORDS = (
    "न्यूटन वोल्ट कूलॉम ऐम्पियर वेबर टेस्ला जूल ओम ओम् मीटर सेकंड सेकण्ड "
    "किग्रा ग्राम हेनरी फैरड वाट कैल्विन मोल कैंडेला रेडियन गॉस ऑर्स्टेड "
    "मी से किमी सेमी मिमी"
).split()


_FORMULA_TOKEN = re.compile(
    r'^\(?(?:[A-Z][a-z]?[\u2080-\u2089\d]{0,3}){1,6}\)?[\u2080-\u2089\d]{0,3}'
    r'[\u207a\u207b\u2070-\u2079+-]{0,3}$')


def _both_formulae(a, b):
    """Do BOTH sides of a slash look like chemical formulae?

    Requires both, so a physics quotient of two symbols (`E/B`, `mv/qB`) is
    untouched — those have a lower-case leading letter or a multi-symbol
    numerator that is not element-shaped. A Devanagari side counts as a
    condition name (`HBr/परॉक्साइड`), which is the other half of the pair.
    """
    def ok(t):
        t = (t or "").strip().strip("()")
        if re.search(r'[\u0900-\u097F]', t):
            return True
        return bool(_FORMULA_TOKEN.match(t)) and bool(re.match(r'[A-Z]', t))
    def formula(t):
        t = (t or "").strip().strip("()")
        return bool(_FORMULA_TOKEN.match(t)) and bool(re.match(r'[A-Z]', t))
    # At least one side must be an actual FORMULA. Two Devanagari sides are a
    # unit name (`न्यूटन/(ऐम्पियर·मीटर)`), which is a real quotient and still
    # stacks — physical chemistry writes those too.
    return ok(a) and ok(b) and (formula(a) or formula(b))


def _fraction_worthy(text):
    """Is this `a/b` a division, or a word-alternative like `और/या`?

    Prose slashes were left flat because `stack_fracs` only ran on
    maths-marked text — so `मात्रक न्यूटन/(ऐम्पियर·मीटर)` and `l/r` printed
    with a slash while the identical expression inside `$…$` stacked. On
    chapter 4 all 179 prose slashes were units or formulas and not one was a
    word-alternative, but "not one in this chapter" is not a rule, so:

      · either side carrying a Latin letter, Greek letter or digit is maths
        (`mv/qB`, `2πm/qB`, `Tm/A`, `E/B`) — 106 of the 179;
      · otherwise both sides must be SI unit names (`मीटर/सेकंड`) — 71.

    `और/या` satisfies neither and stays prose.
    """
    m = re.search(r'([^\s<>]{1,24})/([^\s<>]{1,24})', text or "")
    if not m:
        return False
    a, b = m.group(1), m.group(2)
    # A SLASH BETWEEN TWO CHEMICAL FORMULAE IS NOT A DIVISION.
    #
    # Chemistry writes a reagent and its condition as `HX/ZnCl₂`,
    # `Br₂/CCl₄`, `HBr/परॉक्साइड` — a pair, not a quotient. Stacked, `HX`
    # sat over `ZnCl₂` with a rule between them, which reads as a quantity
    # being divided by another quantity, and on the chapter's cover it made
    # the list of four reagents unreadable.
    #
    # `Br₂/CCl₄` also satisfies the Latin-letter test below, so it cannot be
    # left to that; the check has to come first. A chemical formula here is
    # an element-shaped token: a capital, an optional lower-case letter, and
    # subscript digits — and BOTH sides must look like one, so `mv/qB` and
    # `E/B` stay divisions.
    if REACTIONS and _both_formulae(a, b):
        return False
    if re.search(r'[A-Za-z\u0370-\u03ff0-9]', a + b):
        return True
    # A compound unit: `(ऐम्पियर·मीटर)` is two unit names joined by a middle
    # dot. Cleaning the whole side to one token left `ऐम्पियरमीटर`, which is
    # in no lexicon, so the commonest unit in the chapter stayed flat.
    def units_only(side):
        # Superscripts too: `मीटर\u00b2` is the unit `मीटर` squared, and
        # leaving the \u00b2 on kept `\u0935\u0947\u092c\u0930/\u092e\u0940\u091f\u0930\u00b2` — the SI unit of magnetic
        # flux density — out of the lexicon and flat on the page.
        side = re.sub(r'[()\s,.\u0964\u00b2\u00b3\u00b9\u2070-\u209f]', '', side)
        parts = [x for x in side.split('\u00b7') if x]
        return bool(parts) and all(x in _UNIT_WORDS for x in parts)

    return units_only(a) and units_only(b)


# `[2022, 15, 13]` — the years a question was set in, written as a bare
# bracketed list. Rendered as plain text it was indistinguishable from the
# prose around it, and it is one of the few things a student scans for.
# Two-digit entries are the same century as the first: `[2025, 24, 23]`.
# A single bracketed year counts too — `[2013]` on its own is as much a
# year as `[2025, 24, 23]`, and left alone it read as body text.
_YEARS_RE = re.compile(r'\[\s*((?:19|20)\d\d(?:\s*[,·]\s*\d{2,4})*)\s*\]')


# `[1M]` / `[2]` — what a question or a step is worth. The reader turns these
# into chips on the blocks it owns, but a QUESTION STEM is rendered straight
# through `inline()` and never passed that way, so eleven of them printed as
# literal text next to a year chip. Converting here covers every path at
# once, which is the lesson the marks work taught three times over.
# HALF MARKS COUNT TOO.
#
# The pattern took whole numbers only, so `[1/2]` — half a mark, and there
# are sixteen of them — fell through to the prose fraction stacker and came
# out as a bracket wrapped round a stacked fraction. That is indistinguishable
# from a 1x1 MATRIX on a page full of matrices, which is exactly how it read.
# `[2½]` and `[½]` are the same value said differently.
#
# The vulgar fraction is used in the chip rather than a stacked one: a chip is
# one line high, and `½` is a single character that fits it.
# THE UNIT WORD IS PART OF THE TAG.
#
# This matched `[2]` and `[2M]` but not `[2 अंक]` — and `[2 अंक]` is how all
# three chemistry chapters write it, 230 times in chapter 6 alone. Not one
# became a chip: each printed as inline bold at the end of the line it
# belonged to, `… B < D < A < C [1 अंक]`, which reads as part of the option
# rather than as the marks for the question. `.qmarks` was used ZERO times on
# a page with 230 marks tags on it.
# A HALF MARK IS ALSO WRITTEN AS LATEX, AND THAT SPELLING MUST COME FIRST.
#
# Chapter 6 writes 14 of its tags as `**[2\frac{1}{2}]**`. Every pass that
# knows the tag ran against the `½`/`1/2` spellings only, so the reader's
# `strip_trailing_marks` could not lift these off the text. That left the tag
# inside the line — and the three lines carrying it are ORDER statements
# (`… प्राथमिक हैलाइड > द्वितीयक हैलाइड …`), which `_looks_like_formula`
# correctly reads as maths. `marks_chips` runs on prose only, so the tag went
# down the maths path instead and printed mid-page as an upright-bracketed
# `[2½]`: the marks for the question, set as though it were part of the
# equation. Recognised here, at the one place that spells the tag, so the
# reader lifts it into a marks node before any classification happens.
_MARKS_TAG_RE = re.compile(
    r'\[\s*(\d{0,2}\s*\\frac\s*\{\s*[13]\s*\}\s*\{\s*[24]\s*\}'
    r'|\d{1,2}\s*[½¼¾]|[½¼¾]|\d{1,2}\s*/\s*[24]|\d{1,2})'
    r'\s*(?:[Mm]|अंक|marks?|mark)?\s*\]')

# The same tag wrapped in bold, which is how the source writes it:
# `**[2 अंक]**`. Bold runs before this pass, so by the time it is reached the
# tag is `<b>[2 अंक]</b>` — and leaving the `<b>` around a chip gave a chip
# with a bold border inside it. The wrapper is replaced, not kept.
_MARKS_BOLD_RE = re.compile(
    r'<b>\s*' + _MARKS_TAG_RE.pattern + r'\s*</b>')

# THE TAG MAY BE WRAPPED IN MATHS DELIMITERS — BUT ONLY A FRACTION ONE.
#
# chapter 6 closes fourteen answers `… पृष्ठ संख्या 80 देखें। $[1\frac{1}{2}]$`
# — the tag inside `$…$`, and NOT alone on its line, so neither the
# marks-only line pattern nor the trailing-tag pattern matched it and the
# marks printed mid-answer as `[1½]`.
#
# Deliberately a SEPARATE pattern rather than an optional `$` on the one
# above, and deliberately fractions only: `$[2]$` is a legitimate 1x1
# matrix, and the maths chapter sets pages of them. A 1x1 matrix holding
# `1½` is not a thing in these books, so the fraction spellings are
# unambiguous where a bare digit is not.
_MARKS_TAG_DOLLAR_RE = re.compile(
    r'\$\s*\[\s*(\d{0,2}\s*\\frac\s*\{\s*[13]\s*\}\s*\{\s*[24]\s*\}'
    r'|\d{1,2}\s*[½¼¾]|[½¼¾]|\d{1,2}\s*/\s*[24])'
    r'\s*(?:[Mm]|अंक|marks?|mark)?\s*\]\s*\$')

_VULGAR = {"1/2": "½", "1/4": "¼", "3/4": "¾", "2/4": "½"}


def _marks_value(raw):
    r"""`1/2` -> `½`, `2\frac{1}{2}` -> `2½`, `2½` -> `2½`, `3` -> `3`."""
    v = re.sub(r'\s+', '', raw or "")
    # The LaTeX spelling normalises to the same character the other
    # spellings already produce, so the chip reads identically whichever
    # way the tag was written. `2\frac{1}{2}` keeps its leading whole
    # number; a bare `\frac{1}{2}` becomes just `½`.
    v = re.sub(r'\\frac\{1\}\{2\}|\\frac\{2\}\{4\}', '½', v)
    v = re.sub(r'\\frac\{1\}\{4\}', '¼', v)
    v = re.sub(r'\\frac\{3\}\{4\}', '¾', v)
    # `[1 \times 5]` — five questions worth one mark each, the way a
    # section header states its total. The operator is the only LaTeX in
    # it; spelled out it read `1 \times 5` on the page.
    v = v.replace('\\times', '×')
    return _VULGAR.get(v, v)


def marks_value(raw):
    """Public door on the ONE place that normalises a marks value.

    The reader needs the same normalisation for a marks-only LINE that this
    module already does for a trailing tag, and reaching into `_marks_value`
    from another module would make two owners of one fact.
    """
    return _marks_value(raw)


_TAIL_MARKS_RE = re.compile(
    r'^(.*\S)\s*' + _MARKS_TAG_RE.pattern + r'\s*$', re.S)
_TAIL_MARKS_DOLLAR_RE = re.compile(
    r'^(.*\S)\s*' + _MARKS_TAG_DOLLAR_RE.pattern + r'\s*$', re.S)


def strip_trailing_marks(text):
    r"""`"… होता है। [1]"` -> ("… होता है।", "1"); `"… [1/2]"` -> (…, "½").

    ONE SPELLING OF THE MARKS TAG, ONE PLACE THAT KNOWS IT.

    The chapter writes a half mark as `[1/2]`, and both callers that strip a
    trailing tag — the reader, for answers, and the renderer, for short
    formulas — matched `\d{1,2}` only. So `2A = [matrix] [1/2]` kept its tag
    inside the maths, where `1/2` was set as a stacked fraction in square
    brackets: indistinguishable from a 1x1 matrix, on a page of matrices.
    """
    m = (_TAIL_MARKS_RE.match(text or "")
         or _TAIL_MARKS_DOLLAR_RE.match(text or ""))
    return (m.group(1).rstrip(), _marks_value(m.group(2))) if m else (text, "")


# A FOUR-DIGIT `अंक` TAG IS A YEAR THAT PICKED UP THE WRONG WORD.
#
# The source writes `**[2025 अंक]**` 118 times in chapter 6. `2025` is the
# YEAR the question was asked; `अंक` means marks. Printed literally it reads
# "2025 marks", which is nonsense, and it printed as inline bold at the end
# of the question because the marks regex correctly refuses four digits.
#
# Rendered as the year chip the rest of the book already uses. The word is
# dropped rather than kept, because keeping it would preserve the error.
_YEAR_MARKS_RE = re.compile(
    r'(?:<b>\s*)?\[\s*(19[5-9]\d|20[0-4]\d)\s*(?:अंक|marks?)\s*\]'
    r'(?:\s*</b>)?')


# A DECORATIVE DASH RUN RIGHT BEFORE THE TAG IS NOT PART OF THE PAGE.
#
# `20_dash_free.md` marks a step's worth `-----------**[1 अंक]**` — a
# hand-typed divider immediately before the tag. The reader strips a
# trailing tag from prose in two places, but a few of the 40 in this
# chapter carry something else after the tag on the same joined paragraph
# run — another bracketed note, a bolded `इति सिद्धम्` right after — so
# they are not the LAST thing in the text either caller matches against,
# and reach this pass (the one place every spelling of the tag converges)
# with the dash run still attached. Stripped here, once, regardless of
# which caller found the tag itself.
_DASH_RUN_BEFORE_MARKS_RE = re.compile(r'-{3,}\s*(?=(?:<b>)?\[)')


# A BARE DIGIT WITH NO UNIT WORD IS ONLY A MARKS TAG WHEN IT TRAILS.
#
# `[1]`/`[2]` with no `M`/`अंक`/`marks` is how physics and biology write a
# one-line answer's marks — always the LAST thing on the line: `…रहती है।
# [1]`. But the same bracket-digit shape is ALSO real mathematics: maths
# writes an equivalence class as `[0]`, and `तुल्यता वर्ग [0] को लिखो` — MORE
# of the sentence following the bracket, not a trailing tag at all — turned
# into a yellow "0 अंक" chip stamped into the middle of the question, and
# the same corruption hit `$[0]=\{0,2,4\}$` two lines later because this
# regex has no notion of `$` and matches inside maths delimiters too. The
# fraction spellings below (`½`, `2\frac{1}{2}`) stay unambiguous regardless
# of position — nothing else looks like a mark written as a fraction — so
# only the bare-digit branch needs the extra check: convert it ONLY when
# nothing but closing punctuation/markdown follows to the end of the string.
_TRAILING_AFTER_MARKS_RE = re.compile(r'^[\s*।.\)]*$')


def marks_chips(s):
    s = _DASH_RUN_BEFORE_MARKS_RE.sub('', s)
    # THE CHIP SAYS WHAT THE NUMBER IS.
    #
    # A yellow chip reading just `1` next to an option is a number with no
    # unit — it could be the option number. The tag's own word is what makes
    # it unambiguous, and the chip is `white-space:nowrap`, so it costs one
    # line either way.
    def chip(m):
        raw = m.group(1)
        if (re.fullmatch(r'\d{1,2}', raw)
                and not re.search(r'[Mm]|अंक|marks?|mark', m.group(0))
                and not _TRAILING_AFTER_MARKS_RE.match(m.string[m.end():])):
            return m.group(0)
        return '<span class="qmarks">%s अंक</span>' % _marks_value(raw)
    s = _MARKS_TAG_DOLLAR_RE.sub(
        lambda m: '<span class="qmarks">%s अंक</span>' % _marks_value(m.group(1)), s)
    # Years first — they are not marks and must not be read as any.
    s = _YEAR_MARKS_RE.sub(
        lambda m: '<span class="qyr">%s</span>' % m.group(1), s)
    # The bolded form next, so its `<b>` wrapper goes with it.
    s = _MARKS_BOLD_RE.sub(chip, s)
    parts = re.split(r'(<[^>]+>)', s)
    return ''.join(
        p if p.startswith('<') else _MARKS_TAG_RE.sub(chip, p)
        for p in parts)


def year_chips(s):
    def one(m):
        parts = [p.strip() for p in re.split(r'[,·]', m.group(1)) if p.strip()]
        return ('<span class="qyr">%s</span>'
                % ' · '.join(parts))
    parts = re.split(r'(<[^>]+>)', s)
    return ''.join(p if p.startswith('<') else _YEARS_RE.sub(one, p)
                   for p in parts)


def prose_fracs(s):
    """Stack `a/b` in ORDINARY text, when it is really a division.

    Marked `fr-unit`, because a UNIT is not maths. `न्यूटन/(ऐम्पियर·मीटर)` was
    coming out in the Georgia italic that formulas use — a unit name set as
    though it were an algebraic operand, mid-sentence in a Devanagari
    paragraph. Inside `$…$` the italic is right; in prose it is not.
    """
    # A FRACTION IN A SENTENCE STAYS ON THE LINE.
    #
    # Stacking was added so a prose unit would not be set in the italic
    # algebra face. That part was right; stacking was not. A two-row fraction
    # inside running text makes that one line two-and-a-half times the height
    # of its neighbours, and the text either side steps around it:
    #
    #     … = 1.92 × 10⁻¹⁰ N/C (धनात्मक से ऋणात्मक प्लेट की ओर)।
    #     … मध्य बिन्दु पर E = E₁+E₂ = σ/ε₀ = 17×10⁻²²/8.85×10⁻¹² …
    #
    # both came out with the slash replaced by a stack mid-sentence. A
    # textbook stacks in a DISPLAY equation and uses a slash in a sentence,
    # and the slash is what the source wrote.
    #
    # So the face is still corrected — that is what `.fr-unit` was for — but
    # the geometry is left alone.
    return s


def _script_depth_parts(s):
    """Split into tags and text, telling which text is inside a <sub>/<sup>.

    Yields (part, in_script). A fraction has no business being stacked inside
    an exponent: `2(x² + a²)^(3/2)` wants `3/2` on ONE line, and stacking it
    hung a two-line fraction below the baseline of a superscript.
    """
    depth = 0
    for part in re.split(r'(<[^>]+>)', s):
        if part.startswith('<'):
            m = re.match(r'</?(sub|sup)\b', part)
            if m:
                depth = max(0, depth + (-1 if part.startswith('</') else 1))
            yield part, False
        else:
            yield part, depth > 0


# A stand-in for one HTML tag while the fraction parser runs.
_TAG_MARK = '\ue031'

# `Sₙ2` — THE SUBSCRIPT IS A CAPITAL N, AND UNICODE HAS NO SUCH CHARACTER.
#
# `S_N` names a NUCLEOPHILIC substitution, so the letter is capital N. The
# chapter writes it `$\mathrm{S_N}2$` in 55 places and, in 19 others — the
# cover, the index, the section head, two formula strips — as the literal
# `Sₙ` with U+2099 LATIN SUBSCRIPT SMALL LETTER N, because there is no
# subscript capital N to type. Printed, those 19 read as a lowercase n: a
# different symbol, on the cover of a chapter about the reaction.
#
# Handled here rather than in the source because the 19 sit in table cells,
# inline-code strips and prose alike; one rule covers every context. The
# markup is parked behind a sentinel until the very end of `inline()` —
# restored any earlier, the escape pass and `_tick` would print the tags.
_SN_MARK = '\ue032'
_SN_RE = re.compile('S\u2099')

# A BOND IS ONE GLYPH, AND THE BOOK ALREADY CHOSE WHICH.
#
# `structure.py`, `reaction.py` and the structure grids all draw a bond as an
# em dash, and the chapter's prose writes `R—OH` and `R—X`. Its MATHS writes
# the same bonds as an ASCII hyphen — `$R-X$`, `$\mathrm{C-Cl}$`, `$(R-X)$` —
# and nothing converted them, so the page carried 97 em-dash bonds and 93
# hyphen ones: the same bond set two ways, often in adjacent lines.
#
# The right side must be an ELEMENT SYMBOL, not a word: one capital and at
# most one lowercase. Without that, `असली UP-Board प्रश्न` became `UP—Board`.
# The left side is a symbol, a digit (`CH3-CH2`, once LaTeX has been
# flattened) or a closing bracket. A Devanagari neighbour never matches, so
# `जल-अपघटन` and `2-ब्रोमो` keep their hyphens.
#
# Chemistry only, on the same `REACTIONS` gate and for the same reason: a
# hyphen between two capitals is a bond in chemistry and a subtraction in
# maths, and only the profile knows which book this is.
_BOND_HYPHEN_RE = re.compile(
    r'((?:[A-Z][a-z]?|[0-9]|\)))-(?=(?:[A-Z][a-z]?(?![a-z])|\())')


def stack_fracs(s):
    """`a/b` -> stacked .fr/.dn, with tags OPAQUE rather than boundaries.

    Splitting on tags and parsing each text run separately meant an operand
    could not contain one — and `\vec{dl}` becomes `<b>` long before this
    runs, so `I(dl⃗ × r⃗)/r³` presented the parser with the text `)` as its
    numerator. The result was `)` over `r³` and the rest of the expression
    stranded on the line above.

    Each tag becomes a single placeholder character instead, which is not in
    `_FR_STOP`, so an operand may span it. The tags go back afterwards, in
    order — `_fr_one` never reorders what it wraps.

    Exponents are still skipped: `2(x²+a²)^(3/2)` wants its `3/2` on one
    line, not stacked — and so is `x^{3/2}`, the same exponent BEFORE
    `reopen_sentinels` has turned it into a real `<sup>`. `strip_latex` parks
    it behind `_SUP_O`…`_SUP_C` private-use marks at this point, which
    `_script_depth_parts_grouped` cannot see — it only tracks literal
    `<sup>`/`<sub>` tags, so `3/2` read as ordinary top-level text, got
    stacked into its own tall `.fr`/`.dn`, and THAT ended up nested inside
    the `<sup>` once it finally opened: a fraction shrunk twice over,
    illegible in print. Stashing the WHOLE sentinel span as one opaque
    placeholder — the same trick already used for real tags, two lines
    down — keeps `_fr_one` from ever seeing the slash inside it, with no
    need to teach the run-splitter a second, more fragile notion of depth.
    """
    out = []
    for part, in_script in _script_depth_parts_grouped(s):
        if in_script:
            out.append(part)
            continue
        tags = []

        def stash(m):
            tags.append(m.group(0))
            return _TAG_MARK

        body = _fr_one(_STASH_RE.sub(stash, part))
        it = iter(tags)
        out.append(re.sub(_TAG_MARK, lambda _: next(it), body))
    return ''.join(out)


def _script_depth_parts_grouped(s):
    """Like `_script_depth_parts`, but yields RUNS with their tags attached.

    The fraction parser needs a whole run — text and the tags inside it — not
    the alternating pieces `re.split` gives, or an operand can never span a
    tag.
    """
    buf, depth, cur_in = [], 0, False
    for part in re.split(r'(<[^>]+>)', s):
        is_tag = part.startswith('<')
        if is_tag:
            m = re.match(r'</?(sub|sup)\b', part)
            if m:
                nxt = max(0, depth + (-1 if part.startswith('</') else 1))
                # the tag itself belongs to the side it is closing over
                if (depth > 0) != (nxt > 0):
                    buf.append(part)
                    yield ''.join(buf), cur_in
                    buf, depth, cur_in = [], nxt, nxt > 0
                    continue
                depth = nxt
        buf.append(part)
    if buf:
        yield ''.join(buf), cur_in


_MINUS_RE = re.compile(r'(?<![<\w])-(?=\d)')


def math_minus(s):
    parts = re.split(r'(<[^>]+>)', s)
    return ''.join(p if p.startswith('<') else _MINUS_RE.sub('−', p) for p in parts)


# `∫` followed by its upper limit — for maths typed as plain text, where
# nothing has marked the limits yet.
#
# `(.)` used to mean ANY next character, which included the private-use
# sentinels `strip_latex` writes to mark a sub/superscript it has ALREADY
# resolved. So `\int_a^b`, which arrives here as `∫ₐ<sup-open>b<sup-close>`,
# had its sentinel superscripted in turn — reopening to `∫<sup><sup></sup>b</sup>`,
# nested tags whose own `<` and `>` the later passes then read as maths.
# That is the `∫_a^<sup>b` in the built page.
#
# A space was superscripted for the same reason, giving `∫<sup> </sup>dB`.
# Neither a sentinel nor whitespace nor a tag opener can be a limit.
#
# The run covers subscript DIGITS as well as letters (U+2080 up), or
# `\int_0^\infty` keeps the same fault its lettered twin had.
# The subscript run is POSSESSIVE (`*+`). Excluding sentinels from the second
# group is not enough on its own: `strip_latex` resolves the LOWER limit to a
# real Unicode subscript, so `\int_a^b` arrives as `∫ₐ<sentinel>b<sentinel>`,
# and an ordinary `*` would hand the `ₐ` back on failure and superscript the
# lower limit instead — `∫<sup><sub>a</sub></sup>`. Refusing to backtrack
# makes the whole rule stand down once the limits are already marked, which
# is exactly when it has nothing to do.
_INT_RE = re.compile('(\u222b[_\u2080-\u209c]*+)([^\\s<\ue010-\ue013\ue020])')


# `^(3/2)` — a BRACKETED exponent. `unicode_scripts_to_tags` handles a
# superscript that is already a Unicode small form, and `underscores` handles
# `_x`, but nothing handled `^` followed by a bracket: the axial-field formula
# printed `2(x2 + a2)^(3/2)` with its own caret and brackets on the page.
_POW_GROUP_RE = re.compile(r'\^\(([^()]{1,12})\)')
# `^2`, `^n` — a single unbracketed token.
_POW_ONE_RE = re.compile(r'\^(?!\()([A-Za-z0-9\u2212-])')


def powers(s):
    """`x^(3/2)` and `x^2` -> real <sup> markup."""
    parts = re.split(r'(<[^>]+>)', s)
    out = []
    for p in parts:
        if p.startswith('<'):
            out.append(p)
            continue
        p = _POW_GROUP_RE.sub(lambda m: '<sup>%s</sup>' % m.group(1), p)
        p = _POW_ONE_RE.sub(lambda m: '<sup>%s</sup>' % m.group(1), p)
        out.append(p)
    return ''.join(out)


def integral_limit(s):
    return _INT_RE.sub(lambda m: m.group(1) + '<sup>%s</sup>' % m.group(2), s)


_SMALL_SUB = {'ₐ': 'a', 'ₑ': 'e', 'ᵢ': 'i', 'ⱼ': 'j', 'ₖ': 'k', 'ₗ': 'l', 'ₘ': 'm',
              'ₙ': 'n', 'ₒ': 'o', 'ₚ': 'p', 'ᵣ': 'r', 'ₛ': 's', 'ₜ': 't', 'ᵤ': 'u',
              'ᵥ': 'v', 'ₓ': 'x'}
_SMALL_SUP = {'ᵃ': 'a', 'ᵇ': 'b', 'ᶜ': 'c', 'ᵈ': 'd', 'ᵉ': 'e', 'ᶠ': 'f', 'ᵍ': 'g',
              'ʰ': 'h', 'ⁱ': 'i', 'ʲ': 'j', 'ᵏ': 'k', 'ˡ': 'l', 'ᵐ': 'm', 'ⁿ': 'n',
              'ᵒ': 'o', 'ᵖ': 'p', 'ʳ': 'r', 'ˢ': 's', 'ᵗ': 't', 'ᵘ': 'u', 'ᵛ': 'v',
              'ʷ': 'w', 'ˣ': 'x', 'ʸ': 'y', 'ᶻ': 'z'}


# Unicode sub/superscript DIGITS as well as letters. The reference page
# contains ZERO raw `₁` and two `⁵`; every one is a real <sub>/<sup> tag,
# with the digit inside wrapped in `.up`:
#
#     R<sub><span class="up">2</span></sub>
#
# That matters because the stylesheet gives <sub>/<sup> `line-height:0` and
# a tuned baseline, while a raw `₁` renders at whatever size and baseline
# the font happens to have — and Kalam has no Devanagari-matched small forms, so
# they fall back to a different face. 770 subscripts and 234 superscripts
# were rendering that way, which is most of why the page looked wrong.
_SUB_DIGIT = {'₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5',
              '₆': '6', '₇': '7', '₈': '8', '₉': '9', '₊': '+', '₋': '−',
              '₌': '=', '₍': '(', '₎': ')'}
_SUP_DIGIT = {'⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5',
              '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '−',
              '⁼': '=', '⁽': '(', '⁾': ')'}

_SUB_RUN = re.compile('([' + ''.join(_SUB_DIGIT) + ']+)')
_SUP_RUN = re.compile('([' + ''.join(_SUP_DIGIT) + ']+)')


def unicode_scripts_to_tags(s):
    """Raw `₁` / `⁻¹⁹` -> real <sub>/<sup>, digits wrapped in `.up`.

    Runs are converted whole, so `10⁻¹⁹` becomes one <sup>, not three."""
    def sub_run(m):
        inner = "".join(_SUB_DIGIT[c] for c in m.group(1))
        return '<sub><span class="up">%s</span></sub>' % inner

    def sup_run(m):
        inner = "".join(_SUP_DIGIT[c] for c in m.group(1))
        return '<sup><span class="up">%s</span></sup>' % inner

    # ALREADY inside a script? Leave the character alone.
    #
    # `\int_{\theta_1}^{\theta_2}` converts to `∫` + a subscript holding
    # `θ₁`, and converting that `₁` in turn produced a <sub> nested in a
    # <sub> — a subscript of a subscript, which browsers set at about half
    # the size again and reads as a smudge. Inside a script tag the Unicode
    # small form is already the right size, and is what the reference uses
    # there.
    out, depth = [], 0
    for part in re.split(r'(<[^>]+>)', s):
        if part.startswith('<'):
            m = re.match(r'</?(sub|sup)\b', part)
            if m:
                depth += -1 if part.startswith('</') else 1
                depth = max(0, depth)
            out.append(part)
            continue
        out.append(part if depth
                   else _SUP_RUN.sub(sup_run, _SUB_RUN.sub(sub_run, part)))
    return "".join(out)


def _small_letters_to_tags(s):
    for ch, letter in _SMALL_SUB.items():
        s = s.replace(ch, '<sub>%s</sub>' % letter)
    for ch, letter in _SMALL_SUP.items():
        s = s.replace(ch, '<sup>%s</sup>' % letter)
    return s


def _vectors(s):
    """`E⃗` (letter + U+20D7) -> .vec, which draws the arrow with ::after.

    Done on the ALREADY-ESCAPED string, and only for a single preceding
    character, so it can never span a tag."""
    # Greek too. `[A-Za-z]` left `τ⃗` unmatched, so the combining arrow stayed
    # a bare mark — and Kalam cannot compose U+20D7 over a tau, so the box
    # `τ = m × B` drew a hollow rectangle above the tau. Every vector in
    # physics that is not a Latin letter is a Greek one.
    # Up to TWO letters, not one. A differential element is written `dl⃗`,
    # and matching a single character put the arrow over the `l` alone —
    # `d` plain, then `l` with an arrow — so the page showed half a symbol
    # marked as a vector. `dl`, `dA`, `mv` are one quantity each.
    return re.sub(r'([A-Za-zΑ-Ωα-ωϑϕϖ][A-Za-z]?)' + _COMBINING_ARROW,
                  lambda m: '<span class="vec">%s</span>' % m.group(1), s)


# --------------------------------------------------------------------------
# LaTeX -> Unicode, via the standalone converter in `latex.py`.
#
# This used to reach into `engine_qa.py` behind `except: lambda x: x`.
# When the old engine was archived the import broke and that fallback
# passed LaTeX through untouched — `\\tau = pE \\sin\\theta` printed as
# literal backslash commands, with no error anywhere. A converter is now
# imported at module load so a missing one is a crash, not a downgrade.
# --------------------------------------------------------------------------
from ..validators.latex_convert import tex as _tex_fn           # noqa: E402


# `latex_convert` marks a multi-character subscript/superscript with private-
# use sentinels rather than Unicode, because `\tau_{अधिकतम}` has no Unicode
# small form. Nothing was turning them back into tags, so every multi-char
# subscript in the book printed as two tofu boxes — `\u03c4\ue010अधिकतम\ue011`.
# They must be reopened as real <sub>/<sup> AFTER escaping, or the tags get
# escaped along with the text.
from ..validators.latex_convert import (_SUB_O, _SUB_C, _SUP_O, _SUP_C,      # noqa: E402
                                        _RM_O, _RM_C)
from ..validators.latex_convert import _SUB_MAP as _SUB_DIGIT_MAP   # noqa: E402
from ..validators.latex_convert import _SUP_MAP as _SUP_DIGIT_MAP   # noqa: E402
# Both operands plain 1-2 digit numerals — see the compact-fraction
# branch in _fr_one.
_SIMPLE_DIGITS_RE = re.compile(r'[0-9]{1,2}')
# A REAL TAG, or one COMPLETE sentinel-wrapped sub/superscript — matched
# as a SINGLE alternation so stack_fracs's one `.sub()` pass stashes both
# in true left-to-right order. Two separate `.sub()` calls (tags, then
# sentinel spans) each append to the same `tags` list in their OWN
# left-to-right order, and concatenating those two orders is not the
# document's order whenever a tag and a sentinel span interleave — the
# restore pass then hands each `_TAG_MARK` the WRONG stashed text.
# Protects a fractional exponent from stack_fracs before
# reopen_sentinels has turned the marks into real <sub>/<sup> tags.
# See stack_fracs.
_STASH_RE = re.compile(
    r'<[^>]+>'
    '|(?:' + _SUB_O + '[^' + _SUB_O + _SUB_C + ']*' + _SUB_C + ')'
    '|(?:' + _SUP_O + '[^' + _SUP_O + _SUP_C + ']*' + _SUP_C + ')'
    '|(?:' + _RM_O + '[^' + _RM_O + _RM_C + ']*' + _RM_C + ')')

_ROW_BREAK = "\ue020"          # a `\\` row break inside a LaTeX environment

_SENTINELS = ((_SUB_O, "<sub>"), (_SUB_C, "</sub>"),
              (_SUP_O, "<sup>"), (_SUP_C, "</sup>"),
              (_RM_O, '<span class="up">'), (_RM_C, "</span>"),
              (_ROW_BREAK, "<br>"))

# `\begin{aligned} … \\ … \end{aligned}` and `\begin{array}{l} …` are
# multi-row environments. The converter does not know them, so the wrapper
# printed literally — a derivation in chapter 3 read "beginaligned I &amp;=
# neAv_d". Strip the wrapper, drop the `&` alignment markers, and keep the
# row breaks as real line breaks.
_ENV_RE = re.compile(r'\\(?:begin|end)\s*\{[a-zA-Z*]+\}(?:\s*\{[^}]*\})?')


def strip_environments(src):
    src = _ENV_RE.sub(" ", src)
    src = src.replace("\\\\", _ROW_BREAK)
    src = re.sub(r'(?<!\\)&', " ", src)
    return src


def reopen_sentinels(s):
    for mark, tag in _SENTINELS:
        if mark:
            s = s.replace(mark, tag)
    return s


def _latex(src):
    try:
        return _tex_fn(src)
    except Exception as e:
        raise RuntimeError("LaTeX conversion failed for %r: %s" % (src[:60], e))


# `{$x$ $y$}` -> `{x y}`. A `$` directly inside a braced LaTeX argument, or
# separating two of them, is a stray delimiter — see strip_latex.
_NESTED_MATH_RE = re.compile(r'\{([^{}$]*)\$([^{}$]*)\$([^{}$]*)\}')


def _drop_inner_dollars(text):
    prev = None
    while prev != text:
        prev = text
        text = re.sub(r'(\{[^{}]*?)\$', r'\1', text)
    return text


# A token stranded BETWEEN two maths spans by a redundant `$…$`.
#
# The maths source wraps a sub-token in its own delimiters inside an
# expression that is already maths:
#
#     $A = [$a_{ij}$]_{m} \times _{n}$
#     $A_{m} \times _{n} \cdot $B_{n}$ \times _{p}$
#
# The dollar COUNT is even — the chapter's own header checked that and found
# nothing wrong — but the PAIRING is not what the author meant. The spans
# come out as `$A = [$` and `$]_{m}…$`, which leaves `a_{ij}` outside maths
# altogether, so nothing converts it and the page prints `a_{ij}` and
# `B_{n}` with their braces and underscores showing. It appears in many
# places in this chapter.
#
# A gap between two spans that is ONLY LaTeX characters — no space, no
# Devanagari, no punctuation — was never prose. The two delimiters around it
# are spurious and the three pieces are one expression.
_STRANDED_RE = re.compile(r'\$([A-Za-z0-9_{}\\^]+)\$')


# `_{m} \times _{n}` — a matrix ORDER written as two subscripts.
#
# LaTeX reads that as "subscript m, then times, then subscript n", so it set
# `[aᵢⱼ]ₘ × ₙ` with the multiplication sign sitting on the baseline between
# two subscripts. The author meant one subscript: the order `m × n`. Three
# occurrences in chapter 3, all of them matrix orders.
_SPLIT_ORDER_RE = re.compile(r'_\{([^{}]{1,4})\}\s*\\times\s*_\{([^{}]{1,4})\}')


def _join_order_subscripts(s):
    return _SPLIT_ORDER_RE.sub(r'_{\1 \\times \2}', s)


def _rejoin_stranded_maths(s):
    """Merge `$…$X$…$` back into one span when X is bare notation."""
    if s.count("$") < 4:
        return s
    parts = s.split("$")
    # parts[0], parts[2], parts[4] … sit OUTSIDE the spans; the odd ones are
    # inside. A stranded token is an even-indexed part that is pure notation
    # and not at either end of the line.
    out = [parts[0]]
    i = 1
    while i < len(parts):
        inside = parts[i]
        after = parts[i + 1] if i + 1 < len(parts) else None
        if (after is not None and i + 2 < len(parts)
                and after and _STRANDED_RE.fullmatch("$" + after + "$")):
            # `…$inside$ after $next…` -> one span holding all three.
            nxt = parts[i + 2]
            parts[i + 2] = inside + after + nxt
            i += 2
            continue
        out.append("$" + inside + "$")
        out.append(after if after is not None else "")
        i += 2
    return "".join(out)


def strip_latex(s):
    """`$x$` / `$$x$$` -> plain Unicode, wrapped in backticks.

    The backticks matter: LaTeX is math by definition, so the converted
    text must go down the `.m` path and get fraction-stacking. Without
    them `\\frac{1}{4\\pi\\varepsilon_0}` renders as the literal
    "(1)/(4πε₀)" instead of a stacked fraction."""
    def conv(m):
        out = _latex(strip_environments(m.group(1))).replace('`', '').strip()
        return '`%s`' % out if out else ''
    # NESTED `$` inside a braced argument, first.
    #
    # The chapter writes `$\frac{F}{L} = …\cdot\frac{$i_1$ $i_2$}{r}$` —
    # maths delimiters inside maths, which is malformed. The outer span then
    # ends at the FIRST inner `$`, so `\frac{` is handed an empty argument
    # and the page shows `μ₀2π·()/()` — a destroyed formula, with the words
    # all still present so `step16` counted nothing missing.
    #
    # A `$` immediately inside a brace is never meaningful, so it is dropped
    # rather than the formula being lost. Fixing the markdown alone would
    # leave every other chapter exposed to the same typo.
    s = _drop_inner_dollars(s)
    s = _rejoin_stranded_maths(s)
    s = _join_order_subscripts(s)
    s = re.sub(r'\$\$(.+?)\$\$', conv, s, flags=re.S)
    s = re.sub(r'\$([^$\n]+?)\$', conv, s)
    # AN UNCLOSED `$` STILL OPENED A MATHS SPAN.
    #
    # Both patterns above need a CLOSING delimiter, so a line that opens one
    # and never closes it matches neither and the whole thing prints raw —
    # the `$`, the backslashes and the command names, straight onto the page.
    # The chemistry chapter writes nine of them, e.g.
    #
    #     क्वथनांक का उन्नयन $(\Delta T) = \text{विलयन का क्वथनांक} - …
    #     $\dfrac{AC}{AB} = \dfrac{AE}{AD}
    #
    # and each printed `$\dfrac { AC }{ AB }` verbatim mid-sentence. The
    # author's intent is not in doubt — the span runs to the end of the line
    # — so the delimiter is closed there and the maths converted. Malformed
    # input, but recoverable, and recovering it here covers every chapter
    # rather than one file's typos.
    if s.count("$") % 2:
        s = re.sub(r'\$([^$\n]+)$', lambda m: conv(m), s)
    # A SPAN THE SOURCE ALREADY PUT IN BACKTICKS MUST NOT GET A SECOND PAIR.
    #
    # `conv` above wraps every converted span in backticks on purpose — that
    # is what sends it down the `.m` path and gets fractions stacked. But a
    # source may ALREADY have wrapped the maths itself, writing both markers
    # for the same object:
    #
    #     **सूत्र:** `$a^{m} \times a^{n}=a^{m+n}$` · `$a^{0}=1$`
    #
    # which after conversion is ``a^m × a^n=a^{m+n}`` — a doubled pair. The
    # inner pair is consumed as the maths span and the OUTER one has nothing
    # left to mark, so it prints as two literal backticks sitting inside the
    # सूत्र panel's formula box, around an otherwise correctly-set formula.
    # Twenty of them on `chapter_mathematics.md`, all in सूत्र panels, which
    # is the most recognisable block on a Part 1 page.
    #
    # Collapsed rather than prevented inside `conv`, because `re.sub` cannot
    # see what surrounds a match — and collapsing is safe for exactly the
    # shape that is wrong: a backtick pair whose entire content is another
    # backtick pair. A run holding real text between the markers is untouched.
    s = re.sub(r'`\s*`([^`]*)`\s*`', r'`\1`', s)
    return s


# Any letter, Greek letter or operator may carry a subscript: `ε_r`,
# `q_1`, `∮_S`, `Σ_i`. Restricting the left side to Latin letters left
# `∮_S` printing its underscore in the middle of a display equation.
# Devanagari is allowed on the right too: the source writes descriptive
# subscripts in Hindi — `I_अधिकतम`, `ε_परिणामी`. Restricted to Latin they kept
# their underscore and printed as `ε_ परिणामी` mid-equation.
_USCORE_RE = re.compile(
    '(?<=[^\\s>_])_([A-Za-z0-9]{1,3}|[ऀ-ॿ]{2,12})(?![A-Za-z0-9ऀ-ॿ])')


def underscores(s):
    """`ε_r` / `q_1` -> real <sub>. LaTeX that reached us as plain text
    keeps its underscores; printed raw they read as typos."""
    parts = re.split(r'(<[^>]+>)', s)
    return ''.join(p if p.startswith('<') else _USCORE_RE.sub(r'<sub>\1</sub>', p)
                   for p in parts)


# Outside math the same notation still leaks in from the source (an answer
# paragraph says "ε_r माध्यम का"). Converting every `x_y` there would also
# rewrite `2026/set_ds` inside a chip, so this stricter rule fires only for
# a Greek letter, or for a LONE Latin letter — never mid-word.
_USCORE_SAFE_RE = re.compile(
    '(?<![A-Za-z0-9])([\u0391-\u03c9]|[A-Za-z])_([A-Za-z0-9]{1,2})(?![A-Za-z0-9])')


# A slug keeps its underscore. `set_ju` is one token, and subscripting the
# `ju` turned a paper reference into `set` with a subscript — the fraction
# guard stopped `2025/set_ju` stacking, but the underscore was still read as
# maths. Same test as `_is_slug`, applied to the whole token.
# The head must be a WORD — three letters or more. `[a-z][a-z0-9]*`
# matched `i_1` and `i_s` as well, so 37 real subscripts had their
# underscore protected and printed as `i_1i_2r` and `i_s`.
# NOT after a backslash. `int_a` and `theta_1` both look exactly like a
# slug — three-plus lowercase letters, then `_something` — so
# `\int_a^b` and `\theta_1` had their underscores protected before the
# LaTeX converter ever saw them, and the converter then failed to
# recognise the command at all: `∫<sup>_</sup>a<sup>b</sup>` and a
# literal `θ_1` on the page. A backslash means the token is a command
# name, never an identifier.
# The TAIL must contain a letter. `_[a-z0-9]+` also matched `nxi_0` and
# `theta_2`, so a subscripted variable was treated as an identifier and
# printed with its underscore showing — `i = nxi_0` on the page. A
# subscript is a digit; a slug's tail is a word (`set_ju`, `_ready`).
#
# A DIGIT-LED FILENAME IS ALSO A SLUG. `` `0_corrected_ocr_file.md` `` —
# an answer-source citation in the arts corpus — starts with a digit, so
# it failed the `[a-z]{3,}` head and rendered as `<sup>0</sup>` over
# `corrected` with `ocr` subscripted: three passes of maths mangling one
# filename. A digit head is only safe with TWO OR MORE underscore
# segments, not one — `x_1`, `i_2`, `θ_r` are genuine single-underscore
# subscripts and must still convert.
_SLUG_TOKEN_RE = re.compile(
    r'(?<![\w\\])('
    r'[a-z]{3,}[a-z0-9]*(?:_[a-z0-9]*[a-z][a-z0-9]*)+'
    r'|[0-9]+(?:_[a-z0-9]*[a-z][a-z0-9]*){2,}'
    r')\b')


# LITERAL <i> AND <b> IN THE SOURCE.
#
# Biology's markdown writes botanical names as HTML — `(<i>Vallisneria</i>)`,
# six of them in chapter 1 — because that is how they came out of the source
# PDF. The escape pass turns `<` into `&lt;`, so the page printed the tags:
# `(<i>Vallisneria</i>)` in the middle of a Hindi sentence, seventeen times
# across the built chapter.
#
# Converted to the markdown the rest of the pipeline speaks BEFORE escaping,
# so `<i>` becomes `*…*` and takes the same italic path as any other emphasis.
# Italic is also correct for a binomial, which is presumably why the source
# used it.
#
# Deliberately only these four, and only as exact tags with no attributes.
# Anything else in angle brackets is text the author wrote and must still be
# escaped — a chapter that discusses `<` as a symbol has to be able to print
# it.
# A pseudo-tag in Devanagari: `<परिभाषा>"…"</परिभाषा>`.
#
# The maths source marks one definition this way — an author's own semantic
# tag, not HTML. Escaping printed it: `<परिभाषा>` appeared on the page around
# the sentence it was meant to label. The tag goes, the sentence stays.
_PSEUDO_TAG_RE = re.compile(r'</?[\u0900-\u097F][\u0900-\u097F\s-]*>')


_INLINE_HTML = (
    ("<i>", "*"), ("</i>", "*"),
    ("<em>", "*"), ("</em>", "*"),
    ("<b>", "**"), ("</b>", "**"),
    ("<strong>", "**"), ("</strong>", "**"),
)


# Matrix sentinels. Private-use characters, like the sub/sup and row-break
# marks above, so no pass between the stash and the restore can mistake one
# for content.
_MX_A, _MX_B = "\ue040", "\ue041"
# REACTIONS get their own pair, for the same reason matrices got theirs: the
# token must survive `strip_latex`, HTML escaping and every span pass without
# being read as content. Letter-indexed, not digit-indexed — a digit index
# was picked up by the subscript pass and typeset as part of a formula.
_RX_A, _RX_B = "\ue042", "\ue043"
# The index is written in LETTERS, not digits.
#
# With a digit index, `upright` wrapped it — `\ue040<span class="up">0</span>
# \ue041` — and the restore pattern no longer matched, so every matrix came
# back as a bare `0`. Digits are exactly what that pass exists to claim.
# Letters are left alone inside a maths run, so the token survives intact.
_MX_TOKEN_RE = re.compile(_MX_A + r'([a-z]+)' + _MX_B)


def _mx_index(n):
    """0 -> 'a', 25 -> 'z', 26 -> 'ba' — a letters-only counter."""
    out = ""
    while True:
        out = chr(ord('a') + n % 26) + out
        n //= 26
        if not n:
            return out


def _mx_number(tok):
    n = 0
    for ch in tok:
        n = n * 26 + (ord(ch) - ord('a'))
    return n


# Devanagari inside a maths run, set UPRIGHT in the body face.
#
# The equivalent of LaTeX's `\text{}`, which the source does not write but
# means: `$A'A = I \Rightarrow A लम्बकोणीय$` is an equation with a Hindi word
# in it — "A is orthogonal" — and the word is not a product of five italic
# variables. Six of these in the maths chapter.
#
# A run of two or more Devanagari characters, plus any spaces inside it \u2014
# OR A LONE ONE. A trailing `\u0964` after a display equation's boxed answer
# (`\u2026 \u2243 **1.45\u00D710\u207B\u00B3 C**\u0964`) is a single Devanagari code point with no
# neighbour to pair it with, so the two-character floor left it unmatched
# and it inherited `.dm`'s italic straight from the ambient style \u2014 a
# vertical stroke slanted by faux-italic reads as a stray `/` after the
# number, indistinguishable on the page from an actual division bug.
# Devanagari punctuation is never meant to slant regardless of run length,
# so the alternation below also matches a single character alone.
_MATHS_TEXT_RE = re.compile(r'([\u0900-\u097F][\u0900-\u097F\s\u200d]*[\u0900-\u097F]'
                            r'|[\u0900-\u097F])')


def plain_text_run(text):
    """A backtick run that turned out to be words, not notation."""
    return '<span class="mt">%s</span>' % _html.escape(text.strip(), quote=False)


# `इति सिद्धम्` — "thus proved", the end of a proof.
#
# Sixteen of them in the maths chapter, written three different ways:
# `**इति सिद्धम्**`, `` `इति सिद्धम्` `` and bare. The reference BOXES it, and
# it earns that: it is the one line in an answer that says the argument is
# complete. As plain bold among four other bold phrases it said nothing.
#
# Matched however it arrived — after the bold and backtick passes have run,
# so all three spellings are the same string by now.
_QED_RE = re.compile(
    r'(?:<b(?:\s[^>]*)?>|<span class="mt">)?\s*(इति\s+सिद्धम्)\s*'
    r'(?:</b>|</span>)?')


def _qed(s):
    if "सिद्धम्" not in s:
        return s
    return _QED_RE.sub(lambda m: '<span class="qed">%s</span>' % m.group(1), s)


def maths_text(s):
    """Wrap Devanagari runs inside already-rendered maths."""
    out = []
    for part in re.split(r'(<[^>]+>)', s):
        if part.startswith("<"):
            out.append(part)
        else:
            out.append(_MATHS_TEXT_RE.sub(
                lambda m: '<span class="mt">%s</span>' % m.group(1), part))
    return "".join(out)


def _matrix_cell(text):
    """One cell of a matrix, set the way the same expression would be set
    anywhere else — a cell may hold `3a + 8c`, `3\\sqrt{3}` or `-\\frac{1}{2}`,
    not just a digit.

    The cell is CONVERTED THROUGH THE MATHS CONVERTER DIRECTLY, not through
    `strip_latex`. `strip_latex` only converts what is inside `$…$` — the
    delimiters are how it finds the maths — and a cell has none, having been
    cut out of the middle of an expression. Handing it a bare cell left every
    command untouched, so 68 `\\frac` and `\\sqrt` printed their own names
    inside matrix grids.

    `maths_text` is the last step, not a step this function can skip. A cell
    that carries a `\\text{...}` remark — `\\text{ (अधिक स्थायी)}` in a d-block
    electron-configuration array — went through `math_body` and out again
    with the Hindi still bare, so it printed in the same italic maths face as
    the formula around it. The inline `.m` path already runs `maths_text`
    last (see `_tick`); a matrix cell is maths set the same way and needs the
    same last step, or every remark inside a matrix/array reads slanted.

    REOPEN THE SUB/SUP SENTINELS HERE TOO — see `_reaction_cell`, which
    already does this for the identical reason. `inline()` calls
    `reopen_sentinels` on its own string BEFORE `_restore_matrices` splices
    a stashed cell's HTML back in, so a sentinel `math_body` parked inside
    THIS cell — `\\Delta T_f` in a chemistry `array` stack of colligative-
    property equations — was never in `s` for that call to see, and reached
    the page as a literal private-use character (a tofu box) instead of a
    `<sub>f</sub>`.
    """
    c = _latex(strip_environments(text or "")).replace("`", "").strip()
    c = _html.escape(c, quote=False)
    html = reopen_sentinels(maths_text(math_body(c)))
    # A SOFT BREAK POINT AFTER EVERY `(`.
    #
    # A long cell wraps at its own spaces when it has to — see `grid()`'s
    # docstring — but a parenthesised aside like `sinα(-sinα)` is one
    # unbroken run of characters with no space at all, so when it still did
    # not fit, the browser's only option was to force a break WHEREVER it
    # ran out of room: `sinα(-` on one line, `sinα)` on the next, cutting
    # the aside in half at a meaningless point. `<wbr>` is invisible and
    # changes nothing when the cell fits on one line; when it does not, it
    # gives the browser "(-sinα)" as a place it MAY break instead of an
    # arbitrary character position inside it.
    return html.replace("(", "(<wbr>")


def _stash_reactions(s, store):
    """Park every reaction construct behind a token — see format/reaction.

    Recursive by construction: the pieces of each construct are rendered by
    `_reaction_cell`, which re-enters this function, so a `\\underset` nested
    inside another one resolves without the scanner modelling the nesting.
    """
    s = _reaction.stash(s, lambda h: _park(h, store),
                        render=lambda t: _reaction_cell(t, store))
    # BARE-TEXT reactions, only for a subject that has reactions.
    #
    # A bare `→` means different things in different subjects: in chemistry
    # it is a reaction and what sits before it may be a condition; in biology
    # it is a stage of a process and nothing belongs on a rail above it.
    # Gated rather than guessed — the same distinction the `backticks` key
    # already draws for maths versus sequences.
    if REACTIONS:
        s = _reaction.bare_text(s, lambda h: _park(h, store),
                                render=lambda t: _reaction_cell(t, store))
    return s


def _reaction_cell(text, store):
    """One label or species body -> HTML, with nested constructs resolved.

    A LABEL IS PROSE; A SPECIES IS MATHS.
    #
    `\\underset{\\text{1-ब्रोमोप्रोपेन}}{...}` labels a species with its NAME,
    and a name is a word. Sent through `math_body` with the formula it
    labels, the `1` of `1-ब्रोमोप्रोपेन` was wrapped as an upright maths
    operand and the Hindi ran in the italic Georgia maths face beside it —
    the same defect that made biology's process chains unreadable, in a
    smaller place. Anything holding Devanagari, or written wholly inside
    `\\text{}`, is set as prose.
    """
    raw = text or ""
    t = _reaction.stash(raw, lambda h: _park(h, store),
                        render=lambda x: _reaction_cell(x, store))
    t = _latex(strip_environments(t)).replace("`", "").strip()
    t = _html.escape(t, quote=False)
    prose = (re.search(r'[\u0900-\u097F]', t)
             or re.fullmatch(r'\\text\s*\{.*\}', raw.strip(), re.S))
    # REOPEN THE SUB/SUP SENTINELS HERE.
    #
    # `strip_latex` parks `_{...}` and `^{...}` behind private-use marks for
    # the passes that follow, and `inline` reopens them near the end of its
    # own run — but a reaction label is built and closed inside this helper,
    # long before that. So a condition written `300\u00b0C` with a degree
    # subscript reached the page carrying a literal U+E012, which step15
    # correctly flagged as a surviving sentinel.
    t = reopen_sentinels(t)
    return t if prose else math_body(t)


def _park(html, store):
    store.append(html)
    return _RX_A + _mx_index(len(store) - 1) + _RX_B


def _restore_reactions(s, store):
    """Restore innermost-first, so a nested token inside a restored one is
    itself replaced. A single pass left the inner token as a private-use
    character on the page."""
    if not store:
        return s
    rx = re.compile(_RX_A + r'([a-z]+)' + _RX_B)
    for _ in range(6):
        if not rx.search(s):
            break
        s = rx.sub(lambda m: store[_mx_number(m.group(1))], s)
    return s


def _stash_matrices(s, store):
    def one(rows, style, augment=0):
        # `style == "stack"` -- an `array` with no `&`, a typesetting
        # shorthand for "these lines belong together", not a matrix. See
        # `matrix._is_stack`. Joined plain, each row set the way a whole
        # equation is set elsewhere, instead of `grid()`'s bracketed cells.
        if style == "stack":
            html = "<br>".join(_matrix_cell(row[0]) for row in rows)
        else:
            html = _matrix.grid(rows, style, render=_matrix_cell,
                                augment=augment)
        store.append(html)
        return _MX_A + _mx_index(len(store) - 1) + _MX_B
    # Both notations that appear INSIDE a line: the LaTeX environment, and
    # the semicolon form `[a b ; c d]` used where a matrix had to fit on one
    # line. The multi-line ASCII form is a block and is handled by the
    # reader — see matrix.ascii_block.
    s = _matrix.stash(s, one)
    return _matrix.stash_semicolon(s, one)


def _restore_matrices(s, store):
    if not store:
        return s
    return _MX_TOKEN_RE.sub(lambda m: store[_mx_number(m.group(1))], s)


def _inline_html(s):
    for tag, md in _INLINE_HTML:
        if tag in s:
            s = s.replace(tag, md)
    if "<" in s:
        s = _PSEUDO_TAG_RE.sub("", s)
    return s


def protect_slugs(s):
    """Stash the underscores inside a lowercase identifier."""
    return _SLUG_TOKEN_RE.sub(lambda m: m.group(1).replace("_", _US_MARK), s)


def underscores_safe(s):
    parts = re.split(r'(<[^>]+>)', s)
    return ''.join(p if p.startswith('<')
                   else _USCORE_SAFE_RE.sub(r'<span class="m">\1<sub>\2</sub></span>', p)
                   for p in parts)


# Inside maths the container is italic because a VARIABLE should be. A number
# never should, and neither should an operator or π. Georgia's italic figures
# also sit on a slanted baseline, so a run like `2·0 × 10⁻¹⁹` set italic reads
# as decoration rather than as a quantity.
#
# The reference wraps every one of them in `.up` — 4,241 times in one chapter.
# It is a mechanical rule, so it is applied mechanically here rather than being
# left to whoever writes the markdown.
_UPRIGHT_CHARS = "0123456789π°%()[]{}+=<>≤≥≠≈≡∝×·÷±∓⇒⇐→←↔∞∴∵,;:!|"
# A trailing `n` joins the upright run, so a PLOIDY stays one token.
#
# `n`, `2n`, `3n`, `(3n)` name how many chromosome sets a cell has. Digits and
# brackets are upright and letters are italic, so `त्रिगुणित (3n)` came out as
# an upright `(3`, an italic `n` and an upright `)` — three pieces, set as
# though `n` were a variable being multiplied by 3. Biology's most-asked fact
# in this chapter is that भ्रूणपोष is 3n, so the one token a reader has to
# recognise was the one that broke.
#
# Done in the RUN pattern rather than by wrapping ploidy separately: a
# separate wrap put a tag inside the text this pass then scanned, and the
# digit came out double-wrapped. The `n` is absorbed only when no letter
# follows it, so `2nd` and `sin` are untouched.
_UPRIGHT_RE = re.compile(
    "([" + re.escape(_UPRIGHT_CHARS) + "\u2212\u00b7\u22c5]+"
    "(?:n(?![\\w\u0900-\u097F]))?)")


# PLOIDY IS ONE TOKEN, NOT ALGEBRA.
#
# `n`, `2n`, `3n`, `(3n)` name how many chromosome sets a cell has. The
# upright pass wraps digits and brackets but leaves letters italic, so
# `त्रिगुणित (3n)` came out as an upright `(3`, an italic `n` and an upright
# `)` — three pieces, set as though `n` were a variable being multiplied.
# Biology's most-asked fact in this chapter is that भ्रूणपोष is 3n, so the one
# token a reader must recognise was the one that broke.
#
# Matched BEFORE the general upright pass and wrapped whole, so the pass sees
# a tag and leaves it alone.
def upright(s):
    """Wrap digit/operator runs in `.up`, never touching tag internals.

    HTML ENTITIES are split out alongside tags. `;` is an upright operator,
    so `&lt;` was being cut into `&lt` + `<span class="up">;</span>` and the
    methodology card printed `[UP <;वर्ष>;]` on the page."""
    out = []
    for part in re.split(r'(<[^>]+>|&(?:#[0-9]+|#[xX][0-9A-Fa-f]+|[A-Za-z][A-Za-z0-9]*);)', s):
        if part.startswith('<') or (part.startswith('&') and part.endswith(';')):
            out.append(part)
            continue
        out.append(_UPRIGHT_RE.sub(lambda m: '<span class="up">%s</span>' % m.group(1), part))
    return "".join(out)


def math_body(s):
    """The five math transforms, in the only order that works.

    `upright` runs LAST: it inserts <span> tags, and every transform before
    it scans raw text for operands. Run it earlier and the fraction parser
    sees a tag where it expects an operand and stops splitting."""
    # `powers` FIRST, before any fraction stacking.
    #
    # `2(x² + a²)^(3/2)` has a slash inside its exponent. Stacking ran
    # first, so by the time `powers` looked for `^(…)` the brackets held
    # markup rather than text — the caret printed literally and the `3/2`
    # became a two-line stacked fraction hanging below the line. An
    # exponent is one level up, not a display fraction: it belongs on one
    # line, which is what it gets once `powers` claims it first.
    return upright(underscores(integral_limit(math_minus(
        stack_fracs(powers(s))))))


# `\text{axis}` in a subscript converts one character at a time, so it came
# out as `<sub>a</sub><sub>x</sub><sub>i</sub><sub>s</sub>` — four tags for one
# word. It renders acceptably by luck, but the word no longer EXISTS in the
# page as a word: step16 counted "axis" as content that had vanished, and any
# search or copy-paste of the page saw four fragments too.
_MERGE_RE = re.compile(r'</(sub|sup)>(?:\s*)<\1>')


def _merge_scripts(s):
    """Join adjacent <sub>…</sub><sub>…</sub> runs into one tag."""
    prev = None
    while prev != s:
        prev = s
        s = _MERGE_RE.sub('', s)
    return s


def inline(s, math=False, swipe="sw-yellow"):
    """Inline markup -> HTML.

    ORDER (do not reorder):
      1. stash `\\/`                       so units survive the fraction parser
      2. LaTeX -> Unicode
      3. HTML-escape, then reopen numeric entities
      4. «...» -> .quote                   before any span is added
      5. ~x~   -> .swipe
      6. **x** -> <b>
      7. *x*   -> <i>
      8. `x`   -> .m  (fraction / minus / integral inside)
      9. math=True: those three over the WHOLE string
     10. vector arrows
     11. small sub/superscript letters     AFTER fractions (see module docstring)
     12. restore `\\/`
    """
    if s is None:
        return ""
    s = s.replace('\\/', _FR_MARK)
    # MATRICES FIRST, before strip_latex.
    #
    # `strip_latex` converts LaTeX to Unicode, which for a matrix means
    # deleting `\begin{bmatrix}`, turning `&` into a space and `\\` into a
    # line break — so `[1 2 3; 2 3 1]` arrived at the page as `1 2 3<br>2 3 1`
    # and a 2x3 matrix was six loose digits. Chapter 3 of maths has 496 of
    # them. Each is built into its grid here and parked behind a sentinel, so
    # every pass after this one sees one opaque token instead of a grid it
    # would flatten. Restored at the very end of this function.
    _mx = []
    s = _stash_matrices(s, _mx)
    # REACTIONS, for the same reason and in the same place.
    #
    # `strip_latex` deletes exactly the braces and commands that carry a
    # reaction's second dimension: the reagent above the arrow, the condition
    # below it, the name under a species and the charge over an atom. Chapter
    # 6 has 419 of them and every one was destroyed — the literal word
    # "xrightarrow" printed 107 times. Built into grids here and parked
    # behind a sentinel; restored at the end of this function.
    _rx = []
    s = _stash_reactions(s, _rx)
    s = protect_slugs(s)
    # A BACKTICK RUN IS CARRIED PAST `strip_latex` INTACT.
    #
    # The ORDER above says backticks are handled at step 8 and the maths
    # pass runs at step 9, but the `$…$` conversion actually lives INSIDE
    # `strip_latex` (step 2), which is why a `$` in a code span was gone
    # long before `_tick` could see it. Physics chapter 9 writes a note
    # about the delimiter itself — "एक ही `$…$` खंड … काटने पर `$` दोनों
    # ओर" — six times, and it came back with the `$…$` eaten as maths and
    # a stray backtick left on the page. Stashing the runs across this one
    # call keeps a code span a code span; they are put back immediately
    # after, so step 8 still formats them exactly as before.
    # A MIXED NUMBER IS ONE QUANTITY, NOT TWO.
    #
    # The marks tag `$[2\frac{1}{2}]$` — two and a half marks, 42 of them in
    # the organic chapter — set the fraction as a stacked `1⁄2` immediately
    # after the `2`, and the three glyphs read as "21⁄2": twenty-one halves.
    # A vulgar fraction is the form a printed mark scheme uses, and it cannot
    # be misread because the integer and the fraction are visibly different
    # sizes. Only the halves and quarters have a precomposed glyph; anything
    # else keeps the stacked form but gains a thin space so the integer stops
    # touching the numerator.
    s = re.sub(r'(?<=\d)\\frac\s*\{\s*1\s*\}\s*\{\s*2\s*\}', '½', s)
    s = re.sub(r'(?<=\d)\\frac\s*\{\s*1\s*\}\s*\{\s*4\s*\}', '¼', s)
    s = re.sub(r'(?<=\d)\\frac\s*\{\s*3\s*\}\s*\{\s*4\s*\}', '¾', s)
    s = re.sub(r'(?<=\d)(\\frac\s*\{)', '\u2009\1', s)

    s = _SN_RE.sub(_SN_MARK, s)

    _bt = []

    def _stash_bt(m):
        # Only a run that QUOTES markup is carried past `strip_latex`.
        # A run holding a real formula must still be converted there, which
        # is what maths chapter 1's `$a^{m} \times a^{n}$` relies on.
        if not _quotes_markup(m.group(1)):
            return m.group(0)
        _bt.append(m.group(0))
        return "\ue023%d\ue023" % (len(_bt) - 1)

    s = re.sub(r'`([^`\n]+)`', _stash_bt, s)
    s = strip_latex(s)
    if _bt:
        s = re.sub(r'\ue023(\d+)\ue023', lambda m: _bt[int(m.group(1))], s)
    # After `strip_latex`, so `\mathrm{CH}_3-\mathrm{CH}_2` has already
    # flattened to the atoms the rule reads; before escaping, so the dash is
    # text and not markup.
    if REACTIONS:
        s = _BOND_HYPHEN_RE.sub(lambda m: m.group(1) + '—', s)
    s = _inline_html(s)
    s = _html.escape(s, quote=False)
    s = re.sub(r'&amp;#(\d+);', r'&#\1;', s)

    s = re.sub(r'«([^»]+)»', r'<span class="quote">\1</span>', s)
    s = re.sub(r'~(.+?)~',
               lambda m: '<span class="swipe %s"><i></i><b>%s</b></span>' % (swipe, m.group(1)), s)
    # A BOLD RUN MUST NOT SURVIVE AS LITERAL ASTERISKS.
    #
    # Two real shapes leave `**` on the page, and both are common enough in
    # hand-edited chapters that neither can be called a typo to fix upstream:
    #
    # 1. A SPACE BEFORE THE CLOSER — `**सही विकल्प : (a) 1 **`. Strict
    #    markdown needs the closing delimiter tight against the text, so the
    #    run never closes and both markers print. Four on
    #    `chapter_mathematics.md`.
    #
    # 2. THE RUN SPANS A BLOCK BOUNDARY. A multiple-choice question opens
    #    `**` on its stem and closes it after the last option, several source
    #    lines later — but the reader splits stem and options into separate
    #    blocks (it must; they are different components), so each half is left
    #    holding ONE marker. That is 41 of them on `physics_edited.md`, every
    #    question in the 68-question bank showing `**` at the start of its
    #    stem and again at the end of its options.
    #
    # Closing an unpaired run at end-of-block is what the author meant in
    # both cases — the stem is bold, the options are bold — and it is the
    # only reading that leaves no marker visible. Done BEFORE the pairing
    # substitution so the normal case is untouched.
    # AN EMPTY `** **` RUN, NOT THE GAP BETWEEN TWO FULL ONES.
    #
    # Deleting every `** **` also deleted the boundary in
    # `**इसे कैसे पढ़ें** **भाग 1**` — two adjacent bold runs — which merged
    # them into one and ate the space with it, so the cover printed
    # "इसे कैसे पढ़ेंभाग 1" and "त्वरित रिवीज़नभाग 2". Parity tells the two
    # apart: with an EVEN number of `**` before it the first marker opens a
    # run and the pair really is empty; with an ODD number it closes one run
    # and the next opens another, and the space between them is a word
    # boundary that has to survive.
    def _empty_bold(m):
        return " " if s[:m.start()].count("**") % 2 else ""

    s = re.sub(r'\*\*\s+\*\*', _empty_bold, s)
    s = re.sub(r'(\S)\s+\*\*(?!\S)', r'\1**', s)     # space before a closer
    if s.count("**") % 2:
        s += "**"
    s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s, flags=re.S)
    s = s.replace("**", "")                          # nothing unpaired survives
    s = re.sub(r'(?<!\*)\*([^*\n]+?)\*(?!\*)', r'<i>\1</i>', s)

    # A backtick span that is only a PAPER REFERENCE is not maths.
    # `` `2025/set_jv` `` came out in the italic serif that formulas use, so a
    # set id read like an expression. The slash guard already stops it being
    # stacked as a fraction; this stops it being italicised as an operand.
    def _tick(m):
        inner = m.group(1)
        # A SPAN THAT QUOTES MARKUP IS NOT MARKUP TO RUN.
        #
        # Two chapters put notation markers inside backticks for opposite
        # reasons, and the difference is whether the `$` WRAPS the span or
        # merely APPEARS in it:
        #
        #   maths ch1   `$a^{m} \times a^{n}=a^{m+n}$`   a formula the source
        #                                                wrapped twice — convert
        #   physics ch9 `$…$` · `$` · `13.1$ डायऑप्टर।`  a note ABOUT the
        #               `v=\frac{13}{15}=1 \cdot 15`     delimiter, or the
        #                                                book's raw line quoted
        #                                                "ज्यों की त्यों" — print
        #
        # Sent down the maths path the second kind loses the very characters
        # it is describing; sent down the plain path the first kind prints
        # its own LaTeX. So: a span wrapped in `$…$` with real content
        # inside stays maths, and anything else holding a `$` or a LaTeX
        # command is quoted markup and is set as text.
        if _quotes_markup(inner):
            return plain_text_run(inner)
        # A BACKTICK RUN THAT IS ALL WORDS IS NOT MATHS.
        #
        # The maths chapter writes `` `इति सिद्धम्` `` — "thus proved" — in
        # backticks, using them for emphasis rather than for notation. Sent
        # down the maths path a Hindi phrase came out in italic Georgia, and
        # `A = B ⇔ कोटि समान तथा aᵢⱼ = bᵢⱼ` mixed the two faces mid-line.
        #
        # A run with no Latin letter and no digit has nothing in it that the
        # maths face is for.
        if (re.search(r'[\u0900-\u097F]', inner)
                and not re.search(r'[A-Za-z0-9]', inner)):
            return plain_text_run(inner)
        # The underscore may already be the sentinel `protect_slugs`
        # swapped in, so both spellings have to match here — the same
        # trap the fraction guard hit.
        if re.fullmatch('\\s*\\d{4}\\s*/\\s*[a-z][a-z0-9_\ue021]*\\s*', inner):
            # LEAVE THE SENTINEL IN PLACE — do not restore it to `_` yet.
            #
            # `inline()` only restores `_US_MARK` to a literal `_` in its
            # own final `return`, well after this. Restoring it here
            # instead put a literal underscore back into `2022/set_a_gh`
            # while `unicode_scripts_to_tags`/`_merge_scripts` — later
            # passes in the SAME `inline()` call, which see this string
            # as plain text with no notion of what `.ref` already
            # protected — still had it ahead of them. `set_a_gh` read
            # exactly like a subscripted variable (`a` with a `gh`
            # subscript) to that pass, so the reference code the `.ref`
            # branch exists to keep verbatim came out `set_<sub>gh</sub>`
            # anyway. Left as the sentinel, those passes see the private-
            # use character, not `_`, and pass over it untouched.
            return ('<span class="ref">%s</span>'
                    % _html.escape(inner.strip(), quote=False))
        # A BACKTICK RUN THAT IS A FILENAME IS ALSO NOT MATHS.
        #
        # `` `0_corrected_ocr_file.md` `` — an answer-source citation — has
        # no slash, so it missed the YYYY/slug branch above and fell to the
        # maths span below. `protect_slugs` had already masked its
        # underscores with the sentinel, so no subscript showed, but the
        # leading digit alone still went through `upright()` inside that
        # maths span and came back `<span class="up">0</span>` split from
        # the rest — enough to make the word-integrity checker read it as a
        # different, missing token even though every character survived.
        # `corrected_book.md` (no leading digit) happened to escape this
        # only because `upright()` had nothing to wrap; that was luck, not
        # a rule, so the same filename shape gets the same `.ref` treatment
        # here rather than relying on the absence of digits.
        if re.fullmatch(r'\s*[0-9A-Za-z' + _US_MARK + r']+\.[a-z]{2,4}\s*', inner):
            return ('<span class="ref">%s</span>'
                    % _html.escape(inner.strip(), quote=False))
        # `maths_text` here rather than at the end of `inline`: this is where
        # a maths run is actually built, and a run reached through the
        # backtick path never sees inline()'s `math=True` branch.
        return '<span class="m">%s</span>' % maths_text(math_body(inner))

    s = re.sub(r'`([^`]+)`', _tick, s)

    if math:
        s = math_body(s)

    s = reopen_sentinels(s)
    s = _vectors(s)
    if not math:
        # `powers` before `prose_fracs`, for the same reason `math_body` runs
        # it first: an exponent that contains a slash must claim it before
        # the fraction parser does.
        s = powers(s)
        # BEFORE the scripts become tags. `μ₀I/2r` has its `₀` turned into a
        # <sub> by the passes below, and the fraction parser scans for plain
        # operands — a tag in the middle ends the scan, so the numerator came
        # out as `I` instead of `μ₀I`.
        # MARKS BEFORE FRACTIONS.
        #
        # `[1/2]` is half a mark, not a division. `prose_fracs` ran first and
        # stacked it, so the chip never matched and the page showed a
        # bracketed fraction that looked like a 1x1 matrix.
        s = marks_chips(s)
        s = prose_fracs(s)
    if not math:
        s = underscores_safe(s)
    s = _small_letters_to_tags(s)
    s = unicode_scripts_to_tags(s)
    # `^(3/2)` in PROSE too, not only inside `$…$`. `math_body` runs on
    # maths-marked text only, so a formula written in a bold callout —
    # `**2(x² + a²)^(3/2)**` — kept its caret and brackets on the page while
    # its `x²` and `a²` were set correctly, which looked like a half-finished
    # conversion. A caret followed by a bracket or a token is markup wherever
    # it appears; running this twice is a no-op, since the first pass leaves
    # no `^` behind.
    if not math:
        s = year_chips(s)
        # `marks_chips` already ran, above `prose_fracs` — see the note there.
        # Running it twice wrapped every chip in a second identical span.
    s = _merge_scripts(s)
    s = _qed(s)
    if math:
        s = maths_text(s)
    s = _restore_matrices(s, _mx)
    s = _restore_reactions(s, _rx)
    # A reaction's last by-product must not be orphaned on its own line —
    # see `reaction.bind_widow`. Only for a run that actually holds an arrow.
    if REACTIONS and 'class="rxn rxn-' in s:
        # Each side of an INLINE reaction becomes an unbreakable unit, so a
        # lone by-product cannot be orphaned on the next line — see
        # `reaction.structure_inline`.
        s = _reaction.structure_inline(s)
        s = _reaction.bind_widow(s)
    # The sentinel covers what the SOURCE wrote; the second pass covers
    # anything `strip_latex` emitted as U+2099 after the first one ran.
    s = _SN_RE.sub('S<sub>N</sub>', s.replace(_SN_MARK, 'S<sub>N</sub>'))
    return s.replace(_FR_MARK, '/').replace(_US_MARK, '_').replace(_DL_MARK, '$')


def plain(s):
    """Escape only — for text that must not be interpreted (alt=, title=)."""
    return _html.escape(s or "", quote=True)
