# -*- coding: utf-8 -*-
"""
RENDERER — IR -> Vidyut Aavesh HTML.

Dispatch on `kind`, one function per kind. The renderer never reads the
markdown and never guesses at content; the parser has already decided
what everything is.

Output is a list of "flow items", each a dict:

    {"html": "<div …>", "atomic": bool, "owner": "q17"}

`atomic` marks a block the paginator must not split. `owner` groups the
sub-blocks of one question so the packer can keep a question head with at
least its first body block. Everything else may break across a column or
page — which the reference book does constantly.
"""
import re

# Below this, numbering is noise: two equations need no spine, and a lone
# `①` beside a single formula pretends to structure that is not there.
MIN_NUMBERED_STEPS = 3

from .. import components as C
from .. import subjects as _subjects                                   # noqa: E402
from ..core import stats as _stats                               # noqa: E402
from ..design import tokens as theme                            # noqa: E402
from ..format.display import split_eqno as _split_eqno
from ..format import inline as _inline                          # noqa: E402
from ..format.inline import inline, plain                        # noqa: E402


_DEVA = re.compile(r'[\u0900-\u097f]')



# `— स्रोत: `2021/set_a` #46 · …` — the citation that closes a question.
_SRC_TRAILER_RE = re.compile(r'^\s*[—–-]\s*स्रोत\s*[:：]')

def _is_pure_math(text):
    """A short line with no Devanagari and real notation is a WORKING LINE,
    not prose. The reference sets 56 of them in Georgia italic (`.work`);
    left as prose they render in Kalam at body size and the derivation stops
    looking like a derivation."""
    t = (text or "").strip()
    if not t or len(t) > 90:
        return False
    if _DEVA.search(t):
        return False
    return bool(re.search(r'[=∝≈≤≥≠⇒→∮∑∫√]', t))


def _item(html, atomic=False, owner=None, tag=""):
    return dict(html=html, atomic=bool(atomic), owner=owner, tag=tag)


# ==========================================================================
# SPLITTABLE BLOCKS
#
# `layout.split` breaks one block over a page or column boundary to use the
# dead space in front of it. It needs two things from a block: a payload
# describing the block as a LIST OF ROWS, and a way to rebuild it from a
# subset of those rows.
#
# Only the सूत्र panel ever offered that, and the split pass reported the
# consequence plainly: of 120 usable holes in chapter 19, sixty-eight sat in
# front of a block with no payload. Three of those were bullet lists and six
# were option lists — both literally lists of rows, both atomic purely
# because nothing had told the packer they were divisible.
#
# What is NOT here matters as much. `para` (13 holes) and `answer` (4) are
# prose: dividing them means breaking between LINES, which needs a different
# mechanism than a row subset. `numbered` is excluded because an `<ol>`
# continuation restarts at 1, and a wrong number is worse than a hole.
# ==========================================================================
# The subject profile in force. Set by the assembler from the parsed doc;
# physics by default, which is what every existing chapter was built with.
_PROFILE = _subjects.get("physics")


def set_profile(name):
    """Choose the subject profile for rendering. Called by assemble.html."""
    global _PROFILE
    _PROFILE = _subjects.get(name)
    # Bare-text reaction handling follows the profile, not the caller. A `→`
    # is a reaction in chemistry and a process stage in biology, and only the
    # profile knows which book this is.
    _inline.set_reactions(_PROFILE.get("reactions"))
    return _PROFILE


def split_payload(b):
    """A rows payload for `layout.split`, or None if the block is atomic.

    GATED ON THE PROFILE'S `splittable`. The key existed and was never
    consulted, so adding tables to the splitter would have quietly applied to
    physics's seven tables as well — and physics's 61-page output is tested.
    Biology needs tables split because it has no सूत्र panels at all; physics
    does not, and the two lists are deliberately different.
    """
    k = b["kind"]
    if k not in _PROFILE.get("splittable", ()):
        return None
    if k == "formula_card":
        return {"kind": k, "title": b.get("title", "सूत्र"), "rows": b["rows"]}
    if k == "bullets":
        return {"kind": k, "rows": list(b["items"]), "acc": b.get("accent")}
    if k == "table":
        # A TABLE IS A LIST OF ROWS, which is exactly what the splitter needs.
        #
        # It matters far more in biology than in physics: biology has no सूत्र
        # panels at all, so the pass that took physics's worst hole from
        # 1432px to 436px had nothing to divide, and biology's build carried
        # twenty holes of 300px or more with ten tables sitting among them.
        #
        # The header travels in the payload because a table's continuation
        # MUST repeat it — see rebuild_split.
        return {"kind": k, "head": b.get("head") or [],
                "align": b.get("align", ()), "rows": list(b["rows"])}

    if k == "options":
        # Option markers — `i)`, `ii)` — live in the text of each item, so a
        # slice keeps its own numbering and a continuation needs no `start`.
        # Forced to ONE per line: a two-column grid broken across a boundary
        # leaves an option beside a gap, which reads as a missing choice.
        return {"kind": k, "rows": list(b["items"])}
    return None


def rebuild_split(payload, rows, cont=False):
    """Rebuild a splittable block from a subset of its rows.

    `cont` marks the SECOND half. It suppresses the repeated heading on a
    सूत्र panel — two full headings cost about what the split reclaimed.
    """
    rows = list(rows)
    k = (payload or {}).get("kind", "formula_card")
    if k == "bullets":
        return C.bullets(rows, payload.get("acc"))
    if k == "numbered":
        # The continuation must not start at 1 again. `payload["rows"]` is
        # still the WHOLE list, so the offset is what the head kept.
        start = 1
        if cont:
            whole = (payload or {}).get("rows") or []
            start = max(1, len(whole) - len(rows) + 1)
        return C.numbered(rows, start=start)
    if k == "options":
        return C.options(rows, "one")
    if k == "table":
        # The header IS repeated on the continuation — the opposite of a
        # सूत्र panel, whose repeated heading costs about what the split
        # reclaims. A table without its header row is unreadable.
        return C.table(payload.get("head") or [], rows,
                       payload.get("align", ()))
    return C.fcard(rows, payload.get("title", "सूत्र"), cont)


# ==========================================================================
# LEAF DISPATCH
# ==========================================================================
def render_block(b, ctx):
    """Render one IR block, plus its marks tag if it carries one."""
    out = _render_block(b, ctx)
    # `[1]` is what the step is WORTH. The reader attaches it to the block it
    # follows; `C.qmarks` and `.marksrow` have existed for it from the start
    # and nothing ever emitted them, so 19 of them printed as body text
    # instead — `[2]` alone in a paragraph, `[1] जहाँ, i आयताकार पथ …`
    # opening the next one.
    # A display equation carries its own marks tag inline (see C.eq), so it
    # must not also get a row of its own.
    marks = b.get("marks")
    if marks and not (b["kind"] == "formula" and b.get("display")):
        out.append(_item('<div class="marksrow">%s</div>'
                         % C.qmarks("[%s]" % marks), atomic=True))
    # WHICH IR block this item came from.
    #
    # Purely diagnostic, and it earns its keep: `layout.split` reports the
    # kind of every block it declines to divide, and without this the report
    # read "68 holes sit in front of an untyped block" — true and useless.
    for it in out:
        it.setdefault("kind", b["kind"])
    return out


