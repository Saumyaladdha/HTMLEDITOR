# -*- coding: utf-8 -*-
"""
ECONOMICS (अर्थशास्त्र) — a third humanities/social-science profile, alongside
biology and arts.

Measured against the first chapter (अर्थशास्त्र : अर्थ एवं परिभाषाएँ, etc.):

    $...$ / $$ / \\frac / \\vec          0/0/0/0
    सूत्र panels                          0
    [FIGURE: …] / [IMAGE: …]              0 — the chapter's own "चित्र" note
                                           says so explicitly: "इस अध्याय में
                                           एक भी चित्र नहीं बनाना है"
    क्रम / बार-बार chains (backticks)     none seen; the one backtick pair
                                           found is a report-code reference,
                                           `` `P-R14` ``, not a chain
    **पहचान:** / **बिंदु:** / **तथ्य:**   all three, same as arts's history
                                           chapter
    MCQ option markers                    LATIN `(a)`/`(A)`, ROMAN `(i)`, AND
                                           a THIRD devanagari alphabet —
                                           अ/ब/स/द (bracketed or bare-paren),
                                           distinct from arts's क/ख/ग/घ
                                           "statement" letters. Both feed the
                                           same `devanagari` marker family in
                                           `book/readers/markdown.py` — see
                                           `_marker_family`.

Same shape as `arts.py` in every measured way but one: no figures at all in
this chapter, so `"figures"` is left at the arts/biology default
("inline") purely as documentation — nothing in this chapter exercises it,
and nothing about the subject rules that convention out for a future
chapter that does have one.

Not measured, so not claimed: auto-detection. Pass `--subject economics`
explicitly, same reasoning as `arts.py` — `**पहचान:**` alone is not enough
to distinguish this from biology or arts without a wrong-detection case to
fix first.
"""

PROFILE = {
    "name": "economics",
    "label": "अर्थशास्त्र",

    # No chain construct measured in the first chapter — the one backtick
    # pair present, `` `P-R14` ``, is a short report-code reference (already
    # handled by the digit/filename-shaped `.ref`-span branch in
    # `book/format/inline.py`'s `_tick()`, not a maths span). "sequence"
    # is still the right default: never the maths face for an
    # unrecognised backtick run, matching arts and biology.
    "backticks": "sequence",

    # पहचान (identification), बिंदु (a fact/point) and तथ्य (fact) are the
    # chapter's own recurring rubric labels — the same three arts's history
    # chapter uses, mapped the same way: a lead-in kept together, not
    # folded into an ordinary definition paragraph.
    "rubric": {
        "पहचान": "identify",
        "बिंदु": "identify",
        "तथ्य": "identify",
    },

    "splittable": ("bullets", "options", "table"),

    # No figures in the measured chapter; see the module docstring.
    "figures": "inline",

    "latex": False,

    "leadin_breaks": True,
    "fence_breaks": True,
}
