# -*- coding: utf-8 -*-
"""
SPLIT — break a splittable panel across a page boundary to reclaim dead space.

Most blocks are atomic: a सूत्र panel that does not fit in the 886px left at
the foot of a page moves to the next sheet whole, and those 886px are dead.
Part 1 of chapter 3 was carrying ~3.6 pages of exactly that.

But a सूत्र panel is a LIST. The reference book breaks one across two sheets
and simply repeats the `सूत्र` header on the continuation, so the split costs
nothing to the reader. This pass does the same, and only where a real render
says the room exists.

It runs BETWEEN settle passes rather than inside one. `settle` maps a
measured height back to an item by id, so any item it has to correct must be
a real member of the flat item list — which is why the split rewrites that
list (one item becomes two) and the caller then re-settles. Splitting inside
`pack_fn` would create items settle has never seen and cannot correct.
"""
import sys

from . import probe as _probe
from .pack import GAP


def dead_space(html):
    """Total free px on every single-column page except the last.

    The last page's slack is the end of the part, not waste. `None` when the
    probe fails, so a caller can tell "no measurement" from "no waste"."""
    space = _probe.empty_space_html(html)
    if space is None:
        return None
    flow = [r for r in space if r.get("cols") and len(r["cols"]) == 1]
    return sum(r["cols"][0]["free"] for r in flow[:-1])


def worst_hole(html):
    """The largest single run of free space on a non-final flow page.

    This, not the total, is what a reader notices: one page two-thirds empty
    reads as a mistake, while the same slack spread over six pages does not.
    A split is judged against it for that reason.
    """
    space = _probe.empty_space_html(html)
    if space is None:
        return None
    flow = [r for r in space if r.get("cols") and len(r["cols"]) == 1]
    return max([r["cols"][0]["free"] for r in flow[:-1]] or [0])


def _free_by_page(html):
    """Free px in each single-column page, keyed by page index (0-based)."""
    space = _probe.empty_space_html(html)
    if space is None:
        return None
    return {rec["page"] - 1: rec["cols"][0]["free"]
            for rec in space
            if rec.get("cols") and len(rec["cols"]) == 1}


# How much chrome the pass may step over to reach a divisible panel.
#
# Gated on KIND, not on height. The first attempt used a height limit, and
# the maths section head — number badge, title, rule and italic subtitle in
# one 152px block — failed it, which left the 787px सूत्र panel behind it
# unreachable and a 470px hole in the column beside it unfilled. A heading is
# chrome whatever it measures; a 109px paragraph is prose whatever it
# measures. The height limit only ever answered the wrong question.
#
# An empty kind is a section head — that is how the renderer emits them.
MAX_LEAD_BLOCKS = 3
LEAD_KINDS = ("", "secflag", "subtitle", "sectionhead", "kicker")