def _render_block(b, ctx):
    k = b["kind"]
    acc = ctx.get("accent")

    if k == "para" and b.get("subhead"):
        # A named division inside a long answer. Measured on chapter 4, the
        # median answer is 6 blocks and the p90 is 17 — one runs to 38 — all
        # at identical weight, which is what makes a long answer read as a
        # wall. Set as a bold sentence (`**text**`) it was indistinguishable
        # from the emphasis inside the prose around it.
        return [_item('<div class="anssub">%s</div>' % inline(b["text"]),
                      atomic=True, tag="sechead")]

    if k == "para":
        # `.q` inside a question, `.para` in Part 1 — the reference sets them
        # at different sizes and has 516 of the former. A pure-maths line in
        # a derivation becomes `.work` (Georgia italic) instead of prose.
        text = b["text"]
        if _is_pure_math(text):
            # The reference puts EVERY one of its 257 `.dm` and 56 `.work`
            # lines in Part 2 — none in Part 1, where maths lives in सूत्र
            # cards instead. A bare short relation (`σ = 1/ρ`) is a working
            # step, set left-aligned; anything longer is a display equation,
            # set centred.
            if len(text.strip()) <= 26:
                return [_item(C.work(text), atomic=True)]
            return [_item(C.eq(text), atomic=True)]
        # A DERIVATION WEARING PROSE ON BOTH ENDS IS STILL A DERIVATION.
        #
        # `_is_pure_math` above only catches a line with no Devanagari at
        # all — physics chapter 1 instead writes "(c) प्लेटों के मध्य
        # $E=…=…=…=1.92×10⁻¹⁰ N/C$ (धनात्मक से ऋणात्मक प्लेट की ओर)।", a
        # short Hindi label and a short Hindi note wrapped around ONE
        # four-step chain. That failed the "no Devanagari" test and fell
        # all the way to plain prose, so a wall-of-symbols step-splitting
        # was meant to prevent read as one dense sentence. `C.has_chain`
        # is the narrower question — does the ONE `$…$` span in this text
        # actually contain a chain worth aligning — and answers it
        # without touching anything that is genuinely prose.
        if C.has_chain(text):
            return [_item(C.eq(text), atomic=True)]
        # THE `— स्रोत:` TRAILER IS A CITATION, NOT ANOTHER SENTENCE.
        #
        # A trailer naming ONE paper is folded into the question head's chip
        # by the reader; one naming three or four keeps all its codes and
        # stays a line of its own at the foot of the question, because
        # folding a ~150-character chain into the chip produced a box that
        # wrapped two lines above the question text. Left to the branch
        # below it inherited `.q` — the question BODY face, 18.5px — so the
        # citation read as one more sentence of the question. Chapter 2
        # closes 31 of its questions this way; chapter 4 and biology have
        # none, which is why nothing caught it before. Quiet and small says
        # "citation" without a box, since 31 boxes would out-shout the
        # questions they belong to.
        if ctx.get("in_question") and _SRC_TRAILER_RE.match(text or ""):
            return [_item(C.para(text, "srccite"))]
        return [_item(C.para(text, "q" if ctx.get("in_question") else "para"))]
    if k == "work":
        return [_item(C.work(b["text"]), atomic=True)]
    if k == "figure_brief":
        # RENDERS TO NOTHING. It is a note to whoever draws the figure, not
        # content — see _figure_brief in readers/markdown.py. The text stays
        # on the IR block so step11 can choose art from it, and step16 must
        # exclude it from the word count rather than report it as vanished.
        return []

    if k == "structure":
        # A drawn structure, not a line of text — see format/structure.py for
        # why the browser must not be allowed to lay this out.
        return [_item(C.chem_structure(b), atomic=True)]

    if k == "ring":
        # A ring compound, drawn by RDKit from the agent's SMILES — see
        # format/ring.py. Same atomic treatment as `structure`: it is one
        # indivisible picture, never a line the packer may split.
        return [_item(C.chem_ring(b), atomic=True)]

    if k == "rxn_smiles":
        # A reaction, both sides drawn by RDKit — replaces a supplied
        # figure the same way `ring` replaces a bare `\bigcirc`. One
        # `.dm` display line, atomic like every other reaction equation.
        return [_item(C.chem_rxn(b), atomic=True)]

    if k == "matrix_art":
        # Side-by-side grids built from the column positions of the source
        # lines — see format/matrix.ascii_block and the note in the reader.
        return [_item(C.matrix_art(b["rows"]), atomic=True)]

    if k == "flow":
        # A process chain, set upright with arrows between the stages.
        #
        # NOT the maths face. These are Hindi nouns naming the stages of a
        # process, and the backtick path set them in italic Georgia as though
        # they were algebra — fourteen of the first biology build's
        # twenty-nine inline-maths runs were prose of this kind.
        return [_item(C.flow(b["text"], b.get("title", "")), atomic=True)]

    if k == "bullets":
        it = _item(C.bullets(b["items"], acc))
        it["split"] = {"kind": k, "rows": list(b["items"]), "acc": acc}
        return [it]
    if k == "numbered":
        it = _item(C.numbered(b["items"]))
        # A numbered list divides like a bulleted one now that the
        # continuation can carry the count on — see `rebuild_split`.
        it["split"] = {"kind": k, "rows": list(b["items"])}
        return [it]
    if k == "definition":
        return [_item(C.definition(b["term"], b["text"], acc))]
    if k == "trio":
        return [_item(C.trio(b["text"]), atomic=True)]

    if k == "formula":
        # `= MB sinθ [1]` — a marks tag on a SHORT formula. Those render
        # through `C.work`, which has no marks handling, so the tag stayed in
        # the maths as literal text.
        _body, _mk = _inline.strip_trailing_marks(b.get("text", ""))
        if _mk and not b.get("marks"):
            b = dict(b, text=_body, marks=_mk)
        # A SHORT STEP IS STILL A STEP — in maths.
        #
        # A formula under 26 characters inside a question renders inline
        # (`C.work`) rather than as a display line, which is right for physics:
        # `v = u + at` mid-sentence is part of the sentence.
        #
        # It is wrong for a maths derivation, where the steps ARE the answer
        # and most of them are short: `= I`, `= O`, `= I + 3A`. Rendered
        # inline they sat left against the margin while the longer steps above
        # them were centred display lines — so one step in a chain broke
        # alignment for no reason a reader could see.
        if (ctx.get("in_question") and len(b["text"].strip()) <= 26
                and not b.get("eqno")
                and _PROFILE.get("name") != "maths"):
            return [_item(C.work(b["text"]), atomic=True)]
        return [_item(C.eq(b["text"], b.get("eqno", ""),
                           None, b.get("marks", "")), atomic=True)]
    if k == "formula_card":
        # A wide सूत्र panel CLEARS the note column, so it always renders at
        # full width. The packer must size it with the wide height, not the
        # narrow one — see `clears` in layout/pack.
        html = C.fcard(b["rows"], b.get("title", "सूत्र"))
        it = _item(html, atomic=True)
        it["clears"] = "fcard-wide" in html
        # A सूत्र panel is a list, so it may be broken across a page boundary
        # with the header repeated — the reference does this. `layout.split`
        # uses this payload to rebuild the panel from a subset of its rows.
        it["split"] = split_payload(b)
        return [it]
    if k == "formula_box":
        return [_item(C.fbox(b["text"], b.get("colour", "blue"), b.get("tail", "")),
                      atomic=True)]

    if k == "options":
        it = _item(C.options(b["items"], b.get("layout", "grid")))
        it["split"] = split_payload(b)
        return [it]
    if k == "answer":
        return [_item(C.answer(b["text"], b.get("title", "")), atomic=True)]
    if k == "given":
        return [_item(C.given(b["text"]), atomic=True)]
    if k == "athava":
        return [_item(C.athava(b.get("label", "अथवा"), b["text"],
                               b.get("years", "")), atomic=True)]
    if k == "marks_band":
        return [_item(C.marktag(b["label"]), atomic=True)]

    if k == "callout":
        # Flat in Part 1, boxed in Part 2 — and only the two skins the
        # reference defines get the flat treatment; the rest stay boxed.
        if not ctx.get("in_question") and b["ctype"] in C.FLAT:
            return [_item(C.pointer_flat(b["ctype"], b.get("label", ""),
                                         b.get("text", "")), atomic=True)]
        return [_item(C.pointer(b["ctype"], b.get("label", ""), b.get("text", ""),
                                b.get("icon", "")), atomic=True)]
    if k == "simchip":
        return [_item(C.simchip(b["text"]), atomic=True)]
    if k == "srcnote":
        return [_item(C.srcnote(b["text"]), atomic=True)]
    if k == "refbox":
        return [_item(C.refbox(b["text"]), atomic=True)]
    if k == "starbadge":
        return [_item(C.starline(b["text"]), atomic=True)]

    if k == "table":
        return [_item(C.table(b["head"], b["rows"], b.get("align", ())), atomic=True)]

    if k == "figure":
        size = "figure" if b.get("mode") == "ref" else "diagram-md"
        return [_item(C.figure(b.get("num", ""), b.get("caption", ""), b.get("desc", ""),
                               b.get("ref"), size=size,
                               cap_text=b.get("cap_text", "")), atomic=True)]
    if k == "slot":
        return [_item(C.slot(b.get("role", "doodle-md"), b.get("hint", "")), atomic=True)]

    if k in ("rule", "qsep"):
        return [_item(C.qsep(), atomic=True)]
    if k == "card":
        return [_item(C.sticky(b["label"], b["rows"], b.get("bg"), b.get("pin", "red"),
                               b.get("ink", "#c81e1e"), icon=b.get("icon", "")),
                      atomic=True)]
    return [_item(C.para(b.get("text", "")))]


