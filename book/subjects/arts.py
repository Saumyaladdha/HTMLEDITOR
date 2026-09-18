# -*- coding: utf-8 -*-
"""
ARTS (इतिहास · भूगोल) — the humanities profile.

Modelled on biology, the other prose-first subject: zero LaTeX, zero सूत्र
panels, no reactions, no matrices. Measured against the first two arts
chapters (history — ईंटें, मनके तथा अस्थियाँ; geography — मानव भूगोल):

                                  biology   arts (both chapters)
    $...$ / $$ / \\frac / \\vec         15/0/0/0        0/0/0/0
    सूत्र panels                          0               0
    बार-बार / क्रम chains (backticks)    yes             yes — years and
                                                          excavation timelines:
                                                          `1875 कनिंघम...→
                                                          1921 साहनी, हड़प्पा→…`
    **पहचान:** / **तथ्य:** rubric        पहचान            पहचान, तथ्य
    [FIGURE: …] / [IMAGE: …] figures     ![]() + fence    bracket, inline
    matching / A-R / source questions    no               yes (both chapters)

The one real difference from biology is HOW figures are declared: arts
writes them as a bracketed `[FIGURE: …]` / `[IMAGE: …]` line, already handled
by the reader unconditionally (see `book/readers/markdown.py` around the
`[FIGURE:`/`[IMAGE:` checks), not through a fenced चित्र-निर्देश block. So
`"figures"` is documentation here, same as it is in every other profile —
no code branches on it yet.

Not measured yet, so not claimed: a subject auto-detector branch. `arts`
must be passed explicitly with `--subject arts` — the existing `detect()`
heuristic scores biology on `**पहचान:**` alone, which this content also
carries, and guessing a threshold without a wrong-detection case to fix
would be exactly the kind of unmeasured rule this module argues against.
"""

PROFILE = {
    "name": "arts",
    "label": "इतिहास एवं भूगोल",

    # A BACKTICK RUN IS A SEQUENCE, NOT MATHS.
    #
    # History's own recurring construct is the excavation/discovery timeline:
    # `1875 कनिंघम के मोहर-रिपोर्ट → 1921 साहनी, हड़प्पा → 1922 मोहनजोदड़ो
    # → …`. Exactly biology's shape — Hindi nouns and years joined by
    # arrows — so it gets the same treatment: never the maths face.
    "backticks": "sequence",

    # पहचान and तथ्य are the recurring rubric labels seen in both chapters
    # (source identification, and a named fact/quote attributed to a
    # scholar). Mapped the way biology maps पहचान — a lead-in kept together,
    # not folded into an ordinary definition paragraph.
    "rubric": {
        "पहचान": "identify",
        "तथ्य": "identify",
    },

    # No सूत्र panels, no formula list — reclaimable dead space is the same
    # place biology's is: option lists, bullet lists and comparison/marks
    # tables.
    "splittable": ("bullets", "options", "table"),

    # Figures are declared inline as a bracketed `[FIGURE: …]` / `[IMAGE: …]`
    # line, not a fenced production note.
    "figures": "inline",

    # No LaTeX anywhere in either chapter: zero `\\frac`, zero `\\vec`, zero
    # `$$`.
    "latex": False,

    # Does a `**label:**` line end the paragraph before it? Same answer as
    # every other subject once physics's outlier was fixed: yes.
    "leadin_breaks": True,
    # Does a ``` fence line end the paragraph before it? Neither chapter
    # uses one, but there is no reason for arts to behave differently from
    # biology if one appears.
    "fence_breaks": True,
}
