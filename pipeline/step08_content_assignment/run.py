#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""step08_content_assignment — which component renders which block."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _step import args, head, line, finish, artifact                 # noqa: E402
from book.format import assignment                                   # noqa: E402

a = args()
doc = artifact.load(a.stem, "07_formatted")
decisions = artifact.read_decisions(a.stem, "step08_content_assignment")
missing = assignment.apply(doc)
broken = assignment.verify()

applied = 0
if decisions:
    from book.core.ir import walk
    for n in walk(doc["parts"]):
        d = decisions.get(n.get("id")) or decisions.get(n.get("kind"))
        if d and d.get("component"):
            n["component"] = d["component"]
            applied += 1

head("step08_content_assignment")
line(True, "mapped", "%d kind(s) -> components" % len(assignment.MAP))
line(not broken, "components exist", "all present" if not broken
     else "MISSING in book/components: %s" % ", ".join(broken))
line(len(missing) == 0, "unassigned", "%d kind(s)" % len(missing))
if applied:
    line(True, "agent overrides", "%d node(s)" % applied)

open_items = [dict(m, id=artifact.item_id(a.stem, "asg", m["kind"])) for m in missing]
artifact.save(a.stem, "08_assigned", doc)
finish(a.stem, "step08_content_assignment", "fail" if broken else "ok", open_items,
       question="This kind has no component. Reply {id, kind, component} using a "
                "name exported by book/components/__init__.py.",
       unassigned=len(missing), broken=len(broken), overrides=applied)