# ==========================================================================
# CONTAINERS
# ==========================================================================
def render_section(sec, ctx):
    """A Part-1 section: heading + blocks, with any cards floated beside it."""
    acc = sec.get("accent", 0)
    sub = dict(ctx)
    sub["accent"] = acc
    out = []
    inner = ['<div class="sec">']
    if sec.get("title"):
        # A `[UP 2025 · 3 अंक]` bracket is an EXAM STAMP (dark red, pinned),
        # not a plain chip. They are the loudest thing on a section head in
        # the reference; rendering them as chips made every section look
        # like it carried footnotes.
        pyq = [p for p in sec.get("pyq", []) if p]
        exams = [p for p in pyq if p.strip().upper().startswith("UP")]
        chips = [p for p in pyq if p not in exams]
        inner.append(C.section_head(sec.get("num", ""), sec["title"], acc,
                                    chips, exams, sec.get("en", ""),
                                    sec.get("flag", "")))

    inner.append("</div>")
    out.append(_item("".join(inner), atomic=True, tag="sechead"))

    for b in sec.get("blocks", []):
        out.extend(render_block(b, sub))

    # A section's sticky notes live in `asides`, and in the single-column
    # layout the caller floats them into a 300px margin column of their own —
    # `render_section` never renders them itself. A two-column layout has NO
    # margin column, so nothing rendered them at all and every one of the
    # chapter's notes silently vanished: "Don't Mix These Up", "Most Asked",
    # "Just Read, Move On" — 24 distinct words that step16 caught as loss.
    #
    # Set inline, closing the section they belong to. A note is 300px and a
    # column is 449px, so it fits without touching the component.
    if ctx.get("inline_asides"):
        for c in sec.get("asides") or []:
            out.append(_item('<div class="stickyinline">%s</div>'
                             % render_card(c, 0), atomic=True))
    return out


def render_question(q, ctx):
    """One `.qb`. Sub-blocks stay separate so the packer may split it —
    the reference book splits questions across columns constantly."""
    acc = q.get("accent", 0)
    sub = dict(ctx)
    sub["accent"] = acc
    sub["in_question"] = True
    owner = "q%s-%s" % (q.get("year") or "x", q.get("num"))

    # No derived step numbering. It was a second system alongside the
    # author's `...(i)`, which the prose cites — see C.eq. The `.dm` hairline
    # and the asymmetric spacing do the grouping instead, without inventing
    # a number the markdown never gave.

    items = [_item(C.qhead(q.get("num"), q.get("raw", ""), acc,
                           q.get("stars", 0), q.get("fullnote", "")),
                   atomic=True, owner=owner, tag="qhead")]
    for b in q.get("blocks", []):
        for it in render_block(b, sub):
            it["owner"] = owner
            items.append(it)
    return items


# A `qgroup` in Part 2 is usually a YEAR ("2026") or a named bank
# ("महत्वपूर्ण प्रश्न") — genuinely chapter-level breaks, and `year_head`'s
# oversized banner is right for both. Economics repeats a Part-1 TOPIC
# NUMBER as a divider between clusters of its own practice-question bank
# — `### 1.8. आर्थिक क्रियाकलापों का आयोजन` — to tag which topic the
# following few questions belong to. `_h3_group_boundary` is right to
# treat it as its own group (it is one, with real questions as children),
# but rendering it with the SAME banner a whole year gets made a one-line
# in-list topic tag read as loud as "2026" itself. `RE_SECTION_NUM`
# already recognises this exact "N.M" shape for the Part-1 sections that
# use it — a `qgroup` label matching it gets that section's own compact
# numbered-circle heading instead, the size an in-list topic tag should be.
#
# A ONE-LEVEL TOPIC NUMBER IS THE SAME SHAPE. A maths chapter's Part 1
# writes `### 1. संख्याओं की नींव: गुणनखंडन, घातांक व परिमेय-अपरिमेय की
# पहचान  ·  **[2 बार · 2, 1 अंक]**` — a single digit, not "N.M" — for the
# same purpose: five short-lived topic dividers, not a year. Unmatched by
# the two-level-only pattern, they fell to `year_head`'s 39px banner
# meant for a bare "2024", and an 80-character title wrapped across four
# lines inside it. The one-level number REQUIRES its trailing period
# (unlike the two-level branch, which makes it optional) — "1 संख्याओं"
# with no punctuation at all is too easily a sentence that happens to
# start with a digit, where "1.8" already carries enough of its own shape
# to tell a topic number from prose.
_RE_QGROUP_TOPIC = re.compile(r'^(?:(\d+\.\d+)\.?|(\d+)\.)\s+(\S.*)$')