def split_pass(items, units, render_fn, rebuild, measure_fn, room_fn=None,
               min_free=200, min_rows=4, min_keep=2, verbose=True, tried=None,
               free_fn=None, report=None):
    """Split the first block of a page onto the page before it.

    `rebuild(payload, rows, cont) -> html` rebuilds the panel from a row
    subset; `cont` is True for the second half, which carries no heading.
    `measure_fn(new_items)` attaches a real `h` to each.

    Returns (items, changed). When `changed`, the caller must re-settle:
    the item list has been rewritten and the old pagination is stale.
    """
    # `free_fn` lets a two-column caller key free space by COLUMN instead of
    # by page; `units` is then the list of columns rather than of pages, and
    # the rest of the pass is unchanged.
    free = (free_fn or _free_by_page)(render_fn(units))
    if free is None:
        if verbose:
            sys.stderr.write("split: probe failed; leaving pagination alone\n")
        return items, False

    # Last page's slack is the end of the part, not dead space.
    tail_page = max(free) if free else -1
    done = 0
    # WHY each hole was left alone.
    #
    # The pass used to `continue` past every unusable hole in silence, so a
    # run that examined three candidates out of sixty holes looked identical
    # to a run that found nothing worth doing. The tally below is the answer
    # to "why are we not optimising this at all": almost always because the
    # block that follows the hole is not a सूत्र panel, and only a सूत्र
    # panel knows how to divide itself.
    skips = {}

    def _skip(why):
        skips[why] = skips.get(why, 0) + 1

    # BIGGEST HOLE FIRST.
    #
    # This used to be `sorted(free, reverse=True)`, which sorts the KEYS —
    # so the pass walked columns from the back of the book forwards and took
    # the first candidate it could use. One split per call and a capped
    # number of rounds meant the budget was spent on whatever holes happened
    # to lie late in the document, and a 523px hole on page 9 was never
    # examined at all while 300px holes on page 40 were.
    #
    # Ordering by the size of the hole spends each round where it can
    # reclaim the most. Ties break on index for a stable, reproducible pass.
    for i in sorted(free, key=lambda k: (-free[k], k)):
        if i == tail_page:
            continue
        if free[i] < min_free:
            _skip("hole under %dpx" % min_free)
            continue
        j = i + 1
        if j >= len(units) or not units[j]:
            continue
        # LOOK PAST THE HEADING.
        #
        # This used to take `units[j][0]` and nothing else, so a सूत्र panel
        # was only ever a candidate when it happened to be the very first
        # block of a column. On the maths cover page the panel sits behind a
        # section number, its title and an italic English subtitle — three
        # pieces of chrome — so a 470px hole in the column beside it was
        # skipped every round as "next block is untyped, which cannot
        # divide", and the panel the reader kept asking to see divided was
        # never examined at all.
        #
        # The blocks in front of the panel need no special handling: they
        # already precede it in `items`, so once the head is small enough the
        # packer flows heading-then-head into the hole in reading order by
        # itself. All the pass has to do is find the panel behind them and
        # charge their height to the room.
        cand, lead_h, lead_n = None, 0, 0
        for blk in units[j][:1 + MAX_LEAD_BLOCKS]:
            if blk.get("split"):
                cand = blk
                break
            # Only cheap chrome may be stepped over. A paragraph of prose in
            # front of the panel means the hole would swallow prose and half
            # a panel, which reads worse than the hole did.
            if (lead_n >= MAX_LEAD_BLOCKS
                    or (blk.get("kind") or "") not in LEAD_KINDS):
                break
            lead_h += blk.get("h", 0)
            lead_n += 1
        if cand is None:
            cand = units[j][0]
        payload = cand.get("split")
        # `tried` holds item ids the caller already split and rejected. The
        # id survives the caller's per-round copy of the item list, which the
        # dict's identity does not.
        if not payload:
            _skip("next block is %s, which cannot divide"
                  % (cand.get("kind") or "untyped"))
            # A big hole that cannot be used is worth naming. The tally says
            # how often the pass gave up; this says what it gave up ON, which
            # is the only way to tell "nothing divisible here" from "the
            # divisible block was two blocks further down than I looked".
            if verbose and free[i] >= 300:
                print("  split: %dpx hole at unit %d — next column starts %s"
                      % (free[i], i + 1,
                         ", ".join("%s/%dpx" % (b.get("kind") or "untyped",
                                                b.get("h", 0))
                                   for b in units[j][:5])))
            continue
        if cand.get("_split_done") or cand.get("id") in (tried or ()):
            _skip("panel already split or already rejected")
            continue
        rows = payload.get("rows") or []
        if len(rows) < min_rows:
            _skip("panel has %d row(s), under the %d-row minimum"
                  % (len(rows), min_rows))
            continue

        # Room the PACKER will grant, not room the browser shows. A head
        # sized to the rendered free space gets rejected by the model that
        # has to place it, and the hole survives the split.
        # The chrome in front of the panel travels with the head, so the
        # room left for the head itself is the hole minus that chrome.
        room = free[i] - GAP - lead_h
        if room_fn is not None:
            room = min(room, room_fn(i, units[i]) - GAP - lead_h)
        if room <= 0:
            continue
        # Measure every legal head in one batch, then take the largest that
        # fits. Estimating from a per-row average is wrong here: the panel is
        # two-column, so height moves in steps, not linearly.
        heads = [dict(k=k, html=rebuild(payload, rows[:k], False))
                 for k in range(min_keep, len(rows) - min_keep + 1)]
        if not heads:
            continue
        measure_fn(heads)
        # LEAVE THE RE-MEASURE SOME ROOM.
        #
        # `settle` only ever ratchets a height UP, so a head chosen because
        # it fits the hole EXACTLY re-measures a little taller once it is
        # placed and the packer pushes it straight back down — the split is
        # then reverted for filling 0px, which is what kept physics chapter
        # 9's twelve-point list out of an 810px column for the whole build
        # ("panel of 12 rows -> 11 + 1 … reverted — hole +0px"). Choosing
        # the largest head that fits with a line to spare costs at most one
        # row of the reclaimed space and is the difference between the hole
        # being filled and the split being thrown away.
        SETTLE_MARGIN = 60
        fits = [h for h in heads if h["h"] <= room - SETTLE_MARGIN]
        if not fits:
            fits = [h for h in heads if h["h"] <= room]
        if not fits:
            if verbose:
                print("  split: page %d has %dpx free, smallest head is %dpx "
                      "— nothing to move up" % (i + 1, free[i],
                                                min(h["h"] for h in heads)))
            continue
        best = max(fits, key=lambda h: h["k"])
        k = best["k"]

        head = dict(cand)
        # THE HEAD STAYS SPLITTABLE TOO — for the same reason the tail does.
        #
        # Marking the head done and throwing its payload away meant a panel
        # could be divided exactly once. Physics chapter 9's section 9.3 is
        # a ten-point list that was split early, and the nine-row head then
        # came to rest at the top of a column with an 839px hole beside it:
        # still nine rows, still divisible, but `_split_done` and no rows to
        # rebuild from, so every later round reported "next block cannot
        # divide" and the hole stayed open to the end of the build.
        #
        # Recursion is bounded by `min_rows`/`min_keep`, not by this flag —
        # the note on the tail below already says so. And a split that does
        # not actually fill the hole it aimed at is reverted by the caller
        # on its own measurement, so keeping the head divisible cannot cost
        # more than the render it spends.
        head.update(html=best["html"], h=best["h"])
        head.pop("id", None)
        head["split"] = dict(payload, rows=rows[:k])
        # The TAIL stays splittable. It is a shorter panel that may still be
        # too tall for the page it lands on, and marking it done left a 430px
        # remainder stranded in front of 469px of free space. `min_rows` is
        # what stops this recursing, not the flag.
        tail = dict(cand)
        # The tail is a CONTINUATION — no repeated heading. Rebuilding it
        # with one made a split cost as much chrome as it saved space.
        tail.update(html=rebuild(payload, rows[k:], True))
        tail.pop("id", None)
        tail["split"] = dict(payload, rows=rows[k:])
        measure_fn([tail])

        if report is not None:
            # Which hole this split aimed at. The caller has to judge it
            # locally: `settle` only ever ratchets heights UP, so re-settling
            # after a split manufactures space elsewhere and a global total
            # says "worse" even when the hole it targeted was filled. That is
            # the same effect that keeps `pull_up` disabled in layout/pack.py.
            report["target"] = i
        try:
            at = items.index(cand)
        except ValueError:
            continue
        items[at:at + 1] = [head, tail]
        if tried is not None:
            tried.add(cand.get("id"))
        done += 1
        if verbose:
            print("  split: panel of %d rows -> %d + %d (page %d had %dpx free)"
                  % (len(rows), k, len(rows) - k, i + 1, free[i]))
        # ONE split per call, so the caller can verify each on its own. Two
        # splits verified together were rejected as a pair even though one of
        # them was reclaiming 886px — a good split must not be undone by a
        # bad one sharing its round.
        break

    if verbose and not done and skips:
        print("  split: no candidate. %d hole(s) skipped — %s"
              % (sum(skips.values()),
                 "; ".join("%s (%d)" % (w, n)
                           for w, n in sorted(skips.items(),
                                              key=lambda kv: -kv[1]))))
    return items, bool(done)

