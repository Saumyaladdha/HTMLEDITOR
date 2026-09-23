# -*- coding: utf-8 -*-
"""
INTEGRITY — does the finished HTML still say what the markdown said?

Everything upstream can pass and the book can still be wrong: a block the
packer dropped, an answer that ended up under the wrong question, a
paragraph rendered twice. This is the last line, and it compares the FINAL
HTML against the ORIGINAL markdown — not against the IR, which shares the
parser's blind spots.

WHY A WORD MULTISET, AND NOT A TEXT DIFF
----------------------------------------
Two earlier attempts failed for the same reason: the design RESTRUCTURES
text, so any sequence-based comparison drowns in false positives.

  * fixed word-windows: a window spanning two markdown lines has no
    counterpart in HTML that renders those lines as two elements;
  * per-line probes: a heading like `1.7 कूलॉम नियम (Coulomb's Law) · [UP 2022]`
    is legitimately reflowed into three separate elements, and `n = q/e`
    becomes a stacked fraction whose numerator and denominator live in
    different spans.

None of that is content loss. What IS content loss is a word that occurs
in the source and occurs fewer times on the page. So: count words on both
sides and report the deficit. Immune to reflow, to fraction stacking, to
element boundaries and to ordering — and it still catches a dropped block,
because a dropped block takes all of its words with it.
"""
import io
import re
import unicodedata
from collections import Counter

# Markup scaffolding the source contains and the page has no reason to.
SCAFFOLD = {
    "figure", "image", "ref", "png", "jpg", "svg", "source_figures",
    "सूत्र", "part", "quick", "revision", "questions", "answers",
    # figure-KIND markers. `taggers/classify.parse_figure` strips these from
    # the brief on purpose — they say what sort of picture it is, they are
    # not part of the description.
    "नामांकित", "डूडल", "ग्राफ़", "ग्राफ", "graph", "doodle",
    # LaTeX ENVIRONMENT names. `\begin{aligned}` / `\begin{array}{l}` wrap
    # a multi-row equation; `format.inline.strip_environments` removes the
    # wrapper and keeps the rows, so these words correctly never reach the
    # page. `_LATEX_CMD` below only catches `\name`, not `{name}`.
    "aligned", "array", "matrix", "cases", "gathered", "split", "bmatrix",
    "pmatrix", "l", "c", "r",
    # `\begin{equation*}…\tag{1}…\end{equation*}` is how a maths chapter
    # numbers a single derivation step it refers back to later ("समी. (1)").
    # `format.matrix` unwraps it into the line plus a plain `(1)` label the
    # same way it unwraps `aligned` — see book/format/matrix.py ENVIRONMENTS.
    "equation",
    # A small 3-column exam-weightage table (topic · count · per-paper
    # average) is rendered by `components.cover` as a `.cvrow`/`.cvbar`
    # coverage chart, not a literal `<table>` — topic name, then the
    # average folded inline as "· 1.8", a count badge, and a proportional
    # bar. That chart has no header row, so a header word describing the
    # third column ("...लगभग" — "approximately, per paper") correctly
    # never reaches the page while the value itself (1.8) still does,
    # inline. Not content loss.
    "लगभग",
    # The same construct, a different header word: a 3-column cover table
    # (तरीका · कितने · कहाँ सबसे ज़्यादा) is rendered by `components.cover`
    # as `.cvflex`/`.cvtiles` — a card per row, the COUNT column's value set
    # as the big number (`.cvtv`), the other two columns as the card's head
    # and body text. The count column's header word ("कितने" — "how many")
    # is exactly like "लगभग" above: implied by the tile's own styling,
    # never printed as a literal label, and not content loss.
    "कितने",
    # A Mathpix crop URL carries its own crop rectangle as a query string —
    # `...jpg?height=159&width=637&top_left_y=1703&top_left_x=238` — physics
    # chapter 1 alone writes ten of them (`चित्र N — ![](url?...)`, see
    # FORMAT_SPEC §9). The figure becomes a placeholder card holding the
    # NUMBER ("चित्र 1.11"), not the URL — the crop coordinates are asset
    # metadata for whoever fetches the image, never meant for the page, so
    # `height`/`width` correctly never reach the HTML.
    "height", "width",
}
# Labels the DESIGN adds that the markdown never contained.
# `प्रश्न` joins `कुल` here for ONE construct, not as a general amnesty: the
# qgroup summary strip `कुल 15 प्रश्न · 21 अंक` is SYNTHESISED per group by
# `derive_group_summary` and never written in the markdown, so a chapter with
# six year groups gains six copies of both words. `कुल` was already declared
# for exactly this string; `प्रश्न` was not, and the maths chapter (2 in the
# source, 8 on the page) tripped the duplication check on it.
ADDED_BY_DESIGN = {"उत्तर", "दिया", "प्र", "वर्ग", "कुल", "नज़र", "पढ़ें",
                   "प्रश्न"}

