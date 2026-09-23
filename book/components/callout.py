# -*- coding: utf-8 -*-
"""
Callouts and margin notes.

TWO SHAPES, and the difference matters:

  `pointer` (.po)          a one-line advice strip inside the flow
  `sticky`  (.callout)     a titled card; in A4 it gets `.sticky`, a pin and
                           a slight rotation, and floats in `.stickycol`

`pointer` takes its icon and colour from the TYPE, never from the markdown.
The source writes one family with several different glyphs, and a page of a
dozen callouts has to read as one system rather than an emoji drawer.

The finalised edition widened the family from 8 to 16. The extra variants
are real distinctions the book makes (a calculation slip is not a board
trap), so they get their own colours rather than being folded together.
"""
import re as _re

from ..design import tokens as theme
from ..format.inline import inline, plain
from .inline import stars, starnote

# type -> (css class, icon). Anything unknown lands on `line`, which is the
# neutral "one-line takeaway" box.
PO = {
    "mark":  ("po-mark",  "🎯"),
    "calc":  ("po-calc",  "🧮"),
    "trap":  ("po-trap",  "⚠️"),
    "warn":  ("po-warn",  "⚠️"),
    "turn":  ("po-turn",  "🔄"),
    "opt":   ("po-opt",   "🔍"),
    "write": ("po-write", "✍️"),
    "key":   ("po-key",   "🗝️"),
    "num":   ("po-num",   "📝"),
    "save":  ("po-save",  "🛟"),
    "step":  ("po-step",  "🪜"),
    "ratt":  ("po-ratt",  "⭐"),
    "line":  ("po-line",  "🧠"),
    "link":  ("po-link",  "🔗"),
    "rep":   ("po-rep",   "🔁"),
    "conf":  ("po-conf",  "💪"),
    "tip":   ("po-tip",   "💡"),
    "fig":   ("po-fig",   "✏️"),
    "sim":   ("po-sim",   "↔"),
    "concl": ("po-concl", "✅"),
}


# Part 1 uses a FLAT callout: a <p>, no border, the label on a coloured
# rounded chip. Part 2 uses the bordered box. Only two flat skins exist.
FLAT = {"trap": "pf-warn", "warn": "pf-warn", "tip": "pf-tip", "save": "pf-tip"}


def _label_stem(label):
    """The label without the sentence-ender it may already carry.

    Both callers append their own `:` after the label. A chapter that
    writes the label as a finished sentence — `✅ **2026 पूरा — 24 अंक
    cover.**` — then printed "cover.:", a full stop and a colon together,
    on every year banner of the maths chapter. `render_cover` already
    strips the same characters for the same reason; this is that rule
    where the other two callers live.
    """
    from ..core.ir import canonical_label
    return (canonical_label(label) or "").rstrip("।.!?\u3002 ").strip()


def pointer_flat(ctype, label, text, icon=""):
    """`<p class="poflat pf-warn"><span class="ic">⚠️</span><b class="t">…"""
    from ..core.ir import canonical_label
    skin = FLAT.get(ctype, "pf-warn")
    _cls, ic = PO.get(ctype, PO["line"])
    lab = '<b class="t">%s:</b> ' % inline(_label_stem(label)) if label else ""
    return ('<p class="poflat %s"><span class="ic">%s</span>%s%s</p>'
            % (skin, ic, lab, inline(text)))


def pointer(ctype, label, text, icon=""):
    from ..core.ir import canonical_label
    cls, ic = PO.get(ctype, PO["line"])
    lab = '<b class="t">%s:</b> ' % inline(_label_stem(label)) if label else ""
    return ('<div class="po %s"><span class="ic">%s</span>'
            '<span>%s%s</span></div>' % (cls, ic, lab, inline(text)))


def simchip(text):
    return pointer("sim", "", text)


def srcnote(text):
    return '<div class="srcnote">%s</div>' % inline(text)


def refbox(text):
    """A quoted note. Blank-line-separated paragraphs stay separate.

    The reader marks a `>` quote's paragraph breaks with a blank line (see
    the `refbox` node it builds); rendered through one `inline` call those
    breaks were whitespace and the cover's reading guide — a heading plus
    the two parts it introduces — printed as a single run-on sentence.
    """
    parts = [p.strip() for p in (text or "").split("\n\n") if p.strip()]
    if len(parts) <= 1:
        return '<div class="note">%s</div>' % inline(text)
    return ('<div class="note">%s</div>'
            % "".join('<div class="note-p">%s</div>' % inline(p)
                      for p in parts))


def fullnote(n_stars, text):
    st = (stars(n_stars) + " ") if n_stars else ""
    return '<div>%s%s</div>' % (st, starnote(text))


# A DERIVATION CARD IS READ DOWN, NOT GLANCED AT.
#
# Every other sticky note is a short aside — a few rows, set inline, tilted
# a degree or two so it reads as pinned to the page. A `निगमन के चरण` card
# is not that: it is the numbered steps of a derivation, several lines each,
# and the shared `.callout.sticky` rules set its rows `display:inline` and
# rotate the whole card, so the steps ran together into a paragraph on a
# slant. The reference gives exactly this card its own class, which
# un-rotates it and puts each step back on its own line — see
# `.derivation-note` in `elements/revision-flow/extra.css`.
_DERIVATION_RE = _re.compile(r'निगमन|व्युत्पत्ति')


def sticky(label, rows, bg=None, pin="red", ink="#c81e1e", rotate=None, icon=""):
    """A titled card. `.sticky` + the pin are added by the A4 stylesheet."""
    cls = "callout sticky"
    if _DERIVATION_RE.search(label or ""):
        cls += " derivation-note"
    out = ['<div class="%s" style="border-color:%s;background:%s;">'
           % (cls, ink, bg or "#fdf3b4")]
    out.append('<span class="pin %s"></span>' % pin)
    out.append('<div class="ch" style="color:%s;">%s %s</div>'
               % (ink, icon or "📌", inline(label)))
    for r in rows:
        mk = r.get("mark") or ""
        out.append('<div class="ci"><span class="b" style="color:%s;">%s</span>'
                   '<span>%s</span></div>' % (ink, mk, inline(r.get("text", ""))))
    out.append('</div>')
    return "".join(out)


def callout_block(label, rows, ink="#2b3a8f", bg="#eef1fb", icon="📌"):
    """The same card, in the flow rather than floated."""
    out = ['<div class="callout" style="border-color:%s;background:%s;">' % (ink, bg)]
    out.append('<div class="ch" style="color:%s;">%s %s</div>' % (ink, icon, inline(label)))
    for r in rows:
        mk = r.get("mark") or ""
        out.append('<div class="ci"><span class="b" style="color:%s;">%s</span>'
                   '<span>%s</span></div>' % (ink, mk, inline(r.get("text", ""))))
    out.append('</div>')
    return "".join(out)
