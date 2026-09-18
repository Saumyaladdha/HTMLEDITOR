# -*- coding: utf-8 -*-
"""
DECORATOR POLICY — where art may go, and how much is too much.

The rule that keeps this from looking like AI-scattered clip-art:

    DECORATION DENSITY IS INVERSELY PROPORTIONAL TO CONTENT DENSITY.

In the reference book the 23 full Q&A pages carry ZERO doodles and ZERO
characters — the coloured question tags and dashed rules carry them. Only
pages with real slack get art. A decorator's job is to make a deliberate
piece of whitespace read as deliberate, not to fill every hole.

This module decides PLACEMENT, never appearance. It emits proposals; the
slots are already reserved at final size, so accepting a proposal cannot
move the page.
"""
MAX_DOODLES_PER_PAGE = 2
MAX_CHARACTERS_PER_PAGE = 1
MIN_SEPARATION_PX = 200          # two doodles closer than this crowd each other
MIN_SLACK_FOR_DOODLE = 260       # below this, art makes the page look cramped
MIN_SLACK_FOR_CHARACTER = 520    # a character needs real room

ROLE_FOR_SLACK = [
    (900, "character"),
    (520, "character"),
    (380, "doodle-lg"),
    (260, "doodle-md"),
]


def role_for(free_px):
    for threshold, role in ROLE_FOR_SLACK:
        if free_px >= threshold:
            return role
    return None


def propose(space_findings, n_pages, existing_by_page=None):
    """-> [{page, col, role, why}] — one proposal per genuinely slack column.

    Only `slack` and `gap` columns are candidates. A `gap` is first a
    PAGINATION problem: filling it with a doodle hides the fact that the
    packer gave up early, so it is proposed but marked low confidence."""
    existing = dict(existing_by_page or {})
    out = []
    for f in sorted(space_findings, key=lambda x: -x.get("free", 0)):
        if f.get("level") not in ("slack", "gap"):
            continue
        page = f["page"]
        if page >= n_pages:                       # last page may end short
            continue
        free = f.get("free", 0)
        role = role_for(free)
        if not role:
            continue
        used = existing.get(page, {"doodle": 0, "character": 0})
        is_char = role == "character"
        if is_char and used["character"] >= MAX_CHARACTERS_PER_PAGE:
            continue
        if not is_char and used["doodle"] >= MAX_DOODLES_PER_PAGE:
            continue
        if is_char and free < MIN_SLACK_FOR_CHARACTER:
            continue
        if not is_char and free < MIN_SLACK_FOR_DOODLE:
            continue
        used["character" if is_char else "doodle"] += 1
        existing[page] = used
        out.append(dict(page=page, col=f.get("col"), role=role, free=free,
                        confidence="low" if f["level"] == "gap" else "medium",
                        why=("%dpx of slack at the foot of the column; a %s "
                             "reads as deliberate whitespace" % (free, role))
                            if f["level"] == "slack" else
                            ("%dpx gap — this is probably a PAGINATION problem; "
                             "fix the packing before decorating it" % free)))
    return out