# LaTeX command names are NOTATION, not content: `\varepsilon_0` is
# correctly rendered as ε₀, so the word "varepsilon" vanishing is the
# converter working, not a block being dropped.
_LATEX_CMD = re.compile(r'\\[A-Za-z]+')

# The renderer prints callout labels in Hindi while the source writes most
# of them in Hinglish (see book/core/ir.py CALLOUT_LABEL_HI). Both sides of
# that swap are declared here so a deliberate translation does not read as
# simultaneous loss AND duplication.
TRANSLATED = set()
try:
    from ..core.ir import CALLOUT_LABEL_HI
    for _en, _hi in CALLOUT_LABEL_HI:
        TRANSLATED.update(_en.lower().split())
        TRANSLATED.update(_hi.lower().split())
    # the source writes fuller labels than the lookup keys
    # ("Aise ghoomkar AA SAKTA HAI"), so cover the connective words too
    TRANSLATED.update("aa sakta hai hain ka ki ke me to ye yahan bas".split())
except Exception:                                                # pragma: no cover
    pass

# `f_1`, `τ_max`, `q_0` are rendered as f<sub>1</sub> etc, so the token
# with the underscore in it correctly stops existing. Not loss.
_SUBSCRIPTED = re.compile(r'^[0-9]?[a-zA-Zα-ωΑ-Ω]{1,4}_[a-z0-9]{1,4}$')

# A maths FRAGMENT: no Devanagari, no real Latin word, just symbols, digits
# and one or two letters — `4πε0ε_r`, `r1i2`, `φe`, `_0`. Fraction stacking
# and subscripting split these across spans, so the joined token stops
# existing. That is the renderer working. Reported separately from prose so
# a genuine dropped paragraph is never buried in notation noise.
_MATH_FRAG = re.compile(
    # The WHOLE Greek range, not a hand-picked handful. `ρ₀` became
    # `ρ` + `0` once subscripts were converted to real tags, and `ρ`
    # was missing from the class, so a notation fragment was reported
    # as a dropped prose word.
    '^(?=.*[0-9_\u0370-\u03ff])[0-9a-zA-Z_\u0370-\u03ff]{1,10}$')


# A short pure-ASCII identifier — `qn`, `qi`, `ds`, `dA` — is maths too.
# `q₁ + q₂ + … + qₙ` renders the subscript as its own span, so the joined
# token stops existing. Three characters is the cut: no English word this
# book uses is that short and also absent from the page.
_SHORT_ID = re.compile(r'^[a-zA-Z]{2,3}$')


# A token mixing DIGITS with a Devanagari unit word — `10⁷मीटर` -> `107मीटर`
# — is notation, not prose. Converting Unicode superscripts to real <sup>
# tags puts a tag boundary inside it, so the page has `10`, `7` and `मीटर`
# as separate words while the source had one. That is the renderer working;
# it was being reported as nine dropped prose words.
_DIGIT_UNIT = re.compile(r'^(?=.*[0-9])(?=.*[\u0900-\u097f])[0-9\u0900-\u097f]+$')


def is_digit_unit(w):
    return bool(_DIGIT_UNIT.match(w))


# A symbol carrying a written-out subscript — `ε_परिणामी`, `I_अधिकतम`. The
# source writes these with an underscore; the renderer turns them into
# `ε<sub>परिणामी</sub>`, which puts a tag boundary inside the token, so the
# page has `ε` and `परिणामी` where the source had one word. Same situation as
# `_DIGIT_UNIT` above: the renderer working, not a dropped block.
_SYMBOL_SUB = re.compile(r'^[^\s_]{1,3}_[0-9A-Za-z\u0900-\u097f]{1,16}$')


