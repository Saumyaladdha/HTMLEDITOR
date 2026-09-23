# -*- coding: utf-8 -*-
"""
COVER — page 1, built from the chapter's own front matter.

The reference cover is not decoration: every number on it comes from the
markdown's `##` analytics sections. So this builds it from the IR rather
than from a template with the chapter's figures typed in.

The reference lays the cover out LINEARLY — a masthead, then one
`.source-front-section` per `##` heading, stacked in source order, each
block inside it rendered in the order it was written. See
`render.render_cover`, which walks the front matter and calls
`front_title`/`front_section` below; a table inside a section becomes
`priority_table` (a ranked value column) or `study_table` (a numbered
procedure), picked the same way a section's role always was — a numeric
last column vs. a numbered first one.
"""
import re

from ..format.inline import inline, plain

_NUM = re.compile(r'([0-9]+(?:[·.][0-9]+)?)')


def _first_number(text):
    m = _NUM.search(text or "")
    if not m:
        return None
    try:
        return float(m.group(1).replace("·", "."))
    except ValueError:
        return None


# The lamp beside the cover's "औसतन N अंक" line. Verbatim from the
# reference, and generic — it illustrates "here is what this chapter is
# worth", not anything about capacitors, so every chapter gets the same
# one. (The reference's other cover drawing, `.cover-capacitor`, IS
# chapter-specific artwork and belongs to the decorator/asset flow, not
# here — there is nothing in the markdown to derive it from.)
BULB_SVG = (
    '<svg class="cover-bulb" viewBox="0 0 48 64" aria-hidden="true"'
    ' focusable="false"><g stroke="#182550" stroke-width="2.3"'
    ' stroke-linecap="round" stroke-linejoin="round">'
    '<path fill="#ffdb5c" d="M24 13C7 13 6 32 15 39L18 48H30L33 39C43 31 40 13 24 13Z"></path>'
    '<path fill="#fff0a2" stroke="none" d="M14 29C12 21 20 16 26 18C18 19 16 24 17 29Z"></path>'
    '<path fill="none" d="M21 47L20 31L25 34L29 29L27 47M18 49H30M19 53H29M21 57H27'
    'M24 4V8M6 12L10 16M1 27H6M42 12L38 16M42 27H47"></path></g></svg>')


def note_row(text, bulb=False):
    """One note under the cover masthead.

    THE TEXT IS ONE FLEX ITEM, ALWAYS. `.source-front-title .note` is
    `display:flex` (verbatim from the reference, which puts exactly two
    children in it — the lamp and one `<span>`). A flex container makes
    every child its own item and DISCARDS the whitespace between them,
    so a note emitted as bare mixed content — `<b>पेपर का ढाँचा</b> :
    बिहार बोर्ड …` — came apart into one item per tag, losing the space
    around each bold run and letting the row break between them: the
    chapter-structure note rendered with its label welded to the colon
    and its last two words stranded on the right of the box. Wrapping
    the whole text in one `.average-text` span makes it a single item
    again, which is the shape the reference's own CSS was written for.
    """
    return ('<div class="u"><div class="note">%s<span class="average-text">'
            '%s</span></div></div>'
            % (BULB_SVG if bulb else "", inline(text)))


def front_title(num, name, avg_text=""):
    """The cover's masthead — `<header class="source-front-title">`. The
    reference stacks the chapter badge, its name and one "औसतन N अंक" note
    in a plain header — no hero card, no seal, no dashboard grid."""
    out = ['<header class="source-front-title"><div class="u">'
           '<h1 class="source-title">']
    if num:
        out.append('<span class="chapter-badge">अध्याय %s :</span>' % plain(num))
    out.append('<span class="chapter-topic">%s</span></h1></div>' % inline(name))
    if avg_text:
        out.append(note_row(avg_text, bulb=True))
    out.append('</header>')
    return "".join(out)


