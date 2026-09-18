# -*- coding: utf-8 -*-
"""
Question blocks.

In the A4 edition `.qcard` is stripped of its border and background — the
questions are separated by the dashed `.qsep` rule instead, so one can flow
across a column boundary. The scroll edition keeps the card.
"""
from ..design import tokens as theme
from ..format.inline import inline, plain
from .inline import chip, swipe, stars, starnote, qmarks


def qhead(num, chip_text, acc=0, n_stars=0, note=""):
    out = ['<div class="qhead">']
    out.append(swipe("प्र. %s" % num, "qnum"))
    if chip_text:
        out.append(chip(chip_text))
    if n_stars:
        out.append(stars(n_stars))
    if note:
        out.append(starnote(note))
    out.append('</div>')
    return "".join(out)


def question_text(text, marks=""):
    m = (" " + qmarks(marks)) if marks else ""
    return '<p class="q">%s%s</p>' % (inline(text), m)


import re as _re

_OPT_MARK = _re.compile(r'^(\(?[ivxa-dA-D]{1,4}\)?[).])\s*(.*)$', _re.S)


def options(items, layout="grid"):
    """`<b>i)</b> text` — the reference bolds the marker and leaves the option
    text normal. Rendering the whole option as one run loses the scanning cue
    that tells a reader where each choice begins."""
    cls = "opts" if layout == "grid" else "opts one"
    out = []
    for it in items:
        # A `[1]` closing an option is a marks tag, and everywhere else in the
        # book it is a chip. Splitting the item into paragraphs — which is
        # what prose does — would break the list, so the chip goes inline at
        # the end of the option instead.
        it, tag = _re.match(r'^(.*?)(?:\s\[(\d{1,2})\s*[Mm]?\])?\s*$',
                            (it or "").strip(), _re.S).groups()
        tail = (' <span class="qmarks">[%s]</span>' % tag) if tag else ""
        m = _OPT_MARK.match((it or "").strip())
        if m:
            out.append('<div><b>%s</b> %s%s</div>'
                       % (inline(m.group(1)), inline(m.group(2)), tail))
        else:
            out.append('<div>%s%s</div>' % (inline(it), tail))
    return '<div class="%s">%s</div>' % (cls, "".join(out))


# The author's own emphasis, given a book's treatment.
#
# `.swipe` and `.text-color` exist in the codebase but belong to the OLD BEM
# system and are in none of the current stylesheets, so the finished chapter
# carried NO emphasis layer at all: 511 answer paragraphs of uniform grey
# with 263 centred equations among them and nothing marking what mattered.
#
# Rather than invent a rule for what is important, this uses what the source
# already says is: `**bold**`, 669 times. Applied only inside the answer's
# OPENING STATEMENT — the one sentence a student scans for — so the wash
# stays a signal instead of becoming wallpaper across every paragraph.
_BOLD_RUN_RE = _re.compile(r'<b>(.+?)</b>', _re.S)

# HOW LONG A KEYWORD CAN BE.
#
# The wash marks a TERM — the thing a student scans the answer for. It was
# applied to every `<b>` run regardless of length, and biology's markdown
# bolds far more than terms: of 1101 bold runs in chapter 1, **220 are longer
# than 25 characters** and the longest is 181 — an entire question stem. A
# 181-character yellow wash is not a signal, it is a highlighted paragraph,
# and it made the page look as though someone had dragged a marker across it.
#
# Over the limit the run stays BOLD, which is what the author asked for. It
# simply does not also get the wash. 30 characters is about six Devanagari
# words — comfortably a term or a short phrase, nowhere near a sentence.
KEYWORD_MAX = 30

# Sentence punctuation inside a run is the other tell: a keyword does not
# contain a full stop or a question mark, whatever its length.
_SENTENCE = _re.compile(r'[।?!]|\. ')


# A LIST MARKER — `क:`, `ख:`, `(i)`, `a)`.
#
# The biology source writes its label answers with UNBALANCED `**`:
#
#     **उत्तर:** लेबल लिखो:**  क: **वर्तिकाग्र (Stigma)**  ख: **परागकोश …
#
# The pairs therefore fall around the MARKERS rather than the names, so
# `क:` and `ख:` came out bold — and the wash landed on them while
# `वर्तिकाग्र (Stigma)` stayed plain. Exactly backwards from what the author
# meant, and it made those answers look like a row of highlighted letters.
#
# The bold cannot be re-paired reliably, so it is not guessed at. What can be
# said for certain is that a marker is not a keyword: it carries no meaning
# to find, and emphasising it is never right.
_MARKER_RE = _re.compile(r'^[\(\[]?\s*(?:[\u0900-\u097F]|[ivxlcIVXLC]{1,4}|[a-zA-Z]|\d{1,2})'
                         r'\s*[\)\].:：]\s*$')


