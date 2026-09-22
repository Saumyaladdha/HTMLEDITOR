#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scan_render_defects — hunt the faults that every other check passes.

`step02` counts blocks, `step16` counts words, `step15` looks for clipping.
None of them notices a formula that printed its own LaTeX source, a fraction
stacked where there is no division, or an equation number labelling the wrong
paragraph: the content is all present, correctly counted, and unreadable.

Every rule below is a fault that was found ON A REAL PAGE, by eye, after all
seventeen steps reported success. Grep is enough to find each one again, so
none of them should ever have to be found by eye twice.

    python3 tools/scan_render_defects.py build/chapter-19.html
    python3 tools/scan_render_defects.py build/chapter-19.html --json

Exit 1 when anything at `high` severity is found, so it can gate a build.
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "book", "util"))
import bootstrap                                   # noqa: E402,F401

import argparse                                    # noqa: E402
import json                                        # noqa: E402

# THE FULL PRIVATE-USE-AREA RANGE, not just the two sentinel pairs
# someone happened to need when this was first written.
#
# This was `"\ue010-\ue013\ue020"` -- correct as far as it went (those
# ARE real sentinels: \ue010-\ue013 mark a sub/superscript,
# \ue020 a LaTeX row-break) but written as RAW invisible codepoints
# pasted directly into the source rather than escape text, so the
# whole assignment reads as just `"-"` to a human editor, a grep, or
# a diff -- nothing renders a private-use character. That is what
# made this look broken: it wasn't broken, it was invisible, which is
# just as dangerous to maintain. It also missed three sentinels this
# codebase added since: \ue021 (slug-underscore), \ue031 (reaction
# tag), \ue040-\ue043 (matrix/reaction stash tokens -- see
# book/format/inline.py). A matrix sentinel leaking onto the page --
# exactly the failure this rule's own message describes -- had NO
# automated check anywhere that would catch it.
#
# Written here as literal escape TEXT, matching book/qa/visual.py's
# own `[\ue000-\uf8ff]` (line ~120) -- the full private-use area,
# so a sentinel added later needs no matching update here.
SENTINELS = "\ue000-\uf8ff"

# VISIBLE TEXT ONLY.
#
# The first version scanned the raw body and reported 780 stray `$`
# delimiters and 42 unconverted backslashes — nearly all of them inside
# `data-desc` on a figure, which holds the author's brief for art that has
# not been drawn yet and is never rendered. Attribute values have to go, or
# the scan buries its real findings in noise nothing can act on.
#
# `data-desc` is worth checking one day, but as SOURCE hygiene, not as a
# render defect.
_TAG_RE = re.compile(r"<[^>]+>")
# Every attribute EXCEPT `class`. Stripping class too was a mistake the
# first run made obvious: `<p class="q">` became `<p >`, so every rule
# that matches on a tag stopped firing and `detached_eqno` reported 0
# where it had just reported 29.
_ATTR_RE = re.compile(
    r"""\s+(?!class\s*=)[-\w:]+\s*=\s*(?:"[^"]*"|'[^']*')""")


def body_of(html):
    i = html.find("<body")
    j = html.rfind("</body>")
    body = html[html.index(">", i) + 1: j] if i >= 0 and j > 0 else html
    body = re.sub(r"<style\b.*?</style>", " ", body, flags=re.S)
    body = re.sub(r"<script\b.*?</script>", " ", body, flags=re.S)
    # Tags are KEPT (several rules match on them) but stripped of what their
    # attributes hold.
    return _TAG_RE.sub(lambda m: _ATTR_RE.sub(" ", m.group(0)), body)


