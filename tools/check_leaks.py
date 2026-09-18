#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check_leaks — is any LaTeX command printing its own name on the page?

THE CHECK HAS TO LOOK AT VISIBLE TEXT, and two earlier versions of it did not.

  * `grep -c 'mathrm' build/x.html` reported 368 hits on a page with none.
    They were all inside `data-desc="..."` attributes — the figure
    descriptions the integrity audit deliberately keeps and the reader never
    sees — plus this project's own CSS comments, which discuss the commands
    by name.

  * `grep -c 'chain:'` reported a leaked structure fence that was a CSS
    comment reading "A `=` chain: left-hand side, sign, expression".

So: strip <style> and <script>, then strip every tag WITH its attributes, and
only then look. A check that cries wolf is a check people learn to skip, and
this one guards the defect that destroyed 500 constructs in chapter 6 without
raising a single error.

    python3 tools/check_leaks.py build/chem-06-cols.html
"""
import io
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))), "book", "util"))
try:
    import bootstrap                                  # noqa: F401
except Exception:
    pass

# Anything that looks like a backslash command, plus the constructs that are
# handled before `strip_latex` and so must never survive it.
PATTERNS = [
    (r'\\[a-zA-Z]{2,}', "a backslash command printing its own name"),
    (r'\bxrightarrow\b', "a reaction arrow that was not built"),
    (r'\bunderset\b|\boverset\b', "a species label that was not placed"),
    (r'\bsubstack\b', "a two-line arrow condition"),
    (r'\bmathrm\b', "an upright-text wrapper"),
    (r'\$\$|\$[A-Za-z\\]', "an unclosed maths delimiter"),
    (r'^[ \t]*(?:chain|up|down|no|name|src)[ \t]*:', "a leaked संरचना fence"),
    (r'[\ue000-\ue0ff]', "a private-use sentinel"),
]


def visible(path):
    h = io.open(path, encoding="utf-8").read()
    try:
        h = h[h.index(">", h.index("<body")) + 1:h.rindex("</body>")]
    except ValueError:
        pass
    h = re.sub(r"<style\b.*?</style>|<script\b.*?</script>", " ", h, flags=re.S)
    # Tags go WITH their attributes — `data-desc` holds raw source text on
    # purpose and is not on the page.
    return re.sub(r"<[^>]+>", " ", h)


def main(paths):
    bad = 0
    for p in paths:
        text = visible(p)
        print(os.path.basename(p))
        for pat, why in PATTERNS:
            hits = re.findall(pat, text, re.M)
            if hits:
                bad += len(hits)
                print("  XX %-46s %d  e.g. %r"
                      % (why, len(hits), hits[0][:40]))
        if not bad:
            print("  ok  no command printed its own name")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:] or ["build/chem-06-cols.html"]))
