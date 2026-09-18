# -*- coding: utf-8 -*-
"""
ANSWER — give a solution its STRUCTURE: one step per line.

What makes a worked answer readable is not the face it is set in, it is that
each step stands on its own line, in order, with the prose that explains it
kept separate. The reference does exactly that; ours ran the steps together
inside paragraphs, so a numerical answer arrived as a wall of sentences with
the arithmetic buried in them:

    परिपथ का कुल प्रतिरोध = r + 2 + 2 = 1 + 2 + 2 = 5 Ω  I = ε/(R + r) = 10/5
    = 2 ऐम्पियर  बैटरी की टर्मिनल वोल्टता, V = ε − I r = 10 − 2 × 1 = 8 वोल्ट

Each of those is one step and belongs on one line:

    परिपथ का कुल प्रतिरोध = r + 2 + 2 = 5 Ω
    I = ε/(R + r) = 10/5 = 2 ऐम्पियर
    V = ε − I r = 10 − 2 × 1 = 8 वोल्ट

`$$…$$` already marks a step explicitly (see display.py). This module finds
the ones the source never marked — the plain calculation lines — so they get
the same treatment.

The test is about SHAPE, not vocabulary, so it carries no physics in it. A
biology answer's `कुल गुणसूत्र = 23 × 2 = 46` is the same shape as
`कुल प्रतिरोध = 5 Ω` and is laid out the same way, while a sentence that
merely mentions a number stays prose.
"""
import re

# Devanagari is what the prose is written in; everything else — Latin, Greek,
# digits, operators, units — is what a calculation is made of.
_DEVA = re.compile(r'[ऀ-ॿ]')
# `*` IS FORMATTING, NOT PROSE — a step's final result is very often
# bold-wrapped (`108 ÷ 4 = **27**`), and without `*` in this class the two
# markdown asterisks around a one- or two-digit answer were enough on their
# own to push a genuine step below MIN_MATH_RATIO: `" **27**"` is 7
# characters, only "2", "7" and the leading space matched, and 3/7 ≈ 0.43
# failed the 0.72 threshold — a step that is unambiguously a calculation by
# every other measure was classified as prose purely because of its own
# emphasis markup. The module's own rule is that this test is about SHAPE,
# not vocabulary; bold markup is shape-neutral punctuation the same way `(`
# and `.` already are, not a word.
_MATHISH = re.compile(r'[0-9A-Za-zͰ-Ͽ+\-−=×·÷/^_().,:\s²³⁻¹⁰Ωμ°*]')

# A step is short. A long paragraph that happens to contain an equation is
# prose, and breaking it onto its own line would strand it mid-sentence.
MAX_STEP_CHARS = 150

# How much of the line after the first `=` must be maths rather than words.
MIN_MATH_RATIO = 0.72

# A step's label is a name — "कुल प्रतिरोध", "बैटरी की टर्मिनल वोल्टता". Past
# this it is a clause, and the line is a sentence that ends in a formula.
MAX_LABEL_DEVA = 34

# A LETTERED OR ROMAN-NUMERAL PART LABEL MID-TEXT STARTS A NEW LINE.
#
# A multi-part question or answer is written as one run-on sentence with no
# line breaks at all — "आवेश-परत के कारण क्षेत्र E=σ/2ε₀। (a),(b) प्लेटों के
# बाह्य बिन्दुओं पर E=E₁-E₂=0। (c) प्लेटों के मध्य E=…=1.92×10⁻¹⁰ N/C" — three
# parts of one answer, crammed into one paragraph with nothing to tell a
# reader where (b)'s working ends and (c)'s begins. `\n+` splitting alone
# cannot find this boundary: the source never wrote one. The label itself
# IS the boundary a marker would grade on, the same reasoning `[N]` marks
# tags already get in `_split_on_marks` — this is that same break, spelled
# `(a)` instead of `[1]`.
#
# Only fires MID-text (`(?<=\S)`, something non-space before it) — a label
# that opens the paragraph already starts its own line and needs no split.
# `(a),(b)` — two labels sharing one answer, no space between them — stays
# together on purpose: splitting there would strand "(b)" alone with
# nothing of its own to say.
#
# NOT followed by a bare `)` — a maths chapter cites an MCQ option as
# `☞ पूरा हल 2025 · प्र. 1 में देखें। *(उत्तर : (c))*`, where "(c)" is the
# OPTION LETTER, not a part of the answer, sitting inside an OUTER pair of
# parens that closes right after it. That matched the same shape as a real
# part label (a space before it, a single letter in its own parens) and
# split the sentence in two — right through the middle of the `*…*`
# emphasis span wrapping it, so neither half had a matching pair and both
# asterisks printed literally on the page. A genuine part label is always
# followed by that part's own content — a space or a comma before the next
# label — never by the paragraph's own closing paren with nothing after it.
#
# NOT preceded by a NUMBERED item marker (`(?<!\d\.)`) either — a matching
# question's answer key reads `1. (d), 2. (c), 3. (b), 4. (a).`, four
# single-letter labels that are MATCH VALUES for the numbered items before
# them, not four parts of an answer with their own content. Every label
# here sits right after "N. ", so it matched the same shape once more and
# split one five-word answer into four stray fragments — "1.", "(d), 2.",
# "(c), 3.", "(b), 4. (a)." — each printed on its own line. A genuine part
# label is never immediately preceded by its own numbered list marker.
_PART_LABEL_RE = re.compile(
    r'(?<=\S)(?<!\d\.)\s+(?=\((?:[a-e]|[ivx]{1,4})\)(?=[\s,]))')

