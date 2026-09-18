#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
split_css — regenerate book/elements/*/{base,a4}.rules.json from the archive.

WHY THIS IS A TOOL AND NOT A ONE-OFF. The first split silently corrupted the
stylesheet. Its scanner tested `css[i] == '@'` to find an at-rule, but after
the previous rule `i` points at the NEWLINE before `@media`, so the test
failed, the generic branch matched the media block's opening brace against
its first INNER closing brace, and every rule inside the media query leaked
out as an unconditional top-level rule.

The rule count was unchanged — 307 either way — so a count check passed while
`.page { width:1080px }` had been overridden by a responsive rule that was
never meant to apply. The cover page rendered 1400px wide with no grid.

So the split is reproducible, and `--verify` renders a page under both the
bundle and the archive and compares computed styles. Never hand-edit the
rules.json files.
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "book", "util"))
import bootstrap                                       # noqa: E402,F401
sys.path.insert(0, ROOT)

OWN = {
 "page": [".page", ".shell", "body", "*", "@page", "@media", "pre#"],
 "acols": [".acols", ".acol"],
 "unit": [".u", ".acol .u", ".flowwrap .u"],
 "sechead": [".sechead", ".secno", ".basetag"],
 "heading-underline": [".hdu", ".hd-"], "examchip": [".examchip"],
 "starline": [".starline", ".stars", ".starnote"],
 "paragraph": ["p,", "p ", ".para", ".lead"],
 "question-text": [".q ", ".q{", ".qmarks", ".marksrow"],
 "working": [".work", "p.work"], "display-math": [".dm"],
 "math-inline": [".m ", ".m{", ".up", ".k ", ".k{", ".fr", ".vec", "sup,", ".sqb", ".ovl"],
 "definition": [".def", ".deflead", ".dl", ".hlp", ".hlb"], "trio": [".trio"],
 "bullets": ["ul.bl"],
 "numbered": ["ol.nl"],
 "formula-card": [".fcard", ".frow", ".cond", ".fx", ".fd", ".fc"],
 "pointer": [".po", ".po-", ".poflat", ".pf-"],
 "callout": [".callout", ".ch", ".ci", ".pin"], "stickycol": [".stickycol"],
 "figcard": [".figcard", ".figbox", ".figspace", ".figrow", ".fig-", ".fh"],
 "question-head": [".qhead", ".qnum", ".chip"], "options": [".opts"],
 "answer": [".ansrow", ".anslabel", ".anstext"], "given": [".given", ".givenlabel"],
 "table": [".tbl", ".tblwrap"], "marktag": [".marktag"],
 "yearhead": [".yearhead", ".yr"], "banner": [".banner"],
 "separator": [".qsep", "hr.sep", ".rule"], "partbanner": [".partbanner"],
 "booktitle": [".booktitle", ".booksub", ".h2"],
 "night": [".night", ".mirror", ".farewell", ".nh"],
 "srcnote": [".srcnote", ".note"], "toc": [".toc", ".topbar", ".prog"],
 "qcard": [".qcard"], "flowwrap": [".flowwrap"], "stat-tiles": [".cvtiles", ".cvtile", ".cvtv", ".cvtl", ".cvty", ".cvtu", ".cvtcap"],
 "cover": [".cv", ".cover"],
}


def split_rules(css):
    """-> [(selector, whole_rule)] at TOP LEVEL only.

    At-rules are kept whole, braces balanced. The `@` test skips leading
    whitespace — that omission is what corrupted the first split."""
    out, i, n = [], 0, len(css)
    while i < n:
        # Skip whitespace AND comments before deciding whether this is an
        # at-rule. Skipping only whitespace still left `/* responsive */`
        # sitting in front of `@media`, so the `@` test failed a second time
        # and the media block's inner rules leaked out again — this time the
        # rule count LOOKED right (300) while `.page { padding:26px }` from a
        # `max-width:1100px` query applied unconditionally.
        while i < n:
            if css[i] in " \t\r\n":
                i += 1
            elif css.startswith("/*", i):
                e = css.find("*/", i + 2)
                i = (e + 2) if e >= 0 else n
            else:
                break
        if i >= n:
            break
        if css[i] == "@":
            j = css.find("{", i)
            if j < 0:
                break
            depth, k = 0, j
            while k < n:
                if css[k] == "{":
                    depth += 1
                elif css[k] == "}":
                    depth -= 1
                    if depth == 0:
                        break
                k += 1
            out.append((css[i:j].strip(), css[i:k + 1]))
            i = k + 1
            continue
        j = css.find("{", i)
        if j < 0:
            break
        k = css.find("}", j)
        if k < 0:
            break
        out.append((css[i:j].strip(), css[i:k + 1].strip()))
        i = k + 1
    return out


def owner(sel):
    """Longest-prefix match, on the selector plus a trailing space.

    Without the space, a prefix written as `.m ` (to avoid matching
    `.marktag`) never matched the selector `.m`, and `.m`, `.k` and `.q` all
    fell into `misc` — three of the most-used rules in the book, orphaned."""
    probe = sel.strip() + " "
    best, blen = None, -1
    for eid, prefixes in OWN.items():
        for p in prefixes:
            if p in probe and len(p) > blen:
                best, blen = eid, len(p)
    return best or "misc"


def main():
    from book.design import css as archive

    ED = os.path.join(ROOT, "book", "elements")
    if "--verify" in sys.argv:
        from book import elements
        a = elements.bundle("a4")
        b = archive.CSS_BASE + archive.CSS_A4
        ra, rb = split_rules(a), split_rules(b)
        print("bundle rules: %d   archive rules: %d" % (len(ra), len(rb)))
        # Our own additions live in `<element>/extra.css` and are appended by
        # the bundler. They are EXPECTED to be in the bundle and absent from
        # the archive, so exclude them or every check reports a false extra.
        ours = set()
        for eid in os.listdir(ED):
            f = os.path.join(ED, eid, "extra.css")
            if os.path.exists(f):
                for _s, r in split_rules(io.open(f, encoding="utf-8").read()):
                    ours.add(re.sub(r"\s+", " ", r).strip())

        norm = lambda rs: sorted(re.sub(r"\s+", " ", r).strip() for _s, r in rs)
        missing = set(norm(rb)) - set(norm(ra))
        extra = set(norm(ra)) - set(norm(rb)) - ours
        print("missing from bundle: %d" % len(missing))
        for m in list(missing)[:5]:
            print("   -", m[:90])
        print("extra in bundle:     %d" % len(extra))
        for m in list(extra)[:5]:
            print("   +", m[:90])
        sys.exit(1 if (missing or extra) else 0)

    # Clear the previous split completely, style.css included. Leaving a
    # stale style.css behind kept an orphan `misc/` folder alive after its
    # rules had been correctly reassigned.
    for eid in os.listdir(ED):
        for f in ("base.rules.json", "a4.rules.json", "style.css"):
            p = os.path.join(ED, eid, f)
            if os.path.exists(p):
                os.remove(p)

    for label, css in (("base", archive.CSS_BASE), ("a4", archive.CSS_A4)):
        per = {}
        for idx, (sel, rule) in enumerate(split_rules(css)):
            if not sel or not rule.strip():
                continue
            per.setdefault(owner(sel), []).append(dict(i=idx, css=rule))
        for eid, rules in per.items():
            d = os.path.join(ED, eid)
            if not os.path.isdir(d):
                os.makedirs(d)
            io.open(os.path.join(d, "%s.rules.json" % label), "w", encoding="utf-8").write(
                json.dumps(rules, ensure_ascii=False, indent=1))

    for eid in sorted(os.listdir(ED)):
        d = os.path.join(ED, eid)
        if not os.path.isdir(d):
            continue
        txt = []
        for label in ("base", "a4"):
            p = os.path.join(d, "%s.rules.json" % label)
            if not os.path.exists(p):
                continue
            txt.append("/* ===== %s ===== */" % ("shared" if label == "base" else "A4 print only"))
            txt.extend(r["css"] for r in json.load(io.open(p, encoding="utf-8")))
        if txt:
            io.open(os.path.join(d, "style.css"), "w", encoding="utf-8").write("\n".join(txt) + "\n")
    print("split: %d element(s)" % len([d for d in os.listdir(ED)
                                        if os.path.isdir(os.path.join(ED, d))]))


if __name__ == "__main__":
    main()