def render_qgroup(g, ctx):
    out = []
    if g.get("label"):
        topic = _RE_QGROUP_TOPIC.match(g["label"])
        if topic:
            out.append(_item(C.section_head(topic.group(1) or topic.group(2),
                                            topic.group(3)),
                             atomic=True, tag="sechead"))
        else:
            out.append(_item(C.year_head(g["label"]), atomic=True, tag="groupband"))
    if g.get("summary"):
        out.append(_item('<div>%s</div>' % C.marktag(g["summary"]), atomic=True))
    first = True
    for ch in g.get("children", []):
        if ch["kind"] == "question":
            if not first:
                out.append(_item(C.qsep(), atomic=True, tag="qsep"))
            first = False
            out.extend(render_question(ch, ctx))
        else:
            out.extend(render_block(ch, ctx))
    if g.get("banner"):
        out.append(_item(C.year_banner(g["banner"]), atomic=True, tag="banner"))
        # The banner's own trailing paragraph — see the RE_BANNER branch in
        # readers/markdown.py. A note about where an off-year question went,
        # so it belongs under the strip that closes the year, not inside it.
        if (g.get("note") or "").strip():
            out.append(_item(C.refbox(g["note"]), atomic=True, tag="banner_note"))
    return out


def render_part(part, ctx):
    out = []
    # Each note goes back beside the section it was written next to. Emitted
    # as one block at the end of the part — which is what "no margin column"
    # first led to — five of them stacked up together and the sections they
    # explained had nothing beside them.
    inline_asides = ctx.get("inline_asides")
    by_home = {}
    if inline_asides:
        for c in part.get("asides") or []:
            by_home.setdefault(c.get("_home", -1), []).append(c)

    def _notes(i):
        for c in by_home.pop(i, []):
            out.append(_item('<div class="stickyinline">%s</div>'
                             % render_card(c, 0), atomic=True))

    _notes(-1)                      # loose between sections, before the first
    for idx, ch in enumerate(part.get("children", [])):
        k = ch["kind"]
        if k == "section":
            out.extend(render_section(ch, ctx))
        elif k == "qgroup":
            out.extend(render_qgroup(ch, ctx))
        elif k == "question":
            out.extend(render_question(ch, ctx))
        else:
            out.extend(render_block(ch, ctx))
        _notes(idx)
    # Anything whose home index no longer exists still has to appear.
    for rest in list(by_home):
        _notes(rest)
    return out


# ==========================================================================
# ASIDES — Part-1 sticky notes, floated beside the flow
# ==========================================================================
def collect_asides(part):
    return list(part.get("asides") or [])


def render_card(c, rotate=1.6):
    return C.sticky(c["label"], c["rows"], c["bg"], c["pin"], c["ink"],
                    rotate=rotate, icon=c.get("icon", ""))


ASIDE_W = 300          # the float column (.stickycol)
ASIDE_GUTTER = 26      # its left margin
ASIDE_GAP = 22         # between two notes


def aside_column(cards_html, width=ASIDE_W):
    """`.stickycol` owns its float, width and stacking gap in CSS, so the
    markup carries no inline geometry — restyling the note column is a
    stylesheet edit, not a renderer edit."""
    if not cards_html:
        return ""
    return '<div class="stickycol" data-aside="1">%s</div>' % "".join(cards_html)


# ==========================================================================
# DOCUMENT SHELL
# ==========================================================================
def document(title, body_html, mode="a4", chrome=False, font_css=None):
    from ..design import fonts
    # THE SUBJECT TRAVELS ON THE BODY.
    #
    # One stylesheet serves all three subjects, so a rule written for maths
    # would otherwise reach physics and biology too. Maths wants its
    # derivations CENTRED — a chain of `= [matrix]` steps reads down the page
    # that way, which is what the reference does — and physics does not: its
    # display equations sit against a rule and its pagination is tested with
    # them there.
    #
    # A class on <body> lets each subject have its own presentation without
    # forking the stylesheet or the elements.
    classes = ["subj-" + (_PROFILE.get("name") or "physics")]
    if chrome:
        classes.append("chrome-on")
    cls = ' class="%s"' % " ".join(classes)
    head = "<style>%s</style>" % (font_css if font_css is not None else fonts.css())
    return (
        '<!DOCTYPE html>\n<html lang="hi">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<title>%s</title>\n%s\n<style>%s</style>\n</head>\n<body%s>\n%s\n</body></html>\n'
        % (plain(title), head, theme.stylesheet(mode), cls, body_html))


# ==========================================================================
# COVER — page 1, assembled from the chapter's own front matter
# ==========================================================================
def _table_leads(sec):
    """`{id(table): its own lead paragraph}` for a section's tables.

    A SECTION'S HEADING PARAGRAPHS BELONG TO THE TABLES THEY HEAD.

    The chapter's `अनुक्रमणिका` is written as four blocks — `**भाग 1 —
    त्वरित रिवीज़न**`, the topic table, `**भाग 2 — प्रश्न व उत्तर**`, the
    per-year table. `_prose_of` reads a section's prose as ONE string, so
    both headings were concatenated into the first card's lead line and
    printed as `भाग 1 — त्वरित रिवीज़न भाग 2 — प्रश्न व उत्तर`: two
    different section names run together as though they were one. The
    second card, its own heading already spent, fell back to titling
    itself from its column heads.

    Walked in order, a paragraph directly above a table is that table's
    heading. Anything else stays with the section, which is what
    `_prose_of` keeps returning for the card's lead.
    """
    leads, pending = {}, []
    for b in sec.get("blocks", []):
        k = b.get("kind")
        if k == "table":
            if pending:
                leads[id(b)] = pending[-1]
            pending = []
        elif k in ("para", "subtitle") and (b.get("text") or "").strip():
            pending.append((b.get("text") or "").strip())
        else:
            pending = []
    return leads


def _lead_text(t, leads, fallback=""):
    """A table's own heading, stripped of the `**` a heading is written in."""
    txt = leads.get(id(t), "")
    return txt.strip().strip("*").strip() if txt else fallback


