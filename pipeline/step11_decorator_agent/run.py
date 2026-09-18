#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""step11_decorator_agent — where art would actually help."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _step import args, head, line, finish, artifact, ROOT           # noqa: E402
from book.decorators import policy, slots                            # noqa: E402
import io                                                            # noqa: E402

a = args()
lay = artifact.load(a.stem, "09_layout")
sp = artifact.load(a.stem, "10_space")
decisions = artifact.read_decisions(a.stem, "step11_decorator_agent")

proposals = policy.propose(sp["findings"], n_pages=lay["pages"])
accepted = [p for p in proposals
            if (decisions.get(artifact.item_id(a.stem, "dec", p["page"], p["col"]))
                or {}).get("accept", False)]

html = io.open(os.path.join(ROOT, lay["draft"]), encoding="utf-8").read()
outstanding = slots.report(html)

head("step11_decorator_agent")
line(True, "policy", "max %d doodle(s) + %d character per page"
     % (policy.MAX_DOODLES_PER_PAGE, policy.MAX_CHARACTERS_PER_PAGE))
line(True, "proposed", "%d placement(s)" % len(proposals))
line(True, "accepted", "%d (needs agent sign-off)" % len(accepted))
line(True, "slots waiting", str(outstanding))

open_items = [dict(p, id=artifact.item_id(a.stem, "dec", p["page"], p["col"]))
              for p in proposals]
artifact.save(a.stem, "11_decorators", dict(proposals=proposals,
                                            accepted=accepted,
                                            outstanding=outstanding))
finish(a.stem, "step11_decorator_agent", "ok", open_items,
       question="Would art here IMPROVE the page, or just fill it? Density is "
                "inversely proportional to content density — a full Q&A page "
                "should get nothing. Reply {id, accept: true|false, role, why}.",
       proposed=len(proposals), accepted=len(accepted))
