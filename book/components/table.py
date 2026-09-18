# -*- coding: utf-8 -*-
"""
Tables — the ONLY place table markup lives.

The previous system had eight table elements, one per column shape. This
design has one. Change the table look here and nothing else in the pipeline
needs to know.

Cells are LEFT aligned by default in the finalised edition (they were
centred before), and every table is wrapped in `.tblwrap` so a wide one
scrolls inside its own box instead of pushing the page sideways.
"""
from ..format.inline import inline


def table(head, rows, align=(), wrap=True):
    out = ['<table class="tbl">']
    if head:
        out.append('<thead><tr>%s</tr></thead>'
                   % "".join('<th>%s</th>' % inline(c) for c in head))
    out.append('<tbody>')
    for r in rows:
        cells = []
        for i, c in enumerate(r):
            a = align[i] if i < len(align) else "l"
            st = '' if a == "l" else ' style="text-align:center;"'
            cells.append('<td%s>%s</td>' % (st, inline(c)))
        out.append('<tr>%s</tr>' % "".join(cells))
    out.append('</tbody></table>')
    html = "".join(out)
    return ('<div class="tblwrap">%s</div>' % html) if wrap else html
