# -*- coding: utf-8 -*-
"""
HTML ASSEMBLER — IR + layout decisions -> the finished document.

    md -> parse -> IR -> render -> measure -> pack -> settle -> A4 -> html

    python3 book/build.py --md content/17_reader_edition.md --out chapter-01.html
    python3 book/build.py --md … --mode flow          # continuous scroll
    python3 book/build.py --md … --only part1         # Quick Revision edition
    python3 book/build.py --md … --only part2         # Yearwise PYQ edition

CONTENT-DRIVEN. Nothing below names a chapter, a section, a year or a
question. Every structural decision comes from the IR, which was itself
inferred from the shape of the markdown, so a different chapter — or a
Part 2 grouped by marks rather than by year — flows through unchanged.

WHY THE SETTLE PASS. `.page` is `overflow:hidden`: content that does not
fit is CLIPPED, not reflowed. A purely predictive packer is therefore not
good enough — it must be checked against a real render. `pack_*` produces
a first guess; `paginate.settle` measures the actual pages and pushes
whatever overflowed onto the next one until nothing is clipped.
"""
import argparse
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .. import components as C                                   # noqa: E402
from ..core.ir import count_kinds                                # noqa: E402
from ..design import tokens as theme                             # noqa: E402
# NOTE: import the FUNCTIONS, not the modules — `layout/__init__.py`
# re-exports `measure`, which shadows the module of the same name.
from ..layout.measure import measure as _measure_fn              # noqa: E402
from ..layout.pack import (GAP as _GAP, pack_columns as _pack_columns,   # noqa: E402
                           pack_full as _pack_full, settle as _settle,
                           pull_up as _pull_up,
                           pull_up_columns as _pull_up_columns)
from ..layout import split as splitter                           # noqa: E402
from ..readers import markdown as md_parser                      # noqa: E402
from . import render as R                                        # noqa: E402


class _Paginate(object):
    """Thin shim so the assembler reads as one narrative."""
    GAP = _GAP
    measure = staticmethod(_measure_fn)
    pack_columns = staticmethod(_pack_columns)
    pack_full = staticmethod(_pack_full)
    settle = staticmethod(_settle)
    pull_up = staticmethod(_pull_up)
    pull_up_columns = staticmethod(_pull_up_columns)

    @staticmethod
    def verify_pages(path):
        from ..layout import probe
        return probe.page_overflow(path)


paginate = _Paginate()


# ==========================================================================
# PAGE ASSEMBLY
# ==========================================================================
_UID = [0]


# How far the cover may be scaled down to hold it to one sheet.
#
# THE OLD VALUE WAS ARITHMETIC THAT NEVER CHECKED OUT. It said "the smallest
# type is 14.5px; at 0.66 that is ~9.6px on the page" — but the page is also
# printed at PRINT_ZOOM, and 14.5 x 0.66 x 0.734 is 7.0px, not 9.6. The
# missing factor is the print zoom, and it made a scale that halves
# legibility look acceptable.
#
# It went unnoticed because step15 could not see a CSS transform either:
# `fontSize` reports the unscaled size, so a cover scaled to 0.749 reported
# `legibility 0` while 79 of its elements printed under the floor. With the
# gate fixed the two now agree.
#
# Solve it properly. The smallest type that must stay readable is 15.2px, and
# the floor is 11px printed:
#
#     15.2 x k x 0.734 >= 11   ->   k >= 0.986
#
# So a cover that does not fit essentially CANNOT be scaled into fitting, and
# spilling to a second sheet is the only honest answer — which is what the
# chapters with well-fitting covers already do. 0.97 leaves a hair of room
# for a cover that is a rounding error too tall.
COVER_MIN_SCALE = 0.97

# THE SUMMARY IS ONE SHEET. That is an editorial rule, not a fitting outcome.
#
# `COVER_MIN_SCALE` above is the scale at which the smallest cover type still
# prints at the 11px floor, and the code treated it as a HARD gate: a cover
# needing any more shrink than that had cards moved off it instead. Where
# those cards went is the problem — below the PART 1 banner, i.e. into the
# body of the chapter. On maths_chapter1 that put `✅ किस क्रम में पढ़ना है`,
# a reading-order card that is pure front matter, between the end of Part 1
# and the PART 2 banner, reading as neither; the summary meanwhile sat a
# third empty. Splitting the analytics across the chapter is a worse failure
# than setting them a little smaller, because a reader looking for the
# summary cannot find half of it.
#
# So the one-sheet attempt now runs down to COVER_HARD_MIN, and
# COVER_MIN_SCALE becomes the threshold at which the build WARNS rather than
# the one at which it gives up. Below COVER_HARD_MIN the shrink really is
# too much to read (chapter 6's cover wants k=0.39) and the trim loop still
# takes over.
#
#     printed px = 15.2 x k x PRINT_ZOOM(0.734)
#       k = 0.970 -> 10.8px    the current floor
#       k = 0.912 -> 10.2px    maths_chapter1, all 11 cards on one sheet
#       k = 0.880 ->  9.8px    COVER_HARD_MIN
COVER_HARD_MIN = 0.88

