# -*- coding: utf-8 -*-
"""
Question blocks.

In the A4 edition `.qcard` is stripped of its border and background — the
questions are separated by the dashed `.qsep` rule instead, so one can flow
across a column boundary. The scroll edition keeps the card.
"""
import re as _re

from ..design import tokens as theme
from ..format.inline import inline, plain
from .inline import chip, swipe, stars, starnote, qmarks


# THE QUESTION TAG, `[1 अंक · 2024 · Set A/G · आंकिक प्रश्न]`.
#
# One `·`-separated list holding three different KINDS of fact: what the
# question is worth, which papers it came from, and the occasional note
# about it. The whole string used to be dropped into a single `.chip`, so
# a question head read `1 अंक · 2026 · Set A/C/D/E` in one blue pill — the
# marks buried in the middle of a provenance list, and the list itself
# unreadable as a list. The reference separates them: the marks as the
# yellow `.qmarks` chip on the head's own line, the papers as a gold
# `.paper-refs` band under it with one `.paper-ref` per paper, and a note
# as a small `.inline-tag`.
#
# The grammar is positional only in that marks come first. After that a
# year opens a group and an optional `Set …` fills it, so
# `2025 · Set H · 2023 · Set A` is two papers, not four facts.
_TAG_MARKS = _re.compile(r'^\s*\d+(?:[.·]\d+)?\s*(?:अंक|marks?|M)\s*$', _re.I)
_TAG_YEAR = _re.compile(r'^\s*(\d{4}[A-Za-z]?)\s*$')
_TAG_SETS = _re.compile(r'^\s*Set\s+(.+?)\s*$', _re.I)


def split_qtag(chip_text):
    """`[1 अंक · 2024 · Set A/G · आंकिक]` -> ("1 अंक", ["2024/set_a",
    "2024/set_g"], ["आंकिक"]).

    A year with no `Set` keeps its own spelling (`2022A`) as one ref —
    that is how the source names a paper that had no sets.
    """
    marks, refs, notes = "", [], []
    cur = None                      # the year currently collecting sets
    for field in (chip_text or "").split("·"):
        f = field.strip()
        if not f:
            continue
        if not marks and _TAG_MARKS.match(f):
            marks = f
            continue
        m = _TAG_YEAR.match(f)
        if m:
            cur = m.group(1)
            refs.append(cur)        # stands alone unless a `Set` follows
            continue
        m = _TAG_SETS.match(f)
        if m and cur:
            # Replace the bare year with one ref per set it was sat in.
            refs.pop()
            for s in m.group(1).split("/"):
                s = s.strip()
                if s:
                    refs.append("%s/set_%s" % (cur, s.lower()))
            continue
        notes.append(f)
    return marks, refs, notes


def _qtag_html(chip_text, note=""):
    """The `.qmarks` chip and the `.question-meta` band for one tag.

    `note` is the `*2023 में भी आया था*` aside the source writes after the
    stars. It belongs ON the paper band, in brackets — it says something
    ABOUT those papers ("came up in 2023 too"), and given a row of its own
    under them it read as an unrelated line of pink italic between the
    head and the question.
    """
    marks, refs, notes = split_qtag(chip_text)
    out = []
    if marks:
        out.append(qmarks(marks))
    meta = []
    if refs:
        # NO SEPARATOR IN THE MARKUP. The tags used to be joined by a
        # literal " · ", which welded each one to the dots beside it: the
        # editor treats a tag as an object you can pick up and reorder, and
        # moving one past another left its dots behind in the old order.
        # `.paper-ref + .paper-ref::before` draws them now (see
        # `elements/paper-ref/extra.css`), so a tag carries only its own
        # text and the dots fall wherever the tags end up.
        meta.append('<span class="paper-refs">%s</span>'
                    % "".join('<span class="paper-ref">%s</span>' % plain(r)
                              for r in refs))
    for n in notes:
        meta.append('<span class="inline-tag">%s</span>' % inline(n))
    if (note or "").strip():
        meta.append('<span class="starnote">(%s)</span>' % inline(note.strip()))
    if meta:
        out.append('<div class="question-meta">%s</div>' % " ".join(meta))
    return "".join(out)