def _tables_of(sec):
    """EVERY table in the section, in order.

    One card per TABLE, not per section. The maths chapter's `अनुक्रमणिका`
    holds two — the topic list and a 14-row per-year count — and two earlier
    attempts both went wrong:

      - returning only the first dropped the second entirely, so a whole
        table was missing from the chapter's front page. It barely showed in
        the integrity check, because a table of years and counts is almost
        all digits and those are treated as notation rather than prose; the
        single word it caught was that table's heading, `खण्ड`.
      - merging them into one card made a 31-row card that cannot share a
        sheet, so the cover spilled from two pages to four and its first
        page came out holding nothing but the chapter title.

    A card per table keeps every card the size the design expects and lets
    the column balancer do its job.
    """
    return [b for b in sec.get("blocks", []) if b["kind"] == "table"]


def _rows_of(sec):
    """The FIRST table's head and rows — for the card that carries the
    section's own title and lead line."""
    ts = _tables_of(sec)
    if not ts:
        return [], []
    return ts[0].get("head", []) or [], ts[0].get("rows", []) or []


def _prose_of(sec):
    """The section's running text, for a cover card's lead line.

    Lists count. `🚩 कहाँ से शुरू करें` states its advice as a numbered list
    with no table at all, so a paragraphs-only reading left that card with
    nothing to print and three lines of the chapter never reached a page.
    """
    out = []
    for b in sec.get("blocks", []):
        if b["kind"] == "definition":
            # THE TERM COUNTS TOO.
            #
            # A definition is `term` + `text`, and only the text was read —
            # so `**सबसे चौंकाने वाली सच्ची बात:** 53 में से …` lost its
            # opening clause on the cover. Three words vanished from the
            # chapter with no error, because the lead-in of a cover card is
            # exactly where an author puts the sentence they most want read.
            term = (b.get("term") or "").strip()
            body = (b.get("text") or "").strip()
            out.append(("**%s:** %s" % (term, body)).strip() if term else body)
        elif b["kind"] == "para":
            out.append(b.get("text") or "")
        elif b["kind"] == "numbered":
            out.extend(str(x) for x in (b.get("items") or []))
        elif b["kind"] == "bullets":
            # A BULLET LIST NEEDS A SEPARATOR OF ITS OWN.
            #
            # Each item used to be its own `out` entry, space-joined with
            # everything else at the end — fine for a handful of numbered
            # instructions read as a sequence, but a `📑 अनुक्रमणिका` card
            # listing twelve section names has no punctuation of its own
            # between them, and Hindi carries no capital letter to mark
            # where one ends and the next begins: `…के प्रकार1.2 मोल
            # संकल्पना…` read as one run-on word salad. `·` is the
            # separator this corpus already uses everywhere else for a
            # compact enumeration (`6.1 नामपद्धति · 7, 5 अंक`); joining a
            # bullet group with it here is the same convention, not a new
            # one.
            items = [str(x) for x in (b.get("items") or []) if str(x).strip()]
            if items:
                out.append(" · ".join(items))
    return " ".join(x for x in out if x)


def _numeric_col(rows):
    """Does the LAST column hold short numeric VALUES in most rows?

    `"अंक" in text` was not enough: the stats section's second column is
    prose that happens to contain the word ("…के अंक जोड़कर…"), so it was
    bar-charted and the card collapsed. A bar chart needs numbers.

    THE CELL MUST START WITH THE DIGIT, not merely contain one anywhere.
    Geography's `✅ किस क्रम में पढ़ना है` table adds a third `कहाँ` column
    — `भाग 1 · 1.8`, `भाग 2 · 2025 · प्र. 9` — that chemistry's two-column
    version of the same table never had. Those are LOCATION REFERENCES: a
    word, then a `·`, then a section number. `len(...) <= 26 and any digit`
    still matched them (12–21 characters, a digit somewhere), so the whole
    table got bar-charted — five meaningless coloured bars under a
    procedure list, no value they could represent. A genuine value cell is
    digits FIRST (`22`, `5 अंक`, `1.8`); a reference cell opens with a
    word."""
    if len(rows) < 3:
        return False
    good = sum(1 for r in rows
               if len(r[-1]) <= 26 and re.match(r'\s*[0-9०-९]', r[-1]))
    return good >= max(3, int(0.8 * len(rows)))


# Match the unit as a STEM: the source writes सेटों / सेटों में as well as
# सेट, and requiring the bare form found only one figure in three.
_NUM_UNIT = re.compile(
    r'([0-9]+(?:[·.][0-9]+)?)\s*(अंक|प्रश्न|सेट|वर्ष|साल|बार|पेपर)')


def tile_candidates(sec):
    """Numeric prose that MIGHT be a stat-tile block.

    The reference's cover turns "सबसे हल्के सेट में 4 और सबसे भारी में 13"
    into three tiles. Extracting label/value pairs from free Hindi prose is
    not something a regex should be trusted with, so this only detects that
    comparable figures are PRESENT and leaves the reading to
    step03_content_tagger's agent, whose decision is applied on the next run."""
    # Scan the TABLE cells as well as the prose. Chapter 3 states its
    # figures inside the table ("18 असली सेटों", "137 अंक", "7·6 अंक"), so a
    # prose-only scan found nothing and the agent was never asked.
    parts = [_prose_of(sec)]
    for b in sec.get("blocks", []):
        if b["kind"] == "table":
            parts.extend(" ".join(r) for r in b.get("rows", []))
    text = " ".join(x for x in parts if x)
    return text if len(_NUM_UNIT.findall(text)) >= 3 else ""


def _card_role(sec):
    """Infer what KIND of cover card a front-matter section wants.

    Shape first, emoji as a tiebreak: a section with a marks column wants a
    bar chart whatever it is called, and one whose table is a numbered
    sequence wants step circles. That way a chapter that renames or drops a
    section still gets a sensible cover.

    NUMERIC-VS-NUMERIC BEATS "FIRST COLUMN IS NUMBERED".
    A first column of `1,2,3,4,5` is ambiguous by itself: `✅ किस क्रम में
    पढ़ना है` numbers an actual PROCEDURE that way, one instruction per row
    in prose — genuinely `steps`. `1 · भार`'s marks table numbers `अंक`
    values `1,2,3,4,5` with a QUESTION COUNT beside each — `22, 34, 12, 3,
    10` — which only coincidentally starts at 1 and counts up; it is a
    value distribution, the exact shape `bars` exists for, and read as
    `steps` it drew five step circles for numbers that are not a sequence
    of anything. The distinguishing signal is the SECOND column: prose
    instructions are not `_numeric_col`, a second count of numbers is.
    Checking `_numeric_col` first does not touch the genuine steps case —
    `किस क्रम में पढ़ना है`'s instructions are long text, so it still
    fails `_numeric_col` and falls through to `steps` below unchanged.
    """
    title = sec.get("title", "")
    head, rows = _rows_of(sec)
    last_col = " ".join(r[-1] for r in rows) if rows else ""
    first_col = [r[0].strip() for r in rows] if rows else []
    numbered = first_col and all(c.isdigit() for c in first_col)
    if _numeric_col(rows):
        return "bars"
    if numbered:
        return "steps"
    if rows:
        return "tiles"
    if "🏆" in title or "निगमन" in title:
        return "text"
    return "text"