def is_list_marker(inner):
    text = _re.sub(r'<[^>]+>', '', inner).strip()
    return bool(text) and bool(_MARKER_RE.match(text))


def _is_keyword(inner):
    """Is this bold run a term, or a bolded sentence?"""
    text = _re.sub(r'<[^>]+>', '', inner).strip()
    if is_list_marker(inner):
        return False
    return len(text) <= KEYWORD_MAX and not _SENTENCE.search(text)


# THE ONLY THING EMPHASISED IN AN ANSWER IS THE BRACKETED TERM.
#
# The wash went through three rounds and each was still too much. It began on
# every bold run, which gave one biology answer ELEVEN highlighted phrases;
# capping it at two per answer left the page quieter but still washed whole
# Hindi phrases; and because the source writes its label answers with
# unbalanced `**`, the wash sometimes landed on the marker `क:` instead of
# the name beside it.
#
# What a student actually has to carry out of a biology answer is the
# technical term — `(Sporopollenin)`, `(exine)`, `(pollen grain)`. That is
# what gets weight now: DARK BOLD, no background. Everything else in the
# answer, including phrases the author marked bold, is set at normal weight.
#
# The author's `**` is not ignored so much as re-read: it says "this sentence
# matters", which is true of most sentences in an answer, and acting on it
# literally is what made the page look gone-over with a marker.

# A parenthetical carrying Latin letters — the English or scientific name.
# A Hindi parenthetical like `(चार-दिशीय)` is a gloss, not a term to learn,
# and is left alone.
_TERM_PAREN_RE = _re.compile(r'\((?=[^()]*[A-Za-z])[^()<>]{1,44}\)')


def _mark_keywords(html):
    """Strip the author's blanket bold, then mark the bracketed terms."""
    # 1. Author bold becomes normal weight. A list marker loses its bold too
    #    — see is_list_marker for why one ever had it.
    def unbold(m):
        return m.group(1)

    out = _BOLD_RUN_RE.sub(unbold, html)

    # 2. The bracketed technical terms get the weight instead. Split on tags
    #    so a bracket inside an attribute is never touched.
    parts = []
    for chunk in _re.split(r'(<[^>]+>)', out):
        if chunk.startswith("<"):
            parts.append(chunk)
        else:
            parts.append(_TERM_PAREN_RE.sub(
                lambda m: '<b class="term">%s</b>' % m.group(0), chunk))
    return "".join(parts)


def answer(text, title=""):
    # A DIV, not a span: the reference uses a block here so a long opening
    # statement wraps under itself rather than beside the label.
    body = ((('<b class="anstitle">%s</b>' % inline(title)) if title else "")
            + _mark_keywords(inline(text)))
    # AN ANSWER WHOSE WHOLE BODY IS A DRAWING HAS NO TEXT OF ITS OWN.
    #
    # 29 of this chapter's 137 answers are written `**उत्तर:** [RXN: …]` or
    # `**उत्तर:** ![चित्र …](…)` — the reaction or the figure IS the answer,
    # and the reader lifts it into its own block so the column packer can
    # measure and place it. That left an EMPTY `.anstext` here, and the div
    # brings its own line box and margin, so the page showed the green
    # `उत्तर :` chip, a gap where an answer should be, and the drawing
    # further down: it read as a missing answer. Dropped when there is
    # nothing in it, the chip sits directly above the block that answers.
    if not body.strip():
        return ('<div class="ansrow ans-lead">'
                '<span class="anslabel"><i></i><b>उत्तर :</b></span></div>')
    return ('<div class="ansrow">'
            '<span class="anslabel"><i></i><b>उत्तर :</b></span>'
            '<div class="anstext">%s</div></div>' % body)


def given(text):
    return ('<div class="given"><span class="givenlabel">दिया है :</span> %s</div>'
            % inline(text))


def qsep():
    return '<div class="qsep"></div>'