def qhead(num, chip_text, acc=0, n_stars=0, note=""):
    # THE ANCHOR THE PROSE POINTS AT.
    #
    # Answers cross-refer to other questions by number — "पूरा निगमन ☞
    # प्र. 73" — and the reference makes each of those a real link to
    # `#q-73`. Ours emitted no `id` on any question head at all, so there
    # was nothing in the document for such a link to reach; the reference
    # carries one on every `.qhead`. Emitted here whether or not anything
    # currently links to it, because the anchor is a property of the
    # question, not of who happens to cite it.
    _id = _re.sub(r'[^0-9A-Za-z.-]', '', str(num or ""))
    out = ['<div class="qhead"%s>' % ((' id="q-%s"' % _id) if _id else "")]
    out.append(swipe("प्र. %s" % num, "qnum"))
    if chip_text:
        # Marks chip, then the paper band — see `split_qtag`. A tag that
        # parses to nothing recognisable keeps the old single chip rather
        # than being dropped, so an unfamiliar dialect still prints.
        tag = _qtag_html(chip_text, note)
        out.append(tag if tag else chip(chip_text))
        if tag:
            note = ""              # folded into the band above
    if n_stars:
        out.append(stars(n_stars))
    if note:
        out.append(starnote(note))
    out.append('</div>')
    return "".join(out)


def subhead(text):
    """A short blue heading — `.subhead`.

    The reference uses one shape for four jobs, and they are the same
    job: naming the thing that follows, in one short line.

      · a SHORT question stem (`वैद्युत विभव का मात्रक है`) — its stems
        run to a median of 25 characters against 108 for the ones set as
        bold body text;
      · a bare `**उत्तर:**` opening a long answer;
      · a section heading INSIDE a long answer (`परावैद्युत ध्रुवण`,
        `वैद्युत संधारित्र`) — which is what makes a page of answer read
        as sections rather than as one wall;
      · a numbered sub-part of a multi-part question (`(i) जब बिन्दु …`).
    """
    return '<div class="subhead"><b>%s</b></div>' % inline(text)


# How long a line may be and still be a heading rather than a sentence.
# Measured on the reference: its `.subhead` stems have a median length of
# 25 characters and a maximum of 43, while the stems it sets as bold body
# text have a median of 108. 46 sits clear of both.
SUBHEAD_MAX = 46


def is_subhead_text(text):
    """Is this short enough, and plain enough, to be a heading?"""
    t = (text or "").strip()
    if not t or len(t) > SUBHEAD_MAX:
        return False
    # A heading does not end a sentence, and does not contain one.
    return not _re.search(r'[।?!]', t[:-1]) and not t.endswith((".", "।"))


def question_text(text, marks=""):
    m = (" " + qmarks(marks)) if marks else ""
    return '<p class="q">%s%s</p>' % (inline(text), m)


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
    # `उत्तर:` chip, a gap where an answer should be, and the drawing
    # further down: it read as a missing answer. Dropped when there is
    # nothing in it, the chip sits directly above the block that answers.
    if not body.strip():
        # A BARE `**उत्तर:**` OPENS A LONG ANSWER — IT IS A HEADING.
        #
        # The green chip is an INLINE label: it works because the answer's
        # first line sits beside it. With nothing beside it the chip sat
        # alone on a row of its own, reading as an answer that had gone
        # missing. The reference sets exactly this case as a `.subhead` —
        # blue, 20px, bold, on its own line — which is what a multi-section
        # answer wants above it anyway. Five of its nineteen `.subhead`s
        # are this.
        return subhead("उत्तर:")
    return ('<div class="ansrow">'
            '<span class="anslabel"><i></i><b>उत्तर:</b></span>'
            '<div class="anstext">%s</div></div>' % body)


def given(text):
    return ('<div class="given"><span class="givenlabel">दिया है :</span> %s</div>'
            % inline(text))


def qsep():
    return '<div class="qsep"></div>'
