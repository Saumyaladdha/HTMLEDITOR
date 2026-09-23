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


def section_head(num, title, acc=0, chips=(), exams=(), en="", flag="",
                 freq="", revision=False):
    """`(3.5) गतिशीलता (Mobility)  [🔥 UP 2025 · 3 अंक]`

    `en` is the English gloss, and it belongs INSIDE this row. Emitted as a
    block after it — which is what a `<div class="exp">` did — it took a
    whole line of its own beneath a two-word heading, so every section spent
    a line on a translation and the gloss read as a subtitle instead.

    `freq` is the topic's exam-frequency trailer — `13 सवाल आए · 1 व 5 अंक
    में`. It arrives as part of the markdown's heading line and used to be
    left there, so the heading printed as one run with the count welded to
    the name and wrapped onto a second line in a 449px column. The
    reference sets it as a red seal beside the name instead; see
    `.topic-frequency`.

    `revision` switches the Part-1 shape: an `<h2>` rather than a `<span>`,
    wrapped with its chips in a `.topic-heading` flex box, which is what
    `.revision-unit .sechead`'s 40px/rest grid lays out.
    """
    name, ink, _fill, hd = accent(acc)
    out = ['<div class="sechead">']
    if num:
        out.append('<span class="secno" style="border-color:%s;color:%s;">%s</span>'
                   % (ink, ink, plain(num)))
    if revision:
        out.append('<div class="topic-heading">')
    out.append(hdu(inline(title), hd, tag="h2" if revision else "span"))
    if freq:
        # Same seal, same 🔥, as the `[UP 2025 · 3 अंक]` stamp — see
        # `examchip`. The two are the same statement in two authoring
        # dialects ("asked in UP 2023, worth 2 marks" / "13 questions
        # came, in the 1- and 5-mark slots"), so they get one design.
        out.append('<span class="topic-frequency">🔥 %s</span>' % inline(freq))
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
    if revision:
        out.append('</div>')
    out.append('</div>')
    return "".join(out)


def sub_head(title):
    return '<div class="h2">%s</div>' % inline(title)


def _part_heading(label, sub, tag="h2", extra_class=""):
    # `PART 1 · QUICK REVISION` IS TWO THINGS, AND THE MARKDOWN WRITES IT
    # AS ONE STRING.
    #
    # The reference sets the number in its own tinted pill
    # (`.part-label`), the name beside it under a pencil flourish
    # (`.part-name`), and a `·` between them (`.part-divider`) — three
    # elements this function has always been able to build. But the part
    # heading arrives from the reader as a single label with the `·`
    # inside it and nothing in `sub`, so the whole line went into the
    # pill: one long tinted box reading "PART 1 · QUICK REVISION", with
    # the name unstyled inside it and the flourish attached to nothing.
    #
    # Split on the FIRST `·` only, so a name that contains one of its own
    # keeps it.
    if not sub and "·" in (label or ""):
        label, _, sub = [x.strip() for x in (label or "").partition("·")]
    cls = ("part-heading " + extra_class).strip()
    out = ['<%s class="%s">' % (tag, cls)]
    if label:
        out.append('<span class="part-label">%s</span>' % inline(label))
    if label and sub:
        out.append('<span class="part-divider"> · </span>')
    if sub:
        out.append('<span class="part-name">%s</span>' % inline(sub))
    out.append('</%s>' % tag)
    return "".join(out)


def part_banner(label, sub=""):
    """Part 1's single opening banner — `.type-banner.revision-banner`."""
    return ('<div class="type-banner revision-banner">%s</div>'
            % _part_heading(label, sub))


def type_banner(label, accent=None, part_label="", part_sub=""):
    """One of Part 2's question-format banners — बहुविकल्पीय / अतिलघु
    उत्तरीय / लघु उत्तरीय-I / -II / विस्तृत उत्तरीय — pooled across every
    topic (see `readers.markdown._regroup_by_qtype`). The FIRST one also
    carries Part 2's own "PART 2 · QUESTIONS & ANSWERS" masthead, folded
    into the same banner rather than a separate one above it — that is the
    shape the reference uses, and a standalone part-banner above the first
    bucket read as one extra, empty-looking page break."""
    cls = "type-banner questions-banner" if part_label else "type-banner"
    style = ' style="--accent:%s;"' % theme.ACCENTS[accent % len(theme.ACCENTS)][1] \
            if accent is not None else ""
    out = ['<div class="%s"%s>' % (cls, style)]
    if part_label:
        out.append(_part_heading(part_label, part_sub))
        out.append('<h2 class="question-type-heading">%s</h2>' % inline(label))
    else:
        out.append('<h2>%s</h2>' % inline(label))
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
