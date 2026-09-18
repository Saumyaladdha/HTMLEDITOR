#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""step09_layout_analyzer — measure, pack, settle; produce the page plan."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _step import args, head, line, finish, artifact, ROOT           # noqa: E402
from book.assemble import html as assembler                          # noqa: E402
from book.design import tokens                                       # noqa: E402
from book.layout import probe                                        # noqa: E402

a = args(mode=dict(default="a4", choices=["a4", "flow"]),
         only=dict(default="all", choices=["all", "part1", "part2"]),
         page_numbers=dict(action="store_true"))
draft = os.path.join(ROOT, "build", a.stem, "draft.html")

head("step09_layout_analyzer")
line(True, "geometry", "page %dx%d  content %dx%d  column %g (all measured)"
     % (tokens.PAGE_W, tokens.PAGE_H, tokens.CONTENT_W, tokens.CONTENT_H, tokens.COL_W))

out, n, _doc = assembler.build(a.md, draft, mode=a.mode, only=a.only,
                               chrome=a.page_numbers, verbose=not a.quiet,
                               stem=a.stem, subject=a.subject)
over = probe.page_overflow(draft) if a.mode == "a4" else []
line(not over, "overflow", "every page fits" if not over
     else "%d page(s) CLIPPED — content is being deleted" % len(over))

artifact.save(a.stem, "09_layout", dict(draft=os.path.relpath(draft, ROOT),
                                        pages=n, mode=a.mode, only=a.only,
                                        page_numbers=a.page_numbers,
                                        overflow=over or []))
finish(a.stem, "step09_layout_analyzer", "fail" if over else "ok", [],
       question="", pages=n, overflow=len(over or []))