# ==========================================================================
# TWO-COLUMN PAGES
#
# Everything above filters to `len(cols) == 1`, so the whole pass only ever
# applied to the single-column half of the book. A two-column part could
# never split a panel, which is why a six-row सूत्र panel in a 449px column
# sat above several hundred px of dead space with no way to use it.
#
# A column is the packing unit there, exactly as a page is in the flow, so
# the same pass works once free space is keyed by COLUMN. The flat index
# `page * 2 + col` is the one `pack_columns` already produces.
# ==========================================================================

def free_by_column(html, per_page=2):
    """Free px in each column of every multi-column page, flat-indexed."""
    space = _probe.empty_space_html(html)
    if space is None:
        return None
    out = {}
    for rec in space:
        cols = rec.get("cols") or []
        if len(cols) < 2:
            continue
        for c in cols:
            out[(rec["page"] - 1) * per_page + c["col"]] = c["free"]
    return out


def worst_hole_columns(html, per_page=2):
    """The largest run of free space in any column but the last.

    Judged the same way as the flow layout's worst hole, and for the same
    reason: one column two-thirds empty reads as a mistake, the same slack
    spread over six does not.
    """
    free = free_by_column(html, per_page)
    if free is None:
        return None
    if not free:
        return 0
    tail = max(free)
    return max([v for k, v in free.items() if k != tail] or [0])

