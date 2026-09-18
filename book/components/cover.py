# -*- coding: utf-8 -*-
"""
COVER — page 1, built from the chapter's own front matter.

The reference cover is not decoration: every number on it comes from the
markdown's `##` analytics sections. So this builds it from the IR rather
than from a template with the chapter's figures typed in.

    ## 🎯 …अंक किन टॉपिक से…   + a 2-col table   ->  cvc-pink, bar chart
    ## 🏆 जो निगमन…             + a formula       ->  cvc-gold
    ## ✅ किस क्रम में…          + a numbered list ->  cvc-green, step circles
    ## 📐 ये आँकड़े…             + a table         ->  cvc-plain, stat tiles
    a `>` blockquote                              ->  cvnote (red / blue)

Card ROLE is inferred from what the section contains, not from its position,
so a chapter that drops one of these sections or adds another still builds a
sensible cover.
"""
import re

from ..format.inline import inline, plain
from ..design import tokens as theme

# The hand-drawn yellow underline under the chapter name. It is part of the
# title, not decoration — it is what makes the cover read as the same book
# as the section heads, which carry the same stroke.
CVSWIPE = ('<svg class="cvswipe" viewBox="0 0 400 16" preserveAspectRatio="none">'
           '<path d="M5 10 C 90 3, 170 15, 250 8 C 310 3, 360 13, 396 7" fill="none" '
           'stroke="#f6c945" stroke-width="9" stroke-linecap="round"></path></svg>')

TILE_COLOURS = ["#3fae4e", "#ef8e2a", "#c2337a", "#3b74d8", "#9b6fd8"]

BAR_COLOURS = ["#e23b6d", "#ef8e2a", "#3b74d8", "#9b6fd8", "#3fae4e", "#18a8bf"]
_NUM = re.compile(r'([0-9]+(?:[·.][0-9]+)?)')


def _first_number(text):
    m = _NUM.search(text or "")
    if not m:
        return None
    try:
        return float(m.group(1).replace("·", "."))
    except ValueError:
        return None


EMBLEM = "assets/marks/atom-emblem.png"


def _emblem_html(px=104):
    """The chapter emblem, embedded so the file stays self-contained.

    Falls back to the ⚛ glyph if the asset is missing — a cover with a
    slightly plain mark is better than a build that dies over an image."""
    import base64
    import os
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    f = os.path.join(root, EMBLEM)
    if not os.path.exists(f):
        return '<span style="font-size:%dpx;line-height:1;">⚛</span>' % int(px * .62)
    b64 = base64.b64encode(open(f, "rb").read()).decode("ascii")
    return ('<img src="data:image/png;base64,%s" alt="" '
            'style="width:%dpx;height:%dpx;object-fit:contain;flex:none;">'
            % (b64, px, px))


def hero(ch_num, ch_name, lead="", seal=None, strap="", mast=""):
    out = ['<div class="cvhero">']
    out.append(_emblem_html())
    out.append('<div class="cvtitle">')
    if ch_num:
        out.append('<span class="cvch">अध्याय %s</span>' % plain(ch_num))
    out.append('<div class="cvname">%s%s</div>' % (inline(ch_name), CVSWIPE))
    # THE CHAPTER'S MASTHEAD — board, class, subject.
    #
    # `उ.प्र. बोर्ड · कक्षा 12 · रसायन विज्ञान — पूर्ण अध्ययन-सामग्री` is the
    # line under every chapter title, and the cover had no slot for it:
    # `strap` holds the front page's own heading and `lead` holds the derived
    # marks sentence, so the line was collected into the IR and printed
    # nowhere. Four of its words were reported vanished, and they name the
    # board and the subject.
    if mast:
        out.append('<div class="cvmast">%s</div>' % inline(mast))
    if lead:
        out.append('<div class="cvlead">%s</div>' % inline(lead))
    # The front page's own heading, e.g. "अध्याय 4 का नक़्शा, पढ़ना शुरू करने
    # से पहले एक पेज". Set in the lead face rather than a new one — it is the
    # same kind of line, and a class with no rule behind it would print
    # unstyled.
    if strap:
        out.append('<div class="cvlead">%s</div>' % inline(strap))
    out.append('</div>')
    if seal:
        out.append('<div class="cvseal"><div class="cvsn">%s</div>'
                   '<div class="cvsl">अंक</div></div>' % plain(seal))
    out.append('</div>')
    return "".join(out)


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


