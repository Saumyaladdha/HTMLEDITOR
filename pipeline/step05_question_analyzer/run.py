#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""step05_question_analyzer — the question model, and what is wrong with it."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _step import args, head, line, finish, artifact                 # noqa: E402
from book.taggers import questions                                   # noqa: E402

a = args()
doc = artifact.load(a.stem, "04_named")
records, groups, problems = questions.analyse(doc)

head("step05_question_analyzer")
line(True, "questions", "%d in %d group(s)" % (len(records), len(groups)))
line(True, "marks", "%g total" % sum(g["total_marks"] for g in groups))
line(all(g["marks_sorted"] for g in groups), "marks order",
     "ascending within every group" if all(g["marks_sorted"] for g in groups)
     else "some groups unsorted — marks bands will repeat")
line(len(problems) == 0, "problems", "%d" % len(problems))

open_items = []
for p in problems:
    p["id"] = artifact.item_id(a.stem, p["kind"], p["id"])
    open_items.append(p)
    line(False, p["kind"], "%s — %s" % (p.get("id", "")[:12], p["detail"][:60]))

doc["_questions"] = dict(records=records, groups=groups, problems=problems)
artifact.save(a.stem, "05_questions", doc)
finish(a.stem, "step05_question_analyzer", "ok", open_items,
       question="For each flagged question: is this a real content error in the "
                "markdown, or a parsing gap? Reply {id, verdict: content|parser, fix}.",
       questions=len(records), groups=len(groups), problems=len(problems))