def is_symbol_subscript(w):
    return bool(_SYMBOL_SUB.match(w))


# A CONDENSED CHEMICAL FORMULA IS NOTATION.
#
# `BrCH_2CH_2CH_2CH_3` in the source becomes `BrCH₂CH₂CH₂CH₃` on the page:
# the `_2` groups turn into real <sub> tags, so the source token and the page
# token no longer match and the word looks dropped. Twelve of chapter 6's
# formulae were reported as missing prose for exactly this reason, alongside
# 88 others the class already forgave — the same defect, sorted into two
# different buckets because the pattern only knew formulae that START with a
# digit (`2C2H5Br`).
#
# Recognised by ALTERNATION: a formula switches between letter groups and
# digit groups repeatedly (`ch|3|ch|2|ch|2|cl`). An English word with a digit
# stuck on it alternates once, so three or more is a safe floor and no prose
# word in any of the three chapters reaches it.
_ALT_RE = re.compile(r'[a-z]+|[0-9]+')


# The one- and two-letter element symbols, lower-cased. Deliberately does
# NOT include a bare `a`, `e`, `i`, `m`, `r` or `t`: those are not element
# symbols, and excluding them is what stops ordinary English words parsing as
# formulae.
_ELEMENTS = ("cl", "br", "na", "mg", "al", "si", "ca", "fe", "cu", "zn",
             "ag", "sn", "pb", "mn", "cr", "ni", "co", "ti", "li", "be",
             "ba", "sr", "cs", "rb", "as", "se", "te", "xe", "kr", "ar",
             "ne", "he", "hg", "au", "pt", "pd", "rh", "ru", "os", "ir",
             "la", "ce", "th", "pa", "np", "lu", "yb", "eu", "tb", "gd",
             "c", "o", "h", "n", "s", "p", "f", "k", "b", "i", "y", "w",
             "v", "u")


def _all_element_symbols(t):
    """Does `t` parse completely into element symbols? `cooh` -> C,O,O,H."""
    i = 0
    while i < len(t):
        for sym in _ELEMENTS:                 # two-letter first
            if len(sym) == 2 and t.startswith(sym, i):
                i += 2
                break
        else:
            if t[i] in ("c", "o", "h", "n", "s", "p", "f", "k", "b",
                        "i", "y", "w", "v", "u"):
                i += 1
            else:
                return False
    return True


def _is_condensed_formula(w):
    t = w.replace("_", "").replace("{", "").replace("}", "")
    if len(t) < 4 or not re.fullmatch(r'[a-z0-9]+', t):
        return False
    if re.search(r'[0-9]', t):
        return len(_ALT_RE.findall(t)) >= 3
    # NO DIGITS AT ALL, and still a formula: `COOH`, `COONa`, `COOCH`.
    #
    # A carboxyl group has no subscript to lose, so the digit test rejected
    # it and three of chapter 6's functional groups were reported as dropped
    # prose. Case is gone by the time the comparison runs, so shape is the
    # only thing left to test: it must parse completely into element symbols.
    # Only for a token the source itself wrote as notation — see
    # `_NOTATION_TOKENS`. Without that, `carbon` and `cash` both parse into
    # element symbols and prose would be excused as chemistry.
    # Provenance is the real test; the element-symbol shape is a second
    # opinion for a token the source did NOT mark as notation.
    if w in _NOTATION_TOKENS:
        return True
    return len(t) >= 4 and _all_element_symbols(t) and False


def is_math_fragment(w):
    # Strip trailing sentence punctuation first. `r²।` becomes `r`,`2`,`।`
    # once superscripts are real tags, and the danda made the whole token
    # fail the notation test and read as dropped prose.
    w = w.rstrip("।.,;:!?)")
    if not w:
        return False
    if is_digit_unit(w) or is_symbol_subscript(w):
        return True
    if re.search(r'[ऀ-ॿ]', w):
        return False
    if _SHORT_ID.match(w):
        return True
    if _is_condensed_formula(w):
        return True
    return bool(_MATH_FRAG.match(w)) and not re.match(r'^[a-z]{4,}$', w)
    # digits fused to a Devanagari unit are notation too



