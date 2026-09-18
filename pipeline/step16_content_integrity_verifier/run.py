#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""step16_content_integrity_verifier — does the HTML still say what the markdown said?"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _step import args, head, line, finish, artifact, ROOT           # noqa: E402
from book.validators import integrity                                # noqa: E402

a = args()
asm = artifact.load(a.stem, "14_assembled")
html_path = os.path.join(ROOT, asm["html"])
findings, stats = integrity.compare(a.md, html_path)

head("step16_content_integrity_verifier")
line(True, "compared", "%d source words (%d distinct) vs %d on the page"
     % (stats["md_words"], stats["distinct_md"], stats["html_words"]))
line(stats["vanished"] == 0, "prose intact",
     "%d prose word(s) missing from the page" % stats["vanished"])
line(True, "coverage", "%.2f%% of source words · %d notation fragment(s) "
     "re-tokenised by the renderer" % (stats["coverage"] * 100, stats.get("notation", 0)))

# AN `info` FINDING IS A NOTE, NOT WORK FOR AN AGENT.
#
# `notation_retokenised` is the only one, and `integrity.py` raises it to say
# the renderer is working: a maths fragment like `4ac` or `x_1` split across
# spans by fraction stacking or subscripting, which the word-count method is
# deliberately immune to. It was being appended to `open_items` like any
# other finding, so a build that had lost nothing still reported "awaiting an
# agent" forever — the queue cannot drain, because there is no decision that
# makes a correctly-stacked fraction stop being stacked. Worse, it was
# printed TWICE: once through `line(False, …)` with the XX failure mark, and
# again below through `line(None, …)` as the note it actually is.
#
# Queued findings are now the ones an agent can act on; `info` is printed
# once, as a note. `hard` is unchanged — severity `high` still fails the step.
open_items = []
for f in findings:
    f["id"] = artifact.item_id(a.stem, "int", f["kind"])
    if f.get("severity") == "info":
        continue
    open_items.append(f)
    line(False, f["kind"], f["detail"])
    for s in f.get("sample", [])[:3]:
        print("        · %s" % s[:88])

hard = [f for f in findings if f.get("severity") == "high"]
for f in findings:
    if f.get("severity") == "info":
        line(None, f["kind"], f["detail"])
        for s in f.get("sample", [])[:3]:
            print("        · %s" % s[:88])
artifact.save(a.stem, "16_integrity", dict(findings=findings, stats=stats))
finish(a.stem, "step16_content_integrity_verifier",
       "fail" if hard else "ok", open_items,
       question="Is this missing/duplicated text real content loss, or a "
                "legitimate rendering difference (a label the design adds, "
                "markup the design drops)? Reply {id, verdict: loss|by_design, why} "
                "and add anything by-design to ADDED_BY_DESIGN / DROPPED_BY_DESIGN.",
       **stats)
