#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""step14_html_assembler — the finished document, decisions applied."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _step import args, head, line, finish, artifact, ROOT           # noqa: E402
from book.decorators import slots                                    # noqa: E402
import io, shutil                                                    # noqa: E402

a = args()
lay = artifact.load(a.stem, "09_layout")
dec = artifact.load(a.stem, "11_decorators", required=False) or {}
draft = os.path.join(ROOT, lay["draft"])
final = os.path.join(ROOT, "build", a.stem + ".html")

html = io.open(draft, encoding="utf-8").read()
before = len(html)

# fill whatever art the manifest can resolve — a no-op until art exists,
# and safe at any time because every slot is already its final size
html, filled, total = slots.apply(html, verbose=False)
# The accepted placements were counted and then discarded — nothing turned
# one into art on a page. See book/decorators/place.py.
from book.decorators.place import apply_placements                  # noqa: E402
html, art_placed = apply_placements(html, dec.get("accepted") or [])
io.open(final, "w", encoding="utf-8").write(html)

head("step14_html_assembler")
line(True, "pages", str(lay["pages"]))
line(True, "slots", "%d/%d filled, %s still reserved"
     % (filled, total, slots.report(html)))
line(len(html) >= before, "content", "%d bytes" % len(html))
line(True, "written", os.path.relpath(final, ROOT))
if dec.get("accepted"):
    line(art_placed == len(dec["accepted"]), "decorators",
         "%d of %d accepted placement(s) on the page"
         % (art_placed, len(dec["accepted"])))

artifact.save(a.stem, "14_assembled", dict(html=os.path.relpath(final, ROOT),
                                           pages=lay["pages"], bytes=len(html),
                                           slots_filled=filled, slots_total=total))
finish(a.stem, "step14_html_assembler", "ok", [], question="",
       pages=lay["pages"], bytes=len(html))
