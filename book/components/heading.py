# -*- coding: utf-8 -*-
"""
Chapter, section, part and year headings.

The finalised edition replaced the highlighter behind a section title with a
hand-drawn UNDERLINE, and added two devices the old one did not have:

    .examchip    a dark-red exam stamp with a yellow pin — `UP 2025 · 3 अंक`
    .partbanner  the wide gold banner that opens a part
"""
from ..design import tokens as theme
from ..format.inline import inline, plain
from .inline import accent, hdu, chip, examchip, swipe, marktag
from .table import table
from .slot import slot


def chapter_header(num, title, part_label="", part_sub=""):
    head = ("अध्याय %s : " % plain(num)) if num else ""
    out = ['<div class="booktitle">%s%s</div>' % (head, inline(title))]
    if part_label or part_sub:
        out.append('<div class="booksub">%s</div>'
                   % inline(part_sub or part_label))
    out.append('<div class="rule"></div>')
    return "".join(out)


def section_head(num, title, acc=0, chips=(), exams=(), en="", flag=""):
    """`(3.5) गतिशीलता (Mobility)  [🔥 UP 2025 · 3 अंक]`

    `en` is the English gloss, and it belongs INSIDE this row. Emitted as a
    block after it — which is what a `<div class="exp">` did — it took a
    whole line of its own beneath a two-word heading, so every section spent
    a line on a translation and the gloss read as a subtitle instead.
    """
    name, ink, _fill, hd = accent(acc)
    out = ['<div class="sechead">']
    if num:
        out.append('<span class="secno" style="border-color:%s;color:%s;">%s</span>'
                   % (ink, ink, plain(num)))
    out.append(hdu(inline(title), hd))
    if en:
        out.append('<span class="exp">(%s)</span>' % plain(en))
    # `☞ बार-बार` — maths flags a frequently-asked section this way. It is a
    # BADGE, and it was being left inside the title: the heading printed as
    # one italic-and-bold run with the pointer, the English gloss and the
    # marks chip all jammed into the name. Given its own element it reads as
    # what it is, and the title goes back to being a title.
    if flag:
        out.append('<span class="secflag">☞ %s</span>' % inline(flag))
    for e in exams:
        out.append(examchip(e))
    for c in chips:
        out.append(chip(c))
    out.append('</div>')
    return "".join(out)


def sub_head(title):
    return '<div class="h2">%s</div>' % inline(title)


def part_banner(label, sub=""):
    out = ['<div class="partbanner"><div class="pt">%s</div>' % inline(label)]
    if sub:
        out.append('<div class="ps">%s</div>' % inline(sub))
    out.append('</div>')
    return "".join(out)


def year_head(label, chips=()):
    """The big highlighted year that opens a Part-2 group."""
    out = ['<div class="yearhead"><span class="yr"><i></i><b>%s</b></span>'
           % inline(label)]
    for c in chips:
        out.append(chip(c))
    out.append('</div>')
    return "".join(out)


def year_banner(text):
    """The green closing strip at the end of a group."""
    return '<div class="banner">%s</div>' % inline(text)


def part_cover(label, sub, chapter_line="", overview=None, notes=None):
    """Opening page of a part.

    The overview table is DERIVED from the parsed document, so it stays true
    for any chapter and any grouping without being written by hand."""
    out = [part_banner(label, sub)]
    if chapter_line:
        out.append('<div class="booktitle" style="font-size:30px;">%s</div>'
                   % inline(chapter_line))
    if overview:
        out.append('<div class="h2">एक नज़र में</div>')
        out.append('<div class="tblwrap">%s</div>'
                   % table(overview["head"], overview["rows"], align=("l",)))
    if notes:
        out.append('<div class="h2">कैसे पढ़ें</div>')
        out.append('<ul class="bl" style="--acc:#e23b6d;">%s</ul>'
                   % "".join('<li><span>%s</span></li>' % inline(n) for n in notes))
    out.append(slot("character", "", w=190, h=206, place="center",
                    extra="margin-top:18px;"))
    return "".join(out)