def bar_card(title, head, rows, total=None, skin="cvc-pink", body=""):
    """A topic-weight card. Bar widths are scaled to the largest row, so the
    chart stays truthful for any chapter's numbers."""
    col = _bar_col(rows)
    vals = [(_first_number(r[col]) if col < len(r) else None) or 0 for r in rows]
    top = max(vals) or 1
    out = ['<div class="cvcard %s"><div class="cvh">%s</div>' % (skin, inline(title))]
    if body:
        # the section's own lead line — dropping it lost real prose ("…18 सेट
        # नापे गए…"), which step16 counts as a missing block
        out.append('<div class="cvtxt" style="margin-bottom:8px;">%s</div>' % inline(body))
    if head:
        out.append('<div class="cvhead"><span>%s</span><span>%s</span></div>'
                   % (inline(head[0]),
                      inline(head[col] if col < len(head) else head[-1])))
    for i, r in enumerate(rows):
        v = vals[i]
        pct = max(8, min(100, int(round(100.0 * v / top))))
        # Any column that is neither the label nor the charted figure still
        # carries content — a cross-reference, a "where" — and is set after
        # the label rather than dropped. Same treatment steps_card gives its
        # extra columns.
        extra = " · ".join(c.strip() for j, c in enumerate(r)
                           if j not in (0, col) and c.strip())
        label = "%s · %s" % (r[0], extra) if extra else r[0]
        out.append('<div class="cvrow"><div class="cvrl">'
                   '<span class="cvtopic">%s</span><span class="cvmk">%s</span></div>'
                   '<div class="cvtrack"><span class="cvbar" style="width:%d%%;'
                   'background:%s;"></span></div></div>'
                   % (inline(label),
                      inline(r[col] if col < len(r) else r[-1]),
                      pct, BAR_COLOURS[i % len(BAR_COLOURS)]))
    if total:
        out.append('<div class="cvtotal"><span>%s</span>'
                   '<span class="cvmk">%s</span></div>'
                   % (inline(total[0]),
                      inline(total[col] if col < len(total) else total[-1])))
    out.append('</div>')
    return "".join(out)


def steps_card(title, rows, skin="cvc-green", body="", head=None):
    """A numbered-procedure card: one circle per row, the instruction beside it.

    `head` IS RENDERED, for the same reason `body` is. This function used to
    take the rows only, so a steps table's column headers had nowhere to go
    and were dropped — `| # | क्या करना है |` on the maths chapter's reading-
    order table. `bar_card` has always printed its head as a `.cvhead` strip;
    steps was the one card shape that did not, and step16 reported the word
    `क्या` as occurring in the markdown and NOWHERE in the HTML — a hard
    failure on a build that had lost nothing else. The header is the label
    for the instruction column and is content like any other.
    """
    out = ['<div class="cvcard %s"><div class="cvh">%s</div>' % (skin, inline(title))]
    if body:
        # Same reason `bar_card` carries this: the section's lead prose is
        # what an author puts the sentence they most want read into. A
        # "steps" card (the shape a numbered-first-column table gets, e.g.
        # a 1-5 अंक/प्रश्न distribution counted by mark value) had nowhere
        # to put it — this parameter did not exist, so `**102 प्रश्न · 188
        # अंक**, आठ वर्षों में।` never reached the page at all, which
        # step16 counts as a missing block same as any other.
        out.append('<div class="cvtxt" style="margin-bottom:8px;">%s</div>' % inline(body))
    # Same two-span strip `bar_card` uses: the first column's header, then
    # everything after it joined — a steps table can have three columns
    # (`क्रम | क्या करना है | कहाँ`) exactly as its rows can.
    head = [h for h in (head or [])]
    if any((h or "").strip() for h in head):
        rest = " · ".join(h.strip() for h in head[1:] if (h or "").strip())
        out.append('<div class="cvhead"><span>%s</span><span>%s</span></div>'
                   % (inline(head[0]), inline(rest)))
    out.append('<div class="cvsteps">')
    for i, r in enumerate(rows, 1):
        label = r[0] if len(r) > 1 and len(r[0]) <= 3 else str(i)
        # Keep EVERY column after the number. The steps table has three —
        # `क्रम | क्या करना है | कहाँ` — and taking r[-1] printed the
        # cross-reference ("3.13 · 2025 · प्र. 25") where the instruction
        # should be, losing the instruction entirely.
        rest = [c for c in r[1:] if c.strip()]
        body = " · ".join(rest) if rest else r[-1]
        out.append('<div class="cvstep"><span class="cvn">%s</span>'
                   '<span>%s</span></div>' % (plain(label), inline(body)))
    out.append('</div></div>')
    return "".join(out)


