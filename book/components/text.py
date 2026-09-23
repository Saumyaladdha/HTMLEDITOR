# -*- coding: utf-8 -*-
"""
Body text — paragraphs, bullets, definitions.

Bullet dots take the SECTION's accent through the `--acc` custom property,
which is what keeps a page reading as one system.
"""
import re as _re

from ..design import tokens as theme
from ..format.inline import inline, plain
from .inline import accent


def para(text, cls="para"):
    """Prose. `cls` is CONTEXT, not style: the reference sets prose inside a
    question as `.q` (18.5px) and prose in Part 1 as `.para` (18px). 516 of
    its paragraphs are `.q` — rendering them all as `.para` is most of why
    Part 2 read at the wrong size."""
    return '<p class="%s">%s</p>' % (cls, inline(text))


def work(text):
    """A working line — Georgia italic, for derivation steps."""
    return '<p class="work">%s</p>' % inline(text, math=True)


def bullets(items, acc=None):
    ink = accent(acc)[1] if acc is not None else "#2fa356"
    lis = "".join('<li><span>%s</span></li>' % inline(t) for t in items)
    return '<ul class="bl" style="--acc:%s;">%s</ul>' % (ink, lis)


def numbered(items, cls=None, start=1):
    """An ordered list. `start` continues the count on a split continuation.

    Without it a numbered list could not be divided at all: the second half
    would begin again at 1 and the page would show "1. 2. 3." twice, which
    is worse than the hole the split was trying to fill. With it the tail
    carries on from where the head stopped, so `layout/split` can treat a
    numbered list exactly like a bulleted one.
    """
    attr = '' if start <= 1 else ' start="%d"' % start
    return ('<ol class="nl"%s>%s</ol>'
            % (attr, "".join('<li>%s</li>' % inline(t) for t in items)))


def definition(term, text, acc=None):
    """A lead-in line plus the definition body, with its left rule."""
    return ('<div class="deflead"><b class="dl">%s:</b></div>'
            '<div class="def">%s</div>' % (inline(term), inline(text)))


# One fact inside a `**त्रिक:**` strip: `मात्रक: फैरड (F)`. The label runs
# to the FIRST colon and is never maths, so a `:` inside the value — a
# ratio, a range — cannot be mistaken for a second label.
_FACT_RE = _re.compile(r'^\s*([^:：$`]{1,24})\s*[:：]\s*(\S.*)$', _re.S)

# What separates one fact from the next. `·` is this book's own multi-item
# separator (`9 सवाल आए · 1 व 2 अंक में`), so the same glyph is read the
# same way here. A `|` is accepted because the pipe-table dialect leaks
# into hand-written strips often enough to be worth tolerating.
_FACT_SPLIT_RE = _re.compile(r'\s+[·|]\s+')


def trio(text):
    """The compact unit/dimension/quantity strip — `**त्रिक:**`.

    ONE `.fact-item` PER FACT, not one run-on line. The reference sets
    each fact as its own block with the label in green
    (`.trio .fact-label`), so `मात्रक: … · विमीय सूत्र: … · राशि का
    प्रकार: …` reads as three labelled rows rather than a single
    sentence with colons in it. Split on this book's own `·` separator;
    a part with no `label:` head is passed through as plain text, which
    is what keeps a one-fact strip (and every older chapter's free-form
    `त्रिक` line) rendering exactly as it always did.

    The leading `त्रिक:` the reader prepends is dropped — it names the
    construct, and the reference never prints it.
    """
    body = (text or "").strip()
    m = _FACT_RE.match(body)
    if m and m.group(1).strip() == "त्रिक":
        body = m.group(2).strip()

    parts = [p for p in _FACT_SPLIT_RE.split(body) if p.strip()]
    facts = []
    for p in parts:
        fm = _FACT_RE.match(p)
        if fm:
            facts.append('<span class="fact-item">'
                         '<b class="fact-label">%s:</b> %s</span>'
                         % (inline(fm.group(1).strip()),
                            inline(fm.group(2).strip())))
        else:
            facts.append('<span class="fact-item">%s</span>' % inline(p.strip()))
    if not facts:
        return '<div class="trio">%s</div>' % inline(text)
    # `data-fact-labels` records that this strip parsed into labelled
    # facts — the reference carries it, and it lets the QA pass tell a
    # real strip from a free-form one without re-parsing the text.
    labelled = ' data-fact-labels="1"' if any(
        _FACT_RE.match(p) for p in parts) else ""
    return '<div class="trio"%s>%s</div>' % (labelled, "\n".join(facts))


def note(text):
    return '<div class="note">%s</div>' % inline(text)


def rule():
    return '<div class="rule"></div>'


def sep():
    return '<hr class="sep">'


# ==========================================================================
# PROCESS CHAINS — biology's flowchart
# ==========================================================================

# Above this many stages, or this many characters, a chain is set VERTICALLY.
#
# A horizontal chain reads as a sequence only while it fits on one line. The
# five-stage chain `गुरुबीजाणु मातृ कोशिका → अर्द्धसूत्री विभाजन → 4
# गुरुबीजाणु → 1 क्रियाशील → 3 समसूत्री विभाजन → 8-केन्द्रकीय भ्रूणकोष` wraps
# across two lines in a 449px column, and the arrow that lands at the end of
# the first line points at nothing. Stacked, every arrow points at the stage
# below it.
FLOW_WRAP_STAGES = 4
FLOW_WRAP_CHARS = 62