# A CITATION CHAIN IS NOT A PART LABEL — `समीकरण (i) और (ii) से`.
#
# Physics writes "from equations (i) and (ii)" constantly: two roman labels
# joined by a bare conjunction, naming equations it derived earlier. By
# SHAPE that is indistinguishable from two part labels — mid-text, single
# roman numeral, parens, space after — so `_PART_LABEL_RE` split at both,
# and one five-word sentence became three blocks that each mean nothing:
#
#     `समीकरण`   `(i) और`   `(ii) से`
#
# This is the fourth time this regex has matched something that is not a
# part label (see the `(उत्तर : (c))` and `1. (d), 2. (c)` cases above), and
# the previous three were each fixed by bolting another lookaround onto the
# pattern. That does not work here: killing the split before `(i)` needs a
# lookAHEAD past the conjunction, and killing the one before `(ii)` needs a
# lookBEHIND over a label whose width varies (`(i)` vs `(iii)`), which
# `re` cannot express.
#
# So the chain is MASKED to one opaque token before the split and restored
# after — the same technique FORMAT_SPEC §8.6 prescribes for a `$…$` cell
# inside a semicolon matrix, and for the same reason: a span that must not
# be cut is removed from the splitter's view rather than described to it.
#
# `markdown.py`'s `_RE_MARKER_CHAIN` already encodes this exact rule at the
# LINE level, with the same four conjunctions — a line that OPENS with such
# a chain is a citation, not an options list. This is that rule mid-text.
_CITE_CHAIN_RE = re.compile(
    r'\((?:[a-e]|[ivx]{1,4})\)\s*(?:तथा|और|एवं|व|&)\s*'
    r'\((?:[a-e]|[ivx]{1,4})\)')

# U+E042 is unused elsewhere; inline.py holds E011/E020/E021/E031/E040/E041/
# E043 and latex_check.py E013, so this cannot collide with a live sentinel.
_CITE_OPEN, _CITE_CLOSE = u"\ue042", u"\ue044"


def _mask_citations(text):
    """-> (masked, spans). A citation chain becomes one uncuttable token."""
    spans = []

    def sub(m):
        spans.append(m.group(0))
        return u"%s%d%s" % (_CITE_OPEN, len(spans) - 1, _CITE_CLOSE)
    return _CITE_CHAIN_RE.sub(sub, text or ""), spans


def _unmask_citations(text, spans):
    for i, raw in enumerate(spans):
        text = text.replace(u"%s%d%s" % (_CITE_OPEN, i, _CITE_CLOSE), raw)
    return text


def _math_ratio(s):
    if not s:
        return 0.0
    return sum(1 for ch in s if _MATHISH.match(ch)) / float(len(s))


def is_step(text):
    """True if this line is one calculation step, and so wants its own line."""
    t = (text or "").strip()
    if not t or len(t) > MAX_STEP_CHARS or "=" not in t:
        return False
    lhs, rhs = t.split("=", 1)
    if _math_ratio(rhs) < MIN_MATH_RATIO:
        return False
    return len(_DEVA.findall(lhs)) <= MAX_LABEL_DEVA


def split_steps(text):
    """-> [(kind, line)] with kind "step" or "prose".

    A paragraph can hold several steps in a row, or a sentence and then a
    step. Splitting on line breaks first keeps the author's own grouping,
    which is almost always one step per source line — then each of THOSE is
    split again on any mid-text part label, for the paragraph that groups
    several parts onto one source line instead.
    """
    # A BOLD WRAPPER BELONGS TO EVERY PART, NOT JUST THE FIRST.
    #
    # A multi-part question is written as ONE bold run — `**(i) … (ii) …
    # (iii) …**` — and splitting it at the part labels left the opening
    # `**` stranded on part (i) and no marker at all on (ii) and (iii).
    # `format/inline` closes an unpaired `**` rather than printing it, so
    # part (i) came out fully bold and the other two came out plain: three
    # parts of one question, set in two different weights. Unwrap before
    # splitting and re-wrap each piece, so the author's emphasis reaches
    # all of them.
    t = (text or "").strip()
    inner = t[2:-2] if (len(t) > 4 and t.startswith("**") and t.endswith("**")) else None
    bold_all = inner is not None and inner.count("**") % 2 == 0
    if bold_all:
        text = inner

    masked, spans = _mask_citations(text)
    out = []
    for line in re.split(r'\n+', masked):
        for chunk in _PART_LABEL_RE.split(line):
            piece = _unmask_citations(chunk, spans).strip()
            if not piece:
                continue
            if bold_all:
                piece = "**%s**" % piece
            out.append(("step" if is_step(piece) else "prose", piece))
    return out or [("prose", (text or "").strip())]


def has_step(text):
    return any(k == "step" for k, _ in split_steps(text))


def has_part_label(text):
    """True if a lettered/roman part label sits MID-text — see
    `_PART_LABEL_RE`. Routes a run-on multi-part question or answer through
    `split_steps` even when it has no calculation step of its own to
    trigger that on (a question stem, say, with no `=` in it at all).

    Masked exactly as `split_steps` masks, or the two disagree: this would
    report True for `समीकरण (i) और (ii) से`, routing the paragraph into a
    split that then correctly refuses to cut it — reporting a multi-part
    answer where there is one sentence."""
    masked, _ = _mask_citations(text)
    return bool(_PART_LABEL_RE.search(masked))
