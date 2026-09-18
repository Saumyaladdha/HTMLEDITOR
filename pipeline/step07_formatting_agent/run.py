#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""step07_formatting_agent — how each kind should be set."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _step import args, head, line, finish, artifact                 # noqa: E402
from book.format import rules                                        # noqa: E402

a = args()
doc = artifact.load(a.stem, "06_latex")
decisions = artifact.read_decisions(a.stem, "step07_formatting_agent")
unknown = rules.apply(doc)

# an agent may override any kind's formatting; it is data, so it just merges
applied = 0
if decisions:
    from book.core.ir import walk
    for n in walk(doc["parts"]):
        d = decisions.get(n.get("kind")) or decisions.get(n.get("id"))
        if d:
            n["fmt"].update({k: v for k, v in d.items() if k != "id"})
            applied += 1

head("step07_formatting_agent")
line(True, "rules", "%d kind(s) in the table" % len(rules.RULES))
line(len(unknown) == 0, "unknown kinds", "%d" % len(unknown))
if applied:
    line(True, "agent overrides", "%d node(s)" % applied)

open_items = [dict(u, id=artifact.item_id(a.stem, "fmt", u["kind"])) for u in unknown]
artifact.save(a.stem, "07_formatted", doc)
finish(a.stem, "step07_formatting_agent", "ok", open_items,
       question="This kind has no formatting rule. Reply {id, kind, atomic, "
                "density, accent, emphasis} — and add it to book/format/rules.py.",
       unknown=len(unknown), overrides=applied)