ARROWS = ("→", "➜", "⟶", "->")


def looks_like_flow(text):
    """Is this a process chain rather than an expression?

    An arrow between two runs of text. Physics writes `v = u + at` in
    backticks and means maths; biology writes stages joined by arrows and
    means a sequence. The arrow is what separates the two, and nothing in the
    physics chapter's 231 backtick runs uses one this way.
    """
    s = (text or "").strip()
    if not s:
        return False
    return any(a in s for a in ARROWS)


def looks_like_relation(text):
    """A WORD EQUATION — a relation stated in nouns rather than symbols.

    Biology's `**संबंध:**` lines are the case:

        `1 नर युग्मक + 2 ध्रुवीय केन्द्रक = त्रिगुणित (3n) प्राथमिक भ्रूणपोष केन्द्रक`

    There is no arrow, so this is not a chain, and `looks_like_flow` says no.
    It went to the maths face instead and came out in italic Georgia — the
    thing the flow component exists to prevent, reached by a different route.

    A relation has a top-level `=` and Devanagari on at least one side of it.
    That last part is what keeps physics out: `v = u + at` has an `=` too, and
    it IS an equation.
    """
    s = (text or "").strip().strip("`").strip()
    if "=" not in s or any(a in s for a in ARROWS):
        return False
    sides = [x.strip() for x in s.split("=")]
    if len(sides) < 2 or not all(sides):
        return False
    return any(_DEVANAGARI.search(x) for x in sides)


_DEVANAGARI = _re_dev = __import__("re").compile(r'[\u0900-\u097F]{2}')


def flow_stages(text):
    """The stages of a chain, in order, arrows removed.

    Falls back to splitting on `=` for a relation with no arrows, so a word
    equation reads as its two sides rather than as one long chip.
    """
    s = (text or "").strip().strip("`").strip()
    if not any(a in s for a in ARROWS) and "=" in s:
        return [p.strip() for p in s.split("=") if p.strip()]
    for a in ARROWS[1:]:
        s = s.replace(a, ARROWS[0])
    return [p.strip() for p in s.split(ARROWS[0]) if p.strip()]


def flow_connector(text, down):
    """The symbol drawn between stages."""
    s = (text or "").strip().strip("`").strip()
    if not any(a in s for a in ARROWS) and "=" in s:
        return "="
    return "↓" if down else "→"


def flow(text, title=""):
    """A chain of stages, set UPRIGHT with arrows between them.

    Never the maths face. `बीजाणुजन ऊतक` is a Hindi noun naming a tissue, not
    a variable, and setting it in italic Georgia — which is what the backtick
    path did — made a biological process look like an equation. Fourteen of
    the first biology build's twenty-nine inline-maths runs were prose of
    this kind.

    Each stage is `inline()`d so a ploidy or a count inside it still gets its
    proper treatment: `8-केन्द्रकीय` keeps its digit upright, and `(3n)` is
    not torn into `(3` and `n`.
    """
    stages = flow_stages(text)
    if not stages:
        return ""
    plain_len = sum(len(s) for s in stages)
    down = len(stages) > FLOW_WRAP_STAGES or plain_len > FLOW_WRAP_CHARS
    out = ['<div class="flow%s">' % (" flow-down" if down else "")]
    if title:
        # The chip is an inner span, not the row itself. `.ft` is a flex
        # item with flex-basis:100% — that is what puts the label on its own
        # line — so styling it directly stretched the chip into a bar right
        # across the panel.
        out.append('<div class="ft"><span>%s</span></div>' % inline(title))

    if down:
        # A NUMBERED TIMELINE, not a stack of chips with arrows between them.
        #
        # Stacked chips separated by a bare ↓ read as a list that happens to
        # have arrows in it. A sequence wants two things a list does not: a
        # position for each stage, so a student can say "the third step", and
        # ONE continuous line down the whole thing, so it reads as a single
        # process rather than as five separate boxes.
        #
        # The number is generated, not authored. The markdown writes the
        # stages and nothing else, so a stage inserted or removed renumbers
        # the rest for free — the failure mode of hand-written step numbers
        # is that they stop matching after the first edit.
        #
        # A relation (`A = B`) keeps its connector instead: numbering the two
        # sides of an equation would say they happen in order, which is not
        # what an `=` means.
        conn = flow_connector(text, True)
        if conn == "=":
            for i, st in enumerate(stages):
                if i:
                    out.append('<span class="ar">=</span>')
                out.append('<span class="st">%s</span>' % inline(st))
        else:
            for i, st in enumerate(stages):
                out.append('<div class="fstep">'
                           '<span class="no">%02d</span>'
                           '<span class="st">%s</span></div>'
                           % (i + 1, inline(st)))
    else:
        for i, st in enumerate(stages):
            if i:
                out.append('<span class="ar">%s</span>' % flow_connector(text, False))
            out.append('<span class="st">%s</span>' % inline(st))
    out.append('</div>')
    return "".join(out)


def matrix_art(rows):
    """Side-by-side matrices from multi-line ASCII art.

    Cells go through `inline` so a value like `-2` or `3a` is set the same
    way it would be inside a LaTeX matrix; the two notations must not look
    different on the page just because they were written differently.
    """
    from ..format import matrix as _mx
    return _mx.ascii_block(list(rows), render=lambda c: inline(c, math=True))