MIN_LEN = 2               # single characters are noise
DUP_FACTOR = 2.5          # this much more often than the source is suspicious

_TAG = re.compile(r"<[^>]+>")
_ATTR = re.compile(r'(?:data-desc|data-fig|data-ref|alt|title)="([^"]*)"')
# EXCLUDES U+0964/U+0965 (danda / double danda) from the Devanagari range.
#
# Both sit inside ऀ-ॿ, so a word directly followed by one with no space —
# `सिद्धम्।`, every sentence in the book — glued the danda onto the word as
# part of the SAME token. On the source side that is harmless (the identical
# gluing happens in the HTML too, wherever the word and its danda share one
# text node). It broke on `.qed`, which wraps only "इति सिद्धम्" and leaves
# the trailing danda outside the span: `_TAG.sub` turns that boundary into a
# space, so the HTML-side token is `सिद्धम्` while the markdown-side token is
# `सिद्धम्।` — two different tokens for text that renders identically,
# reported as a dropped word on a page that dropped nothing. A danda is
# punctuation, never part of a word, in any Devanagari text; excluding it
# here fixes every chapter that boxes a punctuated phrase this way, not just
# this one line.
_WORD = re.compile(r"[\wऀ-ॣ०-ॿ]+", re.U)


def _words(text):
    text = unicodedata.normalize("NFKC", text or "")
    return [w for w in _WORD.findall(text.lower())
            if len(w) >= MIN_LEN and w not in SCAFFOLD]


# A ```चित्र-निर्देश``` fence and everything inside it.
#
# The fence holds instructions for whoever DRAWS a figure — which plate, what
# to label — and it is deliberately never printed. Counted as source prose it
# reports as vanished: 49 words on biology chapter 1, which is a hard failure
# for a document that lost nothing at all. Worse, a REAL loss would hide
# inside that noise.
#
# Excluded from the expected count here. That the brief must be ABSENT from
# the page is a separate assertion, and the render scanner makes it —
# `fence_leaked` in tools/scan_render_defects.py. Both checks are needed and
# they are not the same check.
_FIG_BRIEF = re.compile(r'```\s*चित्र[^\n]*\n.*?```', re.S)

# THE TAIL OF AN ITALIC FIGURE CAPTION IS A DRAWING BRIEF TOO.
#
# `21_figures_final.md` writes each figure twice: the image with a short
# caption in its `![...]`, then a standalone italic line repeating that
# caption and continuing for several hundred characters of drawing
# description — "नीले रंग की पृष्ठभूमि पर … डैश (dashed) रेखा खिंची है".
# One of them runs to 950 characters.
#
# Only the first sentence is a caption; `first_sentence` in the reader
# keeps that and leaves the rest, exactly as it does for a fenced brief.
# The reference agrees and settles it: its 35 figcaptions run to a MEDIAN
# OF 51 CHARACTERS and a maximum of 76 — it prints the short caption and
# none of the description.
#
# Counted whole as source prose, the unprinted tail reported as 112
# vanished words: a hard failure on a document that dropped nothing the
# design meant to keep, and exactly the noise a real loss would hide in.
# The first sentence stays in the count, so a caption that genuinely
# disappeared is still caught.
_FIG_CAPTION_TAIL = re.compile(
    r'^\*\s*चित्र\s*[0-9०-९.]+\s*[—·:-].*?(?:।|\.)(.*)\*\s*$', re.M | re.S)


def _drop_caption_tails(src):
    return _FIG_CAPTION_TAIL.sub(
        lambda m: m.group(0)[:m.start(1) - m.start(0)] + " ", src)


# An HTML comment, which the reader removes and the page never shows.
#
# The maths chapter opens with 1084 characters of production notes in
# `<!-- … -->`. Counted as source prose they reported as 59 vanished words —
# a hard failure on a document that had lost nothing — and a real loss would
# have hidden inside that. Exactly the same trap as the figure briefs below,
# and the same fix.
_COMMENT = re.compile(r'<!--.*?-->', re.S)

