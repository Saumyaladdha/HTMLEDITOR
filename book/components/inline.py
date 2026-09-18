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


def hdu(text, colour="hd-pink"):
    """Section title with the hand-drawn underline under it."""
    return '<span class="hdu %s"><i></i><b>%s</b></span>' % (colour, text)


def swipe(text, colour="qnum", cls=""):
    """A marker pill. Only `qnum`, `anslabel` and `yr` use one now — each
    carries its own stroke in CSS, so the colour argument is the class."""
    c = (colour + (" " + cls if cls else "")).strip()
    return '<span class="%s"><i></i><b>%s</b></span>' % (c, text)


def chip(text, size=None):
    st = ' style="font-size:%s;"' % size if size else ""
    return '<span class="chip"%s>%s</span>' % (st, inline(text))


def examchip(text):
    """The dark-red exam stamp with its little yellow pin — `UP 2025 · 3 अंक`."""
    return '<span class="examchip">🔥 %s</span>' % inline(text)


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
    tail = (' <span class="qyr">[%s]</span>' % inline(years)) if years else ""
    # A RULE with the word in it, not an italic lead-in.
    #
    # Set as `<i>अथवा</i> …` the variant read as a continuation of the
    # question above it — the two phrasings ran together and a student could
    # not see where one ended. `अथवा` is a fork in the question, so it is set
    # as a divider across the column with the word sitting in the break.
    return ('<div class="athsep"><span>%s</span></div>'
            '<p class="q">%s%s</p>'
            % (inline(label), inline(text), tail))
