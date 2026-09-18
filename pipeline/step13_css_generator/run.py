#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""step13_css_generator — build the stylesheet from the design tokens."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _step import args, head, line, finish, artifact, ROOT           # noqa: E402
from book.design import css, fonts, tokens                           # noqa: E402
import io                                                            # noqa: E402

a = args()
lay = artifact.load(a.stem, "09_layout")
mode = lay.get("mode", "a4")

sheet = css.stylesheet(mode)
face = fonts.css()
out_dir = os.path.join(ROOT, "build", a.stem)
if not os.path.isdir(out_dir):
    os.makedirs(out_dir)
io.open(os.path.join(out_dir, "bundle.css"), "w", encoding="utf-8").write(sheet)

checks = {
    "print-color-adjust": "print-color-adjust:exact" in sheet.replace(" ", ""),
    "A4 page rule":       "@page" in sheet and "size:A4" in sheet.replace(" ", ""),
    "print zoom":         ("zoom:%s" % tokens.PRINT_ZOOM) in sheet.replace(" ", ""),
    # The finalised edition draws six heading underlines (.hd-*) plus three
    # marker pills (.qnum, .anslabel, .yearhead .yr). The old check counted
    # nine `sw-*` highlighter strokes, a class that no longer exists — it had
    # been reporting MISSING on a stylesheet that was completely fine.
    "marker strokes":     (sheet.count("background-image:url(data:image/svg")
                           + sheet.count('background-image:url("data:image/svg')) >= 9,
    "fonts embedded":     fonts.available() and "base64" in face,
}

head("step13_css_generator", "mode=%s" % mode)
line(True, "stylesheet", "%d bytes -> build/%s/bundle.css" % (len(sheet), a.stem))
line(True, "fonts", "%d KB embedded (Kalam 400 + Caveat 500)" % (len(face) // 1024))
for name, ok in checks.items():
    line(ok, name, "" if ok else "MISSING")

artifact.save(a.stem, "13_css", dict(mode=mode, css_bytes=len(sheet),
                                     font_bytes=len(face), checks=checks))
finish(a.stem, "step13_css_generator",
       "fail" if not all(checks.values()) else "ok", [], question="",
       css_bytes=len(sheet))
