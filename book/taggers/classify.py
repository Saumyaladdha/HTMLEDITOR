# -*- coding: utf-8 -*-
"""
CLASSIFY — how raw text becomes a semantic kind.

This is the file to edit when the source starts speaking a new dialect.
It holds three lookup layers, all of them tolerant by design:

    callout_type()   emoji first, label keyword second, `line` as the floor
    card_tone()      sticky-note colour from the label
    parse_chip()     `[1 अंक · 2026/set_ds · खण्ड अ]` -> structured fields
    parse_figure()   figure marker -> num / caption / desc / ref

NOTHING HERE MAY RAISE ON UNKNOWN INPUT. An unseen marker must degrade to
a sensible family, never be dropped — a missing callout in a physics book
is a worse failure than a slightly wrong colour. When the deterministic
rules cannot decide, the caller records the item for step03_content_tagger's
agent to resolve rather than guessing silently.
"""
import re

# Patterns this module owns. `readers/markdown.py` owns the line-level
# grammar; these are about the CONTENT of a marker, not its position.
# A VULGAR FRACTION IS A MARK COUNT.
#
# `[½ अंक · 2026]` is how physics chapter 1 writes a half mark — 34 of its 53
# question chips. Matching digits only, none of them parsed: step05 reported
# 34 `no_marks` and the marks bands never opened for that chapter.
#
# `1 ½` (a mixed number) and `1/2` both occur too. `inline.strip_trailing_marks`
# already knew all three spellings for a marks tag at the END of a line; this
# is the same knowledge for a chip, and it is the SIXTH time one construct has
# been found written two ways with code that knew one.
#
# A LITERAL DECIMAL POINT WAS NEVER IN THE CHARACTER CLASS.
#
# The whole-number branch's optional suffix was `[/·]\d+` — `/` for a
# slash fraction, `·` because the code below already normalises a
# middle-dot decimal (`raw.replace("·", ".")`) before calling `float()`.
# Only `.` itself, the spelling chemistry chapter 1 actually writes —
# `[0.5 अंक · 2026]`, `[1.5 अंक · 2026]` — was missing. `\d+` alone
# matched just the digit AFTER the point (`re.search` skips the `0.`
# that fails the trailing `\s*अंक`, then succeeds from `5 अंक`), so
# every fractional chip in the chapter parsed as if the decimal were
# the whole value: `0.5` became `5`, `1.5` became `5`. The mark shown
# on each question's own chip was untouched (that text is a separate,
# unparsed passthrough — see `format/inline.py`), but everything
# computed FROM the parsed number was wrong: a paper of 0.5+0.5+0.5+
# 0.5+1+1.5+1.5 = 6 marks summed to 31 in the "कुल … अंक" band it
# opens, and the same corruption is what step05 flagged as
# `marks_unsorted` — the true sequence (0.5, 0.5, 0.5, 0.5, 1, 1.5,
# 1.5) is ascending; the corrupted one (5, 5, 5, 5, 1, 5, 5) is not.
RE_MARKS = re.compile(
    r'((?:\d+(?:\.\d+)?\s*)?[½¼¾]|\d+(?:\.\d+)?(?:[/·]\d+)?)\s*अंक')

# What each vulgar fraction is worth, for the numeric `marks` field.
_VULGAR_VALUE = {"½": 0.5, "¼": 0.25, "¾": 0.75}
RE_YEAR = re.compile(r'(20\d\d)')


# ==========================================================================
# CALLOUT DIALECT NORMALISATION
# ==========================================================================
# Emoji is the strong signal; label keywords are the fallback so an
# unseen marker still lands in a sensible family.
# One glyph, one variant. The earlier map folded six markers into `trap` and
# five into `save`, which lost distinctions the book actually draws.
_ICON_TO_TYPE = {
    "🎯": "mark", "🧮": "calc",
    "⚠": "trap", "⚠️": "trap", "🔄": "turn", "🔍": "opt",
    "✍": "write", "✍️": "write", "🗝": "key", "🗝️": "key", "📝": "num",
    "🛟": "save", "🪜": "step", "⭐": "ratt", "🔢": "save", "💡": "tip",
    "🧠": "line", "✏": "fig", "✏️": "fig",
    "🔗": "link", "🔁": "rep", "💪": "conf", "↔": "sim",
    "✅": "concl",
}
# Every glyph `callout_type` recognises, for readers that need to match a
# callout icon POSITIONALLY (a line that opens with one, but carries no
# `**Label:**`). Derived from the table above so the two can never drift.
CALLOUT_ICONS = tuple(_ICON_TO_TYPE)