# (id, severity, compiled pattern, what it means)
RULES = [
    ("latex_command", "high",
     re.compile(r'\\(?:frac|vec|sqrt|sum|int|oint|text|mathrm|hat|dfrac|tfrac|'
                r'therefore|because|ldots|cdots|quad|qquad|left|right|begin|end)\b'),
     "a LaTeX command printed its own name — the converter never saw it"),

    ("latex_spacing", "high", re.compile(r'\\[,;:!]'),
     "a LaTeX spacing command printed as a backslash (see _SPACING)"),

    ("bare_backslash", "medium", re.compile(r'\\[a-zA-Z]{2,}'),
     "an unconverted backslash command"),

    ("math_delimiter", "high", re.compile(r'(?<!\\)\$\$?'),
     "a `$` or `$$` delimiter reached the page; the maths inside it is raw"),

    ("md_bold", "high", re.compile(r'\*\*[^*<>]{1,60}\*\*'),
     "`**bold**` printed literally — markdown that was never parsed"),

    ("md_italic", "medium", re.compile(r'(?<![\w*])\*[^*<>\s][^*<>]{0,50}\*(?![\w*])'),
     "`*italic*` printed literally"),

    ("md_code", "medium", re.compile(r'`[^`<>]{1,60}`'),
     "a backtick span reached the page"),

    ("md_heading", "high", re.compile(r'(?:^|>)\s*#{1,6}\s'),
     "a `#` heading printed as body text"),

    ("sentinel", "high", re.compile('[' + SENTINELS + ']'),
     "a private-use sentinel survived; reopen_sentinels did not run on it"),

    ("bare_combining_arrow", "medium", re.compile('(?<![>])⃗'),
     "a combining vector arrow outside .vec — draws as tofu in Kalam"),

    ("empty_script", "medium", re.compile(r'<(sub|sup)>\s*</\1>'),
     "an empty <sub>/<sup> — the operand was lost"),

    ("nested_script", "medium", re.compile(r'<(sub|sup)>\s*<\1>'),
     "a script nested in itself — a sentinel was processed twice"),

    ("empty_fraction", "high",
     re.compile(r'<span class="fr"><span>\s*</span>|<span class="dn">\s*</span>'),
     "a fraction with an empty half"),

    ("slug_fraction", "high",
     re.compile(r'<span class="fr"><span>[^<]*</span><span class="dn">'
                r'(?:<[^>]+>)*[a-z][a-z0-9]{2,}(?:<sub>[^<]*</sub>)?</'),
     # Three or more characters, matching `_is_slug` in book/format/inline.py.
     # Allowing one let every `mv/qB`, `NAB/k` and `F/l` through as a finding —
     # 35 of them, all correct fractions with a single-letter denominator.
     "a lowercase identifier as a denominator — a path, not a division"),

    ("detached_eqno", "high",
     re.compile(r'<p class="q">\s*(?:…|\.\.\.)\s*\([ivxlcdm]+\)', re.I),
     "a paragraph opening with an equation number — it labels the wrong thing"),

    ("literal_power", "medium", re.compile(r'\^\(?\d'),
     "a `^` exponent printed literally instead of being set as a superscript"),

    ("literal_underscore_sub", "low", re.compile(r'(?<=[A-Za-z])_[A-Za-z0-9]{1,3}(?![^<]*</)'),
     "an `_` subscript printed literally"),

    ("double_separator", "low", re.compile(r'·\s*·|,\s*,|:\s*:'),
     "a doubled separator — usually a split that left an empty part"),

    # `stray_separator` was removed. `<span class="up">4π</span> · I dl`
    # trips it 148 times and every one is a correct multiplication dot; the
    # rule could not tell that from a separator a bad split had stranded.
    # A rule with a 100% false-positive rate teaches you to ignore the scan.

    ("prose_in_display", "medium",
     re.compile(r'<div class="dm">(?=[^<]*[ऀ-ॿ]{25})'),
     "a long Devanagari run centred as a display equation — prose set as maths"),

    # ======================================================================
    # BIOLOGY
    #
    # Run against the first biology build, every rule above reported CLEAN
    # while the page carried eleven printed figure briefs, a hundred stray
    # backticks and fourteen Hindi-prose maths runs. The rules above look for
    # broken LaTeX, doubled equation numbers and split fractions; a chapter
    # with no LaTeX at all cannot trip any of them.
    #
    # These are the failure modes a subject without maths actually has.
    # ======================================================================

    # A note to whoever draws the figure, printed in the book. All eleven of
    # chapter 1's briefs reached the page in the first build.
    ("fence_leaked", "high",
     re.compile(r'चित्र-निर्देश|(?<![\w/])ref:\s|NCERT\s+चित्र'),
     "a figure brief leaked into the page — the ```चित्र-निर्देश``` fence is "
     "a production note and must never render"),

    # A literal backtick in visible text. 100 in the first build.
    ("stray_backtick", "high", re.compile(r'`'),
     "a literal backtick reached the page — a backtick run was not converted"),

    # A ploidy torn apart by the fraction/upright machinery: `(3n)` coming
    # out as `(3` + `n` + `)`. Latent rather than seen, and cheap to hold.
    #
    # FALSE POSITIVE on a compound physics subscript: `F`_{1n}` (particle 1
    # to particle n, Coulomb superposition) correctly renders digit and
    # variable separately — upright `1`, italic `n` — as
    # `<sub><span class="up">1</span>n</sub>`. Biology's ploidy is bare
    # prose (`… अगुणित (n) या द्विगुणित (2n) …`), never inside a `<sub>`, so
    # excluding an immediate `</sub>` keeps the biology case caught without
    # flagging every subject's legitimate digit+variable subscript.
    ("ploidy_split", "high",
     re.compile(r'<span class="up">\(?\d</span>\s*n(?![ऀ-ॿ\w])(?!</sub>)'),
     "a ploidy such as 2n or (3n) was split across spans — read as algebra"),

    # A flow stage must be upright. The whole point of the component is that
    # a stage is not italic.
    ("flow_italic", "high",
     re.compile(r'<span class="st"[^>]*style="[^"]*font-style:\s*italic'),
     "a flow stage rendered italic — a stage names a thing, it is not a "
     "variable"),
]