def tag_items(items):
    """Give every flow item a stable id so the settle probe can match a
    rendered element back to the item it came from, across repacks."""
    for it in items:
        if "id" not in it:
            _UID[0] += 1
            it["id"] = _UID[0]
    return items


def _ensure_dir(path):
    d = os.path.dirname(os.path.abspath(path))
    if d and not os.path.isdir(d):
        os.makedirs(d)


def _item_html(html, atomic=True, tag=""):
    """A bare HTML string as a flow item the packer can measure."""
    return dict(html=html, atomic=atomic, owner=None, tag=tag)


def _wrap(items):
    """Each flow item gets a `.u` wrapper.

    `.u` is not decoration. In a column it is `display:flow-root`, and in
    `.flowwrap` it is a plain block with 0.02px of vertical padding — both
    exist to stop the child's margins collapsing THROUGH the wrapper, so the
    height the packer measured is exactly the height the block occupies on
    the page. Drop the wrapper and every measurement is short by a margin.

    A Part-1 item also carries `revision-unit` and its IR kind. Part 1 is
    a DIFFERENT DESIGN from Part 2, not the same one with other content —
    denser prose, a bulleted सूत्र panel, a two-column त्रिक strip — and
    `.revision-unit` is the hook the whole of `elements/revision-flow`
    hangs on. `data-kind` carries the kind because one of those rules
    (`.revision-unit[data-kind="topic"]:not(:first-child)`) draws the
    dashed rule BETWEEN topics and must not draw it above the first.
    """
    out = []
    for it in items:
        cls = "u revision-unit" if it.get("revision") else "u"
        kind = it.get("kind") or ""
        out.append('<div class="%s" data-it="%s"%s>%s</div>'
                   % (cls, it.get("id", ""),
                      (' data-kind="%s"' % kind) if kind else "", it["html"]))
    return "".join(out)


def _page(inner, keep=False, cover=False):
    cls = "page"
    if cover:
        cls += " source-cover"
    if keep:
        cls += " keep"
    return '<div class="%s"><div class="sheet-body">%s</div></div>\n' % (cls, inner)


def _page_accent(items, prev):
    """A page's accent is whichever topic's `.u` items last started on it —
    the same `section`/`question` accent index `render.py` already tags
    each heading item with — carried forward from the previous page when
    nothing on this one starts a new topic (a page that is entirely a
    continuation carries the colour along, exactly as the reference does
    across a topic's multi-page runs)."""
    acc = prev
    for it in items:
        a = it.get("accent")
        if a is not None:
            acc = a
    return acc


def _accent_style(acc):
    """The reference's inline `--accent`/`--tint`, or "" for a page with no
    topic of its own (the cover)."""
    if acc is None:
        return ""
    _name, hexc, _fill, _hd = theme.ACCENTS[acc % len(theme.ACCENTS)]
    return ' style="--accent:%s;--tint:%s;"' % (hexc, theme.TINTS[acc % len(theme.TINTS)])


def _number_pages(pages, accents):
    """Stamp every page with its final 1-based number, footer, and (for a
    content page) its `--accent`/`--tint` custom properties — done in one
    pass, after `cover_pages` have already been spliced in, so the numbers
    the reader sees start at the cover and nothing after it drifts."""
    out = []
    for n, (pg, acc) in enumerate(zip(pages, accents), start=1):
        pg = pg.replace('">', '" data-page="%d"%s>' % (n, _accent_style(acc)), 1)
        foot = '<footer class="page-bottom"><span class="page-number">%d</span></footer>' % n
        i = pg.rfind("</div>")
        pg = pg[:i] + foot + pg[i:]
        out.append(pg)
    return out


def _flow_page(items, cards_html, head_html=""):
    return _page(head_html + '<div class="flowwrap">%s%s</div>'
                 % (R.aside_column(cards_html), _wrap(items)), keep=True)


# How much room the last Part-1 page must leave before Part 2 is invited onto
# it. Below this the two-column strip is too short for a question and its
# answer to read, and a cramped merge is worse than a clean break.
MERGE_MIN_H = 420