def front_section(n, title, body_html):
    """One stacked front-matter block — `<section class="source-front-section
    front-section-N">`. `n` is this section's 1-based position among the
    chapter's front-matter sections, which is what picks its skin (see
    `.front-section-1/2/3` in the stylesheet — a ranked table, a prose
    card, a numbered table are visually distinct, not just repeats of one
    shape)."""
    return ('<section class="source-front-section front-section-%d">'
            '<div class="u"><h2>%s</h2></div>%s</section>'
            % (n, inline(title), body_html))


def _bar_col(rows):
    """Which column holds the figure to chart.

    `r[-1]` was assumed. That is right for a two-column table and wrong for a
    three-column one: chapter 4's `तरीका | कितने | कहाँ सबसे ज़्यादा` puts the
    count in the MIDDLE and a cross-reference last, so the card charted the 5
    out of "5 अंक के खण्ड में 18" instead of the real 33 — a wrong chart, and
    the count column dropped from the page entirely.

    Chosen by measurement: the column after the label whose cells most often
    begin with a number. Ties fall to the last column, which keeps every
    two-column card exactly as it was.
    """
    if not rows:
        return -1
    width = max(len(r) for r in rows)
    best, best_score = width - 1, -1
    for c in range(1, width):
        score = sum(1 for r in rows
                    if c < len(r) and _first_number(r[c]) is not None)
        if score > best_score:
            best, best_score = c, score
    return best


# The chip colours the reference cycles through, one per row, on both the
# priority and the study table.
_CHIP_COLOURS = ["#dec4ff", "#bfddff", "#a5ead8", "#ffdf7d",
                 "#cfb6ff", "#99e5ed", "#ffb9dc", "#a6d5ff"]

# `2.18 संधारित्रों का संयोजन` -> a topic id chip + the name beside it.
# Anything that does not start with a section number (a chapter that
# writes this table by hand, not by topic) prints as plain text instead.
#
# THE ID MAY BE BOLD. A chapter writes the same cell either way —
# `2.18 संधारित्रों का संयोजन` or `**2.3** वैद्युत द्विध्रुव के कारण विभव`
# — and with the markers unmatched the second spelling fell to the plain
# branch: the whole cell printed as running text, so every topic on the
# cover lost the coloured id chip the reference gives it. The markers are
# consumed here rather than in the caller, since `inline()` renders what
# is left and would otherwise be handed a stray `**`.
_RE_TOPIC_CELL = re.compile(
    r'^\s*(?:\*\*)?\s*(\d+(?:\.\d+)+)\s*(?:\*\*)?[\s:·-]+(\S.*)$')

# A COUNT PILL HOLDS THE FIGURE, NOT THE SENTENCE AROUND IT.
#
# `.count-value` is `display:inline-flex` (verbatim from the reference,
# which only ever puts a bare `7` in it). A flex container makes every
# child its own flex item and DISCARDS the whitespace between them, so a
# cell written `लगभग **2 अंक**` — qualifier, then figure — rendered as
# `लगभग2 अंक`, the two words welded together inside the pill. Splitting
# the leading qualifier off and setting it outside the pill restores the
# space and gives the pill the shape it was designed for.
_QUALIFIER_RE = re.compile(r'^\s*([^\d]*?)\s*(\*{0,2}\d.*)$', re.S)


def _count_cell(val):
    """One value cell of the priority table: the figure in its pill, and
    whatever qualifies it (`लगभग`, `कम से कम`) set beside it as plain
    text — see `_QUALIFIER_RE` for why the two cannot share the pill."""
    m = _QUALIFIER_RE.match(val or "")
    if not m or not m.group(1).strip():
        return '<span class="count-value">%s</span>' % inline(val)
    return '%s <span class="count-value">%s</span>' % (
        inline(m.group(1).strip()), inline(m.group(2).strip()))