def _maths_runs(body):
    """The inner HTML of every `<span class="m">`, nested tags and all.

    A regex cannot do this. `.m` runs contain nested `<span class="up">`,
    `<sub>` and `<sup>` tags, so any lookahead that stops at the first
    `</span>` sees only the first few characters — which is exactly why the
    first version of the two rules below reported CLEAN on a page carrying a
    whole italic word-equation. Count the depth instead.
    """
    key = '<span class="m">'
    out, i = [], 0
    while True:
        a = body.find(key, i)
        if a < 0:
            return out
        depth, k = 1, a + len(key)
        while depth and k < len(body):
            o, c = body.find("<span", k), body.find("</span>", k)
            if c < 0:
                break
            if 0 <= o < c:
                depth += 1
                k = o + 5
            else:
                depth -= 1
                k = c + 7
        out.append((a, body[a + len(key):max(a + len(key), k - 7)]))
        i = max(k, a + len(key))


# Rules that need to see a whole balanced element, which a regex cannot.
# (id, severity, predicate over the body -> list of (offset, why-fragment))
# Devanagari that has ALREADY been taken out of the italic face.
#
# `<span class="mt">…</span>` is the `\text{}` equivalent: upright, body
# font, inside a maths run. A mixed statement like
# `A'A = I ⇒ A लम्बकोणीय` is CORRECT once its Hindi is wrapped that way, so
# counting it keeps reporting a defect that has been fixed — and a rule that
# fires on correct output is a rule people learn to ignore.
_MT_SPAN = re.compile(r'<span class="mt">.*?</span>', re.S)

# A REACTION LABEL IS HINDI ON PURPOSE, AND IS ALREADY PROSE-FACED.
#
# `.rxn-t` / `.rxn-b` hold a reagent or a condition (`निर्जल ZnCl₂`,
# `ऐल्कोहॉलीय`); `.sp-u` holds a species NAME (`1-ब्रोमोप्रोपेन`). All three
# sit inside a maths run because that is where the equation is, and all three
# are set in the prose face by `elements/reaction`. Counting them, this rule
# reported 115 findings on chemistry output that was correct — and a rule
# that fires on correct output is a rule people learn to ignore. That has
# now happened three times to my own rules; the fix each time was to exempt
# what the CSS already handles, not to lower the threshold.
_RXN_LABEL = re.compile(
    r'<span class="(?:rxn-t|rxn-b|sp-u)">.*?</span>', re.S)


def _rule_devanagari_in_maths(body):
    hits = []
    for at, inner in _maths_runs(body):
        text = re.sub(r"<[^>]+>", "",
                      _RXN_LABEL.sub(" ", _MT_SPAN.sub(" ", inner)))
        if len(re.findall(r"[ऀ-ॿ]", text)) >= 6:
            hits.append((at, text[:90]))
    return hits