_MAST_RE = re.compile(r'(?:बोर्ड|Board)', re.I)


def _masthead(front):
    """The board/class/subject line at the top of the chapter, if there is one.

    Written three ways across the chemistry chapters — a bold paragraph, an
    H3, and not at all — so it is matched on CONTENT (it names a board)
    rather than on the shape the author happened to use.
    """
    for ch in (front.get("children") or [])[:6]:
        if ch.get("kind") in ("para", "definition"):
            t = (ch.get("text") or "").strip()
            if t and _MAST_RE.search(t) and len(t) <= 120:
                return t
    return ""


def render_cover(front, chapter, decisions=None):
    """-> (main, overflow) HTML for the cover; both "" when no front matter."""
    secs = [c for c in front.get("children", []) if c["kind"] == "section"]
    if not secs:
        return None

    # The pull-quotes live INSIDE the analytics sections, not beside them,
    # so collect them from the section bodies. Looking only at part level
    # found none and the cover lost both note cards.
    # Pull-quotes appear at BOTH depths: loose before the first `##`, and
    # inside an analytics section. Collecting only one depth dropped the
    # other — chapter 3 lost both notes, chapter 2 lost its lead line.
    notes = [c for c in front.get("children", []) if c["kind"] == "refbox"]
    for sec in secs:
        notes.extend(b for b in sec.get("blocks", []) if b["kind"] == "refbox")

    # A CALLOUT IN THE FRONT MATTER IS A NOTE TOO.
    #
    # `render_cover` only ever extracts RECOGNISED shapes from a front-matter
    # section — a table becomes a bars/tiles card, a `>` blockquote (kind
    # `refbox`) becomes a note above — and `body = [p for p in parts if
    # p.get("role") != "front"]` in `html.py` means front matter is never
    # ALSO rendered generically into the page flow the way a Part-1 section
    # is. An aside written as `⛔ **आलेख शून्य है।** ch01–ch03 में …` — an
    # icon + bold label, `render_block`'s `callout` kind rather than a `>`
    # blockquote — fits neither shape, so it was never visited by anything
    # and the whole sentence vanished: real editorial content ("this
    # chapter has never asked for a graph"), not decoration. Folded into
    # the same notes list, using the callout's own label, so it prints as a
    # pull-quote instead of being silently dropped.
    def _callout_note(c):
        label, text = c.get("label", ""), c.get("text", "")
        # A callout label is usually a short phrase, but this one is a full
        # sentence the author already ended with `।` — appending `:` after
        # it printed "है।:", two closers in a row. Stripped only for THIS
        # join; `pointer()`'s own `label:` convention elsewhere is untouched.
        label = label.rstrip("।.!?")
        return dict(text=("%s: %s" % (label, text)) if label else text)

    notes.extend(_callout_note(c) for c in front.get("children", [])
                 if c["kind"] == "callout")
    for sec in secs:
        notes.extend(_callout_note(b) for b in sec.get("blocks", [])
                     if b["kind"] == "callout")

    # A LOOSE PARAGRAPH UNDER THE `##` IS THE SAME SHAPE AGAIN.
    #
    # Not every aside is a `>` blockquote or an icon-led callout — a chapter
    # can just write a plain sentence directly under the `##`, with no `###`
    # to hold it: "आधे से थोड़े ज़्यादा अंक अकेले टॉपिक 4 से आते हैं, इसलिए
    # पढ़ाई वहीं से शुरू करो।" sits right after the weight-table, one blank
    # line before the first `###`. `secs` only collects `section` children,
    # so this — like the loose table above — was never visited by anything:
    # nine distinct words gone with no error, the exact failure `notes`
    # already exists to prevent for `refbox` and `callout`. Same list, same
    # reasoning, third shape.
    notes.extend(dict(text=c["text"]) for c in front.get("children", [])
                 if c["kind"] == "para" and (c.get("text") or "").strip())

    # The seal is the chapter's headline mark count. It is DERIVED — from the
    # first analytics heading — because no chapter writes it as a field.
    lead, seal = "", None
    m = re.search(r'([0-9]+(?:[·.][0-9]+)?)\s*अंक', secs[0].get("title", ""))
    if m:
        raw = m.group(1).replace("·", ".")
        try:
            seal = "%g" % round(float(raw))
        except ValueError:
            seal = m.group(1)
        # plain text: `inline()` escapes, so raw <b> would print as markup
        lead = "इस अध्याय से एक पेपर में औसतन **%s अंक** आते हैं।" % m.group(1)

    cards = []
    # A TABLE DIRECTLY UNDER THE `##` HEADING IS NOT INSIDE A SECTION.
    #
    # `secs` above only collects "section" children — the `###` subheadings
    # — because that is the shape `_card_role`/`_rows_of` are built to read.
    # A chapter that puts its topic-weight table straight under the `##`
    # itself (no `###` wrapping it) parses that table as a LOOSE child of
    # `front`, the same level `refbox`/`callout` notes sit at — and those
    # are already re-collected below by scanning `front.children` a second
    # time. Tables were not, so this exact shape — physics chapter 1's
    # opening "वो 5 अंक किन टॉपिक से आते हैं?" table — vanished from the
    # cover with nothing to show it was ever there: not an error, not a
    # dropped-word count (its words live on in `part.sub`, the strap line
    # that heading became), just an entire table with no path to a card.
    # Built the same way a section's OWN second table is (see "A SECOND
    # TABLE IN THE SAME SECTION IS ITS OWN CARD" below) — head/rows straight
    # into a bars card, `front.sub` standing in for a section title since
    # this table has no `###` of its own to carry one.
    # ONLY THE FIRST LOOSE TABLE IS THE `##` HEADING'S OWN.
    #
    # `front["sub"]` is the ONE `##` line these tables sit under, so handing
    # it to every one of them titled them all identically. The maths chapter
    # puts two loose tables under `## 🎯 वो लगभग 4 अंक किन टॉपिक से आते हैं?`
    # — a topic-vs-marks table and a method-vs-question-count table — and the
    # cover printed that same question as the heading of both cards, one
    # above the other, while the second card's actual subject (तरीका ·
    # कितने सवाल) appeared nowhere. Two different charts asserting they
    # answer the same question is worse than an unlabelled one.
    #
    # The second and later tables are titled from their OWN column heads,
    # exactly as "A SECOND TABLE IN THE SAME SECTION IS ITS OWN CARD" below
    # already does for a section's extra tables. Same situation, same rule.
    _loose_n = 0
    for t in front.get("children", []):
        if t["kind"] != "table":
            continue
        head, rows = t.get("head", []) or [], t.get("rows", []) or []
        if not rows:
            continue
        total = rows[-1] if "कुल" in str(rows[-1][0]) else None
        body = rows[:-1] if total else rows
        if _loose_n == 0:
            ttl = front.get("sub", "") or (head[0] if head else "")
        else:
            ttl = " · ".join(x for x in head if x) or front.get("sub", "")
        _loose_n += 1
        cards.append(("bars", C.cover.bar_card(
            ttl, head, body, total, "cvc-pink", "")))
    for sec in secs:
        role = _card_role(sec)
        head, rows = _rows_of(sec)
        title = sec.get("title", "")
        if role == "bars":
            total = rows[-1] if rows and "कुल" in rows[-1][0] else None
            body = rows[:-1] if total else rows
            if total is None and body:
                # The reference closes this card with a `कुल` row. Most
                # chapters do not write one, so derive it by summing the
                # column rather than leaving the card without its bottom line.
                # Sum the column the CARD charts, and carry that column's own
                # unit. `r[-1]` plus a hardcoded "अंक" was wrong twice over on
                # a three-column table: it summed the cross-reference column
                # (5 + 1 + 1 + 1) and printed "कुल 8 अंक" under a card whose
                # figures were 33, 51, 49 and 14 — and "बार" columns were
                # labelled "अंक" as well.
                col = C.cover._bar_col(body)
                tot = sum((C.cover._first_number(r[col]) if col < len(r)
                           else None) or 0 for r in body)
                if tot:
                    unit = C.cover._value_unit(body[0][col]
                                               if col < len(body[0]) else "")
                    total = ["कुल", ("%g %s" % (round(tot), unit)).strip()]
            # The section's lead line is real prose and belongs on the page.
            # It was left out earlier only because the cover was unmeasured
            # and adding it clipped the sheet; now the cover is measured and
            # spills to a second page, so it can be printed.
            _leads = _table_leads(sec)
            _tbls = _tables_of(sec)
            # Each table's own heading goes to its own card; whatever prose
            # is left over is the section's and stays on the first one.
            _lead_set = set(_leads.values())
            _sec_lead = " ".join(
                x for x in [_prose_of(sec)] if x and x.strip() not in _lead_set)
            for _lt in _lead_set:
                _sec_lead = _sec_lead.replace(_lt, "").strip()
            _first_lead = _lead_text(_tbls[0], _leads) if _tbls else ""
            cards.append(("bars", C.cover.bar_card(
                title, head, body, total, "cvc-pink",
                (_first_lead + " " + _sec_lead).strip() if _first_lead
                else _sec_lead)))
            # A SECOND TABLE IN THE SAME SECTION IS ITS OWN CARD.
            #
            # Its own head becomes the card's title, since that is what
            # labels its columns. Only the first card carries the section
            # title and lead line — repeating those would read as two
            # sections rather than two views of one.
            for extra in _tables_of(sec)[1:]:
                ehead = extra.get("head", []) or []
                erows = extra.get("rows", []) or []
                if not erows:
                    continue
                etotal = erows[-1] if "कुल" in str(erows[-1][0]) else None
                ebody = erows[:-1] if etotal else erows
                cards.append(("bars", C.cover.bar_card(
                    _lead_text(extra, _leads,
                               " · ".join(x for x in ehead if x) or title),
                    ehead, ebody, etotal, "cvc-blue", "")))
        elif role == "steps":
            cards.append(("steps", C.cover.steps_card(title, rows, "cvc-green",
                                                       _prose_of(sec), head)))
        elif role == "tiles":
            # The cover's stat tiles are a COVER-level decision, not a
            # per-section one: chapter 3 states the figures in the FIRST
            # section's caption but the reference prints them on the last
            # card. The agent supplies them once; the plain card renders them.
            supplied = (decisions or {}).get("cover_tiles") or []
            # Without an agent decision, read the spread out of the chapter's
            # own prose. The figures are stated in a sentence, not a table, so
            # a card that only reads `rows` degraded to a plain list — which
            # is how the cover lost its stat tiles entirely.
            spread = _stats.spread_tiles(" ".join(_prose_of(x) for x in secs))
            tiles = ([[t.get("value", ""), t.get("label", ""), t.get("note", "")]
                      for t in supplied] or spread or rows)
            cards.append(("tiles", C.cover.tiles_card(
                title, _prose_of(sec), tiles, "cvc-plain", head,
                caption=(decisions or {}).get("cover_tiles_caption", ""),
                rows=rows)))
        else:
            fml = ""
            for b in sec.get("blocks", []):
                if b["kind"] in ("formula", "formula_box"):
                    fml = b.get("text", "")
                    break
            cards.append(("text", C.cover.text_card(title, _prose_of(sec), (), fml, "cvc-gold")))

    # THE DERIVED LEAD AND THE CHAPTER'S OWN BLOCKQUOTE CAN BE ONE LINE.
    #
    # `lead` is DERIVED from the first analytics heading — "इस अध्याय से एक
    # पेपर में औसतन **12 अंक** आते हैं।" — and a chapter that ALSO writes
    # that sentence as a `>` blockquote has it collected into `notes` too,
    # so the cover printed it twice: once under the title and again as a
    # pull-quote beside it. Chapter 2 and biology chapter 1 both do this.
    # Matched on letters and digits alone so the `**` the derived copy
    # carries, and any difference in spacing, cannot hide the match.
    def _lead_key(s):
        return re.sub(r'[^0-9\u0900-\u097F]+', '', s or '')
    if lead:
        _lk = _lead_key(lead)
        notes = [n for n in notes if _lead_key(n.get("text")) != _lk]

    # ALL of them. Capping at two dropped chapter 17's third pull-quote —
    # six words of real prose — and the cover now spills to a second sheet,
    # so there is no reason to cap.
    note_html = [C.cover.note(n["text"],
                              "cvn-red" if i % 2 == 0 else "cvn-blue",
                              "🎯" if i % 2 == 0 else "📐")
                 for i, n in enumerate(notes)]

    # Column by ROLE, not by index. The reference puts the weight chart and
    # its pull-quotes on the left, the narrative and the reading order on the
    # right, and the methodology note full width underneath. Alternating by
    # position produced a different shape on every chapter.
    left = [h for r, h in cards if r == "bars"]
    right = [h for r, h in cards if r in ("text", "steps")]
    full = [h for r, h in cards if r not in ("bars", "text", "steps")]

    # Role decides which column a CARD starts in; the notes then even the two
    # up. Sending every note left unconditionally was fine for a chapter with
    # one bar chart and two pull-quotes, and lopsided for chapter 4, which has
    # three charts and five notes: left held 8 cards to right's 2, so the
    # cover measured 2866px — twice a sheet — and spilled over three pages
    # while half of each was blank.
    for n in note_html:
        (left if len(left) <= len(right) else right).append(n)
    # A role split can be uneven on its own. Move the tail across rather than
    # leave one column carrying two more cards than the other.
    while len(left) - len(right) >= 2:
        right.insert(0, left.pop())
    while len(right) - len(left) >= 2:
        left.insert(0, right.pop())

    # Returned in TWO parts so the caller can measure and, if the cover does
    # not fit, put the full-width cards on a second sheet. `.page` is
    # overflow:hidden — an unmeasured cover silently clips, which is exactly
    # what happened when the gold card gained its formula box.
    return dict(hero=C.cover.hero(chapter.get("num", ""), chapter.get("title", ""),
                                  lead, seal, strap=front.get("sub", ""),
                                  mast=_masthead(front)),
                left=left, right=right, full=full,
                # The same cards in reading order, for a caller that can
                # MEASURE. Counting cards is not balancing them: chapter 4's
                # three bar charts are each taller than any two notes, so an
                # even 5/5 split by count still left one column half a page
                # longer. See balance_cover_columns.
                flat=list(left) + list(right))


