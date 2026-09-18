# -*- coding: utf-8 -*-
"""
TOKENS — the Vidyut Aavesh design system, as VALUES only.

Numbers and colours live here; the stylesheet that uses them lives in
`css.py`. Splitting them means a re-skin touches `css.py` and a re-scale
touches this file, and neither has to read the other.

Extracted from `Vidyut Aavesh Full Book A4.html`. Every literal there has
been lifted into a token EXCEPT the handful listed under "DELIBERATE
IRREGULARS" below — those irregular values ARE the design and tidying them
destroys the hand-drawn look.

    .secno   border-radius:50% 46% 52% 48%   hand-drawn circle
    .yearbanner  border-radius:16px 24px 18px 26px
    .sticky  transform:rotate(N deg)         per-note, hand-chosen
    .swipe>i left:-6px; right:-6px           the marker OVERHANGS the text
    .vec::after top:-0.66em                  tuned to Georgia italic cap-height

Geometry numbers are MEASURED in headless Chrome, not calculated
(see NIYAM #11a / #11c):

    page content width   944 px
    column content width 449.5 px  (x2)
    page content height  1432 px
"""

# ==========================================================================
# TOKENS
# ==========================================================================

# --- paper ---------------------------------------------------------------
PAPER        = "#fdfcf7"
DESK_SCREEN  = "#e8e4da"
DESK_A4      = "#cfcabd"
INK          = "#1f2430"
MUTED        = "#666"
MUTED_2      = "#888"
RULE         = "#c9c3b4"

# --- the six accents -----------------------------------------------------
# Order matters: section N takes ACCENTS[N % 6], nudged so no two adjacent
# sections repeat (see renderer.assign_accents).
# The section device changed in the finalised edition: a hand-drawn
# UNDERLINE (.hdu + .hd-*) replaced the highlighter swipe behind the text.
# The six accent hues are unchanged, so the rotation and every `.secno`
# border, bullet dot and rule that follows it still line up.
ACCENTS = [
    # name       ink / border   (legacy swipe fill)   underline class
    ("pink",   "#e23b6d", "#ee7fa8", "hd-pink"),
    ("blue",   "#3b74d8", "#84b6f0", "hd-blue"),
    ("green",  "#3fae4e", "#8fd08f", "hd-green"),
    ("purple", "#9a5fd0", "#b899ec", "hd-purple"),
    ("orange", "#ef8e2a", "#f2a95c", "hd-orange"),
    ("teal",   "#18a8bf", "#7dd0d8", "hd-teal"),
]
ACCENT_BY_NAME = {a[0]: a for a in ACCENTS}

SWIPE_YELLOW = "#f6c945"
SWIPE_ANS    = "#2fa356"

# --- page geometry (MEASURED) --------------------------------------------
PAGE_W        = 1080
PAGE_H        = 1527
PAD_TOP       = 40
PAD_X         = 68
PAD_BOTTOM    = 55
CONTENT_W     = 944            # PAGE_W - 2*PAD_X                (measured)
CONTENT_H     = 1432           # PAGE_H - PAD_TOP - PAD_BOTTOM   (measured)
COL_W         = 440.0          # per .acol, measured              (measured)
#                              was 449.5 with a 43px gutter; the gutter is
#                              64px now (see elements/acols) and the packer
#                              must measure at the width blocks really get,
#                              or every one is sized 10px too wide and the
#                              pagination is struck on numbers that never
#                              happen.
COL_RULE      = "2.5px dashed #5b8dd6"
Q_RULE        = "2.5px dashed #e5a8bc"
PRINT_ZOOM    = 0.734          # 1080 * 0.734 = 793px = 210mm @96dpi

# ONE KNOB FOR THE WHOLE BOOK'S TYPE SIZE.
#
# 148 font-size declarations live across book/elements/*/ and setting them
# by hand is how a scale drifts. `TYPE_SCALE` multiplies every one of them
# at bundle time instead — see book/elements/__init__.py:bundle.
#
# It can only make type SMALLER, and it stops at TYPE_FLOOR. The page
# prints at PRINT_ZOOM, so a CSS pixel is worth 0.734 printed pixels and
# 15.0px is the smallest that still clears step15's 11px legibility check
# (15.0 * 0.734 = 11.01). Thirty of the declarations already sit at or
# under that floor — the small print, the chips, the figure captions — so
# a flat multiplier would have pushed all of them under it. Anything
# already at or below the floor is therefore left exactly as designed.
TYPE_SCALE    = 1.0            # 1.0 = the sizes as authored (no scaling)
TYPE_FLOOR    = 15.0           # 15.0 * 0.734 = 11.01px printed
F_BODY    = "'Kalam',cursive"
F_DISPLAY = "'Caveat',cursive"
F_MATH    = "Georgia,serif"


# The stylesheet is generated from these values in `css.py`. Re-exported here
# so `theme.stylesheet(...)` keeps working for callers that only want "the CSS".
def stylesheet(mode="a4", chrome=False):
    from .css import stylesheet as _s
    return _s(mode, chrome)