def dead_space_columns(html, per_page=2):
    """Total free px in every column but the last."""
    free = free_by_column(html, per_page)
    if free is None:
        return None
    if not free:
        return 0
    tail = max(free)
    return sum(v for k, v in free.items() if k != tail)

def overflows(html):
    """True when any column is overfull. `None` when the probe fails.

    A split rewrites the item list and the following settle is meant to
    absorb the change, but it cannot always: loosening the accept criterion
    to include a total-space win let one through that left a page 42px over,
    and `.page` is overflow:hidden, so that is content cut off. Any accepted
    split has to clear this too.
    """
    space = _probe.empty_space_html(html)
    if space is None:
        return None
    return any(c["free"] < 0 for rec in space for c in (rec.get("cols") or []))


# ==========================================================================
# ABSORB A NEARLY-EMPTY TRAILING PAGE
#
# Chapter 19 ended on a sheet holding one line — "आगे बढ़ो; वापस मत आना।" —
# with 2825px of the 2864px page blank, while the column before it measured
# 164px free. The line needed about 39.
#
# The packer was not wrong to do it: it packs against MODEL heights, and a
# model height is an upper bound. `paginate.settle` only ever ratchets a
# height UP, so an item whose model height overshoots is never corrected
# downwards, and a column the packer believed was full can measure a long
# way from it once a browser lays it out. Nothing then reconsiders the
# decision, which is exactly "the content does not shift up".
#
# This pass reconsiders exactly one decision, the most visible one, and only
# on measured evidence: if everything on the last page fits in what the
# previous page's last column REALLY has spare, it moves up and the sheet
# goes away. The move is rendered and verified before it is accepted, so a
# model that was wrong in the other direction cannot cost content.
#
# It is deliberately not the general `pull_up` that stays disabled in
# layout/pack.py. That one has to compare dead space globally, which the
# ratcheting makes unreliable. This compares one column against one page.
# ==========================================================================

# Below this a trailing page is not "nearly empty", it is a short last page,
# and squeezing it into the column before would crowd the end of the book.
TAIL_ABSORB_MAX = 420


def absorb_tail_page(cols, render_fn, measure_free, overflow_fn,
                     per_page=2, verbose=True):
    """Move a nearly-empty final page into the column before it.

    Takes and returns the flat COLUMN list, not the item list. That is the
    whole point: the item list is re-packed from model heights, so a
    correction expressed there is simply re-derived away — the packer would
    put the line straight back on its own sheet. `cols` is what the emitter
    turns into pages, so a change here is the last word.

    Returns (cols, changed). Nothing needs re-settling afterwards: no item's
    height changed, only which column holds it, and the result is rendered
    and checked for overflow before being accepted.
    """
    if len(cols) <= per_page:
        return cols, False
    tail_idx = list(range(len(cols) - per_page, len(cols)))
    tail_items = [it for k in tail_idx for it in cols[k]]
    if not tail_items:
        return cols, False
    tail_h = sum(it.get("h", 0) for it in tail_items) + GAP * (len(tail_items) - 1)
    if tail_h > TAIL_ABSORB_MAX:
        if verbose:
            print("  tail: last page holds %dpx — a short last page, not an "
                  "empty one; left alone" % tail_h)
        return cols, False

    free = measure_free(render_fn(cols)) or {}
    # The last non-empty column before the final page.
    prev = len(cols) - per_page - 1
    while prev >= 0 and not cols[prev]:
        prev -= 1
    if prev < 0:
        return cols, False
    room = free.get(prev, 0) - GAP
    if room < tail_h:
        if verbose:
            print("  tail: last page holds %dpx but the column before it has "
                  "only %dpx spare — left alone" % (tail_h, max(0, room)))
        return cols, False

    trial = [list(c) for c in cols]
    trial[prev].extend(tail_items)
    for k in tail_idx:
        trial[k] = []
    # Drop the now-empty trailing columns, so the sheet itself goes away
    # rather than being emitted blank.
    while trial and not trial[-1]:
        trial.pop()
    if not trial:
        return cols, False
    if overflow_fn(render_fn(trial)):
        if verbose:
            print("  tail: moving the last page up overfilled the column — "
                  "the free space was not as usable as it measured; left alone")
        return cols, False
    if verbose:
        print("  tail: absorbed the last page (%d block(s), %dpx) into the "
              "column before it, which had %dpx spare"
              % (len(tail_items), tail_h, room + GAP))
    return trial, True