def _rule_chain_as_maths(body):
    """An arrow inside a maths run — but only when it joins WORDS.

    A process chain names its stages: `बीजाणुजन ऊतक → पराग मातृ कोशिका`. A
    row operation does not: `R₁ → ½R₁` is an instruction in symbols, and so
    are a limit, a mapping and an implication. Flagging every arrow in maths
    reported 20 correct row operations as defects — and a rule that fires on
    correct output is a rule people learn to ignore.
    #
    Devanagari is what separates them. Nothing in the maths chapter's row
    operations contains any; every biology chain is made of it.
    """
    out = []
    for at, inner in _maths_runs(body):
        # A reaction arrow's own label is not a chain stage — same exemption
        # as the rule above, and the arrow grid is why the `→` is there.
        inner = _RXN_LABEL.sub(" ", inner)
        if "→" not in inner:
            continue
        text = re.sub(r"<[^>]+>", "", _MT_SPAN.sub(" ", inner))
        if len(re.findall(r"[ऀ-ॿ]", text)) >= 4:
            out.append((at, text[:90]))
    return out


CODE_RULES = [
    ("devanagari_in_maths", "high", _rule_devanagari_in_maths,
     "Hindi prose set in the italic maths face — it belongs in a flow or a "
     "paragraph, not in maths"),
    ("chain_as_maths", "high", _rule_chain_as_maths,
     "a process chain rendered as maths — it should be a flow block "
     "(components/text.flow)"),
]


def scan(path):
    body = body_of(io.open(path, encoding="utf-8").read())
    # A QUOTED MARKUP RUN IS SHOWING THE CHARACTER, NOT LEAKING IT.
    #
    # `format/inline.plain_text_run` emits `<span class="mt">` for a
    # backtick run that QUOTES notation rather than using it — physics
    # chapter 9's notes about the delimiters themselves ("एक ही `$…$` खंड
    # … काटने पर `$` दोनों ओर") and the book's own raw line kept
    # deliberately "ज्यों की त्यों" (`v=\frac{13}{15}`). Those spans are
    # correct output: the `$` and the `\frac` are the subject of the
    # sentence. Counted, they reported 20 `math_delimiter` and 4
    # `latex_command` findings on a page that is right, and failed the
    # build for them — which is what the `_MT_SPAN` and `_RXN_LABEL`
    # comments below already warn about. The span is blanked for the
    # TEXT rules only, so its position and the surrounding page are
    # unchanged for everything else.
    _scan_body = _MT_SPAN.sub(
        lambda m: " " * (m.end() - m.start()), body)
    out = []
    for rid, sev, fn, why in CODE_RULES:
        hits = fn(body)
        if hits:
            out.append(dict(id=rid, severity=sev, count=len(hits), why=why,
                            samples=[" ".join(h[1].split())[:110]
                                     for h in hits[:4]]))
    for rid, sev, rx, why in RULES:
        # STRUCTURAL rules check span ADJACENCY (is `.fr`'s first child
        # immediately its own close tag), not leaked text — so they must
        # read the REAL body. `.mt` is `\text{}` inside a maths run, and a
        # unit name is legitimately set that way as a fraction OPERAND
        # (`<span class="fr"><span><span class="mt">मीटर</span></span>
        # <span class="dn"><span class="mt">सेकंड</span></span></span>` —
        # a real, non-empty मीटर/सेकंड quotient). Blanking it before this
        # check emptied both spans and reported ten correct fractions as
        # `empty_fraction`, on a chapter that had none — the exact false
        # alarm `_scan_body`'s own comment above says blanking must not
        # cause ("unchanged for everything else"). Run on `body` instead.
        src = body if rid in ("empty_fraction", "slug_fraction") else _scan_body
        hits = list(rx.finditer(src))
        if not hits:
            continue
        samples = []
        for m in hits[:4]:
            a = max(0, m.start() - 45)
            frag = body[a:m.end() + 45]
            frag = re.sub(r'<[^>]+>', "", frag)
            samples.append(" ".join(frag.split())[:110])
        out.append(dict(id=rid, severity=sev, count=len(hits), why=why,
                        samples=samples))
    order = {"high": 0, "medium": 1, "low": 2}
    out.sort(key=lambda f: (order[f["severity"]], -f["count"]))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("html")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    findings = scan(a.html)
    if a.json:
        print(json.dumps(findings, ensure_ascii=False, indent=1))
    else:
        if not findings:
            print("clean: no render defects found in %s" % a.html)
        for f in findings:
            print("%-7s %-24s %5d  %s" % (f["severity"].upper(), f["id"],
                                          f["count"], f["why"]))
            for s in f["samples"]:
                print("          · %s" % s)
    return 1 if any(f["severity"] == "high" for f in findings) else 0


if __name__ == "__main__":
    sys.exit(main())