# A LaTeX `figure` ENVIRONMENT IS MARKUP, NOT PROSE — its body never renders.
#
# A Mathpix export writes an image option as
# `\begin{figure}\captionsetup{labelformat=empty}\caption{(A)}
# \includegraphics[...]{https://cdn.mathpix.com/cropped/....jpg}\end{figure}`.
# The reader turns the whole block into ONE reserved plate carrying only the
# caption, and deliberately drops the URL (FORMAT_SPEC §9 — a remote URL is
# evidence of what the crop was, never something to hotlink). So `labelformat`,
# `empty`, `https`, `mathpix`, `cropped` and the URL's hex fragments are source
# "words" that CANNOT appear on the page, and counting them reported eight
# vanished words on a build that had lost no content at all.
#
# The caption is kept — it is the one part that does render, and on this
# chapter it is the `(A)`/`(B)`/`(C)`/`(D)` that says which option the picture
# is. Same discipline as `_COMMENT` and `_FIG_BRIEF` above: strip exactly what
# is known not to render, never a character more.
_FIG_ENV = re.compile(
    r'\\begin\{figure\*?\}(.*?)\\end\{figure\*?\}', re.S)


def _strip_fig_env(src):
    def keep_caption(m):
        return " ".join(re.findall(r'\\caption\{(.*?)\}', m.group(1)))
    return _FIG_ENV.sub(keep_caption, src)


# An environment NAME and an array column spec are markup too: `aligned` in
# `\begin{aligned}` and `rlrl` in `\begin{array}{rlrl}` are instructions to
# the converter, and the converter's whole job is to consume them.
_ENV_NAME = re.compile(r'\\(?:begin|end)\s*\{[^}]*\}(?:\s*\{[^}]*\})?')


# Tokens the SOURCE wrote inside `$...$` or a backtick run. Notation is what
# was written as notation — that is the only test that separates `COOH` from
# `carbon`, and shape cannot do it: `carbon` parses cleanly into Ca, Rb, O, N
# and `cash` into Ca, S, H, so an element-symbol test alone called both of
# them formulae.
_STRUCT_KEY = re.compile(
    r'^[ \t]*(?:chain|no|up|down|name|नाम|src)[ \t]*:', re.M | re.I)

# A word with a unicode sub/superscript character anywhere in it.
_SUBSUP_TOKEN = re.compile(
    r'[\w\u0900-\u097F]*'
    r'[\u2080-\u209c\u00b2\u00b3\u00b9\u2070\u2074-\u207f]'
    r'[\w\u0900-\u097F]*')

_MATH_SPAN = re.compile(r'\$[^$\n]+\$|`[^`\n]+`')
_NOTATION_TOKENS = set()


def _md_words(path):
    src = io.open(path, encoding="utf-8").read()
    src = _COMMENT.sub(" ", src)
    src = _FIG_BRIEF.sub(" ", src)
    src = _drop_caption_tails(src)
    src = _strip_fig_env(src)
    src = _ENV_NAME.sub(" ", src)
    # THE STRUCTURE FENCE'S FIELD NAMES ARE MARKUP, NOT PROSE.
    #
    # `chain:`, `up:`, `down:`, `name:`, `no:` and `src:` are the keys of the
    # ```संरचना``` fence the formatting agent writes. They are instructions to
    # the renderer and are never printed, so counting them as source words
    # reported `chain`, `down` and `name` as vanished the moment the first
    # structure was drawn — a false alarm on every structure, which would
    # have trained everyone to ignore this check.
    #
    # Only the KEYS are removed. Their values stay in the count, so the
    # chain, the substituents and the IUPAC name are all still audited.
    src = _STRUCT_KEY.sub(" ", src)
    _NOTATION_TOKENS.clear()
    for m in _MATH_SPAN.finditer(src):
        _NOTATION_TOKENS.update(_words(m.group(0)))
    # A TOKEN CARRYING A UNICODE SUBSCRIPT IS NOTATION BY CONSTRUCTION.
    #
    # `Gmₑmₚ` in `ke²/Gmₑmₚ` normalises to `gmemp`, and on the page those
    # subscripts become real <sub> tags — so the token is SPLIT and cannot
    # match, every time, by design. It is written as bare text rather than
    # inside `$...$`, so the maths-span test above did not see it, and it was
    # reported as a dropped prose word alongside 55 others of exactly the
    # same kind that were correctly forgiven.
    #
    # No judgement is needed here: a subscript in the source guarantees a
    # split in the output.
    for m in _SUBSUP_TOKEN.finditer(src):
        _NOTATION_TOKENS.update(_words(m.group(0)))
    src = _LATEX_CMD.sub(" ", src)
    return Counter(_words(src))


