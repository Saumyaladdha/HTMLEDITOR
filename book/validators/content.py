# -*- coding: utf-8 -*-
"""
CONTENT VALIDATOR — did the reader actually get everything?

The failure this exists to catch is SILENT LOSS. A block the parser did not
recognise does not appear on the page and nothing errors anywhere; the book
just quietly has fewer questions in it. Two real examples from this chapter:

  * requiring two `**प्र.` heads before treating a group as questions
    dropped the 2020 and 2012 groups entirely — a whole year each;
  * anchoring the option splitter on `^` dropped option (i) of every
    question while the answer key still said "(iii)".

So this counts what the SOURCE contains, by grep-level rules that do not
share code with the parser, and compares. Two independent implementations
disagreeing is the whole point — a shared helper would agree with itself.
"""
import io
import re

from ..core.ir import count_kinds

# What to count in the raw markdown, and which IR kind it should become.
SOURCE_RULES = [
    # TWO SPELLINGS, independently — the reader's `RE_QHEAD` accepts a
    # question head written either `**प्र. N**` (bold) or `## प्र. N`
    # (an H2-H4 heading, chapter 1 of chemistry writes 102 of these and
    # zero of the bold form). This rule shares no code with the reader on
    # purpose, but it must still recognise both spellings the reader does
    # — matching only the bold form undercounted chem_01's questions as
    # zero, which is not a caught defect, it is the validator itself being
    # wrong: every build of an H2-style chapter reported "102 vanished"
    # regardless of whether anything was actually lost.
    ("question", r'^\*\*\s*(?:प्र\.?|Q\.?|प्रश्न)\s*[0-9]+\s*\*\*'
                 r'|^#{2,4}\s*(?:प्र\.?|Q\.?|प्रश्न)\s*[0-9]+'),
    ("answer",   r'^\*\*\s*(?:उत्तर|Answer|Ans)\s*[:：]?\s*\*\*'),
    # A CARD'S HEADING LEVEL IS THE CHAPTER'S CHOICE, NOT PART OF THE FACT.
    #
    # chem_06 writes its one card `> ### 🧭 अभिक्रिया-पथ के चरण — …` with
    # ①②③ rows beneath. Counting `####` only, the source total was 0
    # against the IR's 1 and step02 called a correctly-read card "content
    # being duplicated or split" — a hard failure that stopped the build.
    # The reader accepts either level; so must the count, or the two sides
    # are not measuring the same thing.
    ("card",     r'^>\s*#{3,4}\s'),
    # Three figure conventions are in use across chapters; counting only the
    # first made chapter 3 look like it had invented 48 figures from nowhere.
    # Three spellings of a figure, all in real chapters: the bracketed
    # marker, the "draw this" brief, a markdown image — and `[चित्र: …]`,
    # which holds the brief INSIDE the brackets. The counting rule shares no
    # code with the reader on purpose, so a spelling added to one has to be
    # added to the other; missing it here reported "66 in the markdown, 69 in
    # the IR — content is being duplicated".
    #
    # A FIFTH SPELLING: the Mathpix crop-URL caption line, `चित्र N —
    # ![](url?height=...&width=...)` — the reader already handles it (see
    # FORMAT_SPEC §9), but `^!\[` only matches a markdown image that OPENS
    # its own line. Physics chapter 1 writes 10 of its 22 figures this way,
    # caption first, so this rule saw 12 and the IR — correctly — had 22:
    # not duplication, just an undercount of the source.
    # A SIXTH AND SEVENTH SPELLING, and they must be counted DIFFERENTLY.
    #
    # `*चित्र N · caption*` on its own line, followed by a `> 🖼️` brief, IS a
    # figure — `chapter_mathematics.md` writes all ten of its that way and
    # nothing else declares them, so uncounted here the validator reported
    # "0 in the markdown, 10 in the IR".
    #
    # But the SAME italic line also appears as the CAPTION of a real scan
    # that was declared on the line above (`physics_chap2.md`, 36 times):
    #
    #     ![चित्र 2.1](source_figures/page_06_image_1.png)
    #     *चित्र 2.1 — एक क्षैतिज सीधी रेखा …*
    #
    # There it is not a second figure, and counting it as one reported
    # "36 in the markdown, 72 in the IR" — an exact doubling. The reader
    # draws the same distinction from the preceding block; this rule cannot
    # see blocks, so `_fig_caption_count` below does it on the raw lines:
    # an italic चित्र line counts ONLY when the nearest preceding non-blank
    # line is not itself a figure declaration.
    ("figure",   r'\[(?:FIGURE|IMAGE)\s*:|^\[\s*चित्र बनाना है\s*\]'
                 r'|^\[\s*चित्र\s*[:：]|^!\['
                 r'|^चित्र\s*[0-9०-९.]*\s*—\s*!\['
                 # AN EIGHTH: a LaTeX `figure` environment from a Mathpix
                 # export (`physics_edited.md` wraps four MCQ option images
                 # that way). The reader folds the whole block into one
                 # plate, so the OPENER is what counts — matching
                 # `\includegraphics` too would count the same figure twice.
                 r'|^\s*\\begin\{figure\*?\}'),
    ("table",    None),          # counted as pipe-table blocks, below
    # A LABEL, NOT ANY SENTENCE THAT OPENS WITH THE WORDS.
    #
    # A `given` is a bolded LABEL with its values beside it — `**दिया है :**
    # $A = …$` — which is exactly what `readers.markdown.RE_GIVEN` matches:
    # the bold CLOSES after the label. Matching `^**दिया है` alone also
    # caught a bolded question stem that happens to begin with the same
    # words, where the bold wraps the whole sentence:
    #
    #     **दिया है $A = \begin{bmatrix}…\end{bmatrix}, B = …**
    #
    # Maths chapter 3 has one, the second line of प्र. 61's stem. The reader
    # was right to keep it in the question and this counter called it a
    # dropped `given`, which stopped the build over content that had not
    # moved. An independent cross-check is only worth having while it
    # describes the same thing the reader does.
    ("given",    r'^\*\*\s*दिया है\s*[,，:：]?\s*\*\*'),
    # A CARD'S HEADING LEVEL IS THE CHAPTER'S CHOICE, NOT PART OF THE FACT.
    #
    # chem_06 writes its one card `> ### 🧭 अभिक्रिया-पथ के चरण — …` with
    # ①②③ rows beneath. Counting `####` only, the source total was 0
    # against the IR's 1 and step02 called a correctly-read card "content
    # being duplicated or split" — a hard failure that stopped the build.
    # The reader accepts either level; so must the count, or the two sides
    # are not measuring the same thing.
    ("card",     r'^>\s*#{3,4}\s'),
]


