#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""step06_latex_validator — will the maths render, or print as backslashes?"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _step import args, head, line, finish, artifact                 # noqa: E402
from book.validators import latex_check                              # noqa: E402

a = args()
doc = artifact.load(a.stem, "05_questions")
findings = latex_check.validate(doc)

head("step06_latex_validator")
line(len(findings) == 0, "latex", "%d problem(s)" % len(findings))
open_items = []
for f in findings[:200]:
    f["id"] = artifact.item_id(a.stem, f.get("id"), f.get("src", "")[:40])
    open_items.append(f)
    line(False, f["kind"], (f.get("src") or "")[:60])

doc["_latex"] = findings
artifact.save(a.stem, "06_latex", doc)
finish(a.stem, "step06_latex_validator", "ok", open_items,
       question="For each: what should this maths convert to? Reply "
                "{id, corrected_source} — fix the SOURCE, not the output.",
       findings=len(findings))