def _merged_page(flow_items, cards_html, left, right, head_html="", raw=""):
    """Part 1's last page, with Part 2 starting underneath it.

    A part used to be a hard page boundary — Part 1 packs as single-column
    `flowwrap` pages, Part 2 as two-column `acols` pages, and the two lists
    were simply concatenated. So when Part 1 closed with a five-line list,
    that list sat alone on a sheet with 1217px blank under it and Part 2
    opened the next one.

    Nothing about the boundary needed to be a page break; it was an artefact
    of the two layouts being paginated separately. The columns are sized to
    what the flow content actually leaves, so nothing above them moves.
    """
    # `raw` is a block that is already HTML — the cover's last spill sheet.
    # The boundary above the columns is the same boundary either way, so it
    # is the same page; only the thing sitting above them differs.
    top = raw or ('<div class="flowwrap">%s%s</div>'
                  % (R.aside_column(cards_html), _wrap(flow_items)))
    return _page(head_html + top
                 + '<div class="acols acols--tail">'
                   '<div class="acol">%s</div><div class="acol">%s</div></div>'
                 % (_wrap(left), _wrap(right)), keep=True)


def _acols_page(left, right):
    """One two-column sheet.

    A page holding any Part-1 unit is a `revision-flow` spread — the
    reference rules the gutter between its columns in blue and sizes the
    whole page for a crib sheet. The class is decided from the CONTENT,
    not from which packer ran, because the reference's last Part-1 page
    also carries Part 2's opening banner and is still ruled.

    A PART BANNER THAT OPENS THE PAGE SPANS IT, rather than sitting in
    the left column. The reference puts `.type-banner` directly in
    `.sheet-body`, above `.acols`, so "PART 1 · QUICK REVISION" runs the
    full measure; packed as an ordinary column item it was drawn at 449px
    with the right column starting level beside it, which read as a
    heading for the left column only. The packer still charges its column
    height, so hoisting it can only leave a page emptier than modelled,
    never overfull.
    """
    left = list(left)
    right = list(right)
    head = ""
    if left and left[0].get("tag") == "groupband":
        head = left[0]["html"]
        left = left[1:]
    rev = " revision-flow" if any(it.get("revision")
                                  for it in left + right) else ""
    return _page(head + '<div class="acols%s"><div class="acol">%s</div>'
                 '<div class="acol">%s</div></div>'
                 % (rev, _wrap(left), _wrap(right)))


def part_overview(part):
    """Summarise a question part straight from the IR.

    Works for ANY grouping — by year, by marks, by topic — because it only
    counts what the parser found. Nothing here knows the groups are years."""
    rows, tq, tm = [], 0, 0.0
    for ch in part.get("children", []):
        if ch["kind"] != "qgroup" or not ch.get("label"):
            continue
        qs = [q for q in ch.get("children", []) if q["kind"] == "question"]
        if not qs:
            continue
        marks = sum((q.get("marks") or 0) for q in qs)
        rows.append([ch["label"], str(len(qs)), ("%g" % marks) if marks else "—"])
        tq += len(qs)
        tm += marks
    if not rows:
        return None
    rows.append(["कुल", str(tq), ("%g" % tm) if tm else "—"])
    return dict(head=["वर्ग", "प्रश्न", "अंक"], rows=rows)


def part_notes(part, limit=4):
    """Any loose text at the top of a part becomes the cover's reading notes."""
    out = []
    for ch in part.get("children", []):
        if ch["kind"] == "qgroup":
            break
        if ch["kind"] == "para":
            out.append(ch["text"])
        elif ch["kind"] == "bullets":
            out.extend(ch["items"])
        if len(out) >= limit:
            break
    return out[:limit]


