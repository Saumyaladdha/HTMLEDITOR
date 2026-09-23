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

from ..util import upload_image as _upload_image

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
        # `inline.marks_chip`, not `C.qmarks("[%s]" % marks)`: the value is
        # already extracted, and putting it back in brackets so `inline` can
        # re-find it nested the chip in a second `.qmarks` span and lost the
        # values the tag pattern does not match (`1×5` printed as `[1×5]`).
        out.append(_item('<div class="marksrow">%s</div>'
                         % _inline.marks_chip(marks), atomic=True))
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
        # A STANDALONE BOLD LINE OPENING A PARAGRAPH IS A SECTION HEADING.
        #
        # A long answer is written as `**धारिता**` on its own line, then the
        # prose, then `**ऊर्जा घनत्व**`, then more. The reader folds a
        # paragraph's lines into one block, so the heading arrived glued to
        # the front of the prose and printed as `<b>धारिता</b> धारिता
        # (Capacitance) …` — one run-on paragraph where the reference has a
        # blue heading and a paragraph under it. Breaking a wall of answer
        # into named sections is most of what makes a long answer readable,
        # and the source already says where the breaks go.
        #
        # A trailing colon means a LEAD-IN (`**सूत्र:** …`), not a heading,
        # and those are claimed by the rubric long before this.
        m_sub = _RE_LEAD_BOLD.match(text or "")
        if m_sub and C.is_subhead_text(m_sub.group(1)):
            rest = m_sub.group(2).strip()
            head = [_item(C.subhead(m_sub.group(1).strip()), atomic=True)]
            if not rest:
                return head
            return head + render_block(dict(b, text=rest), ctx)
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
        # PART 1 GETS THE BULLETED PANEL, PART 2 THE BOXED ONE.
        #
        # Two different designs for two different jobs — see
        # `components.math.formula_list`. The panel no longer clears a note
        # column in either half (there is no float column any more), but
        # `clears` is still read below for the wide Part-2 variant.
        if ctx.get("revision"):
            html = C.formula_list(b["rows"], b.get("title", "सूत्र"))
            it = _item(html, atomic=True)
            it["split"] = split_payload(b)
            return [it]
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
        # EVERY CALLOUT IS THE BORDERED BOX, IN BOTH HALVES.
        #
        # This used to set a Part-1 callout as `pointer_flat` — a bare
        # `<p class="poflat">` with no border — on the rule that "Part 1
        # uses a flat callout, Part 2 the bordered box". The reference
        # does not: it carries ZERO `.poflat` elements in the whole
        # chapter (the CSS survives, nothing emits it) and 14 bordered
        # `.po` boxes in Part 1 alone. Unboxed, a ⚠️ warning sat in the
        # column as an ordinary paragraph with an emoji in front of it and
        # read as body text rather than as a warning — which is the entire
        # job of the component.
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
        # A REF IS A URL FOR A READER'S BROWSER, OR IT IS NOTHING YET.
        #
        # `resolve_ref` is the one place a local file, an inline `data:`
        # image, or an external crop (mathpix) becomes something this
        # platform's own storage serves — see book/util/upload_image.py.
        # It never raises and never makes things worse: with no upload
        # credentials configured, or with nothing real behind the ref yet,
        # it hands the same string back and the page draws the empty
        # placeholder plate exactly as it always has.
        ref = _upload_image.resolve_ref(b.get("ref"))
        return [_item(C.figure(b.get("num", ""), b.get("caption", ""), b.get("desc", ""),
                               ref, size=size,
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
# The exam-frequency trailer a topic heading ends with:
#
#     ### 2.3 वैद्युत द्विध्रुव के कारण विभव · **13 सवाल आए · 1 व 5 अंक में**
#
# A `·` and then a bold run that COUNTS something. Anchored to the end and
# required to be bold, so a title that merely contains a `·` — a topic
# genuinely named "क्षेत्र · विभव" — is not cut in half. The counting words
# are the guard that keeps a bold trailer which is part of the NAME
# (`**संधारित्र**`) out of the seal.
_TOPIC_FREQ_RE = re.compile(
    r'\s*·\s*\*\*([^*]*(?:सवाल|प्रश्न|अंक|बार|पेपर)[^*]*)\*\*\s*$')


def _split_topic_freq(title):
    """-> (title without its frequency trailer, the trailer or "")."""
    m = _TOPIC_FREQ_RE.search(title or "")
    if not m:
        return title, ""
    return title[:m.start()].rstrip(" ·"), m.group(1).strip()


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
        _title, _freq = _split_topic_freq(sec["title"])
        inner.append(C.section_head(sec.get("num", ""), _title, acc,
                                    chips, exams, sec.get("en", ""),
                                    sec.get("flag", ""), freq=_freq,
                                    revision=bool(ctx.get("revision"))))

    inner.append("</div>")
    out.append(_item("".join(inner), atomic=True, tag="sechead"))
    # THE PAGE ITSELF CARRIES THE TOPIC'S ACCENT NOW, NOT JUST THE HEADING.
    #
    # The reference sets `--accent`/`--tint` on every content `.page`, and
    # `.type-banner`/`.type-en` read them via `var()` — a per-element accent
    # class is not enough once the colour has to reach the page wrapper
    # itself. `html.py` walks the flow/column items looking for this tag to
    # resolve each page's accent; nothing here decides which page a section
    # lands on, it just states which accent that section IS.
    out[-1]["accent"] = acc
    # And which KIND it is, for `.revision-unit[data-kind="topic"]` — the
    # dashed rule the reference draws BETWEEN Part-1 topics. Carried on the
    # item so the rule can be `:not(:first-child)` per column, which is
    # what stops it printing under the part banner at the top of a page.
    out[-1]["kind"] = "topic"

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
    # See the matching note in `render_section` — Part 2's page accent
    # follows whichever question's topic dominates the page.
    items[0]["accent"] = acc
    # THE QUESTION STEM IS SET BOLD — all 79 of the reference's are, and
    # none of ours were.
    #
    # The stem is the sentence a student scans a page for; at the same
    # weight as the answer prose beneath it, a question and its answer
    # read as one undifferentiated block, which is most of why a Part-2
    # page looked flatter than the reference's. Only the FIRST prose
    # block of the question is marked — a stem that runs to a second
    # paragraph, an option list, or a `दिया है` line, is not the stem.
    _stem_done = False
    for b in q.get("blocks", []):
        # A SHORT STEM IS A HEADING, A LONG ONE IS BOLD BODY TEXT.
        #
        # Measured on the reference: the stems it sets as `.subhead` run
        # to a median of 25 characters, the ones it sets as
        # `<p class="q"><b>` to a median of 108. A one-line MCQ stem
        # ("वैद्युत विभव का मात्रक है") is a label over its options; a
        # four-line numerical is a paragraph. Setting both the same way
        # made the short ones disappear into the options under them.
        if (not _stem_done and b.get("kind") in ("para", "question_text")
                and C.is_subhead_text(b.get("text", ""))):
            it = _item(C.subhead(b["text"]), atomic=True, owner=owner)
            items.append(it)
            _stem_done = True
            continue
        for it in render_block(b, sub):
            it["owner"] = owner
            if (not _stem_done and b.get("kind") in ("para", "question_text")
                    and '<p class="q">' in it["html"]):
                it["html"] = it["html"].replace(
                    '<p class="q">', '<p class="q"><b>', 1)
                it["html"] = _close_last(it["html"], "</p>", "</b></p>")
                _stem_done = True
            items.append(it)
    return items


def _close_last(html, old_tail, new_tail):
    """Replace the LAST occurrence of `old_tail` — a stem may contain a
    nested `</p>` from an inline construct, and closing the bold at the
    first one would leave the tag open across the rest of the block."""
    i = html.rfind(old_tail)
    if i < 0:
        return html
    return html[:i] + new_tail + html[i + len(old_tail):]


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
# A paragraph that OPENS with a standalone bold run — `**धारिता**` and
# then the prose under it. The bold must not end in a colon (that is a
# lead-in like `**सूत्र:**`, claimed by the rubric) and must not be the
# whole paragraph's only content dressed as emphasis.
_RE_LEAD_BOLD = re.compile(r'^\s*\*\*([^*:：]{1,46})\*\*\s*(.*)$', re.S)


_RE_QGROUP_TOPIC = re.compile(r'^(?:(\d+\.\d+)\.?|(\d+)\.)\s+(\S.*)$')

# A QUESTION-FORMAT heading — `बहुविकल्पीय प्रश्न (1 अंक)`, `लघु उत्तरीय
# प्रश्न-I (2 अंक)`, `आंकिक प्रश्न`. Named by the FORM of the answer the
# paper wants, which is what separates it from a year (`2024`) and from a
# topic (`2.18 संधारित्रों का संयोजन`). Matched on the format words
# themselves rather than on "is not a year", so a group labelled with
# something genuinely unexpected still falls through to the year head
# rather than being silently promoted to a part-level banner.
_QTYPE_WORDS = ("बहुविकल्पीय", "अतिलघु", "लघु उत्तरीय", "दीर्घ",
                "विस्तृत उत्तरीय", "आंकिक", "सत्य/असत्य", "रिक्त स्थान",
                "अति लघु")


def is_qtype_label(label):
    return any(w in (label or "") for w in _QTYPE_WORDS)


def render_qgroup(g, ctx):
    out = []
    if g.get("_qtype_banner"):
        # One of these per question FORMAT (MCQ, VSA, SA-I/II, LA), pooled
        # across every topic — see `readers.markdown._regroup_by_qtype`. Only
        # the FIRST one also carries Part 2's own masthead (`part_label`),
        # folded into the same banner rather than a separate one above it.
        out.append(_item(C.type_banner(g["label"], accent=g.get("accent"),
                                       part_label=g.get("part_label", ""),
                                       part_sub=g.get("part_sub", "")),
                         atomic=True, tag="groupband"))
    elif g.get("_year_marker"):
        out.append(_item(C.year_head(g["label"]), atomic=True, tag="groupband"))
        return out
    elif g.get("label"):
        topic = _RE_QGROUP_TOPIC.match(g["label"])
        if topic:
            out.append(_item(C.section_head(topic.group(1) or topic.group(2),
                                            topic.group(3)),
                             atomic=True, tag="sechead"))
        elif is_qtype_label(g["label"]):
            # A QUESTION-FORMAT GROUP IS A BANNER, NOT A YEAR PILL.
            #
            # `_regroup_by_qtype` exists for a source that nests questions
            # under topics and has to be pooled by format. A source that
            # ALREADY writes `### बहुविकल्पीय प्रश्न (1 अंक)` needs no
            # regrouping, so it never set `_qtype_banner` — and the label
            # fell to `year_head`, which drew "बहुविकल्पीय प्रश्न (1 अंक)"
            # as the big yellow highlighter pill a YEAR gets. The
            # reference sets it as `.type-banner > h2.question-type-heading`
            # either way; how the markdown happened to be organised is not
            # something the page should show.
            out.append(_item(C.type_banner(g["label"], accent=g.get("accent"),
                                           part_label=g.get("part_label", ""),
                                           part_sub=g.get("part_sub", "")),
                             atomic=True, tag="groupband"))
        else:
            out.append(_item(C.year_head(g["label"]), atomic=True, tag="groupband"))
    if g.get("summary"):
        out.append(_item('<div>%s</div>' % C.marktag(g["summary"]), atomic=True))
    first = True
    for ch in g.get("children", []):
        if ch["kind"] == "qgroup" and ch.get("_year_marker"):
            out.extend(render_qgroup(ch, ctx))
            first = True
            continue
        if ch["kind"] == "question":
            # NO SEPARATOR ELEMENT — THE HEAD DRAWS ITS OWN RULE.
            #
            # A `.qsep` div used to be inserted between questions. The
            # reference has none at all (0 in the whole chapter): the same
            # dashed pink rule is `.qhead`'s `border-top`, which is better
            # in the one place it matters — a question that starts a
            # column gets the rule suppressed (`.acol > .u:first-child
            # .qhead`), where a separate div would have stranded a rule
            # across the top of the column with nothing above it. Kept as
            # a standalone element only where the source asks for a rule
            # in its own right (the `rule`/`qsep` block kind).
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
def document(title, body_html, mode="a4", font_css=None):
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
    # A CELL WRAPPED IN `**bold**` STILL OPENS ON THE DIGIT, NOT THE STARS.
    #
    # physics_chap2.md's own marks column writes every value as `**2
    # अंक**` — the raw markdown, stars and all, is what reaches this
    # function — so the digit test always missed on its own chapter,
    # the very shape it exists to catch. Stripped before the check, not
    # after: the emphasis is real markdown, not part of the value.
    good = sum(1 for r in rows
               if len(r[-1].strip("*_ ")) <= 26
               and re.match(r'\s*[0-9०-९]', r[-1].strip("*_")))
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


def _cover_table_html(t):
    """One front-matter table -> `priority_table` (a ranked value column)
    or `study_table` (a numbered procedure), matching the reference's own
    two table skins. Title is left blank — the enclosing `front_section`
    already carries the `<h2>`, and a second heading on the table itself
    duplicated it."""
    head, rows = t.get("head", []) or [], t.get("rows", []) or []
    if not rows:
        return ""
    total = rows[-1] if "कुल" in str(rows[-1][0]) else None
    body = rows[:-1] if total else rows
    first_col = [r[0].strip() for r in body] if body else []
    numbered = first_col and all(c.isdigit() for c in first_col)
    if numbered:
        return C.cover.study_table("", body, head=head)
    return C.cover.priority_table("", head, body, total)


def _cover_note(text, bulb=False):
    """One note under the cover masthead — see `cover.note_row` for why the
    text has to be wrapped rather than emitted bare into the flex row."""
    return C.cover.note_row(text, bulb=bulb)


def render_cover(front, chapter, decisions=None):
    """-> {"hero": html, "sections": [html, ...]} — the cover, stacked in
    SOURCE ORDER, exactly as the reference lays out its front matter: a
    masthead, then one `.source-front-section` per `##` analytics
    heading, each block inside rendered in the order it was written
    (table, prose, note) rather than sorted into role-based columns.

    Replaces the old card-grid cover (`left`/`right`/`full`, balanced by
    measured height) — the reference has no such grid; every front-matter
    chapter reads as one linear page, same as the body does.
    """
    secs = [c for c in front.get("children", []) if c["kind"] == "section"]
    if not secs:
        return None

    # THE MASTHEAD IS THE ONE HEADER NOTE EVERY CHAPTER DERIVES.
    #
    # "इस अध्याय से एक पेपर में औसतन N अंक आते हैं।" is stated by the first
    # analytics heading's own title (`## 🎯 वो N अंक …`) and re-derived
    # here rather than copied from a `>` blockquote, because not every
    # chapter writes the blockquote — see the old `render_cover`'s same
    # derivation, kept verbatim.
    header_notes = []
    m = re.search(r'([0-9]+(?:[·.][0-9]+)?)\s*अंक', secs[0].get("title", ""))
    if m:
        header_notes.append("इस अध्याय से एक पेपर में औसतन **%s अंक** आते हैं।"
                            % m.group(1))
    _mast = _masthead(front)
    for c in front.get("children", []):
        if c["kind"] == "refbox":
            header_notes.append(c.get("text", ""))
        elif c["kind"] == "callout":
            lbl = (c.get("label", "") or "").rstrip("।.!?")
            txt = c.get("text", "")
            header_notes.append(("%s: %s" % (lbl, txt)) if lbl else txt)
        elif c["kind"] == "para" and (c.get("text") or "").strip():
            t = c["text"].strip()
            if t != _mast:
                header_notes.append(t)
    hero = C.cover.front_title(chapter.get("num", ""), chapter.get("title", ""))
    # The lamp marks the DERIVED "औसतन N अंक" line only — the first note,
    # and the one the reference draws it beside. Every note the chapter
    # wrote itself follows without one.
    _notes = [n for n in header_notes if n]
    header_html = hero[:-len("</header>")] + "".join(
        _cover_note(n, bulb=(i == 0 and bool(m)))
        for i, n in enumerate(_notes)) + "</header>"

    sections_html = []
    for i, sec in enumerate(secs, 1):
        parts = []
        for b in sec.get("blocks", []):
            k = b.get("kind")
            if k == "table":
                parts.append(_cover_table_html(b))
            elif k in ("refbox", "callout"):
                txt = b.get("text", "")
                if k == "callout":
                    lbl = (b.get("label", "") or "").rstrip("।.!?")
                    txt = ("%s: %s" % (lbl, txt)) if lbl else txt
                parts.append(_cover_note(txt))
            elif k == "definition":
                term, body = (b.get("term") or "").strip(), (b.get("text") or "").strip()
                txt = ("<b>%s:</b> %s" % (inline(term), inline(body))).strip() \
                    if term else inline(body)
                parts.append('<div class="u"><p class="q">%s</p></div>' % txt)
            elif k == "para" and (b.get("text") or "").strip():
                parts.append('<div class="u"><p class="q">%s</p></div>'
                             % inline(b["text"]))
            elif k == "bullets":
                items = [str(x) for x in (b.get("items") or []) if str(x).strip()]
                if items:
                    parts.append('<div class="u"><p class="q">%s</p></div>'
                                 % inline(" · ".join(items)))
        sections_html.append(C.cover.front_section(i, sec.get("title", ""),
                                                    "".join(parts)))

    return dict(hero=header_html, sections=sections_html)