# Non-greedy from the left, so `**A** text **B**` yields A and B — not the
# " text " that sits BETWEEN them, which is what `[^*]{2,26}` returned.
_CHIP_RE = re.compile(r'\*\*(.+?)\*\*', re.S)
_FORMULA_RE = re.compile(r'\*\*([^*\n]{2,30}?=[^*\n]{1,30}?)\*\*')


def mine_formula_and_chips(text):
    """Pull the headline formula and its chips out of a prose paragraph.

    The reference sets `P/Q = R/S` in a dashed gold box with three chips
    above the prose, but the markdown only has it as bold text inside the
    sentence. Detecting it here keeps the card faithful without asking the
    writer to mark it up specially."""
    formula = ""
    # Backticks FIRST: the chapter writes its headline relation as
    # `P/Q = R/S`, not in bold, so a bold-only search found nothing and the
    # gold card lost its dashed formula box.
    mb = re.search(r'`([^`\n]{2,30}?=[^`\n]{1,30}?)`', text or "")
    if mb:
        formula = mb.group(1).strip()
    else:
        m = _FORMULA_RE.search(text or "")
        if m:
            formula = m.group(1).strip()
    chips = []
    for c in _CHIP_RE.findall(text or ""):
        c = c.strip()
        # A CHIP IS AN ATOMIC FACT, NOT A CLAUSE.
        #
        # `**भाग 1 — त्वरित रिवीज़न**` opens a bold-labelled group inside
        # `📑 अनुक्रमणिका`'s body — a structural header, not a numeric
        # aside — and it has a digit in it like any other "भाग N" label,
        # so it passed the digit test and became a chip. The body text
        # right below it still opens with the very same bold phrase
        # (`mine_formula_and_chips` only READS candidates, never strips
        # them), so the card showed "भाग 1 — त्वरित रिवीज़न" twice: once
        # as the chip badge, once as the first words of its own prose. A
        # real numeric chip is a short standalone token — `5 अंक`, `18
        # सेट` — never a clause joined with an em dash or a colon, which
        # is what marks this as a header introducing what follows rather
        # than a fact about it.
        if "—" in c or ":" in c or "：" in c:
            continue
        if (c and c != formula and 2 <= len(c) <= 22
                and re.search(r'[0-9]', c) and c not in chips):
            chips.append(c)
    chips = chips[:3]
    return formula, chips


def text_card(title, body, chips=(), formula="", skin="cvc-gold"):
    if not formula and body:
        formula, mined = mine_formula_and_chips(body)
        chips = chips or mined
    out = ['<div class="cvcard %s"><div class="cvh">%s</div>' % (skin, inline(title))]
    if formula:
        out.append('<div class="cvformula">%s</div>' % inline(formula, math=True))
    if chips:
        out.append('<div class="cvchips">%s</div>'
                   % "".join('<span class="cvchip%s">%s</span>'
                             % (" cvchip-hot" if i == len(chips) - 1 else "", inline(c))
                             for i, c in enumerate(chips)))
    if body:
        out.append('<div class="cvtxt">%s</div>' % inline(body))
    out.append('</div>')
    return "".join(out)