# ==========================================================================
# BUILD
# ==========================================================================
def build(md_path, out_path, mode="a4", only="all",
          settle=True, verbose=True, stem=None, subject=None):
    # `subject`, WHEN THE CALLER NAMES ONE, MUST WIN — not be re-detected.
    #
    # Without threading it through, this was the one call in the whole
    # pipeline that dropped an explicit `--subject`: step01 used it
    # correctly and reported the right profile, but THIS parse — the one
    # that actually drafts the page HTML every later step works from —
    # re-ran `_subjects.detect()` from scratch with no override. A physics
    # chapter that typesets units with `\mathrm{}` 407 times (this one)
    # scored above the chemistry threshold and silently built as chemistry
    # — wrong rubric, wrong splittable rules, wrong reaction handling —
    # while step01's own report still said "physics" and looked fine.
    doc = md_parser.parse(md_path, report=True, subject=subject)
    # The renderer needs the same profile the reader chose, so that
    # `split_payload` offers the kinds THIS subject can divide — tables in
    # biology, सूत्र panels in physics. Read from the doc rather than
    # re-detected, so the two can never disagree.
    R.set_profile(doc["meta"].get("subject"))
    ch = doc["chapter"]
    title = "अध्याय %s : %s" % (ch.get("num", ""), ch.get("title", ""))

    parts = doc["parts"]
    front = [p for p in parts if p.get("role") == "front"]
    body = [p for p in parts if p.get("role") != "front"]

    # The front matter becomes the COVER — its own page, built from the
    # chapter's analytics sections. It is not packed with Part 1: the
    # reference gives it a full sheet of its own.
    cover_pages = []
    # Set when the cover's last spill sheet is held back to share a page with
    # the start of the book — see `_merged_page`.
    cover_tail = None
    if front:
        # Take the stem from the CALLER, not from the output filename. step09
        # writes `build/<stem>/draft.html`, so deriving it gave "draft" and
        # the agent's decisions were never found.
        from book.core import artifact as _art
        _dec = _art.read_decisions(stem or os.path.basename(out_path).rsplit(".", 1)[0],
                                   "step03_content_tagger")
        cov = R.render_cover(front[0], ch, _dec)
        if cov:
            def _measure(html, width=None):
                w = int(theme.CONTENT_W if width is None else width)
                return paginate.measure([{"html": html}], w, mode=mode,
                                        extra_class="flowwrap cover")[0]["h"]

            def _fit_scale(html):
                """Largest k <= 1 whose reflowed-at-width cover fits one
                sheet — see the identical search in the old cover code this
                replaced; the maths does not change, only what it is
                applied to (one linear stack of sections, not two
                measured-and-balanced columns)."""
                h1 = _measure(html)
                if h1 <= theme.CONTENT_H:
                    return 1.0
                if (float(theme.CONTENT_H) / h1) < COVER_HARD_MIN:
                    return None
                lo, hi, best = COVER_HARD_MIN, 1.0, None
                for _ in range(6):
                    mid = (lo + hi) / 2.0
                    if _measure(html, theme.CONTENT_W / mid) * mid <= theme.CONTENT_H:
                        best, lo = mid, mid
                    else:
                        hi = mid
                return best

            def _scaled_page(html, k):
                if k >= 1.0:
                    return _page(html, keep=True, cover=True)
                wh = _measure(html, theme.CONTENT_W / k)
                fitted = ('<div class="cvfit" style="width:%.4f%%;'
                          'height:%dpx;transform:scale(%.4f)">%s</div>'
                          % (100.0 / k, int(wh * k), k, html))
                return _page(fitted, keep=True, cover=True)

            sections = cov["sections"]
            whole = cov["hero"] + "".join(sections)
            k = _fit_scale(whole)
            if k is not None and k >= COVER_HARD_MIN:
                cover_pages = [_scaled_page(whole, k)]
                front = []
            elif sections:
                # EVEN SHRUNK TO THE LEGIBILITY FLOOR, IT WOULD NOT FIT —
                # spill trailing SECTIONS onto as many further sheets as
                # needed, each one individually fitted the same way. The
                # unit here is a whole `front-section`, not a card: the
                # reference never splits one mid-table.
                sheets, cur, held = [], cov["hero"], []
                for sec_html in sections:
                    trial = cur + "".join(held) + sec_html
                    if not held or _measure(trial) <= theme.CONTENT_H:
                        held.append(sec_html)
                    else:
                        sheets.append(cur + "".join(held))
                        cur, held = "", [sec_html]
                if held:
                    sheets.append(cur + "".join(held))
                cover_pages = []
                for sh in sheets:
                    sk = _fit_scale(sh) or COVER_HARD_MIN
                    cover_pages.append(_scaled_page(sh, sk))
                # THE LAST SHEET IS NOT A PAGE OF ITS OWN, IF IT HAS ROOM
                # TO SPARE — held back and handed to the column packer as
                # `tail_merge`, so a short final section shares a sheet
                # with the start of Part 1 instead of leaving most of a
                # page blank. Only when unscaled (`sk == 1.0`): a shrunk
                # sheet's measured height no longer means what
                # `MERGE_MIN_H` assumes.
                if len(cover_pages) > 1 and (_fit_scale(sheets[-1]) or 0) >= 1.0:
                    last_h = _measure(sheets[-1])
                    if theme.CONTENT_H - last_h >= MERGE_MIN_H:
                        cover_tail = dict(raw=sheets[-1],
                                          free=theme.CONTENT_H - last_h)
                        cover_pages = cover_pages[:-1]
                front = []
    # EVERY PART IS PACKED INTO TWO COLUMNS, Part 1 included.
    #
    # A "revision part" is one whose children are sections (Part-1 shaped)
    # rather than question groups. It used to be routed to a separate
    # single-column `flowwrap` packer, with the chapter's sticky notes
    # floated into a 300px margin column — and that was kept as the default
    # because "Part 1 is written around a 300px margin column of sticky
    # notes and full-width सूत्र panels that clear it, and neither has
    # anywhere to go in a 449px column".
    #
    # The reference settles it: its Part 1 IS two columns (four
    # `.acols.revision-flow` spreads, ruled down the gutter), it has no
    # floated note column anywhere in the book (zero `.stickycol` — a note
    # is set inline as a `.derivation-note`), and its सूत्र panel in Part 1
    # is a flat bulleted `.formula-list`, not a row of boxed results that
    # needs the full measure. So neither of the two things the margin
    # column existed for is true of the design any more, and at full width
    # a one-line सूत्र row left three-quarters of the measure empty — the
    # ~880px holes at the foot of every Part-1 page.
    #
    # The classification stays, because Part 1 still gets a DIFFERENT SKIN
    # (`.revision-unit`); only the routing changed.
    flow_parts, col_parts, revision_parts = list(front), [], []
    for p in body:
        kids = p.get("children") or []
        if kids and any(k["kind"] == "section" for k in kids) and \
                not any(k["kind"] == "qgroup" for k in kids):
            revision_parts.append(id(p))
        col_parts.append(p)

    # `--only` selects a half of the book. Both halves are column parts
    # now, so the filter is on the part's SHAPE rather than on which list
    # it landed in.
    if only == "part1":
        col_parts = [p for p in col_parts if id(p) in revision_parts]
    elif only == "part2":
        col_parts = [p for p in col_parts if id(p) not in revision_parts]
        flow_parts = []

    ctx = dict(accent=0)
    sections_html = []
    # Parallel to `sections_html` — the resolved topic-accent index for each
    # entry, `None` for the cover (see `_page_accent`/`_number_pages`).
    page_accents = []
    _acc = [0]

    # ---- scroll mode: one continuous document, no pagination at all -----
    # The browser flows `.cols2` itself; running the packer here would
    # invent page breaks the reader never sees.
    if mode == "flow":
        out = []
        for p in flow_parts:
            cards = R.collect_asides(p)
            body_items = R.render_part(p, ctx)
            out.append('<div class="page"><div class="flowwrap">%s%s</div></div>'
                       % (R.aside_column([R.render_card(c, 1.6 if i % 2 == 0 else -1.4)
                                          for i, c in enumerate(cards)]),
                          "".join(x["html"] for x in body_items)))
        for p in col_parts:
            head = C.part_cover(p["label"], p.get("sub", ""), title,
                                overview=part_overview(p),
                                notes=part_notes(p)) if p.get("label") else ""
            out.append('<div class="page">%s<div class="cols2">%s</div></div>'
                       % (head, "".join(x["html"] for x in R.render_part(p, ctx))))
        html = R.document(title, "".join(out), mode=mode)
        _ensure_dir(out_path)
        io.open(out_path, "w", encoding="utf-8").write(html)
        if verbose:
            kinds = dict(count_kinds(doc["parts"]))
            print("build: %s  (scroll mode)" % os.path.basename(out_path))
            print("  blocks  : %d" % sum(kinds.values()))
            print("  slots   : %d" % html.count('class="slot'))
        return out_path, 0, doc

    # Set by the flow loop when Part 1's last page has room for Part 2 to
    # begin on it. Consumed by the FIRST column part only.
    #
    # The cover's held-back sheet seeds it when there is no flow half — with
    # a flow half the cover is followed by flow pages, not column pages, and
    # merging it into the columns would jump the book's order.
    tail_merge = cover_tail if (cover_tail and not flow_parts) else None

    # ---------------------------------------------------------------- flow
    # FRONT MATTER THAT NEVER BECAME A COVER.
    #
    # `flow_parts` used to be Part 1 as well; every body part now goes
    # through the column packer (see the classification above), so what is
    # left here is only front matter a chapter wrote but the cover builder
    # did not consume. It is prepended to the column stream rather than
    # packed on its own, so it cannot open a page of its own.
    flow_raw = []
    for p in flow_parts:
        if p.get("label"):
            flow_raw.append(_item_html(C.part_banner(p.get("label", ""),
                                                     p.get("sub", "")),
                                       tag="groupband"))
        flow_raw.extend(R.render_part(p, dict(ctx, inline_asides=True)))

    # ------------------------------------------------------------- columns
    # ONE STREAM FOR EVERY COLUMN PART.
    #
    # Each part used to get its own `pack_columns` run and its own list of
    # pages, and the lists were concatenated — so a part boundary was a hard
    # page boundary that nothing had asked for. Measured on chapter 4 with
    # Part 1 in columns:
    #
    #     page 10  col0 free 210   col1 free  237
    #     page 11  col0 free 785   col1 free 1432   <- 2217px, Part 1's last
    #     page 12  col0 free 218   col1 free  246   <- Part 2 starts fresh
    #
    # One column two-thirds empty and the next completely empty, because the
    # questions began a new pagination run instead of continuing where the
    # revision text stopped. Packed as one stream they simply carry on.
    raw = list(flow_raw)
    for p in col_parts:
        # WHEN THE PART OPENS ON A QUESTION-FORMAT GROUP, ITS MASTHEAD
        # FOLDS INTO THAT GROUP'S BANNER.
        #
        # "PART 2 · QUESTIONS & ANSWERS" belongs INSIDE the first
        # `.type-banner`, above the format heading and sharing its layered
        # purple card — that is the one place the reference draws a
        # `questions-banner`. Emitted as a separate banner above it, the
        # masthead printed as its own block and the format heading below
        # it got the plain skin.
        #
        # Two ways a Part 2 can arrive at that shape: `_regroup_by_qtype`
        # built the buckets (and set `part_label` itself), or the source
        # was already written format-first, in which case the label is
        # tagged here. Both end up in the same banner.
        _first = (p.get("children") or [{}])[0]
        if (p.get("label") and _first.get("kind") == "qgroup"
                and not _first.get("_qtype_banner")
                and R.is_qtype_label(_first.get("label", ""))):
            _first["part_label"] = p.get("label", "")
            _first["part_sub"] = p.get("sub", "")
        # A two-column part has no margin column, so a section's sticky notes
        # must be set inline or they render nowhere at all.
        part_raw = R.render_part(p, dict(ctx, inline_asides=True,
                                         revision=id(p) in revision_parts))
        _self_announced = bool(_first.get("part_label"))
        if p.get("label") and not _self_announced:
            # ABOVE the banner of the FIRST part: the cover cards that
            # would otherwise have needed a second cover sheet.
            #
            part_raw.insert(0, _item_html(
                C.part_banner(p.get("label", ""), p.get("sub", "")),
                atomic=True, tag="groupband"))
        # What carries "this is Part 1" all the way to the page: `_wrap`
        # turns it into `.revision-unit`, `_acols_page` into
        # `.revision-flow`. Set on the part's items rather than on the
        # page, because the reference's last Part-1 spread also holds
        # Part 2's opening banner and is still ruled as a revision page.
        if id(p) in revision_parts:
            for it in part_raw:
                it["revision"] = True
        raw.extend(part_raw)

    if raw:
        items = tag_items(paginate.measure(raw, int(theme.COL_W), mode=mode))

        # Part 1's held-back last page, if the flow half left room on it.
        merge = tail_merge

        def pack_cols(its, _merge=merge):
            cs = []
            rest = its
            if _merge:
                # Pack a first page whose columns are only as tall as the
                # flow content left free. `pack_columns` takes a height, so
                # this needs no new packer — just a shorter one for one page.
                short = paginate.pack_columns(its, col_h=_merge["free"], cols=2)
                took = sum(len(c) for c in short[0]) if short else 0
                if took:
                    first = short[0]
                    cs.extend([first[0] if len(first) > 0 else [],
                               first[1] if len(first) > 1 else []])
                    rest = its[took:]
            for pg in paginate.pack_columns(rest, cols=2):
                cs.extend([pg[0] if len(pg) > 0 else [], pg[1] if len(pg) > 1 else []])
            return cs

        def render_cols(cs, _merge=merge):
            out = []
            i = 0
            if _merge and cs:
                out.append(_merged_page(
                    _merge.get("items") or [], _merge.get("cards") or [],
                    cs[0], cs[1] if len(cs) > 1 else [],
                    _merge.get("head", ""), _merge.get("raw", "")))
                i = 2
            while i < len(cs):
                out.append(_acols_page(cs[i], cs[i + 1] if i + 1 < len(cs) else []))
                i += 2
            return R.document(title, "".join(out), mode=mode)

        cols = (paginate.settle(items, pack_cols, render_cols, verbose=verbose)
                if (settle and mode == "a4") else pack_cols(items))

        if settle and mode == "a4":
            # The same panel-splitting pass the flow half gets. It only ever
            # ran there, because every helper in `layout/split.py` filtered to
            # single-column pages — so a six-row सूत्र panel in a 449px column
            # sat above several hundred px of dead space with no way to use
            # it. A column is the packing unit here exactly as a page is
            # there, so keying free space by column is the whole adaptation.
            _rebuild_c = R.rebuild_split

            def _measure_c(new_items):
                paginate.measure(new_items, int(theme.COL_W), mode=mode,
                                 extra_class="acol")
                return tag_items(new_items)

            # Judged on the worst hole OR the total, not the worst hole
            # alone. `worst_hole` is a single global maximum, so a split that
            # fills a 400px hole in one column changes it not at all and was
            # reverted — the pass kept one split worth 19px and threw away
            # two that each reclaimed real space somewhere else. Filling any
            # column's dead space is worth doing; a panel that breaks over a
            # boundary reads perfectly well, which is the whole premise of
            # the pass existing.
            MIN_TOTAL_GAIN = 120
            best_c = splitter.worst_hole_columns(render_cols(cols))
            best_tot = splitter.dead_space_columns(render_cols(cols))
            tried_c = set()
            # Judged LOCALLY, on the hole the split aimed at.
            #
            # A global total cannot be used: `settle` only ratchets heights
            # up, so re-settling after a split inflates them and the total
            # rises by more than the split reclaimed — measured at +729px
            # while the target hole itself was filled. Every split therefore
            # measured "worse" and was reverted, which is why half a सूत्र
            # panel stopped moving up into 555px of empty column.
            MIN_LOCAL_GAIN = 120
            # More rounds. One split per round, and six rounds meant the pass
            # stopped while holes were still open — it managed three
            # attempts on this chapter and then gave up. With the candidate
            # order now largest-hole-first, extra rounds go to the holes
            # that are actually worth the render they cost.
            for _ in range(24):
                trial = [dict(x) for x in items]
                rep = {}
                before_free = splitter.free_by_column(render_cols(cols)) or {}
                trial, changed = splitter.split_pass(
                    trial, cols, render_cols, _rebuild_c, _measure_c,
                    verbose=verbose, tried=tried_c, report=rep,
                    free_fn=splitter.free_by_column,
                    # ONE row is enough to move up. `min_rows=4` with
                    # `min_keep=2` meant a panel needed four rows to split at
                    # all and a three-row panel could never be halved — so a
                    # two-row सूत्र card under 300px of empty column was
                    # excluded by rule rather than by measurement.
                    # TWO rows, keeping ONE. Four-with-two meant a panel
                    # needed four rows to split at all and a three-row panel
                    # could never be halved — so a two-row सूत्र card sitting
                    # under 300px of empty column was excluded by rule rather
                    # than by measurement. A single row moved up is still a
                    # row that was not going to be printed there.
                    #
                    # The earlier note here argued for SIX rows, because a
                    # split of four measured worse. That was true while the
                    # pass was judged on the global total, which `settle`
                    # inflates; judged on the hole it actually targets, a
                    # small split either fills the hole or is reverted on its
                    # own evidence.
                    min_rows=2, min_keep=1)
                if not changed:
                    break
                tcols = paginate.settle(trial, pack_cols, render_cols,
                                        verbose=False)
                trial_html = render_cols(tcols)
                got_c = splitter.worst_hole_columns(trial_html)
                got_tot = splitter.dead_space_columns(trial_html)
                after_free = splitter.free_by_column(trial_html) or {}
                tgt = rep.get("target")
                local_gain = 0
                if tgt is not None and tgt in before_free and tgt in after_free:
                    local_gain = before_free[tgt] - after_free[tgt]
                better_local = local_gain >= MIN_LOCAL_GAIN
                better_worst = (best_c is not None and got_c is not None
                                and got_c < best_c)
                better_total = (best_tot is not None and got_tot is not None
                                and got_tot <= best_tot - MIN_TOTAL_GAIN)
                if splitter.overflows(trial_html):
                    if verbose:
                        print("  split(col): reverted — it left a column overfull")
                    continue
                if not (better_local or better_worst or better_total):
                    if verbose:
                        print("  split(col): reverted — hole %+dpx, worst %s->%s, "
                              "total %s->%s"
                              % (-local_gain, best_c, got_c, best_tot, got_tot))
                    continue
                if verbose:
                    print("  split(col): kept — filled %dpx of the target hole "
                          "(worst %s->%s, total %s->%s)"
                          % (local_gain, best_c, got_c, best_tot, got_tot))
                items, cols = trial, tcols
                best_c = got_c if got_c is not None else best_c
                best_tot = got_tot if got_tot is not None else best_tot
        # A LAST SHEET HOLDING ONE LINE.
        #
        # Chapter 19 ended on a page carrying only "आगे बढ़ो; वापस मत आना।" —
        # 2825px of a 2864px sheet blank — while the column before it
        # measured 164px spare and the line needed about 39. The packer was
        # not wrong: it packs against model heights, which are upper bounds,
        # and `settle` only ratchets them UP, so a column it believed was
        # full can measure a long way from it. Nothing reconsidered that.
        cols, tail_moved = splitter.absorb_tail_page(
            cols, render_cols, splitter.free_by_column, splitter.overflows,
            verbose=verbose)

        # RECLAIM WHAT THE HEIGHT MODEL OVER-CHARGED.
        #
        # `settle` corrects heights UPWARD only, and with the overflow
        # probe now able to see content spilling a fixed-height
        # `.sheet-body` it makes several hundred corrections a build.
        # Every one of those is an upper bound the packer then packs
        # against, so columns close while they still have room: a column
        # measuring 285px free with the next column opening on a 126px
        # block. This moves such a block back, by MEASUREMENT — render,
        # see which columns really have space, move one, keep it only if
        # the render still has no overflow. Runs last, after the splitter
        # has already done what it can, because both passes compete for
        # the same free space and the splitter's gains are the bigger
        # ones.
        cols = paginate.pull_up_columns(
            cols, render_cols, splitter.free_by_column, splitter.overflows,
            verbose=verbose)

        i = 0
        if merge and cols:
            sections_html.append(_merged_page(
                merge.get("items") or [], merge.get("cards") or [],
                cols[0], cols[1] if len(cols) > 1 else [],
                merge.get("head", ""), merge.get("raw", "")))
            _acc[0] = _page_accent((merge.get("items") or []) + cols[0]
                                   + (cols[1] if len(cols) > 1 else []), _acc[0])
            page_accents.append(_acc[0])
            i = 2
        elif merge:
            # Nothing fitted after all — the held-back page still has to be
            # emitted, or Part 1's last page (or the cover's last sheet)
            # would vanish from the book.
            sections_html.append(
                _page(merge["raw"], keep=True) if merge.get("raw")
                else _flow_page(merge["items"], merge["cards"],
                                merge["head"]))
            _acc[0] = _page_accent(merge.get("items") or [], _acc[0])
            page_accents.append(_acc[0])
        while i < len(cols):
            sections_html.append(_acols_page(cols[i], cols[i + 1] if i + 1 < len(cols) else []))
            _acc[0] = _page_accent(cols[i] + (cols[i + 1] if i + 1 < len(cols) else []), _acc[0])
            page_accents.append(_acc[0])
            i += 2

    # ------------------------------------------------------------- numbers
    #
    # THE COVER MUST BE SPLICED IN *BEFORE* NUMBERING, NOT AFTER.
    #
    # The old `--page-numbers` chrome numbered `sections_html` and only then
    # inserted `cover_pages` ahead of it — so with numbering on, the cover
    # itself was never numbered and every page after it was off by the
    # cover's own page count. Splice first; number the finished book once.
    for i, cp in enumerate(cover_pages):
        sections_html.insert(i, cp)
        page_accents.insert(i, None)
    sections_html = _number_pages(sections_html, page_accents)

    html = R.document(title, "".join(sections_html), mode=mode)
    _ensure_dir(out_path)
    io.open(out_path, "w", encoding="utf-8").write(html)

    if verbose:
        kinds = dict(count_kinds(doc["parts"]))
        print("build: %s" % os.path.basename(out_path))
        print("  chapter : %s" % title)
        print("  pages   : %d" % len(sections_html))
        print("  blocks  : %d" % sum(kinds.values()))
        print("  slots   : %d  (reserved space for art not yet made)" % html.count('class="slot'))
        print("  kinds   : %s" % json.dumps(kinds, ensure_ascii=False, sort_keys=True))
    return out_path, len(sections_html), doc


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--md", default=os.path.join(ROOT, "content", "17_reader_edition.md"))
    ap.add_argument("--out", default=os.path.join(ROOT, "build", "chapter-01.html"))
    ap.add_argument("--mode", default="a4", choices=["a4", "flow"])
    ap.add_argument("--only", default="all", choices=["all", "part1", "part2"])
    ap.add_argument("--no-settle", action="store_true")
    ap.add_argument("--verify", action="store_true")
    a = ap.parse_args()

    out, n, _ = build(a.md, a.out, mode=a.mode, only=a.only,
                      settle=not a.no_settle)

    if a.verify and a.mode == "a4":
        bad = paginate.verify_pages(out)
        if bad is None:
            print("verify: could not run")
        elif bad:
            print("verify: %d page(s) OVERFLOW:" % len(bad))
            for b in bad[:12]:
                print("   page %-3s used %spx > limit %spx" % (b["page"], b["used"], b["limit"]))
            sys.exit(1)
        else:
            print("verify: all %d pages fit" % n)


if __name__ == "__main__":
    main()
