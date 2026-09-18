# -*- coding: utf-8 -*-
"""
SPACE — where the empty space is, how much, and whether it is a problem.

Not all whitespace is a fault. The end of a part, the foot of a cover page
and the last page of the book are all legitimately short. What matters is
space that reads as a MISTAKE: a half-empty column in the middle of a run,
or a page that stops two-thirds of the way down with more content to come.

Classification, deliberately conservative — it flags, it does not fix:

    ok          under `MINOR`, or a page that is allowed to end short
    slack       noticeable but harmless; a decorator could sit here
    gap         large and mid-document; the packer probably gave up early
    lopsided    the two columns of one page differ badly
"""
MINOR = 120          # px of trailing space nobody notices
SLACK = 380          # beyond this it reads as deliberate space
GAP = 620            # beyond this it reads as a mistake
LOPSIDED = 0.35      # column height difference, as a fraction of the taller


def classify(pages, n_pages, allow_short=()):
    """`pages` is `probe.empty_space()` output. -> findings, summary."""
    findings, total_free, worst = [], 0, 0
    for rec in pages or []:
        pno = rec["page"]
        cols = rec.get("cols") or []
        last_page = pno >= n_pages
        for c in cols:
            free = c.get("free", 0)
            total_free += max(free, 0)
            worst = max(worst, free)
            if last_page or pno in allow_short or free <= MINOR:
                continue
            if free >= GAP:
                findings.append(dict(page=pno, col=c["col"], free=free,
                                     level="gap", severity="medium",
                                     detail="%dpx unused mid-document" % free))
            elif free >= SLACK:
                findings.append(dict(page=pno, col=c["col"], free=free,
                                     level="slack", severity="low",
                                     detail="%dpx of slack — a decorator could "
                                            "sit here" % free))
        if len(cols) == 2:
            a, b = cols[0].get("used", 0), cols[1].get("used", 0)
            if max(a, b) and abs(a - b) / float(max(a, b)) > LOPSIDED and not last_page:
                findings.append(dict(page=pno, col=None, free=abs(a - b),
                                     level="lopsided", severity="low",
                                     detail="columns differ by %dpx" % abs(a - b)))
    summary = dict(pages=len(pages or []), total_free_px=total_free,
                   worst_free_px=worst,
                   gaps=sum(1 for f in findings if f["level"] == "gap"),
                   slack=sum(1 for f in findings if f["level"] == "slack"),
                   lopsided=sum(1 for f in findings if f["level"] == "lopsided"))
    return findings, summary