def count_source(md_path):
    text = io.open(md_path, encoding="utf-8").read()
    lines = text.split("\n")
    out = {}
    for kind, pat in SOURCE_RULES:
        if pat:
            out[kind] = sum(1 for l in lines if re.search(pat, l))
    # a pipe table is a RUN of |...| lines, not one per line
    #
    # A RUN THAT IS REALLY AN MCQ IS NOT A TABLE. A chapter lays its four
    # choices out as a 2x2 pipe grid with an empty header, because that is
    # how markdown gets two columns; the reader turns that into an
    # `options` block, not a `table` (see `_table_as_options` in
    # readers/markdown.py). Counted as tables here, five of this chapter's
    # seven "tables" had no IR counterpart and the cross-check called it
    # content being DROPPED — a hard failure that stopped the build on a
    # change that lost nothing.
    #
    # Deliberately a SECOND implementation of the same rule, not a shared
    # call: two independent counts disagreeing is the whole point of this
    # step, and importing the reader's own helper would make the check
    # agree with the reader by construction.
    _opt_cell = re.compile(r'^\(?\s*(?:[ivx]{1,4}|[a-dA-D]|[कखगघङअबसद])\s*[\).]')
    tables, run = 0, []

    def _close(run):
        """-> 1 if this run of pipe lines is a real table, 0 if an MCQ."""
        if not run:
            return 0
        # The separator must actually contain a dash. `|  |  |` — an
        # EMPTY header, which is exactly what an MCQ grid opens with —
        # is nothing but pipes and spaces and matched a `[\s:|-]+`
        # separator pattern, so it was dropped as the rule row and the
        # first row of CHOICES became the header. `any(head)` was then
        # true and every MCQ grid counted as a real table.
        body = [l for l in run
                if not re.match(r'^\s*\|[\s:|-]*-[\s:|-]*\|\s*$', l)]
        if len(body) < 2:
            return 1
        head = [c.strip() for c in body[0].strip().strip("|").split("|")]
        if any(head):
            return 1
        cells = [c.strip() for l in body[1:]
                 for c in l.strip().strip("|").split("|") if c.strip()]
        if cells and all(_opt_cell.match(c) for c in cells):
            return 0
        return 1

    for l in lines:
        if re.match(r'^\s*\|.+\|\s*$', l):
            run.append(l)
            continue
        tables += _close(run)
        run = []
    tables += _close(run)
    out["table"] = tables
    # The standalone italic चित्र caption — see the "SIXTH AND SEVENTH
    # SPELLING" note on the `figure` rule above for why adjacency decides it.
    _ital = re.compile(r'^\*\s*चित्र\s*[0-9०-९.]+\s*[·:—-]?\s*.*\*\s*$')
    _declared = re.compile(r'^!\[|^\[\s*चित्र|^चित्र\s*[0-9०-९.]*\s*—\s*!\[')
    prev_nonblank = ""
    for l in lines:
        t = l.strip()
        if not t:
            continue
        if _ital.match(t) and not _declared.match(prev_nonblank):
            out["figure"] = out.get("figure", 0) + 1
        prev_nonblank = t

    out["_headings_h3"] = sum(1 for l in lines if l.startswith("### "))
    out["_lines_nonblank"] = sum(1 for l in lines if l.strip())
    return out


def validate(md_path, doc, tolerance=None):
    """-> (findings, stats). A finding is a real discrepancy, not a warning."""
    tolerance = tolerance or {}
    src = count_source(md_path)
    got = dict(count_kinds(doc.get("parts", [])))
    findings = []

    for kind in ("question", "answer", "card", "figure", "table", "given"):
        want, have = src.get(kind, 0), got.get(kind, 0)
        if want == have:
            continue
        slack = tolerance.get(kind, 0)
        if abs(want - have) <= slack:
            continue
        findings.append(dict(
            kind="count_mismatch", element=kind, source=want, parsed=have,
            severity="high" if have < want else "medium",
            detail=("%d in the markdown, %d in the IR — %s"
                    % (want, have,
                       "content is being DROPPED" if have < want
                       else "content is being duplicated or split"))))

    # every question must live inside a group, or it will never be rendered
    orphan = 0
    for part in doc.get("parts", []):
        for ch in part.get("children", []):
            if ch["kind"] == "question":
                orphan += 1
    if orphan:
        findings.append(dict(kind="orphan_questions", element="question",
                             source=orphan, parsed=orphan, severity="medium",
                             detail="%d question(s) sit outside any group" % orphan))

    stats = dict(source=src, parsed=got)
    return findings, stats
