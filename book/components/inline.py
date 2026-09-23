# -*- coding: utf-8 -*-
"""
Inline marks — heading underline, chips, stamps, badges.

CHANGED IN THE FINALISED EDITION. The highlighter `swipe` behind section
titles is gone; a hand-drawn UNDERLINE (`.hdu` + `.hd-*`) sits beneath them
instead. `swipe()` survives only where the reference still uses a marker
pill: the question number and the year head.
"""
from ..design import tokens as theme
from ..format.inline import inline, plain

A = theme.ACCENTS


def accent(i):
    return A[i % len(A)]


def tint(i):
    """The pale per-accent background that rides along with `accent(i)` —
    set on the page as `--tint` beside `--accent`."""
    return theme.TINTS[i % len(theme.TINTS)]


def hdu(text, colour="hd-pink", tag="span"):
    """Section title with the hand-drawn underline under it.

    `tag="h2"` for a Part-1 topic head: `.revision-unit .sechead h2` sizes
    and un-margins it, and those rules cannot reach a `<span>`."""
    return '<%s class="hdu %s"><i></i><b>%s</b></%s>' % (tag, colour, text, tag)


def swipe(text, colour="qnum", cls=""):
    """A marker pill. Only `qnum`, `anslabel` and `yr` use one now — each
    carries its own stroke in CSS, so the colour argument is the class."""
    c = (colour + (" " + cls if cls else "")).strip()
    return '<span class="%s"><i></i><b>%s</b></span>' % (c, text)


def chip(text, size=None):
    st = ' style="font-size:%s;"' % size if size else ""
    return '<span class="chip"%s>%s</span>' % (st, inline(text))


def examchip(text):
    """The dark-red exam stamp with its little yellow pin — `UP 2025 · 3 अंक`.

    `.topic-frequency` is the reference's name and design for this: same
    dark-red seal, same yellow pin, but the pin is a `::before` on the
    span rather than a separate element, and it is `flex:none` so it sits
    on the heading's own row instead of being squeezed by it. The
    reference carries no `.examchip` at all (0 occurrences), so keeping
    the old class meant this stamp was the one heading element still
    styled by the pre-reference stylesheet. Only the new name is emitted
    — carrying both would leave the two rule sets fighting in the
    cascade, which is how a chip ends up with one sheet's padding and
    the other's border.
    """
    return '<span class="topic-frequency">🔥 %s</span>' % inline(text)


def marktag(text):
    return '<span class="marktag">%s</span>' % inline(text)


def qmarks(text):
    """The small `[1]` marks tag that sits at the end of a question."""
    return '<span class="qmarks">%s</span>' % inline(text)


def starline(text):
    """Standalone `★ 5 साल में 4 बार पूछा गया।` strip under a section head."""
    return '<div class="starline">★ %s</div>' % inline(text)


def stars(n):
    return '<span class="stars">%s</span>' % ("★" * max(int(n or 0), 0))


def starnote(text):
    return '<span class="starnote">%s</span>' % inline(text)


def athava(label, text, years=""):
    """An alternative phrasing of the same question.

    `years` is the sitting the variant was set in — written in the source as
    `* *(2026)*` under the marker. It used to parse as an empty bullet list
    and vanish, which mattered: which years a variant appeared in is half of
    why a student reads the variant at all. Set apart from the question text,
    the way the reference sets its year lists.
    """
    # A VARIANT HEAD, NOT A RULE ACROSS THE COLUMN.
    #
    # This drew `अथवा` sitting in a break in a full-width divider, on the
    # reasoning that a fork in the question needs to be unmissable. The
    # reference does not: it sets one ordinary question paragraph,
    # `<p class="q variant-head"><b>अथवा</b> <i>(2025 के विकल्प)</i></p>`,
    # and lets the options below it do the separating. The rule was louder
    # than the question it divided, and in a 449px column it read as the
    # end of the question rather than as a second phrasing of it.
    #
    # The sitting goes in the same line, in italic parentheses, rather
    # than in a `.qyr` chip — it qualifies the word `अथवा` ("the 2025
    # wording"), and as a chip it read as a separate year tag on the
    # question.
    tail = (' <i>(%s)</i>' % inline(years)) if years else ""
    body = (" " + inline(text)) if (text or "").strip() else ""
    return ('<p class="q variant-head"><b>%s</b>%s%s</p>'
            % (inline(label), tail, body))
