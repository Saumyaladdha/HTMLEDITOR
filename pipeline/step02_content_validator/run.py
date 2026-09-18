#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""step02_content_validator — did the reader get everything?"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _step import args, head, line, finish, artifact                 # noqa: E402
from book.validators import content                                  # noqa: E402

a = args()
doc = artifact.load(a.stem, "01_read")
findings, stats = content.validate(a.md, doc)

head("step02_content_validator")
for k in ("question", "answer", "card", "figure", "table", "given"):
    s, p = stats["source"].get(k, 0), stats["parsed"].get(k, 0)
    line(s == p, k, "markdown %-4d  IR %-4d" % (s, p))

open_items = []
for f in findings:
    f["id"] = artifact.item_id(a.stem, f["kind"], f.get("element"))
    open_items.append(f)
    line(False, f["element"], f["detail"])

doc["_validation"] = dict(findings=findings, stats=stats)
artifact.save(a.stem, "02_validated", doc)
hard = [f for f in findings if f.get("severity") == "high"]
finish(a.stem, "step02_content_validator", "fail" if hard else "ok", open_items,
       question="Is this count difference real content loss, or a legitimate "
                "difference between how the source writes a thing and how the "
                "IR models it?",
       findings=len(findings))
