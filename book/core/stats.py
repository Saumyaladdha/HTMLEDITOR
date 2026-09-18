# -*- coding: utf-8 -*-
"""
STATS — read a chapter's mark SPREAD out of its own prose.

The reference cover ends with three stat tiles: the lightest paper, the
typical paper, the heaviest. That is not a table in the markdown; every
chapter states it in a sentence instead, e.g.

    (पाँच साल के 18 सेट नापे गए; एक पेपर में इस अध्याय से औसतन 7·6 अंक आए,
     सबसे हल्के सेट में 4 और सबसे भारी में 13।)

so a card that only reads tables renders a plain list and the cover loses
its most recognisable block.

This finds the three figures and, crucially, takes each tile's LABEL from
the chapter's own words rather than from a fixed string — a chapter that
says "सबसे कम" gets "सबसे कम", not a translation of it. It is a DEFAULT:
`step03_content_tagger` can override any of it through `cover_tiles`, and
whatever it proposes is queued for that agent to confirm.
"""
import re

# Qualifier -> which tile it is. Ordered low, typical, high so the tile
# colours (green, orange, magenta) line up with the reference.
QUALIFIERS = [
    ("low",     ["सबसे हल्के", "सबसे हल्का", "सबसे कम", "न्यूनतम"]),
    ("typical", ["औसतन", "औसत", "आमतौर पर", "प्रति सेट औसतन"]),
    ("high",    ["सबसे भारी", "सबसे ज़्यादा", "सबसे अधिक", "अधिकतम"]),
]

_NUM = r'[0-9]+(?:[·.][0-9]+)?'


def _unit(text):
    """The counted noun, so tiles read `4 अंक` and not a bare `4`."""
    m = re.search(r'%s\s*(अंक|प्रश्न|नंबर)' % _NUM, text or "")
    return m.group(1) if m else "अंक"


def spread_tiles(text):
    """-> [[value, label], ...] for whatever the prose actually states.

    Returns [] unless at least two of the three are present: one number on
    its own is a fact, not a spread, and three tiles built from one figure
    would be padding.
    """
    if not text:
        return []
    unit, found = _unit(text), {}
    for kind, words in QUALIFIERS:
        for w in words:
            # The number may sit either side of the qualifier:
            # "सबसे हल्के सेट में 4" and "औसतन 7·6 अंक" both occur.
            m = (re.search(r'%s[^0-9।]{0,24}(%s)' % (re.escape(w), _NUM), text)
                 or re.search(r'(%s)\s*(?:%s)?\s*%s' % (_NUM, unit, re.escape(w)), text))
            if m:
                found[kind] = (m.group(1), w)
                break
    if len(found) < 2:
        return []
    return [["%s %s" % (found[k][0], unit), found[k][1]]
            for k, _ in QUALIFIERS if k in found]