def _short_numeric(text):
    return bool(text) and len(text) <= 14 and bool(re.search(r'[0-9]', text))


def _tileable(rows):
    """Stat tiles need SHORT numeric values in every row.

    `7·6 अंक प्रति पेपर` next to a 90-word explanation is not tile-shaped:
    set at 34px in a 100px-wide box it stacked one word per line and the
    card became unreadable. Anything that fails this test becomes a compact
    list instead."""
    return bool(rows) and all(any(_short_numeric(c) for c in r) for r in rows)


def _split_unit(text):
    """`4 अंक` -> ("4", "अंक"); the unit is set small beside the number."""
    m = re.match(r'\s*([0-9]+(?:[·.][0-9]+)?)\s*(.*)$', text or "")
    return (m.group(1), m.group(2).strip()) if m else (text, "")


def tiles_card(title, body, tiles, skin="cvc-plain", head=None, caption="",
               rows=None):
    """Stat tiles, degrading to a list when the data is not tile-shaped.

    `head` is carried through because a small table that does not qualify
    for a bar chart still has column headings, and dropping them is content
    loss — step16 caught exactly that on chapter 2."""
    out = ['<div class="cvcard %s"><div class="cvh">%s</div>' % (skin, inline(title))]
    # A table can have a header ROW whose cells are blank — chapter 4's
    # `| | |` set-summary table is one. `len(head) >= 2` was true for it, so
    # an empty `.cvhead` was emitted, `.cvflex` was therefore rendered, and
    # that flex column claimed half the card while holding nothing at all.
    has_head = bool(head) and len(head) >= 2 and any((c or "").strip() for c in head)
    headrow = ('<div class="cvhead"><span>%s</span><span>%s</span></div>'
               % (inline(head[0]), inline(head[-1]))) if has_head else ""
    # The reference lays this card out HORIZONTALLY: `.cvstats` is a flex row
    # with the prose (`.cvflex`) on the left and the figures on the right.
    # Stacking them made the card tall enough to claim a sheet of its own.
    #
    # The column labels ride INSIDE the prose column rather than above the
    # whole card. The figures column is the taller of the two, so the labels
    # land in slack the card already had and cost nothing — which is the 26px
    # that kept the cover from closing on a single sheet. Dropping them
    # instead is content loss: step16 counted `आँकड़ा` and `कैसे निकला`
    # vanishing the one time they were left out.
    #
    # The chapter's own methodology table gets its own column. The tiles are
    # a SUMMARY read out of the prose; the table rows are content, and
    # rendering only the tiles dropped seven words of it.
    extra = [r for r in (rows or []) if r and list(r) not in [list(t) for t in (tiles or [])]]
    boxed = bool(tiles) and _tileable(tiles)

    # A COLUMN HEADER NEEDS COLUMNS TO HEAD.
    #
    # `.cvhead` is a two-cell strip built for the row-and-bar layout, where
    # its two labels sit over two real columns. In the TILE layout there are
    # no such columns, and when the card has no prose body and no leftover
    # table rows the flex column holds nothing but those two labels — so
    # "टॉपिक" and "हर पेपर में लगभग" were squeezed into a sliver beside the
    # first tile and collided with it. Dropping them is content loss
    # (step16 counted `आँकड़ा` and `कैसे निकला` vanishing the one time they
    # were), so they become a single caption line across the top instead,
    # which is what they actually say: what the tiles are, and what the
    # figure on each one means.
    tiles_only = (bool(tiles) and _tileable(tiles)
                  and not (body or "").strip() and not extra)
    if headrow and tiles_only:
        out.append('<div class="cvtxt" style="margin:0 0 7px;opacity:.75;">%s</div>'
                   % inline(" · ".join(c for c in (head or []) if (c or "").strip())))
        headrow = ""
    out.append('<div class="cvstats">')
    # Only when there is something to put in it. An empty left column is
    # half a card of white space, which on the cover is the one page that
    # cannot afford any.
    if (body or "").strip() or headrow:
        out.append('<div class="cvflex">%s%s</div>'
                   % (headrow,
                      ('<div class="cvtxt" style="margin-top:0;">%s</div>' % inline(body))
                      if body else ""))

    if extra and boxed:
        # Compact form: label and text run on ONE flowing line. Three columns
        # leave this one ~285px wide, and the two-line-per-row form wrapped
        # into 42px more than the cover sheet had left.
        out.append('<div class="cvflex cvmini">')
        for t in extra:
            out.append('<div class="cvrow"><span class="cvtopic">%s</span> '
                       '<span class="cvmt">%s</span></div>'
                       % (inline(t[0]), inline(" · ".join(t[1:]))))
        out.append('</div>')

    if tiles and _tileable(tiles):
        out.append('<div class="cvtiles">')
        if caption:
            out.append('<div class="cvtcap">%s</div>' % inline(caption))
        for i, t in enumerate(tiles):
            cells = list(t)
            col = TILE_COLOURS[i % len(TILE_COLOURS)]
            val = next((c for c in cells if _short_numeric(c)), cells[0])
            rest = [c for c in cells if c is not val]
            num, unit = _split_unit(val)
            out.append('<div class="cvtile">'
                       '<div class="cvtv" style="color:%s;">%s<span class="cvtu">%s</span></div>'
                       '<div class="cvtl">%s</div>'
                       % (col, inline(num), inline(unit), inline(rest[0] if rest else "")))
            if len(rest) > 1:
                out.append('<div class="cvty" style="color:%s;">%s</div>'
                           % (col, inline(rest[1])))
            out.append('</div>')
        out.append('</div>')
    elif tiles:
        # Not tile-shaped (no short numeric), so the figures degrade to a row
        # list — but it still sits in the second flex column, not underneath.
        out.append('<div class="cvflex">')
        for t in tiles:
            out.append('<div class="cvrow"><div class="cvrl">'
                       '<span class="cvtopic">%s</span></div>'
                       '<div class="cvtxt" style="font-size:15px;margin-top:2px;">%s</div>'
                       '</div>' % (inline(t[0]), inline(" · ".join(t[1:]))))
        out.append('</div>')
    out.append('</div>')
    out.append('</div>')
    return "".join(out)

