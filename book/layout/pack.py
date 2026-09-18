# -*- coding: utf-8 -*-
"""
PACK — turn a measured block stream into pages that provably fit.

`.page` is `overflow:hidden`. Content that does not fit is CLIPPED, not
reflowed: a packing error deletes content and nothing errors anywhere. So
a predictive packer is not sufficient on its own, and `settle()` checks
the guess against a real render.

    pack_columns   two pre-assigned .acol columns   (Part 2)
    pack_full      single-column pages              (front matter, Part 1)
    settle         repack until a real render says nothing is clipped
"""
import sys

from . import probe as _probe
from ..design import tokens as theme

GAP = 9                       # .qb flex gap — the dominant inter-block gap
HEAD_TAGS = ("qhead", "sechead", "groupband")


def pack_columns(items, col_h=None, cols=2):
    """Greedy fill, column by column, page by page.

    Column-by-column rather than "one big 2x pool" because almost every
    block is unbreakable: space left at the foot of a column is dead, and
    pooling the page hides that.

    A question MAY split across a column boundary — the reference book
    does it constantly — but its head must never be orphaned there."""
    col_h = col_h or theme.CONTENT_H
    pages, page, col, used = [], [], [], 0

    def close_col():
        nonlocal col, used
        page.append(col)
        col, used = [], 0

    def close_page():
        nonlocal page
        while len(page) < cols:
            page.append([])
        pages.append(page)
        page = []

    i = 0
    while i < len(items):
        it = items[i]
        h = it["h"] + (GAP if used else 0)
        if used and used + h > col_h:
            if col and col[-1].get("tag") in HEAD_TAGS:
                moved = col.pop()
                used -= moved["h"] + GAP
                close_col()
                if len(page) == cols:
                    close_page()
                col.append(moved)
                used = moved["h"]
                continue
            close_col()
            if len(page) == cols:
                close_page()
            continue
        col.append(it)
        used += h
        i += 1
    if col:
        close_col()
    if page:
        close_page()
    return pages


def pack_full(items, col_h=None, first_extra=0):
    """Single-column pages, for front matter and the Part-1 float flow."""
    col_h = col_h or theme.CONTENT_H
    pages, cur, used = [], [], first_extra
    for it in items:
        h = it["h"] + (GAP if used else 0)
        if used and used + h > col_h:
            pages.append(cur)
            cur, used = [], 0
            h = it["h"]
        cur.append(it)
        used += h
    if cur:
        pages.append(cur)
    return pages


def settle(items, pack_fn, render_fn, rounds=4, verbose=True, wide_w=None):
    """Repack until a real render says nothing is clipped.

    `pack_fn(items) -> units`, `render_fn(units) -> html`. Every item must
    render inside an element carrying `data-it="<item id>"`.

    An additive height model is always an approximation — margin collapse,
    float wrap and re-breaking at a different width all move the total. In
    Part 1's float region the error ran to ~15%.

    Pushing overflow forward one page per round CASCADES and needs as many
    rounds as there are pages. Instead we measure every item's real height
    in its real context and repack the whole part, which corrects the model
    globally and converges in two or three rounds.

    Heights only ratchet UP. Letting one shrink between rounds makes the
    packer pull a block back onto a page it just left, and the loop
    oscillates instead of settling."""
    units = pack_fn(items)
    for r in range(rounds):
        state = _probe.settle_state(render_fn(units))
        if state is None:
            if verbose:
                sys.stderr.write("settle: probe failed; keeping current pagination\n")
            return units
        changed = 0
        for it in items:
            real = state["items"].get(str(it.get("id")))
            if not real:
                continue
            if isinstance(real, list):
                rh, rw = real[0], real[1]
            else:
                rh, rw = real, None
            # Route the correction to the height that was actually measured.
            # `h` is the block at full width, `h_narrow` the same block beside
            # the note column. Writing a narrow measurement into `h` inflated
            # blocks that later moved below the note, and because heights only
            # ratchet up the packer kept closing pages on room that was there
            # — Part 1 was carrying pages that rendered barely half full.
            field = ("h_narrow"
                     if (wide_w and rw and rw < wide_w - 20 and "h_narrow" in it)
                     else "h")
            if rh > it.get(field, 0):
                it[field] = rh
                changed += 1
        if verbose:
            print("  settle round %d: %s, %d height(s) corrected"
                  % (r + 1, "overflow" if state["over"] else "clean", changed))
        if not state["over"]:
            return units
        if not changed:
            break
        units = pack_fn(items)
    if verbose:
        sys.stderr.write("settle: gave up after %d rounds — run step15_visual_qa\n" % rounds)
    return units


def pull_up(units, render_fn, rounds=3, min_free=180, verbose=True):
    """Move a page's first block onto the page before it, when it fits.

    `settle` only ratchets heights UP — deliberately, so the loop cannot
    oscillate — which means an over-estimate becomes permanent dead space.
    Part 1 was carrying ~3.6 pages of it: the packer charges items beside the
    note column their NARROW height, and once the note ends the rest of the
    page renders far shorter than the model believed.

    This does the opposite, by measurement rather than by model. Each round
    renders ONCE to find which pages actually have room, then tries the
    candidates in one batch and keeps the batch only if nothing overflows —
    falling back to one-at-a-time when the batch is too greedy. Content order
    is preserved: a block only ever moves to the page immediately before it.
    """
    from ..design import tokens as theme

    def free_space(us):
        html = render_fn(us)
        st = _probe.settle_state(html)
        if st is None:
            return None, None
        return st, _probe.empty_space_from(html)

    for r in range(rounds):
        html = render_fn(units)
        space = _probe.empty_space_html(html)
        if space is None:
            if verbose:
                sys.stderr.write("pull_up: probe failed; stopping\n")
            return units
        roomy = {rec["page"] - 1: rec["cols"][0]["free"]
                 for rec in space
                 if rec.get("cols") and len(rec["cols"]) == 1
                 and rec["cols"][0]["free"] >= min_free}
        moved = 0
        for i in sorted(roomy, reverse=True):
            j = i + 1                      # page index whose head we may move
            if j >= len(units) or not units[j] or not units[i]:
                continue
            cand = units[j][0]
            if cand.get("h", 0) > roomy[i]:
                continue                   # cannot possibly fit
            trial = [list(u) for u in units]
            trial[i].append(cand)
            trial[j] = trial[j][1:]
            st = _probe.settle_state(render_fn(trial))
            if st and not st["over"]:
                units = [u for u in trial if u]
                moved += 1
        if verbose:
            print("  pull-up round %d: reclaimed %d block(s)" % (r + 1, moved))
        if not moved:
            break
    return units