def _html_words(path):
    h = io.open(path, encoding="utf-8").read()
    h = re.sub(r"<style\b.*?</style>|<script\b.*?</script>", " ", h, flags=re.S)
    attrs = " ".join(m.group(1) for m in _ATTR.finditer(h))
    return Counter(_words(_TAG.sub(" ", h) + " " + attrs))


def compare(md_path, html_path, sample=30):
    md, html = _md_words(md_path), _html_words(html_path)

    lost, dup = {}, {}
    for w, n in md.items():
        if w in TRANSLATED or _SUBSCRIPTED.match(w):
            continue
        got = html.get(w, 0)
        if got < n:
            lost[w] = n - got
    for w, n in html.items():
        base = md.get(w, 0)
        if w in TRANSLATED or w in ADDED_BY_DESIGN:
            continue
        # a bare maths identifier (q1, e2, x2, 4πε0) is re-tokenised by
        # fraction stacking, not duplicated
        if re.match(r'^[0-9a-zπεμσλφθ]{1,6}$', w):
            continue
        if base and n > base * DUP_FACTOR and n - base > 3:
            dup[w] = n - base

    total = sum(md.values())
    # A math-fragment word's count can drop WITHOUT vanishing entirely: `2x`
    # appears five times, fraction-stacking or subscripting reshapes it away
    # from three of those sites and leaves it literal at the other two, so
    # `lost["2x"] = 3` while `html.get("2x")` is still > 0. Only a FULL
    # vanish (`d == md[w]`) was ever classed as "notation, not loss" — a
    # partial one fell through to the generic reduced_occurrences bucket
    # instead, reported as content loss for the exact same renderer
    # behaviour the full-vanish case is explicitly forgiven for. The
    # distinction was never about whether SOME occurrences survived; it is
    # about WHAT KIND of token this is — same test `notation` already uses.
    frag_lost = {w: d for w, d in lost.items() if is_math_fragment(w)}
    prose_lost = {w: d for w, d in lost.items() if w not in frag_lost}
    deficit = sum(prose_lost.values())
    gone = sorted([w for w, d in prose_lost.items() if d == md[w]], key=lambda w: -len(w))
    reduced = sorted([w for w in prose_lost if w not in gone],
                      key=lambda w: -prose_lost[w])
    notation = sorted(frag_lost)

    findings = []
    if gone:
        findings.append(dict(
            kind="missing_text", count=len(gone), severity="high",
            detail="%d distinct word(s) occur in the markdown and NOWHERE in the "
                   "HTML — a block is being dropped" % len(gone),
            sample=gone[:sample]))
    elif deficit:
        findings.append(dict(
            kind="reduced_occurrences", count=len(reduced), severity="medium",
            detail="%d word(s) appear fewer times than in the source" % len(reduced),
            sample=reduced[:sample]))
    if dup:
        findings.append(dict(
            kind="duplicated_text", count=len(dup), severity="medium",
            detail="%d word(s) appear far more often than in the source — a block "
                   "may be rendered twice" % len(dup),
            sample=sorted(dup, key=lambda w: -dup[w])[:sample]))

    if notation:
        findings.append(dict(
            kind="notation_retokenised", count=len(notation), severity="info",
            detail="%d maths fragment(s) split across spans by fraction stacking "
                   "or subscripting — the renderer working, not content loss"
                   % len(notation),
            sample=notation[:sample]))

    stats = dict(md_words=total, html_words=sum(html.values()),
                 distinct_md=len(md), vanished=len(gone),
                 notation=len(notation), deficit_words=deficit,
                 coverage=round(1.0 - deficit / float(total or 1), 4))
    return findings, stats
