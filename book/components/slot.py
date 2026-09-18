# -*- coding: utf-8 -*-
"""Reserved, correctly-sized space for art that does not exist yet.

A slot is rendered at its FINAL size from the first build, so filling
one later is a pure substitution: the box does not grow, the page does
not reflow, and pagination does not have to be re-run.

Change a reserved size here and nowhere else."""
from ..design import tokens as theme
from ..format.inline import inline, plain

A = theme.ACCENTS


def accent(i):
    return A[i % len(A)]



SLOT_SIZES = {
    "emblem":     (82, 82),        # chapter mark beside the title
    "diagram-sm": (150, 130),      # inline physics diagram, beside text
    "diagram-md": (230, 150),      # floated diagram in a section
    "diagram-lg": (330, 128),      # centred diagram in an answer
    "figure":     (456, 158),      # wide scan crop from the printed book
    "doodle-sm":  (42, 42),        # margin doodle
    "doodle-md":  (76, 60),
    "doodle-lg":  (100, 70),
    "character":  (150, 163),      # teacher / student illustration
    "rule-art":   (260, 14),       # hand-drawn underline squiggle
    "doodle-arrow": (76, 34),      # the little arrow beside "दिया है :"
}


def slot(role, hint="", w=None, h=None, place="", fill=None, extra=""):
    """Reserved, correctly-sized space for art that may not exist yet."""
    dw, dh = SLOT_SIZES.get(role, (150, 120))
    w = int(w or dw)
    h = int(h or dh)
    cls = "slot"
    if place:
        cls += " slot--" + place
    if fill:
        cls += " slot--filled"
    style = "width:%dpx;height:%dpx;%s" % (w, h, extra)
    # A decorative slot with no caption shows an EMPTY hint box: the
    # reserved space still reads as deliberate whitespace instead of as a
    # label the reader is meant to decipher.
    body = fill if fill else '<span class="slot__hint">%s</span>' % plain(hint)
    return '<div class="%s" data-slot="%s" style="%s">%s</div>' % (cls, plain(role), style, body)
