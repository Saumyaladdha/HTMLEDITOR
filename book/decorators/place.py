# -*- coding: utf-8 -*-
"""
PLACE — put the accepted art onto the page.

`step11_decorator_agent` proposes placements and an agent accepts them, and
until now that was the end of it: nothing turned an accepted placement into
anything on a page. `slots.py` was the intended seam, but it fills slots that
only a future diagram generator would create, and its own docstring says
nothing calls it in the default build. So every chapter reported
`decorators: 2 accepted placement(s)` and shipped with none.

This is the missing middle. An accepted placement names a page, a column and
a role; the art goes at the FOOT of that column, inside space step10 already
measured as free. Nothing above it moves, so pagination does not have to be
re-run and a placement can never push content off a sheet.

Art is chosen by (page, role) rather than at random, because a build has to
be reproducible — the same chapter must produce the same book twice.
"""
import io
import os
import re

from . import slots

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# How tall the art is allowed to be, by role — the policy's own numbers.
ROLE_H = {"character": 170, "doodle-lg": 190, "doodle-md": 140, "doodle-sm": 96}

# Matches `<div class="page">`, `<div class="page keep" data-page="4"
# style="--accent:...">` and every other class/attribute combination the
# page shell emits — NOT just the bare, attribute-less shape this used to
# require. Requiring an immediate `">` right after the class attribute
# meant this matched ZERO pages the moment `book/assemble/html.py` started
# writing `data-page`/`style` on every page div for the per-page accent
# colours: every accepted placement silently placed nothing, every build,
# with no error — `apply_placements` fell straight through its own
# `if not starts: return html, 0`.
_PAGE_RE = re.compile(r'<div class="page(?:\s[^"]*)?"[^>]*>')


def _pick(manifest, role, page):
    """One file for this role, chosen deterministically from the page number."""
    files = manifest.get(role)
    if not files:
        return None
    if isinstance(files, str):
        return files
    return files[page % len(files)]


def _art_html(path, role, free_px):
    body = slots._embed(path)
    if not body:
        return None
    # Never taller than the space measured free, and never taller than the
    # role allows. A placement that would not fit is not made at all.
    h = min(ROLE_H.get(role, 140), max(0, int(free_px) - 40))
    if h < 70:
        return None
    return ('<div class="bookart bookart--%s" style="height:%dpx">%s</div>'
            % (role, h, body))


_DIV_OPEN_RE = re.compile(r'<div\b')
_DIV_CLOSE = "</div>"
_ACOL_OPEN_RE = re.compile(r'<div class="acol"[^>]*>')


def _matching_close(html, after, end):
    """Position of `</div>` that closes the div whose content starts at
    `after`, searching no further than `end`. -> index, or -1.

    `.acol` holds a whole column's worth of deeply nested markup — a plain
    `rfind`/`find` for the next `</div>` closes on the first CHILD div
    instead of the column itself. This walks the tag stream counting
    open/close so the boundary found is the column's own.
    """
    depth = 1
    pos = after
    while pos < end:
        nxt_open = _DIV_OPEN_RE.search(html, pos, end)
        nxt_close = html.find(_DIV_CLOSE, pos, end)
        if nxt_close < 0:
            return -1
        if nxt_open and nxt_open.start() < nxt_close:
            depth += 1
            pos = nxt_open.end()
            continue
        depth -= 1
        if depth == 0:
            return nxt_close
        pos = nxt_close + len(_DIV_CLOSE)
    return -1


def _acol_bounds(html, start, end):
    """[(content_end, close_pos), ...] for every `.acol` inside `html[start:end]`,
    in document order — index `n` is column `n`, matching `probe.py`'s `ci`."""
    bounds = []
    for m in _ACOL_OPEN_RE.finditer(html, start, end):
        close = _matching_close(html, m.end(), end)
        if close >= 0:
            bounds.append((m.end(), close))
    return bounds


