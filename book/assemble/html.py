# -*- coding: utf-8 -*-
"""
HTML ASSEMBLER — IR + layout decisions -> the finished document.

    md -> parse -> IR -> render -> measure -> pack -> settle -> A4 -> html

    python3 book/build.py --md content/17_reader_edition.md --out chapter-01.html
    python3 book/build.py --md … --mode flow          # continuous scroll
    python3 book/build.py --md … --only part1         # Quick Revision edition
    python3 book/build.py --md … --only part2         # Yearwise PYQ edition
    python3 book/build.py --md … --page-numbers       # optional header/footer

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
                           pull_up as _pull_up)
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
    the page. Drop the wrapper and every measurement is short by a margin."""
    return "".join('<div class="u" data-it="%s">%s</div>' % (it.get("id", ""), it["html"])
                   for it in items)


def _page(inner, keep=False, num=None, head=None):
    cls = "page keep" if keep else "page"
    chrome = ""
    if head:
        chrome += '<div class="page__head">%s</div>' % head
    if num is not None:
        chrome += '<div class="page__no">%d</div>' % num
    return '<div class="%s">%s%s</div>\n' % (cls, chrome, inner)


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
    return _page('<div class="acols"><div class="acol">%s</div>'
                 '<div class="acol">%s</div></div>' % (_wrap(left), _wrap(right)))


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
def build(md_path, out_path, mode="a4", only="all", chrome=False,
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
    # Cover cards that did not fit ONE sheet and were moved below the Part 1
    # banner instead. See the one-sheet policy in the cover block below.
    cover_overflow = []
    if front:
        # Take the stem from the CALLER, not from the output filename. step09
        # writes `build/<stem>/draft.html`, so deriving it gave "draft" and
        # the agent's decisions were never found.
        from book.core import artifact as _art
        _dec = _art.read_decisions(stem or os.path.basename(out_path).rsplit(".", 1)[0],
                                   "step03_content_tagger")
        parts = R.render_cover(front[0], ch, _dec)
        if parts:
            def _measure(html, width=None):
                w = int(theme.CONTENT_W if width is None else width)
                return paginate.measure([{"html": html}], w, mode=mode,
                                        extra_class="flowwrap cover")[0]["h"]

            # A card lives in one of two grid columns, so it must be measured
            # at COLUMN width. Measured at page width it comes out shorter
            # than it will be on the page, and the balance is struck on
            # numbers that never happen.
            def _card_h(html):
                return _measure(html, theme.CONTENT_W / 2.0)

            # THE SCALE MUST BE SOLVED FOR, NOT DIVIDED OUT.
            #
            # `.cvfit` does not just shrink — it sets `width:100/k %` and THEN
            # `scale(k)`, so the box the cards lay out in gets WIDER as k gets
            # smaller. Wider means less wrapping, which means the content is
            # genuinely SHORTER than the height measured at CONTENT_W. So
            # `k = CONTENT_H / measured_at_CONTENT_W` is not the answer to
            # "what scale fits?" — it is a lower bound on it, and using it
            # directly threw away type size for nothing. On maths_chapter1 it
            # picked 0.912 for a cover that fits at 0.973: 10.2px of printed
            # type where 10.9px was available, a shrink that took it under the
            # 11px floor when it never had to go there.
            #
            # `h(k) * k` is monotone in k (a wider box never gets taller), so
            # a short bisection finds the largest k that fits. Six rounds is
            # +/-0.008 of scale — finer than the difference is visible — and
            # costs six measurements on a page that is measured anyway.
            _scale_memo = {}

            def _fit_scale(html):
                """Largest k <= 1 whose reflowed-at-width cover fits one sheet."""
                if html in _scale_memo:
                    return _scale_memo[html]
                h1 = _measure(html)
                if h1 <= theme.CONTENT_H:
                    _scale_memo[html] = 1.0
                    return 1.0
                lo, hi, best = COVER_HARD_MIN, 1.0, None
                # Cheap reject: even the theoretical bound is below the floor.
                if (float(theme.CONTENT_H) / h1) < COVER_HARD_MIN:
                    _scale_memo[html] = None
                    return None
                for _ in range(6):
                    mid = (lo + hi) / 2.0
                    if _measure(html, theme.CONTENT_W / mid) * mid <= theme.CONTENT_H:
                        best, lo = mid, mid
                    else:
                        hi = mid
                _scale_memo[html] = best
                return best

            # ONE SHEET FIRST.
            #
            # The cover is the chapter's front page and reads as one: spilling
            # it onto a second sheet splits the analytics in half and wastes
            # most of the second page. So before dropping any card, try the
            # whole thing scaled down to fit — smaller cards, smaller type,
            # everything still there.
            #
            # Only if that would take it below COVER_MIN_SCALE — where the
            # 14.5px table type stops being readable in print — does it fall
            # back to spilling.
            # Even the two columns by MEASURED height before anything else.
            # Role decides where a card starts, but only a measurement can
            # tell that three bar charts outweigh five notes.
            _bl, _br = R.balance_cover_columns(parts, _card_h)
            parts["left"], parts["right"] = _bl, _br

            # ONE COVER PAGE, BY MOVING A CARD OFF IT — NOT BY SHRINKING.
            #
            # Measured on chapter 6: the cards total 3625px, or 1812px per
            # column against the 1226px left after the 206px hero. Scaling
            # that to one sheet needs k = 0.79, which prints the smallest
            # cover type at 8.8px — under the 11px floor. That is why it
            # "fitted" before and could not be read.
            #
            # One card is 1133px of the 3625: the अनुक्रमणिका. It is a CONTENTS
            # LISTING, not cover analytics, and every textbook gives contents
            # a page of its own. Moved off, the remaining cards fit one sheet
            # at full size.
            #
            # So the tallest cards are moved out until the rest fits, and they
            # are emitted on the page after — nothing is dropped, and the
            # cover is one page at a size a reader can use.
            #
            # THE CANDIDATE POOL IS FLAT CARDS *AND* FULL-WIDTH ONES.
            #
            # Chapter 1's `full` list carries a card the two-column stack
            # never sees — "प्रश्न किस तरीके से आते हैं", four stat boxes
            # side by side — and at 463px it alone is bigger than any flat
            # card on the page. Only ever trimming the two-column stack
            # made it untouchable, so three small flat cards (topic
            # frequency, reading order, most-repeated derivation — exactly
            # the "at a glance" cards a reference cover carries) had to be
            # moved to Part 1 to free the room ONE full card would have
            # cleared by itself. Comparing both pools and moving whichever
            # single card is tallest fits more of the cover's actual
            # highlights before it reaches for the smaller ones.
            # ONE SHEET FIRST — AND THAT MEANS *BEFORE* THE TRIM LOOP.
            #
            # The block comment above states the policy exactly: "before
            # dropping any card, try the whole thing scaled down to fit".
            # The loop below did not implement it. It ran first and
            # unconditionally moved the tallest card off the cover until the
            # remainder fitted at scale 1.0, so the `k >= COVER_MIN_SCALE`
            # branch further down only ever saw an ALREADY-TRIMMED set and
            # the scale-to-fit path was unreachable for the case it was
            # written for.
            #
            # Measured on maths_chapter1: eleven cards balance to 1195px a
            # column against a 1192px budget (1432 content less a 240px
            # hero). Three pixels. The loop answered that by exiling the
            # 471px `✅ किस क्रम में पढ़ना है` steps card into Part 1 — where
            # it landed between the last Part-1 section and the PART 2
            # banner, reading as neither — and left ~466px of the summary
            # blank. Scaling instead needs k = 1192/1195 = 0.9975, which is
            # not far above COVER_MIN_SCALE (0.97), it is very nearly 1:
            # the smallest cover type goes from 15.2px to 15.16px.
            #
            # So: measure the untrimmed cover once, and if it is within the
            # scale floor, keep every card and let the `elif k >=
            # COVER_MIN_SCALE` branch set it. Only a cover that genuinely
            # cannot be scaled into one sheet reaches the trim loop.
            _keep_all = max(len(parts["left"]), len(parts["right"]))
            _whole0, _left0 = R.cover_pages_html(parts, _keep_all, full_on_1=True)
            _k0 = _fit_scale(_whole0) if not _left0 else None
            _fits_scaled = _k0 is not None
            if _fits_scaled and _k0 < COVER_MIN_SCALE and verbose:
                print("  cover  : one sheet at scale %.3f — smallest type "
                      "prints at %.1fpx (floor 11px)" % (_k0, 15.2 * _k0 * 0.734))

            moved = []
            while not _fits_scaled:
                flat = [c for c in (parts["left"] + parts["right"])]
                full = list(parts["full"])
                if len(flat) + len(full) <= 3:
                    break
                trial, spill = R.cover_pages_html(
                    parts, max(len(parts["left"]), len(parts["right"])),
                    full_on_1=True)
                if not spill and _measure(trial) <= theme.CONTENT_H:
                    break
                flat_tallest = max(flat, key=_card_h) if flat else None
                full_tallest = max(full, key=_measure) if full else None
                if full_tallest is not None and (
                        flat_tallest is None
                        or _measure(full_tallest) >= _card_h(flat_tallest)):
                    tallest, from_full = full_tallest, True
                else:
                    tallest, from_full = flat_tallest, False
                moved.append(tallest)
                if from_full:
                    parts["full"] = [c for c in parts["full"] if c is not tallest]
                else:
                    parts["left"] = [c for c in parts["left"] if c is not tallest]
                    parts["right"] = [c for c in parts["right"] if c is not tallest]
                    parts["left"], parts["right"] = R.balance_cover_columns(
                        dict(parts, flat=parts["left"] + parts["right"]), _card_h)

            keep_all = max(len(parts["left"]), len(parts["right"]))
            whole, leftover = R.cover_pages_html(parts, keep_all, full_on_1=True)
            if not leftover:
                k = _fit_scale(whole) or 0.0
                # The laid-out height AT THE SCALED WIDTH — the box `.cvfit`
                # actually gets. Measuring at CONTENT_W here set an explicit
                # height taller than the content, which is where the summary's
                # trailing white band came from.
                wh = (_measure(whole, theme.CONTENT_W / k) if 0 < k < 1.0
                      else _measure(whole))
                if k >= 1.0:
                    cover_pages = [_page(whole, keep=True)]
                    # The cards moved off the cover go BELOW the Part 1
                    # banner, not onto a second cover sheet.
                    #
                    # "Everything above `PART 1 · त्वरित रिवीज़न` is the cover"
                    # — so a second sheet before that banner is still a cover
                    # page, and putting the अनुक्रमणिका there did not make the
                    # cover one page, it just moved the problem. Below the
                    # banner it is the first thing in Part 1, which is where a
                    # contents listing belongs.
                    cover_overflow.extend(moved)
                    front = []
                elif k >= COVER_HARD_MIN:
                    # An explicit height because `transform` leaves the layout
                    # box unchanged — without it the packer still sees the
                    # unscaled height and calls the page overfull.
                    fitted = ('<div class="cvfit" style="width:%.4f%%;'
                              'height:%dpx;transform:scale(%.4f)">%s</div>'
                              % (100.0 / k, int(wh * k), k, whole))
                    cover_pages = [_page(fitted, keep=True)]
                    front = []
            if front:
                # Walk the number of cards on sheet 1 down until it measures
                # under the page height. Same discipline as every other page.
                keep = max(len(parts["left"]), len(parts["right"]))
                while keep >= 0:
                    p1, p2 = R.cover_pages_html(parts, keep)
                    if _measure(p1) <= theme.CONTENT_H or keep == 0:
                        break
                    keep -= 1
                # If the full-width cards also fit on sheet 1, put them there —
                # a second sheet carrying one short card is a wasted page.
                t1, t2 = R.cover_pages_html(parts, keep, full_on_1=True)
                if _measure(t1) <= theme.CONTENT_H:
                    p1, p2 = t1, t2
                cover_pages = [_page(p1, keep=True)]
            # The spill is measured too, and split across as many sheets as it
            # needs. It used to be emitted unchecked — see cover_spill_html.
                spill = R.cover_spill_html(
                    parts, keep, p1 is t1,
                    lambda html: _measure(html) <= theme.CONTENT_H,
                    height_of=_card_h)
                # THE LAST COVER SHEET IS NOT A PAGE OF ITS OWN.
                #
                # The maths cover's final sheet carried one card of eleven
                # words and 1250px of nothing, and Part 1 opened the sheet
                # after it. The part boundary below Part 1 already merges
                # this way — a layout boundary is not a reason for a page
                # break. Held back here and handed to the column packer as
                # `tail_merge`, the card and the start of the book share a
                # sheet.
                if len(spill) > 1:
                    last_h = _measure(spill[-1])
                    if theme.CONTENT_H - last_h >= MERGE_MIN_H:
                        cover_tail = dict(raw=spill[-1],
                                          free=theme.CONTENT_H - last_h)
                        spill = spill[:-1]
                for sheet in spill:
                    cover_pages.append(_page(sheet, keep=True))
                front = []

    # a "flow part" is one whose children are sections (Part-1 shaped);
    # everything else is packed into two columns.
    #
    # `VIDYUT_PART1_COLUMNS=1` sends the section parts through the COLUMN
    # packer as well, so the revision half of the book is set in two columns
    # like the questions. It is an option rather than the default because the
    # two shapes are genuinely different: Part 1 is written around a 300px
    # margin column of sticky notes and full-width सूत्र panels that clear
    # it, and neither has anywhere to go in a 449px column. Build both and
    # compare before choosing.
    all_cols = os.environ.get("VIDYUT_PART1_COLUMNS") == "1"
    flow_parts, col_parts = list(front), []
    for p in body:
        kids = p.get("children") or []
        if (not all_cols) and kids and any(k["kind"] == "section" for k in kids) and \
                not any(k["kind"] == "qgroup" for k in kids):
            flow_parts.append(p)
        else:
            col_parts.append(p)

    if only == "part1":
        col_parts = []
    elif only == "part2":
        flow_parts = []

    ctx = dict(accent=0)
    sections_html = []

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
        html = R.document(title, "".join(out), mode=mode, chrome=False)
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
    if flow_parts:
        items, cards = [], []
        for p in flow_parts:
            cards.extend(R.collect_asides(p))
            if p.get("label"):
                # Before measurement: the packer needs a height for it, and a
                # block inserted afterwards has none.
                items.append(_item_html(C.part_banner(p.get("label", ""),
                                                      p.get("sub", "")),
                                        tag="groupband"))
            items.extend(R.render_part(p, ctx))

        narrow_w = int(theme.CONTENT_W - R.ASIDE_W - R.ASIDE_GUTTER)
        wide = paginate.measure([dict(x) for x in items], int(theme.CONTENT_W),
                                mode=mode, extra_class="flowwrap")
        narrow = paginate.measure([dict(x) for x in items], narrow_w,
                                  mode=mode, extra_class="flowwrap")
        for it, w, nw in zip(items, wide, narrow):
            it["h"], it["h_narrow"] = w["h"], nw["h"]

        card_items = [{"html": R.render_card(c, 1.6 if i % 2 == 0 else -1.4)}
                      for i, c in enumerate(cards)]
        if card_items:
            card_items = paginate.measure(card_items, R.ASIDE_W, mode=mode)

        # The reference opens Part 1 with the gold `partbanner` box, not a
        # plain centred title. The component existed but nothing called it,
        # so every Part-1 opening page was missing its banner.
        # The part banner is a FLOW block, not a page header. The reference
        # lets it take the width it is given — 624px beside the note column,
        # 450px in a question column — so it sits in the rhythm of the page.
        # Emitted as a full-width page header it spanned all 944px and
        # dominated the sheet.
        _p = flow_parts[-1]
        head_html = ("" if _p.get("label")
                     else C.chapter_header(ch.get("num", ""), ch.get("title", ""),
                                           part_label=_p.get("sub", "")))
        head_h = paginate.measure([{"html": head_html}], int(theme.CONTENT_W),
                                  mode=mode)[0]["h"]

        tag_items(items)

        def pack_flow(its):
            """One sticky note per page; blocks beside it use the narrow
            height, blocks below it the wide one."""
            limit, units, cur = theme.CONTENT_H, [], []
            top = head_h + 24
            used, ci = top, 0
            for it in its:
                fb = (top + 16 + card_items[ci]["h"]) if ci < len(card_items) else 0
                # A block that CLEARS the float is never narrowed by it, so
                # size it wide even inside the float region. Sizing the wide
                # सूत्र panel at its narrow height (1029px vs 601px) made the
                # packer think it could not fit and pushed it to the next
                # sheet, leaving 886px of dead space behind it.
                if it.get("clears"):
                    hn = it["h"]
                else:
                    hn = max(it.get("h_narrow", 0), it["h"]) if used < fb else it["h"]
                h = hn + (paginate.GAP if used > top else 0)
                if used > top and max(used + h, fb) > limit:
                    units.append(cur)
                    cur, top, used, ci = [], 0, 0, ci + 1
                    fb = (16 + card_items[ci]["h"]) if ci < len(card_items) else 0
                    h = (it["h"] if it.get("clears")
                         else (max(it.get("h_narrow", 0), it["h"]) if fb else it["h"]))
                if os.environ.get("VIDYUT_DEBUG_PACK") and it.get("clears"):
                    sys.stderr.write("PACK clears-item: page=%d used=%d h=%d "
                                     "hwide=%s hnarrow=%s fb=%d limit=%d\n"
                                     % (len(units), used, h, it.get("h"),
                                        it.get("h_narrow"), fb, limit))
                cur.append(it)
                used += h
            if cur:
                units.append(cur)
            if os.environ.get("VIDYUT_DEBUG_PACK"):
                for pi, pg in enumerate(units):
                    sys.stderr.write("MODEL page=%d items=%d used=%d\n"
                                     % (pi, len(pg), model_used(pg, pi)))
            return units

        def model_used(pg, pi):
            """What `pack_flow` BELIEVES a page holds.

            The split pass has to size a head against this, not against the
            rendered page. The two differ — the model charges narrow heights
            inside the float region and settle only ratchets them up — and
            sizing to the real 886px free produced a head the packer then
            rejected at its own 828px, so the split bought nothing."""
            top_ = (head_h + 24) if pi == 0 else 0
            fbv = (top_ + 16 + card_items[pi]["h"]) if pi < len(card_items) else 0
            u = top_
            for n, x in enumerate(pg):
                xh = (x["h"] if x.get("clears")
                      else (max(x.get("h_narrow", 0), x["h"]) if u < fbv else x["h"]))
                u += xh + (paginate.GAP if n else 0)
            return u

        def render_flow(us):
            out = []
            for i, pg in enumerate(us):
                cards_html = [card_items[i]["html"]] if i < len(card_items) else []
                out.append(_flow_page(pg, cards_html, head_html if i == 0 else ""))
            return R.document(title, "".join(out), mode=mode, chrome=chrome)

        units = (paginate.settle(items, pack_flow, render_flow, verbose=verbose,
                                 wide_w=int(theme.CONTENT_W))
                 if (settle and mode == "a4") else pack_flow(items))

        if settle and mode == "a4":
            # Reclaim the dead space an atomic panel leaves at a page foot by
            # breaking the panel itself. Re-settle after each pass: the item
            # list has changed, so the pagination that produced it is stale.
            # Dispatches on the payload's kind — a सूत्र panel, a bullet
            # list or an option list. See `render.split_payload`.
            _rebuild = R.rebuild_split

            def _measure(new_items):
                paginate.measure(new_items, int(theme.CONTENT_W), mode=mode)
                for n in new_items:
                    n["clears"] = "fcard-wide" in n["html"]
                return tag_items(new_items)

            # Sizing a split against `model_used` was too conservative: on
            # chapter 3 the model put 72px of room on a page the browser
            # showed 469px of, so the split never fired. The rendered page is
            # the truth, so the split is sized against THAT and then verified
            # — keep the round only if the measured dead space actually fell.
            # A split that does not pay for itself is undone, which means a
            # wrong guess costs a render rather than a broken panel.
            # Judged on the WORST hole, not the total. Splitting a panel to
            # fill an 886px gap can nudge the total up while removing the one
            # page a reader would notice — which is the point of the pass.
            # Judged on the worst hole OR the total, matching the column
            # pass. Worst-hole alone threw away splits that reclaimed real
            # space on a page that simply was not the worst one — measured on
            # the column half, three of four splits were reverted for that
            # reason. `dead_space` is the flow equivalent of the column
            # pass's total.
            MIN_TOTAL_GAIN = 120
            best = splitter.worst_hole(render_flow(units))
            best_tot = splitter.dead_space(render_flow(units))
            tried = set()
            for _ in range(6):
                trial = [dict(x) for x in items]
                trial, changed = splitter.split_pass(
                    trial, units, render_flow, _rebuild, _measure,
                    verbose=verbose, tried=tried)
                if not changed:
                    break
                tunits = paginate.settle(trial, pack_flow, render_flow,
                                         verbose=False, wide_w=int(theme.CONTENT_W))
                trial_html = render_flow(tunits)
                got = splitter.worst_hole(trial_html)
                got_tot = splitter.dead_space(trial_html)
                better_worst = (best is not None and got is not None
                                and got < best)
                better_total = (best_tot is not None and got_tot is not None
                                and got_tot <= best_tot - MIN_TOTAL_GAIN)
                # A gain is not a gain if it clips a page.
                if splitter.overflows(trial_html):
                    if verbose:
                        print("  split: reverted — it left a page overfull")
                    continue
                if not (better_worst or better_total):
                    if verbose:
                        print("  split: reverted — worst %s->%s, total %s->%s"
                              % (best, got, best_tot, got_tot))
                    continue        # that panel is in `tried`; try the next
                if verbose:
                    print("  split: kept — worst %spx->%spx, total %spx->%spx"
                          % (best, got, best_tot, got_tot))
                items, units = trial, tunits
                best = got if got is not None else best
                best_tot = got_tot if got_tot is not None else best_tot
        # NOTE: a `pull_up` pass exists in layout/pack.py but is NOT enabled.
        # Measured on chapter 3 it reclaimed 18 blocks and then made the total
        # dead space slightly WORSE (5084px -> 5321px), because moving a block
        # up changes the float geometry on both pages and the following settle
        # re-inflates heights. Left in place, unused, with this note — it needs
        # to run INSIDE the settle loop rather than after it.
        # The LAST flow page is held back when a column part follows and the
        # page has real room left: it is emitted by the column loop instead,
        # with Part 2's first questions packed underneath it.
        hold = -1
        if col_parts and units:
            li = len(units) - 1
            free = theme.CONTENT_H - model_used(units[li], li)
            if free >= MERGE_MIN_H:
                hold = li
                tail_merge = dict(
                    items=units[li],
                    cards=[card_items[li]["html"]] if li < len(card_items) else [],
                    head=head_html if li == 0 else "",
                    free=free)
        for i, pg in enumerate(units):
            if i == hold:
                continue
            cards_html = [card_items[i]["html"]] if i < len(card_items) else []
            sections_html.append(_flow_page(pg, cards_html, head_html if i == 0 else ""))

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
    raw = []
    for p in col_parts:
        # A two-column part has no margin column, so a section's sticky notes
        # must be set inline or they render nowhere at all.
        part_raw = R.render_part(p, dict(ctx, inline_asides=True))
        if p.get("label"):
            # ABOVE the banner of the FIRST part: the cover cards that
            # would otherwise have needed a second cover sheet.
            #
            # These were inserted AFTER the banner (index 1, right below
            # it), on the reasoning that this is "directly under" the
            # banner rather than a second cover page. In practice a card
            # sandwiched between the banner and the part's own first
            # section reads as neither: it is still cover content — a
            # marks-distribution card, a "most repeated" table — and
            # putting it BELOW the "भाग 1 शुरू" marker makes it look like
            # Part 1's own first topic. Placed above the banner instead,
            # it reads as what it is: the tail end of the cover, spilling
            # onto this page because the cover sheet itself ran out of
            # room, with the banner still the first thing that visually
            # marks Part 1 as started.
            banner_pos = 0
            if cover_overflow:
                for card in cover_overflow:
                    part_raw.insert(banner_pos, _item_html(
                        '<div class="flowwrap cover cover-moved">%s</div>'
                        % card, atomic=True))
                    banner_pos += 1
                cover_overflow = []
            part_raw.insert(banner_pos, _item_html(
                C.part_banner(p.get("label", ""), p.get("sub", "")),
                atomic=True, tag="groupband"))
        raw.extend(part_raw)

    if raw:
        cover_html = ""
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

        def render_cols(cs, _cover=cover_html, _merge=merge):
            out = [_cover] if _cover else []
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
            return R.document(title, "".join(out), mode=mode, chrome=chrome)

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

        if cover_html:
            sections_html.append(cover_html)
        i = 0
        if merge and cols:
            sections_html.append(_merged_page(
                merge.get("items") or [], merge.get("cards") or [],
                cols[0], cols[1] if len(cols) > 1 else [],
                merge.get("head", ""), merge.get("raw", "")))
            i = 2
        elif merge:
            # Nothing fitted after all — the held-back page still has to be
            # emitted, or Part 1's last page (or the cover's last sheet)
            # would vanish from the book.
            sections_html.append(
                _page(merge["raw"], keep=True) if merge.get("raw")
                else _flow_page(merge["items"], merge["cards"],
                                merge["head"]))
        while i < len(cols):
            sections_html.append(_acols_page(cols[i], cols[i + 1] if i + 1 < len(cols) else []))
            i += 2

    # ------------------------------------------------------------- numbers
    if chrome:
        n = 0
        out = []
        for pg in sections_html:
            n += 1
            out.append(pg.replace('">', '"><div class="page__head">%s</div>'
                                        '<div class="page__no">%d</div>' % (title, n), 1))
        sections_html = out

    for i, cp in enumerate(cover_pages):
        sections_html.insert(i, cp)
    html = R.document(title, "".join(sections_html), mode=mode, chrome=chrome)
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
    ap.add_argument("--page-numbers", action="store_true",
                    help="header + page numbers (the reference book has neither)")
    ap.add_argument("--no-settle", action="store_true")
    ap.add_argument("--verify", action="store_true")
    a = ap.parse_args()

    out, n, _ = build(a.md, a.out, mode=a.mode, only=a.only, chrome=a.page_numbers,
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