def note(text, tone="cvn-red", icon="🎯"):
    return ('<div class="cvnote %s"><span class="cvi">%s</span><span>%s</span></div>'
            % (tone, icon, inline(text)))


def grid(left, right):
    return ('<div class="cvgrid"><div class="cvcol">%s</div>'
            '<div class="cvcol">%s</div></div>'
            % ("".join(left), "".join(right)))

# A UNIT WORD NEVER CARRIES MARKDOWN PUNCTUATION.
#
# A cell that is genuinely descriptive text with a number buried in it —
# `प्र. 9 `` `[2022 · 3 अंक · 2023 · 4 अंक · 2024 · 5 अंक]` `` — matched
# this regex too: the last figure is "5", so `[^\d…]*?` swept up everything
# after it through to the string's end, backtick included, and printed a
# cover total of "38 अंक]`". Excluding the characters that close a markdown
# span — backtick, `]`, `)` — from the captured group is not a special case
# for this cell; a real unit name never contains any of them either.
_UNIT_RE = re.compile(r'[0-9०-९.,·]+\s*([^\d\s०-९`\]\)][^\d०-९`\]\)]*?)\s*$')


def _value_unit(cell):
    """The unit trailing a figure — "अंक" from "लगभग 2 अंक", "बार" from
    "11 बार", "" from a bare "33".

    The derived total used to say "अंक" whatever the column counted, so a
    card tallying how many TIMES a question returned closed with a mark
    count.
    """
    m = _UNIT_RE.search((cell or "").strip())
    if not m:
        return ""
    unit = m.group(1).strip().strip("*_")
    return unit if 0 < len(unit) <= 12 else ""