def apply_placements(html, accepted, verbose=False):
    """Append accepted art to the foot of each named page/column.
    -> (html, placed).

    Free space is MEASURED on the html being changed, not taken from the
    `free` the proposal carries. That number came from `step10`, and the
    layout moves after it: a panel split, a taller answer, a keyword wash.
    Trusting it put 170px of art into a page that had 128px left, and
    `.page` is overflow:hidden — 42px of a real page quietly cut off, which
    `step09` could not see because its model said the page fitted.

    ART GOES INSIDE THE COLUMN IT WAS PROPOSED FOR, NOT AFTER THE PAGE.
    `.page` is a fixed-height box; everything in it is the two `.acol`s and
    the footer. This used to find the LAST `</div>` in the whole page
    chunk — which, after `assemble.html` started closing every page with
    `</footer></div>`, is the `.page` element's OWN closing tag, past the
    footer. Every accepted placement landed there: extra height appended
    below the footer inside a box that cannot grow, clipped by the exact
    same `overflow:hidden` the docstring above warns about — two
    `doodle-lg`s (190px each) on one page reported as 2/2 placed and
    turned into a 416px overflow nobody could see coming from the count
    alone. This was never exercised before — every prior chapter's
    `decorators: N accepted placement(s)` shipped with N literal `<div
    class="bookart">`s nowhere on the page.
    """
    man = slots.load_manifest()
    if not man or not accepted:
        return html, 0

    live = _free_now(html)

    # Group by page, so the per-page limits can be enforced where they mean
    # something. policy.py allows 2 doodles and 1 character per page.
    by_page = {}
    for p in accepted:
        by_page.setdefault(int(p.get("page", 0)), []).append(p)

    starts = [m.start() for m in _PAGE_RE.finditer(html)]
    if not starts:
        return html, 0
    ends = starts[1:] + [len(html)]

    placed = 0
    # Right to left, so an insertion never shifts an offset still to be used.
    for page in sorted(by_page, reverse=True):
        i = page - 1
        if i < 0 or i >= len(starts):
            continue
        chunk_end = ends[i]
        acols = _acol_bounds(html, starts[i], chunk_end)
        if not acols:
            # A flow document (or a page with no `.acols`) has one scope:
            # `.sheet-body`, matching `JS_EMPTY`'s own fallback.
            m = re.search(r'<div class="sheet-body"[^>]*>', html[starts[i]:chunk_end])
            if not m:
                continue
            open_end = starts[i] + m.end()
            close = _matching_close(html, open_end, chunk_end)
            acols = [(open_end, close)] if close >= 0 else []
        if not acols:
            continue

        chars = doodles = 0
        # Collect insertions for this page as (close_pos, html) and apply
        # right-to-left too, so a second insertion in the SAME page never
        # invalidates the first one's position.
        inserts = []
        placed_here = []
        for p in by_page[page]:
            col = int(p.get("col") or 0)
            if col < 0 or col >= len(acols):
                continue
            role = p.get("role", "doodle-md")
            if role == "character":
                if chars >= 1:
                    continue
                chars += 1
            else:
                if doodles >= 2:
                    continue
                doodles += 1
            path = _pick(man, role, page)
            # The measured value wins; the proposal's is only a fallback for
            # when the probe cannot run at all.
            room = (p.get("free", 0) if live is None
                    else live.get((page, col), p.get("free", 0)))
            art = _art_html(path, role, room) if path else None
            if not art and verbose:
                print("  art: page %d col %d skipped — only %spx free now "
                      "(proposal said %s)" % (page, col, room, p.get("free")))
            if art:
                inserts.append((acols[col][1], art))
                placed_here.append(role)
        for close, art in sorted(inserts, key=lambda t: t[0], reverse=True):
            html = html[:close] + art + html[close:]
            placed += 1
        if placed_here and verbose:
            print("  art: page %d <- %s" % (page, ", ".join(placed_here)))
    return html, placed

def _free_now(html):
    """Free px at the foot of each page column, measured on THIS html.
    -> {(page, col): px}, both 1-based/0-based to match a placement."""
    try:
        from ..layout import probe as _probe
        space = _probe.empty_space_html(html)
    except Exception:
        return None
    if space is None:
        return None
    out = {}
    for rec in space:
        for c in rec.get("cols") or []:
            out[(rec["page"], c["col"])] = c["free"]
    return out
