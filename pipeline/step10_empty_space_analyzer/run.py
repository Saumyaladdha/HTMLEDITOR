#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""step10_empty_space_analyzer — where the whitespace is, and is it a fault?"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _step import args, head, line, finish, artifact, ROOT           # noqa: E402
from book.layout import probe, space                                 # noqa: E402

a = args()
lay = artifact.load(a.stem, "09_layout")
draft = os.path.join(ROOT, lay["draft"])
pages = probe.empty_space(draft) or []
findings, summary = space.classify(pages, n_pages=lay["pages"])

head("step10_empty_space_analyzer")
line(True, "measured", "%d page(s)" % summary["pages"])
line(summary["gaps"] == 0, "gaps", "%d column(s) with >%dpx unused mid-document"
     % (summary["gaps"], space.GAP))
line(True, "slack", "%d column(s) — candidates for a decorator" % summary["slack"])
line(summary["lopsided"] == 0, "lopsided", "%d page(s)" % summary["lopsided"])

open_items = [dict(f, id=artifact.item_id(a.stem, "space", f["page"], f.get("col")))
              for f in findings if f["level"] == "gap"]
artifact.save(a.stem, "10_space", dict(findings=findings, summary=summary,
                                       raw=pages))
finish(a.stem, "step10_empty_space_analyzer", "ok", open_items,
       question="This column has a large gap mid-document. Should it stay empty "
                "(a deliberate breath), be filled by moving content up, or take a "
                "decorator? Reply {id, action: leave|repack|decorate, why}.",
       **summary)
