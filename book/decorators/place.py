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

_PAGE_RE = re.compile(r'<div class="page[^"]*">')


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


def apply_placements(html, accepted, verbose=False):
    """Append accepted art to the foot of each named page. -> (html, placed).

    Free space is MEASURED on the html being changed, not taken from the
    `free` the proposal carries. That number came from `step10`, and the
    layout moves after it: a panel split, a taller answer, a keyword wash.
    Trusting it put 170px of art into a page that had 128px left, and
    `.page` is overflow:hidden — 42px of a real page quietly cut off, which
    `step09` could not see because its model said the page fitted.
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
        close = html.rfind("</div>", starts[i], chunk_end)
        if close < 0:
            continue
        pieces = []
        chars = doodles = 0
        for p in by_page[page]:
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
            room = p.get("free", 0) if live is None else live.get(page, 0)
            art = _art_html(path, role, room) if path else None
            if not art and verbose:
                print("  art: page %d skipped — only %spx free now (proposal said %s)"
                      % (page, room, p.get("free")))
            if art:
                pieces.append(art)
        if not pieces:
            continue
        html = html[:close] + "".join(pieces) + html[close:]
        placed += len(pieces)
        if verbose:
            print("  art: page %d <- %s" % (page, ", ".join(
                p.get("role", "?") for p in by_page[page])))
    return html, placed

def _free_now(html):
    """Free px at the foot of each page, measured on THIS html. -> {page: px}.

    Keyed by 1-based page number to match a placement. A two-column page
    reports the smallest of its columns, since art at the foot of the page
    has to clear both.
    """
    try:
        from ..layout import probe as _probe
        space = _probe.empty_space_html(html)
    except Exception:
        return None
    if space is None:
        return None
    out = {}
    for rec in space:
        cols = rec.get("cols") or []
        if cols:
            out[rec["page"]] = min(c["free"] for c in cols)
    return out