def priority_table(title, head, rows, total=None, skin="cvc-pink", body=""):
    """The topic-weight table — `.priority-table` — a real ranked table,
    each row a topic-id chip, a count pill, and whichever marks it came
    up in. `title`/`skin`/`body` are accepted but usually left blank: the
    enclosing `front_section` already carries the `<h2>`, so a table
    inside one prints unlabelled.

    THE THIRD COLUMN ONLY EXISTS IF THE SOURCE HAS ONE. The reference's
    table is three columns — topic, count, "किन अंकों में" — and this
    emitted three cells unconditionally to match it. A chapter whose
    table is written with only `टॉपिक | कितने अंक` then got an empty
    third `<td>` on every row and no third `<th>`: a ruled, permanently
    blank strip down the right of the cover's biggest block, with the
    header border stopping short above it.
    """
    col = _bar_col(rows)
    # Does any row actually carry a column beyond the topic and the count?
    has_extra = any(c.strip() for r in rows
                    for j, c in enumerate(r) if j not in (0, col))
    out = []
    if skin and title:
        out.append('<div class="cvcard %s"><div class="cvh">%s</div>' % (skin, inline(title)))
    if body:
        out.append('<div class="cvtxt" style="margin-bottom:8px;">%s</div>' % inline(body))
    out.append('<div class="front-table-wrap priority-wrap">'
                '<table class="priority-table"><thead><tr>')
    # Never more headings than the body has cells — a source that names
    # three columns but fills two would otherwise re-open the same hole.
    _heads = list(head or [])
    if not has_extra:
        _heads = _heads[:2]
    for h in _heads:
        out.append('<th>%s</th>' % inline(h))
    out.append('</tr></thead><tbody>')
    for i, r in enumerate(rows):
        m = _RE_TOPIC_CELL.match(r[0] if r else "")
        topic = ('<div class="priority-topic"><span class="priority-id">%s</span>'
                 '<span>%s</span></div>' % (plain(m.group(1)), inline(m.group(2)))
                 if m else inline(r[0] if r else ""))
        val = r[col] if col < len(r) else (r[-1] if r else "")
        extra = " · ".join(c.strip() for j, c in enumerate(r)
                           if j not in (0, col) and c.strip())
        out.append('<tr style="--chip-color:%s"><td>%s</td><td>%s</td>%s</tr>'
                   % (_CHIP_COLOURS[i % len(_CHIP_COLOURS)], topic,
                      _count_cell(val),
                      ('<td class="priority-marks">%s</td>' % inline(extra))
                      if has_extra else ""))
    if total:
        val = total[col] if col < len(total) else total[-1]
        out.append('<tr style="--chip-color:#e4e4e4"><td><b>%s</b></td>'
                   '<td>%s</td>%s</tr>'
                   % (inline(total[0]), _count_cell(val),
                      '<td class="priority-marks"></td>' if has_extra else ""))
    out.append('</tbody></table></div>')
    if skin and title:
        out.append('</div>')
    return "".join(out)


def study_table(title, rows, skin="cvc-green", body="", head=None):
    """The reading-order table — `.study-table` — a numbered circle per
    row. `title`/`skin`/`body` are accepted but usually left blank, same
    reason as `priority_table`."""
    out = []
    if skin and title:
        out.append('<div class="cvcard %s"><div class="cvh">%s</div>' % (skin, inline(title)))
    if body:
        out.append('<div class="cvtxt" style="margin-bottom:8px;">%s</div>' % inline(body))
    out.append('<div class="front-table-wrap study-wrap">'
                '<table class="study-table"><thead><tr>')
    for h in (head or []):
        if (h or "").strip():
            out.append('<th>%s</th>' % inline(h))
    out.append('</tr></thead><tbody>')
    for i, r in enumerate(rows, 1):
        label = r[0] if len(r) > 1 and len(r[0]) <= 3 else str(i)
        # Every column after the number — a table can carry three
        # (`क्रम | क्या करना है | क्यों`) or just two.
        rest = [c for c in r[1:] if c.strip()] or ([r[-1]] if r else [""])
        cells = "".join('<td>%s</td>' % inline(c) for c in rest)
        out.append('<tr style="--chip-color:%s"><td><span class="study-number">%s</span></td>'
                   '%s</tr>' % (_CHIP_COLOURS[(i - 1) % len(_CHIP_COLOURS)],
                                plain(label), cells))
    out.append('</tbody></table></div>')
    if skin and title:
        out.append('</div>')
    return "".join(out)
