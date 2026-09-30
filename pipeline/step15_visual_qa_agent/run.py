#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""step15_visual_qa_agent — inspect the page that actually rendered."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _step import args, head, line, finish, artifact, ROOT           # noqa: E402
from book.qa import visual                                           # noqa: E402
from collections import Counter                                      # noqa: E402

a = args(shots=dict(default="", help="comma-separated page numbers to render as PNG"))
asm = artifact.load(a.stem, "14_assembled")
html_path = os.path.join(ROOT, asm["html"])

pages = visual.inspect(html_path)
issues = [dict(i, page=rec["page"]) for rec in pages for i in rec["issues"]]
by_kind = Counter(i["kind"] for i in issues)

# The faults every OTHER step passes: a formula printing its own LaTeX name, a
# fraction stacked where there is no division, an equation number labelling
# the paragraph below it instead of the equation above it. `step02` counts
# blocks and `step16` counts words, so all of those are "present and
# correct" — and unreadable.
#
# Every rule in the scanner is a fault that was found BY EYE after all
# seventeen steps reported success. None of them has to be found by eye twice.
sys.path.insert(0, os.path.join(ROOT, "tools"))
from scan_render_defects import scan as scan_defects              # noqa: E402

defects = scan_defects(html_path)
defect_high = [d for d in defects if d["severity"] == "high"]

head("step15_visual_qa_agent")
line(not by_kind.get("overflow"), "overflow",
     "%d page(s) clipped" % by_kind.get("overflow", 0))
line(not by_kind.get("broken_math"), "maths",
     "%d empty fraction/vector" % by_kind.get("broken_math", 0))
line(not by_kind.get("tiny_text"), "legibility",
     "%d element(s) under 11px" % by_kind.get("tiny_text", 0))
line(not by_kind.get("orphan_heading"), "orphans",
     "%d heading(s) alone at a column foot" % by_kind.get("orphan_heading", 0))
line(not by_kind.get("empty_page"), "empty pages", str(by_kind.get("empty_page", 0)))
line(not defects, "render defects",
     "%d kind(s), %d occurrence(s)"
     % (len(defects), sum(d["count"] for d in defects))
     if defects else "none")
for d in defects:
    line(d["severity"] != "high", "  " + d["id"], "%d — %s" % (d["count"], d["why"]))

shots = []
want = [int(x) for x in a.shots.split(",") if x.strip().isdigit()]
if not want:
    # EVERY PAGE, NOT JUST THE ONES GEOMETRY ALREADY FLAGGED.
    #
    # This step's whole reason to exist is catching what geometry CANNOT
    # see — crowding, awkward rag, a decorator in a silly place. Screenshotting
    # only pages already in `issues` meant a chapter with zero geometry
    # findings got ZERO pages looked at, which is the one case this step
    # is actually FOR: a page can be geometrically perfect and still read
    # badly. Six pages was never a sample of the book, it was a sample of
    # the pages a different, narrower check happened to flag.
    want = list(range(1, asm.get("pages", 0) + 1))
if want:
    # PARALLEL, NOT ONE HEADLESS CHROME LAUNCH AT A TIME.
    #
    # Rendering every page (above) makes this step's own runtime scale
    # with the book's length, and each screenshot is an independent
    # subprocess — Python's GIL releases for the whole time one is
    # blocked on Chrome, so a thread pool gets real, not fake, concurrency
    # out of it. Ordered back into page order afterward so `shots` reads
    # the same as it always did.
    from concurrent.futures import ThreadPoolExecutor
    def _shoot(p):
        png = os.path.join(ROOT, "build", a.stem, "qa", "page-%02d.png" % p)
        return p, (os.path.relpath(png, ROOT) if visual.screenshot(html_path, p, png) else None)
    with ThreadPoolExecutor(max_workers=min(8, len(want))) as pool:
        results = dict(pool.map(_shoot, want))
    shots = [results[p] for p in want if results.get(p)]
if shots:
    line(True, "screenshots", "%d rendered for review" % len(shots))

hard = (by_kind.get("overflow", 0) + by_kind.get("broken_math", 0)
        + sum(d["count"] for d in defect_high))
open_items = [dict(i, id=artifact.item_id(a.stem, "vqa", i["page"], i["kind"]))
              for i in issues]
artifact.save(a.stem, "15_visual_qa", dict(issues=issues, by_kind=dict(by_kind),
                                           screenshots=shots))
finish(a.stem, "step15_visual_qa_agent", "fail" if hard else "ok", open_items,
       question="Open the screenshots in build/%s/qa/ and judge what geometry "
                "cannot see: crowding, awkward rag, a decorator in a silly place, "
                "a page that reads badly. Reply {id, verdict, fix}." % a.stem,
       issues=len(issues), **{k: v for k, v in by_kind.items()})