def cover_grid_html(cards):
    """The cards moved off the cover, as a two-column grid of their own.

    Used for the page after the cover — see the one-sheet policy in
    `assemble.html.build`. The cards keep their own styling; only their
    placement changes.
    """
    half = (len(cards) + 1) // 2
    return C.cover.grid(cards[:half], cards[half:])


def cover_pages_html(parts, keep_n=None, full_on_1=False):
    """Assemble the cover into one or two sheets.

    `keep_n` caps how many left/right cards stay on the first sheet; the rest
    spill. The caller measures and walks that number down until the sheet
    fits, which is the same measure-then-check discipline every other page
    gets — the cover used to be emitted unchecked and `overflow:hidden` ate
    whatever did not fit."""
    left, right, full = parts["left"], parts["right"], parts["full"]
    if keep_n is None:
        keep_n = max(len(left), len(right))
    l1, l2 = left[:keep_n], left[keep_n:]
    r1, r2 = right[:keep_n], right[keep_n:]
    # `full` cards sit AFTER the grid at full width, the way the reference
    # has them — putting them in the grid's left column left the right column
    # empty and gave the methodology card most of a sheet to itself.
    if full_on_1:
        # Now that the full-width cards are laid out horizontally they can be
        # small enough to finish the first sheet, which removes the second
        # sheet entirely. The caller measures before asking for this.
        page1 = ('<div class="flowwrap cover">%s%s%s</div>'
                 % (parts["hero"], C.cover.grid(l1, r1), "".join(full)))
        rest = l2 + r2
        page2 = ('<div class="flowwrap cover">%s</div>' % C.cover.grid(l2, r2)) if rest else ""
        return page1, page2
    page1 = '<div class="flowwrap cover">%s%s</div>' % (parts["hero"], C.cover.grid(l1, r1))
    rest = l2 + r2 + full
    page2 = ('<div class="flowwrap cover">%s%s</div>'
             % (C.cover.grid(l2, r2) if (l2 or r2) else "", "".join(full))) if rest else ""
    return page1, page2