_LABEL_HINTS = [
    ("mark",  ["mark bachta", "अंक यहीं"]),
    ("calc",  ["calculation", "galti", "गणना"]),
    ("trap",  ["jaal", "जाल", "मत भूलो"]),
    ("turn",  ["ghoomkar", "घूमकर"]),
    ("opt",   ["options ka farak", "विकल्प"]),
    ("write", ["itna likhna", "इतना लिखना"]),
    ("key",   ["words zaroor", "शब्द ज़रूर"]),
    ("num",   ["marks aise", "अंक ऐसे"]),
    ("save",  ["yaad na aaye", "याद न आए", "आंकिक"]),
    ("step",  ["pehle ye", "पहले यह"]),
    ("ratt",  ["ratt lo", "रट लो"]),
    ("tip",   ["टिप", "tip"]),
    ("line",  ["ek line", "व्याख्या", "bas ye"]),
    ("link",  ["wahi question", "वही सवाल", "मिलता"]),
    ("rep",   ["बार पूछा", "baar pucha"]),
    ("conf",  ["ban gaya", "बन गया"]),
    ("concl", ["निष्कर्ष", "atah", "conclusion"]),
]


def callout_type(icon, label):
    t = _ICON_TO_TYPE.get(icon)
    if t:
        return t
    low = (label or "").lower()
    for kind, hints in _LABEL_HINTS:
        for h in hints:
            if h.lower() in low:
                return kind
    return "line"


# Card tone: which sticky-note colour + pin a `> #### 📌 <Label>` gets.
# Matched on keyword so a new card label still renders.
_CARD_TONE = [
    (["mistake", "costly", "गलती"],            ("#fdf3b4", "red",  "#c81e1e")),
    (["most asked", "sure-shot", "sure shot"], ("#fbdde7", "blue", "#c2337a")),
    (["just read", "move on"],                 ("#eefaee", "blue", "#1f6e3c")),
    # `चरण` ("steps") and `उपपत्ति` ("proof") are how a Hindi-labelled card
    # spells this — `> #### 📌 🧭 उपपत्ति के चरण`. Matched on the English
    # words alone it fell through to the yellow Common-Mistake default, so a
    # proof-steps card was coloured as a warning.
    (["derivation", "steps", "चरण", "उपपत्ति"], ("#eef4fd", "red",  "#2456c9")),
    (["don't mix", "dont mix", "mix these"],   ("#f4eefc", "blue", "#7b3fd0")),
]
_CARD_DEFAULT = ("#fdf3b4", "red", "#c81e1e")


def card_tone(label):
    low = (label or "").lower()
    for hints, tone in _CARD_TONE:
        for h in hints:
            if h in low:
                return tone
    return _CARD_DEFAULT


# ==========================================================================
# FIGURE MARKERS
# ==========================================================================
def parse_figure(body):
    """`चित्र 1.15—caption | ref: path — desc`  ->  dict.

    Two marker families exist and they mean different things:
      [FIGURE: … | ref: source_figures/x.png — desc]  a scan crop exists
      [IMAGE:  … — नामांकित चित्र — desc]            must be drawn
    Both become a `figure` node; `mode` records which.
    """
    ref = None
    m = re.search(r'\|\s*ref:\s*(\S+?)[;\s]', body + ' ')
    if m:
        ref = m.group(1).rstrip(';')
        body = body[:m.start()] + ' ' + body[m.end():]

    # `num` and a SHORT caption come off the front; everything else is the
    # brief. Splitting on the first separator and keeping only one half
    # threw away the tail of every long description — and the brief is the
    # figure's only record until the art exists.
    num = ""
    mn = re.search(r'(\d+\.\d+)', body[:60])
    if mn:
        num = mn.group(1)
    rest = body
    if num:
        rest = body.replace("चित्र " + num, " ", 1).replace(num, " ", 1)
    rest = re.sub(r'^[\s—–\-;|,]+', '', rest)
    rest = re.sub(r'^(नामांकित चित्र|डूडल|ग्राफ़?|graph)\s*[—–\-;]*\s*', '', rest).strip()

    caption = re.split(r'[—–;|]', rest, 1)[0].strip()
    if len(caption) > 70:
        caption = ("चित्र %s" % num) if num else caption[:70]
    return dict(num=num, caption=caption, desc=rest, ref=ref)


# ==========================================================================
# CHIP  `[1 अंक · 2026/set_ds · खण्ड अ]`  ->  structured fields
# ==========================================================================
def parse_chip(chip):
    out = dict(marks=None, year=None, set=None, khand=None, source=None, raw=chip or "")
    if not chip:
        return out
    m = RE_MARKS.search(chip)
    if m:
        raw = m.group(1)
        try:
            frac = next((c for c in raw if c in _VULGAR_VALUE), "")
            if frac:
                whole = raw.replace(frac, "").strip()
                out["marks"] = (float(whole) if whole else 0.0) \
                    + _VULGAR_VALUE[frac]
            elif "/" in raw:
                out["marks"] = (float(raw.split("/")[0])
                                / float(raw.split("/")[1]))
            else:
                out["marks"] = float(raw.replace("·", "."))
        except Exception:
            out["marks"] = None
        out["marks_label"] = raw + " अंक"
    for part in [p.strip() for p in chip.split("·")]:
        my = re.match(r'^(20\d\d)\s*/\s*(\S+)$', part)
        if my:
            out["year"], out["set"] = my.group(1), my.group(2)
        elif part.startswith("खण्ड"):
            out["khand"] = part.replace("खण्ड", "").strip()
        elif part == "पुस्तक":
            out["source"] = "book"
        elif re.match(r'^20\d\d$', part):
            out["year"] = part
    return out


