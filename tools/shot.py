#!/usr/bin/env python3
"""shot.py — screenshot selected .page divs of a built book. Dev tool."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))), "book", "util"))
import bootstrap  # noqa: F401 — utf-8 stdout + version re-exec

import io, re, subprocess
SC = os.environ.get("SHOT_DIR", "/private/tmp/claude-503/-Users-saumyaladdha-bookGeneration-AutomatedFlow/8d08a58b-00f3-4fbd-9344-32f357ab576d/scratchpad/out")
CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
src_path = sys.argv[1]; nums = [int(x) for x in sys.argv[2].split(",")]
tag = sys.argv[3] if len(sys.argv) > 3 else "p"
os.makedirs(SC, exist_ok=True)
s = io.open(src_path, encoding="utf-8").read()
head = s[:s.index("<body")]; bo = s.index(">", s.index("<body")) + 1
# THE BODY TAG'S CLASS MUST SURVIVE.
#
# This wrote `head + "<body>"`, discarding the attributes — so every
# screenshot lost `class="subj-chemistry"` (or `subj-maths`, or
# `subj-biology`) and every subject-scoped rule in the stylesheet was
# inactive in the preview. Chemistry's formulae are set upright by
# `.subj-chemistry .m`; judged from these screenshots they looked italic on
# a page where they were not, and the same blind spot applied to every
# subject-scoped rule reviewed this way.
body_tag = s[s.index("<body"):bo]
body = s[bo:s.rindex("</body>")]
idx = [m.start() for m in re.finditer(r'<div class="page', body)] + [len(body)]
print("pages:", len(idx) - 1)
for n in nums:
    if n > len(idx) - 1: continue
    f = "%s/%s%d.html" % (SC, tag, n)
    io.open(f, "w", encoding="utf-8").write(head + body_tag + body[idx[n-1]:idx[n]] + "</body></html>")
    subprocess.run([CH, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
                    "--window-size=1130,1590", "--virtual-time-budget=9000",
                    "--screenshot=%s/%s%d.png" % (SC, tag, n), "file://" + f],
                   capture_output=True)
    print("  ->", "%s/%s%d.png" % (SC, tag, n))