def _cover_sheet(items):
    """One spill sheet from a list of (kind, left, right) card slots."""
    ls = [a for k, a, _ in items if k == "grid" and a]
    rs = [b for k, _, b in items if k == "grid" and b]
    fs = [a for k, a, _ in items if k == "full"]
    inner = (C.cover.grid(ls, rs) if (ls or rs) else "") + "".join(fs)
    return '<div class="flowwrap cover">%s</div>' % inner


def _spill_columns(cards, height_of):
    """`cards` greedily balanced into two columns of even measured height."""
    cols, hs = ([], []), [0, 0]
    for html in cards:
        i = 0 if hs[0] <= hs[1] else 1
        cols[i].append(html)
        hs[i] += height_of(html)
    return cols


def cover_spill_html(parts, keep_n, full_on_1, fits, height_of=None):
    """The cards that did not fit sheet 1, on as many sheets as they need.

    Sheet 1 is measured and walked down until it fits. Sheet 2 never was —
    whatever was left over was emitted unchecked, on the assumption that a
    spill is always small. Chapter 4 nests six analytics blocks where chapter
    3 has three, so the spill did not fit, and `.page` is `overflow:hidden`:
    372px of the last card was cut off with no error anywhere.

    `fits(html)` is the caller's measurement — this module does no measuring
    of its own.
    """
    try:
        from itertools import zip_longest
    except ImportError:                                  # pragma: no cover
        from itertools import izip_longest as zip_longest
    left, right, full = parts["left"], parts["right"], parts["full"]

    # THE SPILL GETS ITS COLUMNS BALANCED TOO.
    #
    # A spill row is as tall as its taller card, so pairing a tall card with a
    # short one wastes the difference — and the leftovers kept whatever column
    # they happened to land in when the WHOLE cover was balanced for sheet 1.
    # Six maths cards took two sheets that way, the second holding two short
    # cards and 1200px of nothing. Re-balancing the leftovers by measured
    # height fits them on one sheet.
    rest = [c for pair in zip_longest(left[keep_n:], right[keep_n:])
            for c in pair if c is not None]
    if height_of and rest:
        lrest, rrest = _spill_columns(rest, height_of)
    else:
        lrest, rrest = list(left[keep_n:]), list(right[keep_n:])
    # A CARD THAT WILL NOT FIT THE GRID GOES FULL WIDTH, NOT ONTO A NEW SHEET.
    #
    # Balanced, the maths spill measured 1443px against a 1432px sheet, so its
    # shortest card — eleven words of prose — was sent to a page of its own.
    # Laid across the full sheet width instead of a half-width column, that
    # same card reflows to about half the height, and the two grid columns
    # lose it entirely. Eleven pixels of overflow stop being a page.
    #
    # Shortest-first, because a short card is the one that loses least by
    # spanning the sheet, and because moving it costs the grid the least.
    if height_of and rest:
        wide = []
        while len(rest) > 2:
            cols = _spill_columns(rest, height_of)
            if fits(_cover_sheet([("grid", a, b) for a, b in
                                  zip_longest(*cols)]
                                 + [("full", w, None) for w in wide])):
                lrest, rrest = cols
                break
            shortest = min(rest, key=height_of)
            rest = [c for c in rest if c is not shortest]
            wide.append(shortest)
        else:
            wide = []
        full = list(wide) + list(full)
        if wide:
            full_on_1 = False

    pending = [("grid", a, b) for a, b in zip_longest(lrest, rrest)]
    if not full_on_1:
        pending += [("full", f, None) for f in full]

    pages, cur = [], []
    for item in pending:
        trial = cur + [item]
        if cur and not fits(_cover_sheet(trial)):
            pages.append(_cover_sheet(cur))
            cur = [item]
        else:
            cur = trial
    if cur:
        pages.append(_cover_sheet(cur))
    return pages

def balance_cover_columns(parts, height_of):
    """Re-split the cover's cards into two columns of even HEIGHT.

    `height_of(html)` is the caller's measurement — this module never
    measures. Cards are placed in reading order into whichever column is
    currently shorter, which keeps the order recognisable while stopping one
    column running half a page past the other.

    Returns a new (left, right); `parts` is left alone.
    """
    flat = parts.get("flat") or (list(parts["left"]) + list(parts["right"]))
    cols = ([], [])
    heights = [0, 0]
    for html in flat:
        i = 0 if heights[0] <= heights[1] else 1
        cols[i].append(html)
        heights[i] += height_of(html)
    return cols[0], cols[1]
