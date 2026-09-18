#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""step01_md_reader — read the markdown, produce the IR."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _step import args, head, line, finish, artifact, ROOT          # noqa: E402
from book.readers import markdown                                    # noqa: E402
from book.core.ir import count_kinds                                 # noqa: E402

a = args()
doc = markdown.parse(a.md, report=True, subject=a.subject)
kinds = dict(count_kinds(doc["parts"]))
doc["source"] = os.path.relpath(a.md, ROOT)

head("step01_md_reader", os.path.basename(a.md))
line(True, "chapter", doc["chapter"].get("raw", ""))
for p in doc["parts"]:
    line(True, "part", "%-30s children=%-3d asides=%d"
         % ((p.get("label") or "(front)")[:30], len(p.get("children") or []),
            len(p.get("asides") or [])))
line(True, "blocks", "%d across %d kinds" % (sum(kinds.values()), len(kinds)))

# Unrecognised text becomes `para`. A high para share means the reader is
# guessing, so it is surfaced rather than left to look like prose.
para_share = kinds.get("para", 0) / float(max(sum(kinds.values()), 1))
open_items = []
if para_share > 0.45:
    open_items.append(dict(
        id=artifact.item_id(a.md, "para_share"), kind="high_para_share",
        value=round(para_share, 3),
        detail="%.0f%% of blocks fell through to `para` — the reader may not "
               "recognise this file's conventions" % (para_share * 100)))
line(para_share <= 0.45, "structure", "%.0f%% fell through to para" % (para_share * 100))

artifact.save(a.stem, "01_read", doc)
finish(a.stem, "step01_md_reader", "ok", open_items,
       question="Which conventions in this markdown is the reader not recognising?",
       blocks=sum(kinds.values()), kinds=kinds)
