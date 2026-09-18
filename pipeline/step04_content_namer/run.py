#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""step04_content_namer — a stable, readable id for every block."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _step import args, head, line, finish, artifact                 # noqa: E402
from book.taggers import naming                                      # noqa: E402
from collections import Counter                                      # noqa: E402

a = args()
doc = artifact.load(a.stem, "03_tagged")
index = naming.assign(doc)

dupes = [k for k, v in Counter(index.keys()).items() if v > 1]
head("step04_content_namer")
line(True, "named", "%d node(s)" % len(index))
line(not dupes, "unique", "no collisions" if not dupes else "%d duplicate id(s)" % len(dupes))
line(True, "example", ", ".join(list(index.keys())[:3]))

doc["_index"] = index
artifact.save(a.stem, "04_named", doc)
finish(a.stem, "step04_content_namer", "fail" if dupes else "ok", [],
       question="", named=len(index))
