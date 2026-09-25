# -*- coding: utf-8 -*-
"""
MD_PARSER — reader-edition markdown -> IR.

CONTENT-DRIVEN, NOT CHAPTER-DRIVEN. Nothing here knows that chapter 1 has
16 sections or that Part 2 is grouped by year. Structure is inferred from
the shape of the text:

  * a `#` part whose `###` children look like `N.M Title`  -> section part
  * a `#` part whose `###` children contain `**प्र. N**`   -> question part
  * anything else                                          -> a plain part

so a chapter that groups Part 2 by marks (the old `14_reader_edition.md`)
or by topic parses just as well as one grouped by year.

TWO CALLOUT DIALECTS. The same file speaks two: Part 1 uses the older
Hindi markers (`⚠️ मत भूलो`, `🔢 आंकिक`, `💡 टिप`, `✏️ व्याख्या`) and Part 2
uses the Hinglish set (`⚠ Board ka jaal`, `🎯 Yahan 1 mark bachta hai`,
`🔗 Ye wahi question hai`, …). Both normalise into the eight
`ir.CALLOUT_TYPES`, matched by emoji first and label keyword second, so an
unseen marker degrades to a sensible family instead of being dropped.

NOTHING IS EVER SILENTLY DROPPED. Every consumed line is counted; call
`parse(path, report=True)` to get a coverage figure. Unrecognised text
becomes a `para` rather than vanishing — a missing paragraph in a physics
book is a worse failure than an ugly one.
"""
import io
import os
import re

from ..format import answer as _answer
from ..format import display as _display
import sys

from ..core.ir import node, CALLOUT_ICON                        # noqa: E402
from ..taggers import classify as _classify                    # noqa: E402
from ..taggers.classify import (callout_type, card_tone,        # noqa: E402
                                parse_chip, parse_figure)
from .. import subjects as _subjects                            # noqa: E402
from ..components import text as _C_text                        # noqa: E402
from ..format import matrix as _matrix_art                      # noqa: E402
from ..format import inline as _inline                          # noqa: E402
from ..format import structure as _structure                    # noqa: E402
from ..format import ring as _ring                              # noqa: E402
from ..validators.latex_convert import tex as _latex_tex        # noqa: E402

# ==========================================================================
# LINE-LEVEL PATTERNS
# ==========================================================================
RE_H1 = re.compile(r'^#\s+(.*)$')
RE_H2 = re.compile(r'^##\s+(.*)$')
RE_H3 = re.compile(r'^###\s+(.*)$')
RE_HR = re.compile(r'^\s*---+\s*$')
RE_BQ = re.compile(r'^>\s?(.*)$')
RE_CARD_HEAD = re.compile(r'^>\s*####\s*(.*)$')

# `### 1.5 वैद्युत आवेश के मूल गुण  ·  **[UP 2022 · 1 अंक] · [UP 2026 · 1 अंक]**`
RE_SECTION = re.compile(r'^(\d+(?:\.\d+)*)\s+(.*)$')
RE_EN = re.compile(r'\(([A-Za-z][A-Za-z0-9 &\'\-,/]*)\)\s*$')

# `**प्र. 4**  `[1 अंक · 2026/set_dw · खण्ड ब]`  ★★ *पूरा उत्तर यहीं, 2022 में भी*`
# THE CHIP IS IN BACKTICKS *OR* DOLLARS.
#
# Physics and biology write the marks chip as `` `[1 अंक · 2026]` ``; maths
# writes it as `$[1 अंक \cdot 2026 \cdot 1 अंक]$` — LaTeX delimiters, and
# `\cdot` where the others use `·`.
#
# Accepting only the backtick form meant all 58 of the maths chapter's
# question headings fell through to the paragraph branch: 58 questions in the
# markdown, ZERO in the IR, and step02 stopped the build. This is the same
# failure that has now appeared five times in this reader — `## 2026` against
# `### 2026`, `अथवा` against `*अथवा*`, `दिया है,` against `दिया है :`, a
# fence against a bare fence — and it is always the same shape: two spellings
# of one construct, and code that knows one of them.
# TWO SPELLINGS OF A QUESTION HEAD.
#
# Physics, biology, maths and chemistry chapters 4 and 6 write it as a bold
# run: `**प्र. 1**  `[1 अंक · 2026/set_a_ea]``. Chemistry chapter 1 writes it
# as an H2 HEADING: `## प्र. 1  `[2026 · 1 अंक]``, 102 times.
#
# Matching only the bold form, that chapter parsed to 102 answers and ZERO
# questions — every answer an orphan, every question demoted to a section
# heading, and the whole of Part 2 structurally gone with no error raised.
# The same shape of failure as the maths chip (`$[...]$` against `` `[...]` ``)
# and the figure title, and by the same cause: one construct, two spellings,
# code that knew one. That is now ten confirmed instances in this reader, and
# it is the single most productive thing to check first in a new chapter.
#
# The heading branch is anchored at `^#`, which is what keeps it from firing
# inside a table: chapter 1 has a repeats table whose cells quote question
# heads verbatim (`| ★★★ | ## प्र. 8 `[2017 · 2 अंक]` … |`), and those are
# references to questions, not questions.
_RING_DIRECTIVE_RE = re.compile(r'\[(?:RXN|STRUCT):')

RE_QHEAD = re.compile(
    r'^(?:'
    r'\*\*\s*(?:प्र\.?|Q\.?|प्रश्न)\s*(?P<n1>[0-9]+)\s*\*\*'
    r'|#{2,4}\s*(?:प्र\.?|Q\.?|प्रश्न)\s*(?P<n2>[0-9]+)'
    r')\s*'
    # A CITATION TAG MAY COME BEFORE THE MARKS CHIP, NOT ONLY AFTER.
    #
    # `chip2` below already covers a SECOND tag trailing the marks chip
    # (physics chapter 9's `[1 अंक …]  [म.प्र. 2009 | 1 अंक]`). Chemistry
    # chapter 1's "अन्य महत्त्वपूर्ण प्रश्न" bank writes the same kind of
    # provenance note the OTHER way round — `(CBSE 2023)` `[अंक अंकित नहीं
    # · …]` — source first, marks chip second. Unhandled, the paren tag
    # matched INTO `chip2` (it accepts `(` as well as `[`, for the
    # trailing case), which left the real `[अंक अंकित नहीं …]` chip
    # unconsumed — and the strict end-of-line tail a few lines down then
    # failed the whole match. Twelve question heads, one exact shape
    # every time (`(citation)` immediately before the chip, nothing
    # else), fell through to plain paragraphs and vanished from the
    # book with no error. Optional and tried first, so a head with no
    # leading citation is unaffected.
    r'(?:[`$]\((?P<cite>[^)]*)\)[`$]\s*)?'
    r'(?:[`$]\[(?P<chip>[^\]]*)\][`$])?\s*'
    # A SECOND CHIP IS STILL THE SAME QUESTION HEAD.
    #
    # Physics chapter 9 carries the provenance in its own tag beside
    # the marks chip:
    #
    #     **प्र. 4**  `[1 अंक · …खेल]`  `[म.प्र. 2009 | 1 अंक]`
    #
    # With only one chip permitted the trailing tag fell outside the
    # pattern and the WHOLE head stopped matching, so the question was
    # not a question at all — 44 of that chapter's 117 heads went to
    # prose and `step02` stopped the build for dropped content. The
    # second chip is captured, not skipped, so the board and year it
    # carries reach the page with the rest of the chip.
    # …and the second tag is bracketed EITHER way. The marks chip is
    # always `[...]`, but the provenance tag beside it is written
    # `(म. प्र. 2009)` on 40 of chapter 9's heads and `[म.प्र. 2009 |
    # 1 अंक]` on the other 4, so both close the same group.
    r'(?:[`$][\[(](?P<chip2>[^\])]*)[\])][`$])?\s*'
    r'(?P<stars>★+)?\s*'
    # THE TRAILING NOTE IS NOT ALWAYS ITALIC.
    #
    # Physics and maths write it `*पूरा उत्तर यहीं*`, and that branch is
    # tried first so their behaviour is unchanged. Chemistry chapter 1 writes
    # it as marker-led plain text — `↩ बैंक में पहले से — वर्ष जुड़े` — or as a
    # mix, `☞ *बार-बार*  ⚠ अंक भिन्न`. Twenty-three of its 102 question heads
    # ended that way and none of them matched.
    #
    # The second branch is deliberately NOT `.*`: a permissive tail would
    # make this regex match prose that merely mentions a question
    # (`**प्र. 5** का उत्तर देखिए`) and turn a sentence into a question head.
    # It must open with one of the markers the chapters actually use.
    r'(?:\*(?P<note>[^*]+)\*'
    r'|(?P<note2>[\u21a9\u261e\u26a0\u2605\u2606\u2192][^\n]*))?'
    # A HEAD MAY CARRY MORE THAN ONE TRAILING NOTE.
    #
    # Maths chapter 3 writes two on the questions the board asked in an
    # extra year AND set at another mark value:
    #
    #     **प्र. 18**  `[1 अंक · …]`  *2020 में भी आया था*  *यही सवाल प्र. 6 में …*
    #
    # One note was permitted, and the bold branch then requires the line
    # to END — so the second `*…*` failed the whole match, the head fell
    # through to prose, and the question vanished. Exactly two of that
    # chapter's 87 heads are written this way, which is precisely how a
    # thing like this survives: 85 questions arrive, nobody counts, and
    # step02 is the only reason anyone finds out.
    #
    # Captured rather than skipped — the second note says where the same
    # question appears at another mark value, a cross-reference a student
    # follows and which exists nowhere else on the page.
    r'(?P<notes_more>(?:\s*\*[^*\n]+\*)*)\s*'
    # A `#{2,4}` HEADING MAY CARRY AN INLINE TITLE \u2014 `**bold**` MAY NOT.
    #
    # History and geography write every question as `### \u092a\u094d\u0930. N \u00b7 <title>`
    # \u2014 physics, biology, chemistry and maths never put a title after the
    # number, only a bare chip/star/note, so this case was never
    # exercised. Without it `### \u092a\u094d\u0930. 1 \u00b7 \u092a\u094d\u0930\u0915\u0943\u0924\u093f \u0915\u0940 \u0938\u0930\u094d\u0935\u094b\u091a\u094d\u091a\u0924\u093e \u092e\u0947\u0902...`
    # failed to match, which matters because this regex is also how
    # `_split_on` recognises "this heading is a QUESTION, not a new
    # group" (see the H2 and H3 splits in `_build_part`) \u2014 every question
    # in both arts chapters became its OWN top-level group instead of a
    # child of its year, rendered with the big `.yearhead` banner style a
    # real year gets, not the compact question style.
    #
    # Restricted to the `#{2,4}` branch only \u2014 `(?(n1)...)`, conditional
    # on the bold branch's group NOT having matched: a HEADING is already
    # its own line by construction, so the prose false-positive the
    # strict bold-branch tail exists to prevent cannot happen here \u2014
    # widening this branch is safe in a way widening the bold one is not.
    r'(?(n1)\s*$|(?:\s*[\u00b7:\u2013\u2014-]\s*\S.*)?\s*$)')


def qhead_num(m):
    """The question number from either branch of RE_QHEAD."""
    return int(m.group("n1") or m.group("n2"))

# ARTS/HISTORY DIALECT: `### प्र. N · <title>` carries the title but no
# chip — the marks chip, stars and note sit on the LINE AFTER, alone:
#
#     ### प्र. 1 · नव-निश्चयवाद का प्रतिपादक कौन
#     `[2026 · 1 अंक]` ★★★ ☞ *बार-बार*  ⚠ पाठ भिन्न *2024 · 2023 · 2022 में भी आया था*
#
# RE_QHEAD's chip group only looks on the heading's OWN line (right after
# the number, before an inline title), so this second line never matched
# it and fell through as an ordinary body paragraph. Its backticked
# `[2026 · 1 अंक]` then went through `_tick()` like any other backtick
# span — maths, since a marks-tag bracket has no special case — and
# rendered as a stacked/upright `.m` span instead of joining `प्र. N` as
# the same compact `.chip` every other subject's marks tag gets.
# Mandatory-chip (not optional, unlike RE_QHEAD): a body line that merely
# starts with stars would otherwise be swallowed by accident.
RE_QCHIP_CONT = re.compile(
    r'^(?:[`$]\[(?P<chip>[^\]]*)\][`$])\s*'
    r'(?P<stars>★+)?\s*'
    r'(?:\*(?P<note>[^*]+)\*'
    r'|(?P<note2>[↩☞⚠★☆→][^\n]*))?'
    # The same run of extra notes RE_QHEAD accepts — a continuation line
    # is the same head written across two lines, so it must not be
    # stricter than the head itself.
    r'(?P<notes_more2>(?:\s*\*[^*\n]+\*)*)\s*$')


def _join_notes(first, more):
    """Join a head's trailing notes into the one note the IR carries.

    `more` is the raw run RE_QHEAD captured — `  *a*  *b*` — so the
    delimiters come off here rather than in the regex, where making each
    note its own group would mean a fixed number of them.

    Joined with the same `·` the chip uses between its own parts, because
    that is what the rest of the chapter reads as "and also".
    """
    parts = [first.strip()] if first and first.strip() else []
    for chunk in re.findall(r'\*([^*\n]+)\*', more or ""):
        chunk = chunk.strip()
        if chunk and chunk not in parts:
            parts.append(chunk)
    return " · ".join(parts) if parts else None


def _clean_fullnote(text):
    """Trim a stray leading/trailing `*` without breaking real emphasis.

    A `note2` marker keeps embedded `*…*` spans verbatim (unlike `note`,
    whose delimiters sit outside the capture) — `starnote()` converts them
    to `<i>` later. `⚠ पाठ भिन्न *2024 · 2023 · 2022 में भी आया था*` has TWO
    marker sections, the second closing on the line's very last char, so a
    blind `.strip(" *")` chopped that closing `*` off — an odd, unmatched
    `*` survived and printed literally instead of closing the italics. Only
    strip when the `*` count is ODD: a lone stray asterisk was never a
    pair, but an even count is real emphasis and must survive untouched.
    """
    t = (text or "").strip()
    if t.count("*") % 2 == 1:
        t = t.strip(" *")
    return t

# `\cdot` and `\times` inside a chip are the separator and the multiplier,
# not commands to convert later — the chip is set as plain text, so a
# backslash command in it prints its own name.
_CHIP_TEX = ((r'\cdot', '·'), (r'\times', '×'), (r'\,', ' '), (r'\;', ' '))


def _chip_text(chip):
    out = chip or ""
    for tex, ch in _CHIP_TEX:
        out = out.replace(tex, ch)
    return re.sub(r'\s{2,}', ' ', out).strip()
RE_ANSWER = re.compile(r'^\*\*\s*(?:उत्तर|Answer|Ans)\s*[:：]?\s*\*\*\s*(.*)$')
# Chapter 1 writes `**दिया है, **`, chapter 3 writes `**दिया है :**`. Both are
# the same block; a regex that only knew the comma dropped all ten of
# chapter 3's given-value lines with no error.
RE_GIVEN = re.compile(r'^\*\*\s*दिया है\s*[,，:：]?\s*\*\*\s*[:：]?\s*(.*)$')
# `अथवा`, `**अथवा**` and `*अथवा*` are all the same separator. Chapter 4
# writes it in SINGLE asterisks, which this missed — so all 43 of its
# alternative-question markers fell through to the paragraph branch and
# printed as literal `*अथवा*` instead of introducing the variant.
RE_ATHAVA = re.compile(r'^(?:\*\*|\*)?\s*अथवा\s*(?:\*\*|\*)?\s*(.*)$')


def _starts_athava(ln):
    """An `अथवा` variant line is a block start.

    Mirrors the acceptance test in `run()`'s `RE_ATHAVA` branch EXACTLY, and
    that is not a stylistic choice: `_starts_block` is consulted on a run's
    first line too, so a line this returns True for but that branch declines
    would break `_para_run` with an empty buffer and never advance. The same
    condition `RE_BARE_CALLOUT` satisfies — see the note there.

    Without this, the 31 of chapter 6's 42 variants that are written packed
    against the line above them (`… **[2022 अंक]**` then `*अथवा* …` with no
    blank between) were swallowed as continuation prose. They never reached
    the branch, so instead of a variant separator carrying its own year the
    page printed an italic `अथवा` glued to the front of the sentence.
    """
    if not (bool(RE_ATHAVA.match(ln)) and "अथवा" in ln[:12]):
        return False
    # THE LENGTH CUTOFF IS THERE FOR THE UNDECORATED MARKER ONLY.
    #
    # 200 characters separates "a variant line" from "a paragraph whose
    # first word happens to be `अथवा`" — but only when the marker is bare.
    # `**अथवा**`, `*अथवा*` and `अथवा —` are the chapter's own way of writing
    # the separator and mean nothing else, whatever follows them. प्र. 14
    # writes the marker, its lead-in AND all five of its parts on ONE
    # 978-character line; the cutoff rejected it, so the variant printed as
    # `अथवा — क्या होता है जब …` opening the question as though the question
    # itself began with the word "or".
    if re.match(r'^\s*(?:\*\*|\*)\s*अथवा|^\s*अथवा\s*[—–:：]', ln):
        return True
    return len(ln) < 200

# `#### बायो-सावर्ट नियम का अनुप्रयोग` — a sub-section heading in the body.
# Only `####` INSIDE a blockquote was ever recognised (RE_CARD_HEAD), so a
# bare one printed its own hashes as body text.
RE_H4 = re.compile(r'^####\s+(.*)$')

# A QUESTION-TYPE DIVIDER, INSIDE A TOPIC'S QUESTION BANK.
#
# `#### 🅾️ ऑब्जेक्टिव (1 अंक)`, `#### ✏️ लघु उत्तरीय (2–3 अंक)`, `#### 📝
# दीर्घ उत्तरीय (4–5 अंक)` mark which FORMAT the questions beneath them are
# — the finalised edition pools these across every topic in Part 2 into one
# banner per format (see `_regroup_by_qtype`). Matched narrowly, on the
# three known Hindi labels: a topic's OWN closing "🪞 आईना" checklist is
# also an H4, and is not one of these — matching every H4 here would have
# swallowed it into `pending_qtype` and silently dropped its heading text.
RE_QTYPE_H4 = re.compile(
    r'^####\s*(?:[^\w\s]+\s*)*'
    r'(ऑब्जेक्टिव|लघु\s*उत्तरीय|दीर्घ\s*उत्तरीय)')

# The bare `*` that this chapter leaves around an `*अथवा*`, and the
# `* *(2026)*` that names the year the variant was set. Left alone, the first
# became a paragraph containing one asterisk and the second an EMPTY bullet
# list — the year silently dropped.
RE_STRAY_STAR = re.compile(r'^\*\s*$')
# `[2]` alone on a line — what a step is worth, not a paragraph.
# ONE OR TWO digits, optionally with an `M`. `\d+` matched `[2025]` too,
# so a bracketed YEAR came out as a marks chip reading "2025 अंक" — and
# the 43 marks the chapter writes as `[1M]` were not matched at all.
# `— स्रोत: 2025/set_jv · खण्ड अ` — which paper this question came from.
RE_SOURCE_NOTE = re.compile(r'^[—–-]\s*स्रोत\s*[:：]\s*(.+?)\s*$')
# History's repeat-frequency summary, standing alone right before a question
# head — see `_parse_questions` for the full shape and why it is dropped
# except for its trailing star rating: `` `[2025, 22] [2023] [2025]` ★★★ ``.
#
# EACH BRACKET GROUP MUST CONTAIN A DIGIT — a year or a question number,
# never bare prose. Without this, the SAME shape (one or more `[...]`
# groups inside backticks, right before a question head) also matched a
# completely different chip this chapter writes with identical
# punctuation: `` `[वर्ष नहीं — पुस्तक का अपना चयन]` `` ("no year — the
# book's own choice"), 24 occurrences, every one immediately followed by
# a question head. That chip carries real information found NOWHERE
# else in the source — unlike the repeat-years summary, which only
# totals facts already on each `अथवा` line's own tag — and was being
# silently dropped with no trace, not even a star rating to keep. A
# genuine repeat-years bracket always holds at least one digit; a
# no-year note never does.
RE_REPEAT_STARS = re.compile(r'^`(?:\[[^\]]*\d[^\]]*\]\s*)+`\s*(★+)?\s*$')
# The marks VALUE inside a tag — legacy bare digit(+M), or a chapter that
# spells it out the way its own marks chip does: a fraction or digit
# followed by the word "अंक" (`RE_MARKS` in book/taggers/classify.py parses
# the identical shape for a question's own chip — reused here, not
# re-derived, since it is the same fact written the same way).
# A CHAPTER MAY ALSO SPELL THE VALUE IN LATEX, AND WRAP THE LINE IN `$…$`.
#
# Chapter 6 writes 11 of its marks-only lines as `$[2\frac{1}{2}]$` and
# `$[1 \times 5]$`. Neither the value nor the wrapper was recognised, so the
# line was not a marks tag at all — and a line that is nothing but `$…$` is
# read as a display equation, which is how the marks for three answers came
# to be printed mid-page as an upright-bracketed `[2½]` set in maths type.
# The `$` here is a maths delimiter around a tag that is not maths; it is
# dropped with the brackets, not rendered.
_MARKS_LATEX = r'\d{0,2}\s*\\frac\s*\{\s*[13]\s*\}\s*\{\s*[24]\s*\}|\d{1,2}\s*\\times\s*\d{1,2}'
_MARKS_VALUE = (r'(?:' + _MARKS_LATEX +
                r'|\d{1,2}\s*[Mm]?|(?:(?:\d+\s*)?[½¼¾]|\d+(?:[/·]\d+)?)\s*अंक)')
# A `$…$`-wrapped marks tag CLOSING a line — see `_para_run`, which
# ends its run on one so the tag never lands mid-paragraph.
_DOLLAR_MARKS_TAIL_RE = re.compile(
    r'\$\s*\[[^\]]{1,24}\]\s*\$\s*(?:\*\*\[[^\]]*\]\*\*)?\s*$')

RE_MARKS_ONLY = re.compile(r'^\**\$?\s*\[(' + _MARKS_VALUE + r')\]\s*\$?\**\s*$')
# `… है। [2]` — the marks tag closing a sentence. Requires the line to
# END there, so a bracketed reference mid-sentence is untouched.
#
# A DECORATIVE DASH RUN AND A BOLD WRAPPER ARE NOT PART OF THE VALUE.
#
# `20_dash_free.md` marks what a step is worth `-----------**[½ अंक]**` — a
# hand-typed divider of dashes, then the bracket bolded. Unrecognised, ALL
# of it reached the page as literal text: the dashes, the `**`, and the
# brackets, 40 times in one chapter, and the clean `.qmarks` badge this tag
# exists to produce never appeared. The dashes are decoration and stripped;
# `**…**` is markdown the tag's OWN styling already supplies, not text that
# belongs inside it.
RE_MARKS_TRAILING = re.compile(
    r'^(.*\S)\s+(?:-{3,}\s*)?\**\s*\[(' + _MARKS_VALUE + r')\]\**\s*$')
RE_VARIANT_YEAR = re.compile(r'^\*\s+\*\((\d{4}(?:\s*[,·]\s*\d{2,4})*)\)\*\s*$')

# `*अथवा* … **[2024 अंक]**` — the SAME fact `RE_VARIANT_YEAR` carries on its
# own line, written instead as a tag closing the variant. Four digits plus
# `अंक` is a year that picked up the wrong word (see `_YEAR_MARKS_RE` in
# format/inline, which renders it as the year chip); it is not a marks value,
# and it is not part of the variant's text.
RE_ATHAVA_YEAR_TAIL = re.compile(
    r'^(.*\S)\s*\**\s*\[\s*(19[5-9]\d|20[0-4]\d)\s*(?:अंक|marks?)\s*\]\**\s*$')

# The year written on the SAME line as the marker — `**अथवा** *(2026)*`,
# which is how the 2026-paper sections head each variant. `RE_VARIANT_YEAR`
# reads this fact only from a line of its OWN, so here the year stayed in
# the variant's text and printed as an italic `(2026)` opening the sentence
# instead of as the variant's year.
RE_ATHAVA_YEAR_LEAD = re.compile(
    r'^\*\s*\((\d{4}(?:\s*[,·]\s*\d{2,4})*)\)\s*\*\s*(.*)$', re.S)

# `$+\ \mathrm{HCl}$` ON A LINE OF ITS OWN — THE EQUATION CONTINUES.
#
# The chapter writes a reaction whose product it wants DRAWN as three
# blocks: the display equation up to the arrow, a ```रिंग``` or ```संरचना```
# fence for the product, then the by-product on its own line. Rendered as
# three blocks it printed as three: the arrow, the benzene ring, and a
# centred line reading `+ HCl` well below it, as though the by-product were
# a new equation. Nine of these in the chapter, four of them the `+ ⁻OH ⟶`
# that carries an SN2 mechanism INTO its next step.
#
# Recognised only as a WHOLE line starting with `+` inside `$…$`, so a
# formula that merely contains a plus is untouched.
RE_EQ_CONTINUES = re.compile(
    # `[\s\\]*` here ate the backslash of the command that FOLLOWS the plus:
    # `$+\ \overline{\mathrm{O}}\mathrm{H}$` handed on `overline{...}` and the
    # page printed `+ overlineOH ⟶`. Only LaTeX's own spacing commands are
    # skipped — `\ `, `\,`, `\;`, `\:`, `\!` — never a bare backslash.
    r'^\s*\$\s*\+(?:\\[ ,;:!>]|\s)*(?P<rest>.+?)\s*\$\s*'
    r'(?P<marks>\*\*\[[^\]]*\]\*\*)?\s*$')
# The kinds a continuation may attach to: the ones that draw a molecule and
# so have no text line of their own for it to join.
_DRAWN_KINDS = ("ring", "structure", "rxn_smiles")


# `> ✅ **2026 का पेपर (इस अध्याय से) पूरा, 18 अंक cover।** …`
RE_BANNER = re.compile(r'^✅\s*\*\*(.+?)\*\*\s*(.*)$')
# `> **[सूत्र]** $$ … $$ [1/2]`
RE_FORMULA_BOX = re.compile(r'^\*\*\[\s*(?:सूत्र|formula)\s*\]\*\*\s*(.*)$')

RE_TABLE_ROW = re.compile(r'^\s*\|(.+)\|\s*$')
RE_TABLE_SEP = re.compile(r'^\s*\|[\s:\-|]+\|\s*$')
RE_BULLET = re.compile(r'^\s*[-•*]\s+(.*)$')
RE_NUMBERED = re.compile(r'^\s*(\d+)[.)]\s+(.*)$')
RE_DEFN = re.compile(r'^\*\*([^*]{2,40}?)\s*[:：]\s*\*\*\s*(.*)$')

RE_FIGURE = re.compile(r'\[(FIGURE|IMAGE)\s*:\s*(.*?)\]\s*$', re.S)
# Chapter 3 introduced two more figure conventions. Neither is exotic, and
# both must be recognised or a chapter silently renders with no figures at
# all — chapter 3 has 58 and the reader found 0.
#   [चित्र बनाना है] चित्र 3.1        an art brief: draw this
#   ![चित्र 3.5](source_figures/x.png)  a normal markdown image
RE_FIG_TODO = re.compile(r'^\[\s*चित्र बनाना है\s*\]\s*(.*)$')

# A SEVENTH FIGURE DIALECT: AN ITALIC CAPTION, THEN A QUOTED BRIEF.
#
#     *चित्र 1.1 · 156 का गुणनखंड वृक्ष*
#     > 🖼️ यह चित्र अभी बना नहीं है। चित्रकार के लिए विवरण : …
#
# `chapter_mathematics.md` writes all ten of its figures this way and none of
# the six shapes in FORMAT_SPEC §9 matches it, so every one fell through:
# the caption became an italic `para` and — far worse — the ILLUSTRATOR'S
# BRIEF became a `refbox` and printed on the page. A brief is production
# instruction, never reader content (docs/IMAGES_POLICY.md; the biology
# step11 skill states the same rule), and it is hundreds of words per figure.
#
# Both halves are consumed here into one `figure` node, so the page reserves
# a plate at its final size — which is the whole point of the slot rule: art
# dropped in later is a pure substitution and pagination never re-runs.
# AN EIGHTH DIALECT: A LaTeX `figure` ENVIRONMENT FROM A MATHPIX EXPORT.
#
#     \begin{figure}
#     \captionsetup{labelformat=empty}
#     \caption{(A)}
#     \includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/...jpg}
#     \end{figure}
#
# `physics_edited.md` carries four of these — the four OPTIONS of one MCQ are
# pictures — and with no rule for them the whole block printed literally:
# `\begin{figure}`, `\captionsetup`, the `\includegraphics` line and the CDN
# URL, all as body text. That is 26 of the 40 render defects step15 counted.
#
# The URL is DROPPED, never hotlinked — FORMAT_SPEC §9's rule for the Mathpix
# convention: "a remote URL in the source is evidence of what the original
# crop was, not something to hotlink into the final page". The `\caption{}`
# becomes the plate's caption, so `(A)`/`(B)`/`(C)`/`(D)` still identify which
# option each picture is, which is the one thing a reader cannot do without.
RE_FIG_ENV_OPEN = re.compile(r'^\s*\\begin\{figure\*?\}')
RE_FIG_ENV_CLOSE = re.compile(r'\\end\{figure\*?\}')
RE_FIG_ENV_CAPTION = re.compile(r'\\caption\{(.*?)\}')

RE_FIG_CAPTION = re.compile(
    r'^\*\s*चित्र\s*([0-9]+(?:\.[0-9]+)*)\s*[·:—-]?\s*(.*?)\s*\*$')
# The brief that follows it, as a blockquote led by the picture glyph.
RE_FIG_BRIEF = re.compile(r'^>\s*🖼️?\s*(.*)$')
# A THIRD spelling: the brief written inside the brackets rather than
# after them — `[चित्र: क्षैतिज तार के दोनों सीधे भागों पर …]`. Unknown
# to the reader, it printed as body text: a paragraph of instructions
# for an illustrator, set as prose in the middle of an answer.
RE_FIG_DESC = re.compile(r'^\[\s*चित्र\s*[:：]\s*(.+?)\]\s*$', re.S)
# A FOURTH spelling: NUMBERED, with a dash instead of a colon —
# `[चित्र 1.1 — पुष्प की अनुदैर्ध्य काट, 11 भाग नामांकित: …]`. The
# sibling above demands a colon straight after `चित्र`, so a figure
# that names itself first matched nothing: biology chapter 1 writes 16
# of its figures this way and every one printed as a bracketed line of
# body text, in the middle of an answer, where a reserved plate should
# have been. The number is the figure's own, so it is kept as `num`
# and becomes the caption the plate prints.
# The bracket inside a BOLD question stem — see the RE_FIG_STEM branch.
RE_FIG_STEM = re.compile(
    r'^\*\*\[\s*चित्र\s*(?P<num>[0-9\u0966-\u096F][0-9\u0966-\u096F.]*)?'
    r'(?:\s*[—–:：-]\s*(?P<desc>[^\]]+))?\]\s*(?P<rest>.*)$')
RE_FIG_NUMDESC = re.compile(
    r'^\[\s*चित्र\s*([0-9\u0966-\u096F][0-9\u0966-\u096F.]*)\s*'
    r'[—–-]\s*(.+?)\]\s*$', re.S)
# A STRUCTURE CAN BE THE ANSWER TO PART (ii).
#
# This used to anchor the image at the very start of the line. In the organic
# chapter 30 of the 78 structures are the answer to a numbered part and are
# written with the enumerator in front of them:
#
#     (ii) ![चित्र 6.5](source_figures/page_16_image_2.png)
#     **उत्तर:** (i) ![चित्र 6.11](source_figures/page_14_image_5.png)
#
# All 30 fell through to the paragraph scanner, so a benzene ring became the
# literal text `(ii) ![चित्र 6.5](source_figures/…)` in the middle of an
# answer. The enumerator is kept and shown, because it is what says WHICH
# part of the question this structure answers — three skeletal formulae in a
# row are indistinguishable without it.
# A standalone image ANYWHERE in an answer's text — see the answer branch.
_ANS_IMG_RE = re.compile(r'!\[(?P<alt>[^\]]*)\]\((?P<url>[^)]*)\)')

# THE SAME ANSWER, WRITTEN WITHOUT AN IMAGE FILE.
# `**उत्तर:** [चित्र 1.1 — देखें भाग 1, पुष्प L.S., 11 भाग नामांकित]`
# is the whole answer to "draw a labelled diagram" — a figure, just
# one whose plate is still to be drawn, so there is no `![](…)` for
# `_ANS_IMG_RE` to find. Without this the brackets printed verbatim in
# the middle of the answer badge. Biology chapter 1 answers four of
# its diagram questions this way.
# The description is OPTIONAL: an answer that only points at a plate
# already drawn elsewhere writes `… वही उत्तर। [चित्र 1.2]` with no
# separator and nothing after the number.
_ANS_FIG_RE = re.compile(
    r'\[\s*चित्र\s*(?P<num>[0-9\u0966-\u096F][0-9\u0966-\u096F.]*)?'
    r'(?:\s*[—–:：-]\s*(?P<desc>[^\]]+))?\]')

RE_FIG_MD = re.compile(
    r'^(?P<pre>(?:\*\*[^*\n]{1,16}:\*\*\s*)?'
    r'(?:\([ivxlcIVX]{1,5}\)|\([a-zA-Z]\)|[a-z]\)|\d{1,2}\.)\s*)?'
    r'!\[(?P<alt>[^\]]*)\]\((?P<url>[^)]*)\)\s*(?P<rest>.*)$')

# A FOURTH SPELLING: `चित्र N — ![](url)`, the caption OUTSIDE the
# brackets and the image EMPTY — a Mathpix crop URL that never got a local
# asset saved for it (21 of them in physics chapter 1, every other figure
# in the same file having the normal `![चित्र N](source_figures/x.png)`
# form and a real local image). `RE_FIG_MD`'s `pre` group only knows an
# enumerator or a bold lead-in, not "चित्र N — ", so this shape matched
# nothing and the whole line — markdown syntax, the bare `cdn.mathpix.com`
# URL, its crop-coordinate query string — printed as literal text on the
# page. There is no local file to embed even once this is recognised, so
# it gets the SAME treatment as `[चित्र बनाना है]`: a reserved empty plate
# captioned with the number, the broken URL simply dropped.
RE_FIG_MATHPIX_STRAY = re.compile(
    r'^चित्र\s*([\d.]+)\s*[—–-]\s*!\[[^\]]*\]\([^)]*\)\s*(.*)$')

# Option markers, all four shapes the corpus uses:
#     i) 10⁷          ii) 1·6 × 10¹⁹        <- roman, bare, 2-space gutter
#     (i) F₁ …                              <- roman, bracketed, own line
#     (a) योगात्मक   (b) …                  <- latin, bracketed
#     (A) शून्य                             <- latin, upper
# Matched at start-of-string or after whitespace. Anchoring on ^ alone
# used to drop the FIRST option of every question — the answer key still
# said "(iii)" while option (i) had silently vanished from the page.
RE_OPT_TOKEN = re.compile(
    r'(?:(?<=^)|(?<=\s))(\((?:[ivx]{1,4}|[a-dA-D]|'
    r'[\u0915\u0916\u0917\u0918\u0919\u0905\u092c\u0938\u0926])\)'
    r'|(?:[ivx]{1,4}|[a-dA-D]|'
    r'[\u0915\u0916\u0917\u0918\u0919\u0905\u092c\u0938\u0926])\))(?=[\s\u00a0])')


def _math_spans(text):
    """The `$...$` ranges in `text`, as (start, end) pairs."""
    out, i = [], 0
    while True:
        a = text.find('$', i)
        if a < 0:
            return out
        b = text.find('$', a + 1)
        if b < 0:
            return out
        out.append((a, b + 1))
        i = b + 1


def opt_tokens(text):
    """Option enumerators in `text` — those OUTSIDE any maths span.

    `(A)` AND `(B)` ARE PRODUCTS, NOT OPTION LABELS.
    #
    Organic chemistry's commonest question form names its unknown products
    with exactly the letters an MCQ uses for its options:

        (i) $C_2H_5Br \\xrightarrow{KOH(aq)} (A) \\xrightarrow[\\Delta]{...} (B)$

    `RE_OPT_TOKEN` matched `(A)` and `(B)`, so the splitter cut that ONE
    option into three — and the cut fell in the middle of the `$...$` pair,
    leaving an unclosed `$` in the first piece and an unopened one in the
    last. Maths conversion is scoped to a balanced pair, so neither piece was
    converted: `$\\mathrm{C}_2\\mathrm{H}_5\\mathrm{Br}` printed as literal
    LaTeX on the page while the reaction arrow beside it rendered correctly.

    An enumerator inside a maths span is part of the notation. Nothing else
    distinguishes the two, and the position does it exactly.

    TWO MORE THINGS THAT LOOK LIKE A MARKER AND ARE NOT — both found the
    same way, an option/answer block that split into more pieces than it
    has parts:

    `प्रश्न 5 (ii) देखें` — a cross-reference to ANOTHER question's part,
    not this answer's own next part: "(i) चुम्बकीय गुण … प्रश्न 5 (ii)
    देखें।" split into "(i) चुम्बकीय गुण … प्रश्न 5" and "(ii) देखें।",
    two pieces where the source wrote one. The shape — "प्रश्न", a number,
    then the very marker being cited — is a generic citation notation, not
    chemistry vocabulary: any subject's answer says "see question N part
    X". Excluded by what comes immediately before the marker.

    `(a) (A) और (R) दोनों सत्य हैं …, (A) की सही व्याख्या है।` — an
    Assertion-Reason option, the commonest board MCQ shape, citing its own
    `(A)`/`(R)` labels inside its text. `RE_OPT_TOKEN` treats upper- and
    lower-case Latin as one alternation, so `(a)…(d)` (the true options)
    and `(A)`/`(R)` (labels the options are ABOUT) all matched, and one
    option became three. AN OPTIONS BLOCK USES ONE MARKER FAMILY
    THROUGHOUT — roman, lower-case Latin, or upper-case Latin — decided by
    whichever family the FIRST marker establishes; a token of a different
    family is prose that mentions a marker, not a marker.
    """
    spans = _math_spans(text)
    cands = [m for m in RE_OPT_TOKEN.finditer(text)
             if not any(a <= m.start() < b for a, b in spans)]
    cands = [m for m in cands
             if not _RE_QREF_BEFORE.search(text[:m.start()])]
    if not cands:
        return cands
    # A REFERENCE CHAIN IS NOT AN OPTIONS LIST.
    #
    # "(i) तथा (ii) को विलोपन विधि द्वारा सरल करने पर a = -191, c = 77 प्राप्त
    # होता है।" cites two EARLIER equation numbers as the subject of one
    # sentence — "(i) and (ii), simplified by elimination, give …" — not two
    # options. The gap between the markers is the bare conjunction "तथा"
    # ("and"), never real option content, and splitting there tore one
    # sentence into "(i) तथा" — a fragment holding nothing — and "(ii) को
    # विलोपन विधि…", the entire rest of the sentence orphaned onto option
    # (ii). A genuine option is never separated from the next by nothing but
    # a bare conjunction; `(a) हाँ (b) नहीं` still has real (if short) words
    # of its own in the gap, so this only catches the citation shape.
    if len(cands) >= 2:
        gap = text[cands[0].end():cands[1].start()]
        if _RE_CONNECTOR_ONLY.match(gap):
            return []
    family = _marker_family(cands[0].group(0).strip("()"))
    cands = [m for m in cands
             if _marker_family(m.group(0).strip("()")) == family]
    # AN OPTION LIST ONLY EVER GOES FORWARD.
    #
    # `(A) प्रत्यावर्ती … (B) दिष्ट … (C) (A) और (B) दोनों के लिए (D) इनमें
    # से कोई नहीं` — the "both of the above" option, which every MCQ paper
    # writes sooner or later, cites the two options it is about. All six
    # markers are the same upper-Latin family, so the family filter above
    # cannot separate them, and the splitter cut four options into six:
    # a `(C)` with no text at all, then `(A) और` and `(B) दोनों के लिए` as
    # two more.
    #
    # What a cited marker cannot do is ADVANCE the sequence — it names an
    # option already given. Keeping only markers that move forward leaves
    # A, B, C, D and reads the citation as what it is, the text of (C).
    out, best = [], -1
    for m in cands:
        r = _marker_rank(m.group(0).strip("()"), family)
        if r is None or r > best:
            out.append(m)
            if r is not None:
                best = r
    return out


# A MARKER THE PROSE IS CITING, not one it is offering.
#
# `प्रश्न N` was the only cue. A worked solution cites its own earlier
# steps far more often, and in this book it does so by name:
#
#     समी (iii) से p = 4r; इसे समी (ii) में रखने पर,
#
# Both markers are roman, both look exactly like options, and the gap
# between them is a real clause rather than a bare conjunction — so the
# family check and the connector check above both pass it, and the
# splitter cut ONE sentence into three paragraphs: "समी", then
# "(iii) से p = 4r; इसे समी", then "(ii) में रखने पर,". The reader met a
# line that stopped mid-thought and a fragment beginning with a bracket.
#
# The cue is the citation word immediately before the marker. `समी` is
# how the chapters abbreviate समीकरण; the others are the same shape for a
# formula, a step or a stage.
_RE_QREF_BEFORE = re.compile(
    r'(?:प्रश्न\s*\d+|समी(?:करण)?|सूत्र|चरण|पद|भाग)\s*$')
_RE_CONNECTOR_ONLY = re.compile(r'^\s*(?:तथा|और|व|एवं)\s*$')
# A line OPENING with `marker CONNECTOR marker` — "(i) तथा (ii) को …" — see
# the connector-gap check in `opt_tokens`; this is the same exclusion for
# `_looks_like_options`'s single-marker fallback, which does not go through
# `opt_tokens` the same way.
_RE_MARKER_CHAIN = re.compile(
    r'^\(?(?:[ivx]{1,4}|[a-dA-D]|[कखगघङअबसद])\)\s*(?:तथा|और|व|एवं)\s*'
    r'\(?(?:[ivx]{1,4}|[a-dA-D]|[कखगघङअबसद])\)')


# Where each marker sits in its family's order — see the monotonic filter
# in `opt_tokens`. `None` for anything unrecognised, which is kept rather
# than dropped: an unknown marker is not evidence of a citation.
_ROMAN = ("i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x")
_DEVA_MARKERS = ("क", "ख", "ग", "घ", "ङ")
_DEVA_ALT = ("अ", "ब", "स", "द")


# The marker an MCQ cell opens with — `(A)`, `(a)`, `(i)`, `(क)`.
_RE_OPT_CELL = re.compile(
    r'^\(?\s*(?:[ivx]{1,4}|[a-dA-D]|[कखगघङअबसद])\s*[\)\.]')


def _table_as_options(head, rows):
    """-> the cells in reading order if this table is really an options
    grid, else None. See the note above `_Scanner._table`."""
    if not rows or any((h or "").strip() for h in head):
        return None
    cells = [c.strip() for r in rows for c in r if c and c.strip()]
    if len(cells) < 2 or not all(_RE_OPT_CELL.match(c) for c in cells):
        return None
    return cells


def _marker_rank(inner, family):
    inner = (inner or "").strip()
    if family == "roman":
        return _ROMAN.index(inner) if inner in _ROMAN else None
    if family == "devanagari":
        for seq in (_DEVA_MARKERS, _DEVA_ALT):
            if inner in seq:
                return seq.index(inner)
        return None
    if len(inner) == 1 and inner.isalpha() and inner.isascii():
        return ord(inner.lower()) - ord("a")
    return None


def _marker_family(inner):
    if inner in ("i", "ii", "iii", "iv"):
        return "roman"
    if inner in ("क", "ख", "ग", "घ", "ङ", "अ", "ब", "स", "द"):
        return "devanagari"
    return "upper" if inner.isupper() else "lower"

# `↔ **मिलता-जुलता:** …`   `⚠ **पुस्तक से बाहर …**`   `★ **5 साल में 4 बार …**`
RE_MARKER = re.compile(
    r'^(?P<icon>[^\w\s\|>#*\-\[(])(?P<icon2>[\uFE0F\u20E3]?)\s*'
    r'\*\*(?P<label>[^*]{1,60}?)\s*[:：]?\*\*\s*(?P<rest>.*)$')

# An icon-led line with NO bold label — `🔢 "…प्रश्न…?" → …हल… *(UP 2023)*`.
#
# RE_MARKER requires `**label**` after the icon, so these matched nothing,
# were not block starts, and `_para_run` merged every consecutive one into a
# single paragraph: three separate past-paper numericals arrived as one dense
# run-on block with three 🔢 buried inside it.
#
# Each is one item and gets one line. The icon class is the same as
# RE_MARKER's, minus the characters that already begin other constructs.
RE_ICON_LINE = re.compile(
    r'^(?P<icon>[^\w\s\|>#*\-\[(])(?P<icon2>[\uFE0F\u20E3]?)\s+'
    r'(?P<rest>(?!\*\*)\S.*)$')

# A CALLOUT ICON WITH NO `**Label:**` IS STILL A CALLOUT.
#
# `RE_MARKER` requires the bold label, and the maths chapter writes four of
# its most important warnings without one:
#
#     **सीमा:** `gof` की शर्त : $f : A \to B$ तथा $g : B \to C$ …
#     ⚠️ `gof` में सदैव पहले भीतरी फलन $f$ लगता है; क्रम उलटकर …
#
# The `**सीमा:**` definition calls `_para_run()` for its continuation, and
# that run's icon-line break is gated on `buf` being non-empty — so the
# FIRST continuation line can never break it. All four ⚠️ lines were
# swallowed into the end of the definition above them and printed as
# ordinary prose with a stray ⚠️ mid-sentence. The same absorption is
# already documented at the `flow` branch below, where chemistry worked
# around it locally instead of fixing it here.
#
# Deliberately NARROWER than `RE_ICON_LINE`: only a glyph the callout table
# actually knows. `RE_ICON_LINE`'s icon class is "any non-word character",
# which also matches the `— स्रोत: …` citation trailer that closes almost
# every answer in the corpus, and `$ x = 1$`. Those are not callouts, and
# turning them into one — or letting them start a block — would change every
# chapter already shipped.
RE_BARE_CALLOUT = re.compile(
    u'^(?P<icon>'
    + u'|'.join(re.escape(k) for k in
                sorted(_classify.CALLOUT_ICONS, key=len, reverse=True))
    + u')\\s+(?P<rest>(?!\\*\\*)\\S.*)$')

RE_MARKS = re.compile(r'(\d+(?:[/·]\d+)?)\s*अंक')
RE_YEAR = re.compile(r'(20\d\d)')

# A Part-2 GROUP label that is nothing but a year: `### 2026`, `### 2025`,
# and the two-year spelling a board paper sometimes carries (`### 2025-26`).
# Anchored at both ends on purpose. See `_h3_group_boundary`.
RE_YEAR_GROUP = re.compile(
    r'^(?:19|20)\d\d(?:\s*[-–—/]\s*(?:(?:19|20)?\d\d))?$')

# A Part-2 group label that is a MARKS band: `### 1 अंक`, `### 5 अंक`.
RE_MARKS_GROUP = re.compile(r'^\d+(?:\s*[/·]\s*\d+)?\s*अंक\s*$')

# A Part-2 group label that NAMES the group rather than numbering it:
# `### महत्वपूर्ण प्रश्न`, `### प्रश्न बैंक`. `_h3_group_boundary`'s own
# docstring already cites `### महत्वपूर्ण प्रश्न` as a group heading, so this
# is writing down a rule the file states but never encoded — `physics_edited.md`
# closes with 68 questions under exactly that heading and, with no `---`
# anywhere in Part 2, they were all swallowed into the 2020 group.
#
# Kept to the question-bank vocabulary on purpose. The guard exists to protect
# an essay answer's in-body subheadings (`### प्रणाली की संरचना`), and those
# are ordinary noun phrases — nothing that reads as "<qualifier> प्रश्न".
RE_NAMED_QGROUP = re.compile(
    r'^(?:महत्[त्]?वपूर्ण|अन्य|अतिरिक्त|चयनित|विविध|अभ्यास)?\s*'
    r'प्रश्न(?:\s*(?:बैंक|संग्रह|सूची))?\s*$')


def _is_group_label(title):
    """Is this H3 title a Part-2 GROUP heading rather than prose?

    The three shapes a chapter actually groups Part 2 by, all structural:

        `2026`                     a year          (RE_YEAR_GROUP)
        `2.4 बिंदु आवेश के कारण विभव`  a topic section (RE_SECTION, hierarchical)
        `5 अंक`                     a marks band    (RE_MARKS_GROUP)

    What it must NOT match is the reason `_h3_group_boundary` guards at all:
    an essay answer's own in-body subheading — `### प्रणाली की संरचना`,
    `### निर्माण और सामग्री` — which is bare prose and matches none of the
    three. That is the distinction the FORMAT_SPEC already draws for
    sections ("A section number must be HIERARCHICAL (`3.4`), because a
    Part 2 grouped by marks has headings like `### 1 अंक` that would
    otherwise be read as sections"); this is the same test, reused.
    """
    t = (title or "").strip()
    return bool(RE_YEAR_GROUP.match(t) or RE_MARKS_GROUP.match(t)
                or RE_NAMED_QGROUP.match(t) or RE_SECTION_NUM.match(t))


# ==========================================================================
# BLOCK SCANNER — a flat run of lines -> a list of leaf IR nodes
# ==========================================================================
# The subject profile in force for this parse. Set by `parse()`; physics by
# default, which is the behaviour every existing chapter was built with.
_PROFILE = _subjects.get("physics")


def set_profile(name):
    """Choose the subject profile. Called by `parse`."""
    global _PROFILE
    _PROFILE = _subjects.get(name)
    return _PROFILE


# `**1.** … **2.** … **3.** …` all on ONE line.
#
# The maths chapter states its proof method that way:
#
#   **1.** जो सिद्ध करना है, उसका बायाँ पक्ष लिखो। **2.** परिभाषा … एक बार
#   लगाओ। **3.** साहचर्य नियम से कोष्ठक बदलो। **4.** $AA^{-1} = I$ … **5.** …
#
# Read as prose it came out as one five-sentence paragraph with bold digits
# scattered through it — the steps of a proof set as a wall of text, which is
# the one shape a student cannot follow. They are a numbered list; the author
# numbered them.
#
# At least two markers, so a sentence that merely opens with `**1.**` is not
# torn apart.
_INLINE_ENUM_RE = re.compile(r'\*\*\s*(\d{1,2})\s*[.)]\s*\*\*')


def _panel_title(term, rows):
    r"""What a `**सूत्र:**` panel actually holds, from its rows.

    Chemistry writes four different things on that one label, and calling
    them all "सूत्र" tells a student to memorise a list of reagents as
    though it were a set of formulae:

        `R—OH + HX/निर्जल ZnCl₂ → R—X + H₂O` · …      reactions
        `X₂/निर्जल FeX₃` · `सांद्र HNO₃ + सांद्र H₂SO₄`  reagents
        `CH₂Cl₂` पेन्ट हटाने में · `CHCl₃` विलायक      a compound and its use
        `Sₙ1: वेग = k[R—X]` · …                        actual formulae

    An arrow makes it a reaction. Devanagari at the END of a row makes it a
    description of the formula in front of it, which is a use. Neither, and
    it is a bare reagent. Anything else keeps the label the author wrote.
    """
    txts = [(r[0] if r else "") for r in rows]
    if not txts:
        return term
    arrows = sum(1 for t in txts
                 if re.search(r'[→⟶⇌⟷]|\\xrightarrow|\\longrightarrow', t))
    if arrows >= max(2, len(txts) // 2):
        return "अभिक्रिया"
    # A row that ENDS in Devanagari is `formula — what it is used for`.
    described = sum(1 for t in txts
                    if re.search(r'[\u0900-\u097F][\u0900-\u097F\s,]*$',
                                 t.strip()))
    if described >= max(2, (len(txts) * 2) // 3):
        return "उपयोग"
    # No arrow, no description, and every row is a chemical species: these
    # are the reagents that DO the reaction, not the equation itself.
    if arrows == 0 and all(re.search(r'[A-Z][a-z]?[\u2080-\u2089\d]', t)
                           for t in txts) \
            and not any(re.search(r'=', t) for t in txts):
        return "अभिकर्मक"
    return term


# Is this the RESULT of a सूत्र row, or a remark about one?
#
# A result states an equality or a proportionality. A remark is a sentence,
# and a sentence in a boxed formula row reads as an error.
_RESULT_RE = re.compile(r'[=∝≈≡]')

# A WHOLE bullet wrapped in one backtick span — the author's own "this is
# notation" mark, same as `_PROFILE["backticks"] == "maths"` already means
# for inline text. Maths writes सूत्र rows in Devanagari WORDS standing in
# for algebraic symbols — `परिमेय + अपरिमेय = अपरिमेय` states an identity
# ("rational + irrational = irrational") the same way "even + odd = odd"
# would in English — and every word in it is well past 4 Devanagari
# characters, so the prose check below misread five straight सूत्र rows as
# sentences ABOUT a formula and boxed none of them; the panel came out an
# empty label over a plain, unstyled bullet list. A whole backtick span
# settles it before that heuristic runs at all.
_BACKTICK_SPAN_RE = re.compile(r'^`[^`]+`$')


def _is_result(text):
    t = (text or "").strip()
    if not t:
        return False
    if (_PROFILE.get("backticks") == "maths"
            and _BACKTICK_SPAN_RE.match(t) and _RESULT_RE.search(t)):
        return True
    core = re.sub(r'\*\*|\$', '', t)
    # Devanagari BEFORE the first relation sign means the line opens with
    # prose — `दूरी दुगुनी करने पर बल चौथाई रह जाता है ($F \propto 1/r^2$)`
    # states a fact about a formula rather than being one.
    m = _RESULT_RE.search(core)
    if not m:
        return False
    return not re.search(r'[\u0900-\u097F]{4,}', core[:m.start()])


def _bullet_rows(items):
    """One BULLET is one row: `formula · caption · **शर्त:** condition`.

    The panel row already has three fields — expression, caption, condition —
    and `components.math.frow` draws them as one boxed result with its
    description beside it. Physics chapter 1 writes exactly that shape:

        - $E = (1/4πε₀)·2p/r³$ · अक्षीय स्थिति पर क्षेत्र · **शर्त:** r ≫ a

    Joining the bullets into one ` · ` string and splitting on every dot made
    each of those three fields a ROW OF ITS OWN. A panel of three formulae
    came out as nine rows, six of them prose — a सूत्र box whose contents were
    mostly not सूत्र, which is exactly what it looked like.

    So the split is per bullet first, and only the FIRST field of a bullet is
    the result; everything after it describes that result.
    """
    rows, notes = [], []
    for it in items:
        parts = [p.strip() for p in (it or "").split(" · ") if p.strip()]
        if not parts:
            continue
        expr, rest = parts[0], parts[1:]
        # A BULLET THAT IS NOT A RESULT IS NOT A ROW.
        #
        # Some bullets under `**सूत्र:**` are remarks about the formulae
        # rather than formulae — `दूरी दुगुनी करने पर बल चौथाई रह जाता है`,
        # `पृष्ठ विद्युत क्षेत्र के समांतर हो तो फ्लक्स शून्य होता है`. Boxed
        # as results they put a sentence in a सूत्र box, which is what "this
        # is not सूत्र, some is a line" means. They are returned separately
        # and printed as prose under the panel, where they belong.
        if not _is_result(expr):
            notes.append(it)
            continue
        cond = ""
        keep = []
        for r in rest:
            m = re.match(r'^\*\*\s*(?:शर्त|सीमा|condition)\s*:?\s*\*\*\s*(.*)$',
                         r, re.I)
            if m:
                cond = m.group(1).strip()
            else:
                keep.append(r)
        rows.append((expr, " · ".join(keep), cond))
    return rows, notes


def _result_rows(text):
    r"""`A · B · C` -> [(A, "", ""), (B, "", ""), (C, "", "")] for a सूत्र panel.

    Split on ` · ` — the separator the source uses between results. A
    `\cdot` INSIDE an expression is multiplication and never a boundary,
    which is why the split is on the rendered middle dot with spaces round
    it rather than on the command.

    A LaTeX-normalised source spells that SAME separator `$\cdot$` — the
    dot wrapped in its own maths delimiters, not the bare `·` character —
    `**सूत्र:** $(A')' = A$ $\cdot$ $(A+B)' = A'+B'$ $\cdot$ …`. Recognising
    only the bare form left this whole line as ONE unsplit string (`len(
    parts) < 2`), so `formula_card` never fired and four standard results
    fell through as a single run-together definition paragraph instead of
    a row each. Normalised to the same ` · ` before splitting, so either
    spelling of the separator produces the same rows.
    """
    t = (text or "").strip()
    t = re.sub(r'\s*\$\\cdot\$\s*', ' · ', t)
    parts = [p.strip() for p in t.split(" · ") if p.strip()]
    # A LONE RESULT IS STILL A PANEL, NOT A DEFINITION.
    #
    # `**सूत्र:** $V = W/q_0$` — one formula, no ` · ` to split on — used to
    # return `[]` here on the reasoning that "A · B · C" needs at least two
    # parts to be worth calling a list. But the caller's only alternative
    # for an empty `rows` is `node("definition", term="सूत्र", text=...)`,
    # which prints as a plain bold-label paragraph — not the bordered सूत्र
    # box every OTHER formula in the chapter gets. The reference boxes a
    # single result exactly the same as a list of them (see physics
    # chapter 2's 2.1, one formula, still a full `.fcard`), so a length of
    # one is a one-row panel, not nothing.
    if not parts:
        return []
    return [(p, "", "") for p in parts]


def _inline_enumeration(text):
    """-> (lead-in, [items]) for a one-line numbered run, else ("", [])."""
    t = (text or "").strip()
    marks = list(_INLINE_ENUM_RE.finditer(t))
    if len(marks) < 2:
        return "", []
    # The numbers must actually count up. A stray `**2.**` in prose is not an
    # enumeration, and re-ordering someone's sentences would be worse than
    # leaving them alone.
    nums = [int(m.group(1)) for m in marks]
    if nums != list(range(nums[0], nums[0] + len(nums))):
        return "", []
    lead = t[:marks[0].start()].strip()
    items = []
    for i, m in enumerate(marks):
        stop = marks[i + 1].start() if i + 1 < len(marks) else len(t)
        body = t[m.end():stop].strip()
        if body:
            items.append(body)
    return lead, items


def _prose_chain(text):
    """-> (lead-in, chain) for a paragraph that IS a sequence, else ("", "").

    Only when the arrows are all in a TAIL that follows a colon, or make up
    the whole paragraph. A chain embedded mid-sentence is left alone: eight of
    chapter 1's arrows sit inside a description of what develops from what,
    and lifting those out would break the sentence around them.

    Profile-gated by the caller through `_PROFILE`; physics writes 11 arrows
    in a chapter and none of them this way.
    """
    if _PROFILE.get("backticks") != "sequence":
        return "", ""
    t = (text or "").strip()
    if t.count("→") < 2:
        return "", ""
    lead, sep, tail = t.partition(":")
    if not sep:
        lead, tail = "", t
    # Every arrow must be in the tail, and the tail must not run on into
    # another sentence after the chain.
    if "→" in lead:
        return "", ""
    body = tail.strip().rstrip("।").strip()
    if not body or "।" in body:
        return "", ""
    stages = [x.strip() for x in body.split("→") if x.strip()]
    if len(stages) < 3:
        return "", ""
    # A SEMICOLON BETWEEN ARROWS MEANS PAIRS, NOT A SEQUENCE.
    #
    # `बीजाण्ड → बीज बनाता है; बीजाण्डवृन्त → वृन्त; नाभिका → धब्बे …` is a
    # list of what-becomes-what, one arrow per pair — seven arrows, but no
    # stage leads into the next. Split on `→` alone the stages straddle the
    # separators and come out as "बीज बनाता है; बीजाण्डवृन्त", which is two
    # halves of two different pairs in one box. A real sequence carries the
    # reader from one stage to the next and never needs a separator.
    if any(";" in x or "·" in x for x in stages[:-1]):
        return "", ""
    return lead.strip(), body


def _prose_nodes(txt):
    """Prose that IS an arrow sequence -> a flow chart; anything else a para.

    `_prose_chain` was applied in exactly ONE place — the paragraph run —
    so the same sentence became a flow chart in Part 1 and stayed prose the
    moment it appeared inside an answer, or after the figure split lifted it
    out of one. Biology chapter 1 writes five of its answers as a chain.
    """
    # AN IMAGE INSIDE A SENTENCE IS STILL A FIGURE.
    #
    # `**उत्तर:** ![](…)` is already split out of an ANSWER, but a question
    # stem can carry one too — physics chapter 2 writes "नीचे दिये चित्र में
    # $A$ तथा $B$ के बीच … होगी ![](https://cdn.mathpix.com/…)" as one
    # paragraph. Nothing downstream knew what to do with it, so the raw
    # markdown printed on the page: literal brackets and a 90-character URL
    # wrapping through the middle of the question. Split here into the
    # sentence and a reserved plate carrying the reference, which is what a
    # figure with art still to come looks like everywhere else in the book.
    # The plate does NOT try to fetch the URL — it records it, the same as a
    # `source_figures/…png` that has not been drawn yet.
    figs = list(_ANS_IMG_RE.finditer(txt or ""))
    if figs:
        out = []
        out.extend(_prose_nodes((txt[:figs[0].start()] or "").strip())
                   if (txt[:figs[0].start()] or "").strip() else [])
        for fm in figs:
            fcap = fm.group("alt").strip()
            mnum = re.search(r'(\d+\.\d+)', fcap)
            out.append(node("figure", mode="ref",
                            num=mnum.group(1) if mnum else "",
                            caption=fcap, desc="",
                            ref=fm.group("url").strip()))
        tail = (txt[figs[-1].end():] or "").strip()
        if tail:
            out.extend(_prose_nodes(tail))
        return out

    lead, chain = _prose_chain(txt)
    if chain:
        out = []
        # THE CHART'S OWN TITLE IS THE LEAD-IN, when the lead-in is short
        # enough to be one — `_chain_title` returns it verbatim under 24
        # characters. Emitting the para as well printed "परागकण-निर्माण"
        # twice in a row, once as a one-word paragraph and again inside the
        # chart's title chip. Only keep the paragraph when the title fell
        # back to the generic "क्रम" and the lead-in would otherwise be lost.
        title = _chain_title(lead)
        if lead and lead.strip() != title.strip():
            out.append(node("para", text=lead))
        out.append(node("flow", text=chain, title=title))
        return out
    return [node("para", text=txt)] if (txt or "").strip() else []


def _chain_title(lead):
    """The chip above a prose chain: `क्रम` unless the lead-in names one."""
    l = (lead or "").strip()
    if not l:
        return "क्रम"
    return l if len(l) <= 24 else "क्रम"


def _split_chain_text(text):
    """-> (the backticked chain, whatever followed it).

    Without backticks the whole string is the chain and there is no tail.
    """
    m = re.match(r'\s*`([^`]+)`\s*(.*)$', (text or "").strip(), re.S)
    if not m:
        return (text or "").strip(), ""
    return m.group(1).strip(), m.group(2).strip()


def _flow_chain(text):
    """An arrow-joined chain, OR a word equation, ignoring the backticks.

    A `**संबंध:**` line often has no arrow at all —
    `1 नर युग्मक + 2 ध्रुवीय केन्द्रक = त्रिगुणित (3n) …` — so requiring one
    sent it to the maths face instead, and it printed in italic Georgia. That
    is the same defect the flow component exists to prevent, reached by a
    different route. See `looks_like_relation`, which requires Devanagari on
    one side of the `=` so that physics's `v = u + at` is still an equation.
    """
    body = (text or "").strip()
    if body.startswith("`") and body.endswith("`"):
        body = body.strip("`")
    if len(_C_text.flow_stages(body)) < 2:
        return False
    return _C_text.looks_like_flow(body) or _C_text.looks_like_relation(body)


def _close_open_maths(line):
    r"""Close a `$` span the author left open at the end of ITS OWN line.

    A paragraph is joined with spaces, so the line boundary — the only
    place the author's intent is unambiguous — is gone by the time
    `format/inline` sees the text. That matters because two lines can each
    leave a span open and the JOINED text then has an even number of `$`:

        अर्थात् $\Delta T \propto \Delta P                       (1 `$`)
        $P_0 - P_s \propto \dfrac{W_A}{m_A W_B}$ अथवा, $\Delta T … (3 `$`)

    Four delimiters, so nothing looks wrong, but they pair across the line
    break and the halves of two different formulas end up inside one span
    — seven LaTeX commands printed their own names on the page. Each line
    alone converts perfectly. Closing the span HERE, before the join,
    keeps every line's maths inside its own line, which is what the author
    wrote. A balanced line is returned untouched.
    """
    if not line or line.count("$") % 2 == 0:
        return line
    if line.strip() == "$$":
        return line
    return line + "$"


class _Scanner(object):
    def __init__(self, lines, stats):
        self.L = lines
        self.i = 0
        self.out = []
        self.stats = stats

    def eof(self):
        return self.i >= len(self.L)

    def peek(self, k=0):
        j = self.i + k
        return self.L[j] if j < len(self.L) else ""

    def take(self):
        ln = self.L[self.i]
        self.i += 1
        self.stats["consumed"] += 1
        return ln

    # ---- helpers ---------------------------------------------------------

    def _emit_prose(self, txt):
        """Emit a run of text, giving any calculation step its own line."""
        # A trailing `[1]` is stripped HERE because this is the one place all
        # the prose paths meet. Handling it per line caught only the first
        # line of a run, and per run missed the prose that `split_display`
        # carves out from between two `$$…$$` blocks — 23 tags were still
        # printing as text in answers and in derivation prose.
        # `[1]` MID-LINE is the author closing a scoring point and starting
        # the next — "…आकर्षित करते हैं। [1] (ii) यदि धाराएँ…". Stripping only
        # a trailing tag left four of them printing as text mid-sentence, and
        # more importantly missed what they are FOR: the break between two
        # marks-worth of answer. Splitting there gives an answer its line
        # breaks at exactly the points a marker would award on.
        for seg in _split_on_marks(txt):
            body, marks = seg
            for kind, line in _answer.split_steps(body):
                if kind == "step":
                    self.out.append(node("formula", text=line, display=True))
                elif line:
                    self.out.append(node("para", text=line))
            if marks and self.out:
                self.out[-1]["marks"] = marks
    def _para_run(self, depth=0, cont=False, in_dollar=False):
        """Consecutive non-empty lines that start nothing else.

        `depth` starts above 0 when the caller already consumed a line that
        opened a LaTeX environment itself — see the `**उत्तर:** $$\\begin{
        aligned}` case in the `RE_ANSWER` branch, which has no other way to
        tell this call it is starting already inside one.

        `cont` says this run is the CONTINUATION of a line the caller has
        already consumed (a `**विधि:**` lead-in, a figure brief, an `अथवा`),
        not the opening of a fresh paragraph. It only matters to the icon-line
        break below: that break is gated on `buf` so a run started BY an icon
        line can still advance, but a continuation's first line is not the
        run's opening — it is the line after one — so the gate is wrong there
        and an icon line directly beneath a lead-in got absorbed into it.
        """
        buf = []
        # INSIDE AN OPEN `$$…$$` BLOCK, THE SAME RULE AS `depth` APPLIES.
        #
        # A maths chapter's own convention writes a display equation as
        # THREE lines — `$$`, the formula, `$$` — and puts two of them back
        # to back with no blank line between when a "हल :" has several
        # steps: `$$\n6=2^1\times3^1\n$$\n$$\n20=2\times2\times5=2^2\times
        # 5^1\n$$`. The opening `$$` is a line of its own, so the very next
        # check below — `_answer.is_step(ln)`, which exists to split TWO
        # calculations apart — fired on the formula line INSIDE the block
        # and ended the run right after the opening `$$`, orphaning it from
        # its own content. Worse, a bare `$$` closing line trivially matches
        # `_MATHS_LINE_RE` (`\$.*\$` allows an EMPTY middle), so once such a
        # line became `buf[-1]` the run ended again one line early, leaving
        # the next block's own opening `$$` to start a fresh run. Both
        # split one `$$…$$` pair across two or three separate nodes, and
        # `split_display` — which only pairs delimiters WITHIN one node's
        # text — could never rejoin them; the stray `$$` reached the page
        # as literal text. `in_dollar` tracks the SAME open/close state
        # `depth` tracks for `\begin{}/\end{}`, so nothing below is allowed
        # to break the run while a `$$` opened here has not yet closed.
        # Seeded by the caller when it has ALREADY consumed the opening `$$`
        # — `**उत्तर:** $$` puts the answer label and the delimiter on one
        # line, so by the time this runs the block is open and there is no
        # line left in `self.L` that would toggle it. Exactly the role
        # `depth` plays for `\begin{}`; see the RE_ANSWER branch.
        while not self.eof():
            ln = self.peek()
            if not ln.strip():
                # A BLANK LINE INSIDE AN OPEN DISPLAY BLOCK IS WHITESPACE,
                # NOT A PARAGRAPH BOUNDARY.
                #
                # This break sat ABOVE the `depth == 0 and not in_dollar`
                # guard below, so it fired even in the middle of an open
                # `$$…$$` or `\begin{}…\end{}`. `chapter_mathematics.md`
                # writes its NCERT proofs with the delimiters on their own
                # lines AND a blank line inside:
                #
                #     $$
                #                                   <- blank
                #     3 b^{2}=9 c^{2} \text { अर्थात् } b^{2}=3 c^{2} \tag{2}
                #                                   <- blank
                #     $$
                #
                # so the opening `$$`, the equation and the closing `$$`
                # became three separate nodes. `split_display` only pairs
                # delimiters WITHIN one node, so the `$$` and the raw
                # `\text{}`/`\tag{}` printed literally on the page.
                #
                # Bounded deliberately: a heading or a question head still
                # ends the run even inside an open block, so an UNCLOSED
                # `$$` somewhere in a chapter cannot swallow the rest of the
                # document — it loses one paragraph's grouping instead.
                if depth == 0 and not in_dollar:
                    break
                nxt = self.peek(1)
                if nxt is not None and (RE_H1.match(nxt) or RE_H2.match(nxt)
                                        or RE_H3.match(nxt) or RE_QHEAD.match(nxt)):
                    break
                self.take()
                continue
            # INSIDE AN OPEN LATEX ENVIRONMENT, NOTHING ELSE MAY END THE RUN.
            #
            # `\begin{aligned}…\end{aligned}` (also `array`) writes one
            # derivation step per physical line with no blank line between
            # them — chemistry's colligative-property answers do this ten
            # times in one chapter. Every check below this comment exists to
            # split something APART — a calculation step onto its own line,
            # a new icon-led item — and outside an environment that is
            # right. Inside one it is wrong: `w_{...} &= 46\ \mathrm{g} …`
            # both IS a calculation step by `_answer.is_step`'s test AND is
            # row two of a LaTeX block `matrix.stash` needs INTACT to
            # convert at all. Un-split, the block arrived here one
            # `_para_run` per physical line — its own `\begin{}` on one
            # node, `\end{}` on a much later one — so `matrix.py`'s
            # `\begin{…}…\end{…}` regex never matched a complete span, and
            # the whole thing printed as raw, unconverted LaTeX.
            if depth == 0 and not in_dollar:
                if _starts_block(ln):
                    break
                # An icon-led line begins a new item, but only when it is not
                # the FIRST line of this run — otherwise the run could never
                # start and the scanner would not advance. A CONTINUATION run
                # has no such opening line, so there the very first line may
                # break it (`cont`); without that, `**सीमा:** …` swallowed the
                # `⚠️ …` warning written directly beneath it.
                if (buf or cont) and RE_ICON_LINE.match(ln):
                    break
                # A CALCULATION STEP ends the run. Two consecutive equations —
                #     B = μ₀I/4πr · (sin 90° + sin 90°)
                #     **B = μ₀/4π · 2I/r**
                # have no blank line between them, so the run swallowed both
                # and they printed end to end on one line as though the second
                # were a continuation of the first. One step, one line, which
                # is the rule `format/answer.py` exists to apply.
                if buf and _answer.is_step(ln):
                    break
                # A COMPLETE MATHS LINE TAKES NO CONTINUATION.
                #
                # Maths states one result per line and then moves on:
                #
                #     $\Rightarrow (x - 2)(x - 4) = 0 \Rightarrow x = 2$ या $x = 4$
                #     जब $x = 2$, तब समी (iv) से, $y = 6 - 2 = 4$ तथा $z = 0$
                #
                # Joined, those became ONE `formula` block holding two
                # unrelated statements, and the display-maths path then
                # truncated it mid expression — the page showed `जब $x=`
                # with a raw delimiter and the rest gone.
                #
                # A line that both opens and closes with `$` is a finished
                # equation. Profile-gated: physics writes 490 display
                # equations and its pagination is tested against them
                # joining as they do. Excludes a bare `$$` (see `in_dollar`
                # above) — `\$.*\$` matches it as an empty-bodied "formula".
                if (buf and _PROFILE.get("matrices")
                        and buf[-1].strip() != "$$"
                        and _MATHS_LINE_RE.match(buf[-1])):
                    break
            depth = max(0, depth + ln.count("\\begin{") - ln.count("\\end{"))
            if ln.strip() == "$$":
                in_dollar = not in_dollar
            buf.append(self.take().strip())
            # A MARKS TAG CLOSES WHAT IT MARKS.
            #
            # The tag states what the step above it was worth, so nothing
            # after it continues that step. Two of this chapter's answers
            # write `… पृष्ठ संख्या 80 देखें। $[1\frac{1}{2}]$` and then
            # carry straight on with the next part on the following line;
            # the run swallowed both, which left the tag stranded in the
            # MIDDLE of the joined text where the end-of-run extraction
            # below cannot reach it, and it printed as a bracketed `[1½]`
            # mid-sentence.
            #
            # Deliberately only the `$…$` spelling: every other spelling is
            # already handled somewhere above, and breaking on those would
            # change how four shipped chapters paginate.
            if depth == 0 and not in_dollar and _DOLLAR_MARKS_TAIL_RE.search(
                    buf[-1]):
                break
        return " ".join(_close_open_maths(b) for b in buf).strip()

    # A HEADERLESS GRID OF OPTION CELLS IS AN MCQ, NOT A TABLE.
    #
    # A chapter lays its four choices out as a 2x2 pipe table with an
    # empty header, because that is the easiest way to get two columns in
    # markdown:
    #
    #     |  |  |
    #     |---|---|
    #     | (A) $2C$ | (B) $C$ |
    #     | (C) $\dfrac{C}{2}$ | (D) $\dfrac{1}{2C}$ |
    #
    # Read as a table it printed with rules, a blank header strip and
    # centred cells — a bordered box where the reference sets a plain
    # two-column `.opts` grid, and visibly unlike the options of every
    # other question in the chapter.
    #
    # Required: a header that is entirely blank (a real table names its
    # columns), and EVERY cell opening with an option marker. Both, so a
    # genuine two-column table of data is never swallowed.
    def _table(self):
        head, rows, align = [], [], []
        first = self.take().strip()
        head = [c.strip() for c in first.strip("|").split("|")]
        if not self.eof() and RE_TABLE_SEP.match(self.peek()):
            sep = self.take().strip()
            for c in sep.strip("|").split("|"):
                c = c.strip()
                align.append("l" if c.startswith(":") and not c.endswith(":")
                             else "r" if c.endswith(":") and not c.startswith(":")
                             else "c")
        while not self.eof() and RE_TABLE_ROW.match(self.peek()):
            rows.append([c.strip() for c in self.take().strip().strip("|").split("|")])
        opts = _table_as_options(head, rows)
        if opts is not None:
            return node("options", items=opts, layout="grid")
        return node("table", head=head, rows=rows, align=align)

    def _blockquote(self):
        """A `>` run. Three shapes live in here:
             > #### 📌 Label  + rows   -> card   (a floated sticky note)
             > ✅ **… cover।**          -> qgroup banner (handled by caller)
             > **[सूत्र]** $$…$$        -> formula_box
             anything else              -> refbox
        """
        buf = []
        while not self.eof() and RE_BQ.match(self.peek()):
            buf.append(RE_BQ.match(self.take()).group(1).rstrip())
        if not buf:
            return None
        head = buf[0].strip()

        # THREE HASHES OR FOUR — both are a heading inside the quote.
        #
        # Only `####` was recognised, so `> ### 🧭 अभिक्रिया-पथ के चरण …`
        # fell through to the body and printed its own `###` on the page.
        # step15 caught it as `md_heading`, which is exactly what it was.
        _hh = re.match(r'^(#{3,6})\s*', head)
        mc = RE_CARD_HEAD.match("> " + head) if _hh else None
        if _hh:
            label = head[_hh.end():].strip()
            icon = ""
            m = re.match(r'^(📌)?\s*([^\w\s]{1,2})?\s*(.*)$', label)
            if m:
                icon = (m.group(2) or "").strip()
                label = (m.group(3) or label).strip()
            # A CARD MAY CONTAIN A PIPE TABLE, and one did.
            #
            # A card's body was read as plain lines, so maths chapter 3's
            # "परिभाषाएँ व गुणधर्म" card printed its five-row table as
            # literal markdown — `| नाम | पहचान |` and `|---|---|` set as
            # sentences, pipes and all, in the middle of a finished page.
            # Nothing caught it: the words were all there, so step16's
            # coverage held at 1.0, and a table drawn as text is exactly
            # the kind of thing only a reader notices.
            #
            # Taken as a real table rather than flattened into rows,
            # because a two-column key/value grid IS the content here —
            # joining the cells with a dash would read as prose and lose
            # the alignment that makes it scannable.
            rows, tbl_head, tbl_rows = [], None, []
            for r in buf[1:]:
                r = r.strip()
                if not r:
                    continue
                if RE_TABLE_SEP.match(r):
                    continue                       # the `|---|---|` rule
                mt = RE_TABLE_ROW.match(r)
                if mt:
                    cells = [c.strip() for c in mt.group(1).split("|")]
                    if tbl_head is None:
                        tbl_head = cells
                    else:
                        tbl_rows.append(cells)
                    continue
                mk = ""
                if r[:1] in "✗✓★•①②③④⑤◆●–-":
                    mk, r = r[0], r[1:].strip()
                rows.append(dict(mark=mk, text=r))
            bg, pin, ink = card_tone(label)
            return node("card", label=label, icon=icon, rows=rows,
                        head=tbl_head or [], trows=tbl_rows,
                        bg=bg, pin=pin, ink=ink)

        mb = RE_BANNER.match(head)
        if mb:
            # A BANNER BLOCKQUOTE CAN HAVE MORE THAN ONE PARAGRAPH.
            #
            # This branch read `head` and threw `buf[1:]` away — unlike the
            # `card` branch above it, which consumes those same lines as its
            # rows. Biology chapter 1 closes three of its year banners with a
            # second paragraph naming where an off-year question went:
            #
            #   > ✅ **2022 का पेपर (इस अध्याय से) पूरा; 5 अंक cover।**
            #   >
            #   > *(इसी वर्ष का "…, 2022" टैग वाला एक और प्रश्न — अलैंगिक
            #      जनन+कायिक प्रवर्धन — नीति अनुसार महत्वपूर्ण प्रश्न में है।)*
            #
            # `प्रवर्धन` reached ZERO IR nodes, and step16 caught it as seven
            # words that occur in the markdown and nowhere in the HTML. Kept
            # as `note` and rendered under the strip, because the banner
            # itself is a one-line strip and a 180-character parenthetical
            # set inside it would not be a banner any more.
            _note = " ".join(r.strip() for r in buf[1:] if r.strip()).strip()
            return node("qgroup", label="",
                        banner=(mb.group(1) + " " + mb.group(2)).strip(),
                        note=_note, children=[], _banner_only=True)

        mf = RE_FORMULA_BOX.match(head)
        if mf:
            body = " ".join([mf.group(1)] + buf[1:]).strip()
            tail = ""
            mt = re.search(r'\[(\d+(?:/\d+)?)\]\s*$', body)
            if mt:
                tail, body = mt.group(1), body[:mt.start()].strip()
            return node("formula_box", text=body, colour="blue", tail=tail)

        # A BLANK LINE INSIDE THE QUOTE IS A PARAGRAPH BREAK.
        #
        # Joining every line with a space collapsed the chapter's whole
        # "how to read this" note into ONE paragraph — `… आते हैं। इसे कैसे
        # पढ़ें भाग 1 — … भाग 2 — …` — so a heading and the two parts it
        # introduces ran together in a single sentence on the cover.
        #
        # A line that is ONLY a bold label (`**इसे कैसे पढ़ें**`) also opens
        # one: the chapter writes those with no blank line before the item
        # they head, and run into the sentence above they read as part of it.
        paras, cur = [], []
        for x in buf:
            t = x.strip()
            if not t:
                if cur:
                    paras.append(" ".join(cur)); cur = []
                continue
            # A bold label alone (`**इसे कैसे पढ़ें**`), or a bold label
            # opening a labelled item (`**भाग 1** — पूरे अध्याय की …`), both
            # start their own line in the source and their own paragraph
            # here — `भाग 1` and `भाग 2` are two items, not one sentence.
            if cur and re.match(r'^\*\*[^*]+\*\*\s*(?:[—–-]|$)', t):
                paras.append(" ".join(cur)); cur = []
            cur.append(t)
        if cur:
            paras.append(" ".join(cur))
        return node("refbox", text="\n\n".join(p for p in paras if p).strip())

    def _options(self, first_line):
        """`i) a   ii) b` on one or more lines -> options node."""
        lines = [first_line]
        fam = _line_marker_family(first_line)
        while not self.eof():
            nxt = self.peek()
            if not nxt.strip():
                break
            # Deliberately NOT `_starts_block` here: option lines are now
            # block starts (so a paragraph stops before them), and reusing
            # that test made the collector break on its own siblings — every
            # option became its own block, 56 turning into 129.
            if _looks_like_options(nxt):
                # A DIFFERENT MARKER FAMILY IS A NEW BLOCK, NOT MORE OF THIS
                # ONE.
                #
                # A "match these" MCQ writes its matching pairs `(a)…(d)`
                # immediately followed, no blank line between, by its FOUR
                # combined answer choices `(A)…(D)` — two genuinely separate
                # options blocks, lower-case then upper-case. Nothing above
                # stops the second from being consumed as more of the
                # first: `opt_tokens` on the whole 8-line join picks its
                # family from the very FIRST marker in the text — the
                # matching list's `(a)` — filters the entire block down to
                # lower-case cuts only, and every `(A)`/`(B)`/`(C)`/`(D)`
                # marker, belonging to a family that never became the cut
                # point, was silently absorbed into the trailing text of
                # the LAST `(d)` item: one matching-pair option grew a
                # four-choice answer key glued onto its own end. Breaking
                # here on a family change lets the dispatcher open a fresh
                # `_options()` call on `(A) …`, which then correctly
                # establishes upper-case as ITS OWN block's family.
                nxt_fam = _line_marker_family(nxt)
                if fam and nxt_fam and nxt_fam != fam:
                    break
                lines.append(self.take())
                continue
            if _starts_block(nxt):
                break
            # A BARE `$$` IS NEVER MORE OPTION TEXT.
            #
            # `_starts_block` deliberately does not know about `$$` (see its
            # own definition) because it is shared by every accumulation
            # loop in this file, several of which must keep reading THROUGH
            # a `$$` to find its matching close — breaking there instead
            # left raw `\frac`/`\Rightarrow` on the page across the whole
            # book. This loop is narrower: an option row is one line of
            # MCQ text, so nothing it collects should ever look like a
            # display-maths delimiter. Left unhandled, a long single
            # roman-numeral answer part — `(i) माना कि …$(a,b)…$, तब` —
            # that falls through the "one item, too long to be an MCQ"
            # check a few lines down swallowed the `$$\begin{aligned}
            # …\end{aligned}$$` derivation after it (and everything past
            # that too) into this ONE block's raw text instead of letting
            # the dispatcher read it as its own `formula` node the way
            # every sibling proof in this chapter does.
            if nxt.strip() == "$$":
                break
            # A COMBINATION-ANSWER LEAD-IN IS ITS OWN SENTENCE, NOT ANOTHER
            # STATEMENT.
            #
            # History's "consider these statements" MCQ closes with
            # `इनमें से : (i) केवल (क)  (ii) (क) और (ख)  …` — a line that
            # CITES the statement labels it is choosing between, each still
            # wrapped in the same `(क)` parens the statements themselves
            # use. Absorbed into this same options block (nothing above
            # stops it — it is not blank, not `_starts_block`, and fails
            # `_looks_like_options` only because it leads with prose), its
            # every `(क)`/`(ख)`/`(ग)`/`(घ)` CITATION became an extra
            # devanagari-family split point alongside the four real
            # statements, shattering "(iv) (ग) और (घ)" into fragments no
            # sentence survives. Stopping here keeps it a paragraph of its
            # own instead — readable prose, not a fifth "option".
            if RE_AMONG_LEADIN.match(nxt.strip()):
                break
            lines.append(self.take())
        text = " ".join(x.strip() for x in lines)
        # EVERY SPELLING OF THE TAG, NOT JUST A PLAIN DIGIT.
        #
        # This matched `[2]` and `[1/2]` only, so an option row closing
        # `… पृष्ठ संख्या 79 देखें। $[1\frac{1}{2}]$` kept its tag and the
        # marks printed as a bracketed `[1½]` in the middle of the answer.
        # `_strip_trailing_marks` is the one place that knows them all.
        text = re.sub(r'\[(\d+(?:/\d+)?)\]\s*$', '', text).strip()
        text, opt_marks = _strip_trailing_marks(text)
        # AN IMAGE IN AN OPTION ROW IS STILL A FIGURE.
        #
        # An option row's text is set with `inline`, which has no business
        # knowing about block-level figures — so `(vii) ![चित्र 6.18](
        # source_figures/page_10_image_3.png)`, which is how two of this
        # chapter's IUPAC questions give their seventh structure, printed
        # the markdown itself: brackets, the word चित्र, and the file path,
        # in the middle of the question. `_prose_nodes` has done this for a
        # paragraph's images since the physics chapter needed it; an option
        # row simply never reached it. The plate merges with the `*चित्र
        # 6.18 — …*` caption line the same way a standalone image's does.
        opt_figs = []

        def _lift_fig(m):
            fcap = m.group("alt").strip()
            mnum = re.search(r'(\d+\.\d+)', fcap)
            opt_figs.append(node("figure", mode="ref",
                                 num=mnum.group(1) if mnum else "",
                                 caption=fcap, desc="",
                                 ref=m.group("url").strip()))
            return " "

        text = _ANS_IMG_RE.sub(_lift_fig, text).strip()
        # A PART LABEL WHOSE WHOLE CONTENT WAS THE IMAGE GOES WITH IT.
        #
        # `(vii) ![चित्र 6.18](…)` is the seventh part of an IUPAC question
        # and the image IS its content. Once the plate is lifted out, the
        # bare `(vii)` has nothing left, does not split into an item of its
        # own, and was appended to the part above — the page read
        # `(vi) (CH₃)₂CH 2025 (vii)`, two parts run into one line. The
        # label moves onto the plate, which is where its content went.
        _mlab = re.search(r'\((?:i{1,3}|iv|vi{0,3}|ix|x)\)\s*$', text)
        if _mlab and opt_figs:
            text = text[:_mlab.start()].rstrip()
            _lbl = _mlab.group(0).strip()
            opt_figs[-1]["caption"] = (
                "%s %s" % (_lbl, opt_figs[-1].get("caption", ""))).strip()
        cuts = [m.start() for m in opt_tokens(text)]
        items = []
        if cuts:
            if cuts[0] > 0:                      # stray lead-in text
                items.append(text[:cuts[0]].strip())
            for a, b in zip(cuts, cuts[1:] + [len(text)]):
                seg = text[a:b].strip()
                if seg:
                    items.append(seg)
        if not items:
            items = [text]
        # A NUMBERED ANSWER PART IS NOT AN MCQ OPTION.
        #
        # An organic answer runs `(i) … (ii) … (iii) …`, one part per
        # reaction, and each part is a line of its own. Each became a
        # one-item options block — so a four-part answer was rendered as four
        # separate MCQ grids, with the reaction inline inside each. That is
        # most of what made these answers look broken.
        #
        # An MCQ option is SHORT and there are always several of them. One
        # item, and long, and holding a reaction or a sentence, is an answer
        # part. Emitted as a paragraph, it keeps its `(ii)` and reads as
        # prose, which is what it is.
        if (len(items) == 1
                and (len(items[0]) > 62
                     or re.search(r'[→⟶⇌]|\\xrightarrow|\\longrightarrow',
                                  items[0]))):
            return node("para", text=items[0], marks=opt_marks, _figs=opt_figs)
        longest = max((len(x) for x in items), default=0)
        layout = "stack" if longest > 44 or len(items) > 4 else "grid"
        return node("options", items=items, layout=layout,
                    marks=opt_marks, _figs=opt_figs)

    # ---- main loop -------------------------------------------------------
    def _structure_fence(self):
        """A ```संरचना``` fence -> a `structure` node, or a paragraph.

        An unparseable fence becomes a paragraph of its own text rather than
        being dropped: the agent wrote it, so it is content, and losing it
        silently would hide the mistake. step17 greps for a leaked `chain:`.
        """
        self.take()
        lines = []
        while not self.eof():
            ln = self.take()
            if ln.strip().startswith("```"):
                break
            lines.append(ln.rstrip())
        d = _structure.parse_fence(lines)
        if not d:
            return node("para", text=" ".join(x.strip() for x in lines))
        return node("structure", atoms=d["atoms"], bonds=d["bonds"],
                    branches=d["branches"], numbers=d["numbers"],
                    name=d.get("name", ""), src=d.get("src", ""))

    def _ring_fence(self):
        """A ```रिंग``` fence: a ring compound, drawn by RDKit from a
        SMILES string the agent wrote — see `format/ring.py`."""
        self.take()
        lines = []
        while not self.eof():
            ln = self.take()
            if ln.strip().startswith("```"):
                break
            lines.append(ln.rstrip())
        d = _ring.parse_fence(lines)
        if not d:
            return node("para", text=" ".join(x.strip() for x in lines))
        return node("ring", smiles=d["smiles"], name=d.get("name", ""))

    def _figure_brief(self):
        """A ```चित्र-निर्देश``` fence: instructions for drawing a figure.

        Consumed whole, including its closing fence, and returned as a node
        that renders to nothing. The text is retained because it is the only
        description of the artwork that exists — step11 chooses art from it,
        and a `| ref: path` tail names the source plate when there is one.
        """
        self.take()                                  # the opening fence
        lines = []
        while not self.eof():
            ln = self.take()
            if ln.strip().startswith("```"):
                break
            lines.append(ln.rstrip())
        body = " ".join(x.strip() for x in lines if x.strip())
        ref = ""
        if "| ref:" in body:
            body, ref = body.rsplit("| ref:", 1)
        elif "ref:" in body and body.rstrip().endswith("ref:"):
            body = body.rsplit("ref:", 1)[0]
        return node("figure_brief", text=body.strip().rstrip("|").strip(),
                    ref=ref.strip())

    def run(self):
        while not self.eof():
            ln = self.peek()

            if not ln.strip():
                self.take()
                continue

            # A FENCE DOES NOT HAVE TO OPEN THE LINE EITHER.
            #
            # The same shape as the bracket directives above: four of this
            # chapter's 45 structure fences carry the label that numbers the
            # answer part — `(xi) ```संरचना` and `**उत्तर:** ```संरचना` — so
            # the fence opener was never recognised and its whole body
            # printed as prose: "```संरचना chain: CH3-CH-CH3 down: 2=Br …".
            # The label is real content, so it is kept as its own line and
            # the fence is pushed back to be read on the next pass.
            _fpos = ln.find("```")
            if _fpos > 0 and ln[:_fpos].strip():
                # The prefix goes back as a LINE, not out as a paragraph.
                # Emitting it directly turned `**उत्तर:** ```संरचना` into a
                # paragraph plus a structure and the answer itself was gone —
                # `step02` counted 136 answers against the markdown's 137 and
                # stopped the build. Split into two lines, the answer marker
                # reaches the branch that owns it and the fence reaches its.
                self.take()
                self.L[self.i - 1] = ln[:_fpos].rstrip()
                self.L.insert(self.i, ln[_fpos:])
                self.i -= 1
                continue

            if ln.strip().startswith("```"):
                info = ln.strip().lstrip("`").strip()
                # A NAMED fence is a note to whoever produces the book, and
                # must not be printed in it.
                #
                # Biology writes one per figure — ```चित्र-निर्देश``` holding
                # a description of the diagram an illustrator has to draw,
                # plus a `ref:` for the source plate. Treated as an ordinary
                # container (see below) all eleven of chapter 1's were
                # typeset into the student's page, in the maths face, carrying
                # the words चित्र-निर्देश, NCERT and ref: and leaving 100
                # stray backticks in the text. The brief is kept as metadata
                # so the decorator and asset steps can still use it; it
                # renders to nothing.
                if info.startswith("चित्र"):
                    self.out.append(self._figure_brief())
                    continue
                # A ```संरचना``` FENCE IS A DRAWN STRUCTURE.
                #
                # Written by the formatting agent, not by hand — see
                # `format/structure.parse_fence` and the agent's SKILL. The
                # agent reads the chapter's Hindi description of a branched
                # molecule and writes the branches down explicitly; this
                # renders exactly what it is given and infers nothing, which
                # is the only safe division of labour when getting it wrong
                # means drawing a different compound.
                if info.startswith(_structure.FENCE):
                    self.out.append(self._structure_fence())
                    continue
                # A ```रिंग``` FENCE IS A RING COMPOUND, drawn by RDKit from
                # a SMILES string — see format/ring.py and the note beside
                # the संरचना fence just above; same division of labour.
                if info.startswith(_ring.FENCE):
                    self.out.append(self._ring_fence())
                    continue
                # An UNNAMED fence is a container, not something to skip.
                # Chapter 3 wraps its figure briefs in a bare one, and
                # skipping to the closing fence swallowed eight figures. Drop
                # the marker line and keep parsing what is inside; the bare
                # ``` was only ever a rendering problem, never a content
                # boundary.
                self.take()
                continue

            if RE_HR.match(ln):
                self.take()
                self.out.append(node("rule"))
                continue

            # MULTI-LINE ASCII MATRIX ART.
            #
            # Two or more consecutive lines where each line is one matrix ROW
            # and several matrices sit side by side:
            #
            #     [ 3  −2   1 ] [ 3  −2   1 ]   [ 1   12    8 ]
            #     [ 4   2   1 ] [ 4   2   1 ]   [ 14   6   15 ]
            #
            # About 26 lines of chapter 3. The chapter's own header left them
            # untranslated on the grounds that it is not determined which line
            # belongs to which matrix — true by reading order, false by column
            # position. And leaving them alone is not an option: HTML collapses
            # runs of spaces, so the alignment that makes them readable is gone
            # the moment they reach a page.
            if _PROFILE.get("matrices") and (
                    _matrix_art.is_ascii_row(ln) or _matrix_art.opens_block(ln)):
                first = self.take().rstrip()
                # THE FIRST ROW USUALLY SHARES ITS LINE WITH PROSE.
                #
                # `A² = A·A = [ 1  2  3 ] [ 1  2  3 ] = [ 19  4  8 ]` — the
                # expression and the top row of three matrices, together.
                # Requiring the whole line to be groups matched only rows two
                # and three, so every matrix lost its top row to the prose and
                # the remainder printed as a short grid underneath it. That is
                # what `= [1 2 3] [1 2 3] = [19 4 8]` sitting as text above a
                # 2-row matrix was.
                # `split_around`, not `split_opening`: a derivation line can
                # carry prose on BOTH sides of its matrices —
                # `[ 2 5 ][ a b ] − [ 2 −1 ][ 5 2 ] = O` closes with `= O`.
                # Keeping only the prefix dropped that tail off the page.
                lead, first, tail_prose = _matrix_art.split_around(first)
                rows = [first]
                while not self.eof() and _matrix_art.is_ascii_row(self.peek()):
                    rows.append(self.take().rstrip())
                if len(rows) < 2 and self.out:
                    # A LONE ROW USUALLY BELONGS TO THE PARAGRAPH ABOVE IT.
                    #
                    # A derivation line often ends in prose:
                    #
                    #   AB = [ 2 3 ][ 2 -3 ] = [ 1 0 ] = I।  ← पहला गुणनफल
                    #        [ 1 2 ][ -1 2 ]   [ 0 1 ]
                    #
                    # The first line does not END with a bracket, so it was
                    # not recognised as an opening: its matrices stayed as
                    # literal text and the second line was left as a one-row
                    # block. Those were the loose `[ 1 2 ] [ -1 2 ]` fragments
                    # scattered through the worked examples.
                    #
                    # Reach back for it. The paragraph is still the last
                    # thing emitted, and it is only claimed when it really
                    # does carry matrix rows of the same shape.
                    prev = self.out[-1]
                    if prev.get("kind") == "para":
                        pre, mid, post = _matrix_art.split_around(prev.get("text", ""))
                        if mid and len(_matrix_art.value_groups(mid)) == \
                                len(_matrix_art.value_groups(first)):
                            self.out.pop()
                            if pre:
                                self.out.append(node("para", text=pre))
                            self.out.append(node("matrix_art", rows=[mid, first]))
                            # `post` is the PREVIOUS line's own trailing prose
                            # (almost always empty — an opening line's tail
                            # is what THIS branch exists to catch, and it
                            # rarely also carries one). `tail_prose`, from
                            # the outer `split_around(first)` at the top of
                            # this row, is THIS line's own trailing text —
                            # `= [10+6  -2+7; 15+24  -3+28] = [16 5; 39 25]
                            # ← पंक्ति × स्तम्भ गुणनफल` — and was silently
                            # dropped here: `post` was appended, `tail_prose`
                            # never was, so the annotation after the closing
                            # bracket vanished from the page on every
                            # reach-back merge that had one.
                            if post:
                                self.out.append(node("para", text=post))
                            if tail_prose:
                                self.out.append(node("para", text=tail_prose))
                            continue
                if len(rows) >= 2:
                    if lead:
                        self.out.append(node("para", text=lead))
                    self.out.append(node("matrix_art", rows=rows))
                    if tail_prose:
                        self.out.append(node("para", text=tail_prose))
                else:
                    # Genuinely one row: a single-row matrix, or a bracketed
                    # aside. Hand it to the ordinary prose path.
                    self.out.append(node("para", text=" ".join(
                        x for x in (lead, first, tail_prose) if x).strip()))
                continue

            if RE_TABLE_ROW.match(ln):
                self.out.append(self._table())
                continue

            if RE_BQ.match(ln):
                n = self._blockquote()
                if n is not None:
                    self.out.append(n)
                continue

            m = RE_ANSWER.match(ln)
            if m:
                self.take()
                # ONE paragraph. The reference's `.anstext` is never longer
                # than its opening statement — everything after it is normal
                # `<p class="q">` prose. Running on made 39 of my answers up
                # to 998 characters of solid bold, which is what made Part 2
                # look so different.
                # A heading marker on the answer's own line is MARKUP, not
                # text. This chapter writes `**उत्तर:** ### बायो-सावर्ट नियम
                # का अनुप्रयोग …`, and the hashes printed on the page right
                # after the उत्तर label.
                atxt = re.sub(r'^#{1,6}\s+', '', m.group(1).strip())
                # `**उत्तर:** उत्तर` — the label repeated as its own text,
                # which rendered "उत्तर : उत्तर" on the page. Twice in this
                # chapter. The label is already there; the word adds nothing.
                if re.fullmatch(r'उत्तर\s*[:：]?', atxt):
                    atxt = ""
                # `**उत्तर:** $$\begin{aligned}` — the label and a LATEX
                # ENVIRONMENT'S OPENING LINE together. Only ONE line is ever
                # taken for `atxt` (the `self.take()` above), so an
                # environment opened on the answer's own line was left
                # unclosed here and its rows were picked up separately by
                # `_para_run`, which has no idea they belong to this answer
                # at all — see the `depth` parameter there for the general
                # form of this bug. Continue the SAME collection this line
                # would have gotten had it not carried the `**उत्तर:**`
                # label, starting already inside the environment it opened.
                depth = atxt.count("\\begin{") - atxt.count("\\end{")
                # `**उत्तर:** $$` — THE SAME BUG, SPELLED WITH A DELIMITER.
                #
                # `chapter_mathematics.md` opens almost every worked answer
                # that way: the label and the display block's opening `$$` on
                # one line, the equation on the next, the closing `$$` on the
                # one after. `depth` is 0 for it (there is no `\begin{}`), so
                # the branch above did not fire and `_para_run` started with
                # `in_dollar` False — believing itself OUTSIDE a display block
                # while actually inside one. It then broke the run at the
                # first line that looked like a finished equation, splitting
                # one `$$…$$` pair across several nodes. `split_display` only
                # pairs delimiters WITHIN a single node's text, so it could
                # never rejoin them, and the delimiters plus the raw LaTeX
                # between them printed literally: step15 counted 15
                # `math_delimiter` and 12 `latex_command` defects, all of this
                # shape. `step06_latex_validator` saw nothing because it reads
                # the IR, where the text is intact — it is the BLOCK BOUNDARY
                # that is wrong, not the characters.
                #
                # An odd number of `$$` on the answer's own line means one is
                # still open, exactly as a positive `depth` does.
                open_dollar = (atxt.count("$$") % 2) == 1
                if depth > 0 or open_dollar:
                    cont = self._para_run(depth=depth, in_dollar=open_dollar)
                    if cont:
                        atxt = (_close_open_maths(atxt) + " " + cont).strip()
                # `**उत्तर:** | क्र. | अमीटर | वोल्टमीटर |` — the label and
                # the table's HEADER ROW on one line. Taken as answer text it
                # printed the header as literal pipes, and the table parser
                # then began at the separator row and rendered `|---|---|` AS
                # the header: `-- -` in a yellow cell.
                #
                # The row is put back as a line of its own so the table
                # branch picks it up on the next pass, and the answer keeps
                # the label with no text — which is what it actually has.
                atxt, amarks = _strip_trailing_marks(atxt)
                # `**उत्तर:** [RXN: … | smiles: … ]` — the label and a
                # structure directive on one line. The answer branch runs
                # before the directive branch, so eight of these had their
                # whole bracket printed as answer PROSE — the reader saw
                # `smiles: Cc1ccccc1>>Cc1ccccc1Cl` where the drawing should
                # be. The directive is pushed back as a line of its own so
                # the branch that knows how to draw it picks it up next
                # pass, and the answer keeps whatever text came before it.
                _mdir_a = _RING_DIRECTIVE_RE.search(atxt)
                if _mdir_a:
                    self.out.append(node("answer",
                                         text=atxt[:_mdir_a.start()].strip(),
                                         marks=amarks))
                    self.L[self.i - 1] = atxt[_mdir_a.start():]
                    self.i -= 1
                    continue
                if RE_TABLE_ROW.match(atxt):
                    self.out.append(node("answer", text=""))
                    self.L[self.i - 1] = atxt
                    self.i -= 1
                    continue
                # AN ANSWER CAN *BE* A STRUCTURE.
                #
                # "इसकी संरचना बनाइए" is answered with a drawing, and the
                # chapter writes that as `**उत्तर:** ![चित्र 6.40](…png)` —
                # the label and the image on one line. `RE_ANSWER` matches
                # first, so the image never reached the figure branch and
                # eight benzene rings printed as the literal markdown string
                # `![चित्र 6.40](source_figures/page_14_image_8.png)` in the
                # middle of an answer.
                #
                # Split here rather than by reordering the two checks: the
                # answer badge is still wanted, and an answer may hold a
                # sentence AND a structure.
                figs = list(_ANS_IMG_RE.finditer(atxt or ""))
                if figs:
                    lead = atxt[:figs[0].start()].strip()
                    self.out.append(node("answer", text=lead, marks=amarks))
                    for fm in figs:
                        fcap = fm.group("alt").strip()
                        fnum = re.search(r'(\d+\.\d+)', fcap)
                        self.out.append(node(
                            "figure", mode="ref",
                            num=fnum.group(1) if fnum else "",
                            caption=fcap, desc="",
                            ref=re.sub(r'\s+["\u201c].*$', '',
                                       fm.group("url").strip())))
                    tail = atxt[figs[-1].end():].strip()
                    self.out.extend(_prose_nodes(tail))
                    continue
                # Same split for the bracket form — see `_ANS_FIG_RE`.
                bfigs = list(_ANS_FIG_RE.finditer(atxt or ""))
                if bfigs:
                    lead = atxt[:bfigs[0].start()].strip()
                    self.out.append(node("answer", text=lead, marks=amarks))
                    for fm in bfigs:
                        fnum = (fm.group("num") or "").strip()
                        self.out.append(node(
                            "figure", mode="spec", num=fnum,
                            caption=("चित्र %s" % fnum) if fnum else "",
                            desc=(fm.group("desc") or "").strip(), ref=""))
                    tail = atxt[bfigs[-1].end():].strip()
                    self.out.extend(_prose_nodes(tail))
                    continue
                # A ONE-LINE SOURCE ANSWER CAN STILL HOLD SEVERAL STEPS.
                #
                # The comment above promises `.anstext` is never longer than
                # its opening statement, everything after is separate prose
                # — true when the SOURCE puts each step on its own physical
                # line. This chapter instead writes the entire worked
                # answer, every step and every lettered part, on the SAME
                # line as `**उत्तर:**` — "आवेश-परत के कारण क्षेत्र E=σ/2ε₀।
                # (a),(b) प्लेटों के बाह्य बिन्दुओं पर E=E₁-E₂=…=0। (c)
                # प्लेटों के मध्य E=…=1.92×10⁻¹⁰ N/C" as ONE `atxt`, all of
                # it landing in one `.anstext` box with nothing to tell a
                # reader where one part's working ends and the next begins.
                # `_answer.split_steps` already exists for exactly this —
                # `_emit_prose` uses it for ordinary paragraphs — it was
                # simply never applied here, on the one line every worked
                # answer in the corpus actually starts from.
                #
                # A SIMPLE ANSWER STAYS SIMPLE: split only fires when there
                # is a second step or a part label to split on, so a
                # one-line answer with no such boundary is untouched — the
                # single `answer` node it always was.
                if _answer.has_step(atxt) or _answer.has_part_label(atxt):
                    pieces = _answer.split_steps(atxt)
                    first_kind, first_line = pieces[0]
                    self.out.append(node(
                        "answer", text=first_line, marks=amarks))
                    for kind, line in pieces[1:]:
                        if kind == "step":
                            self.out.append(node(
                                "formula", text=line, display=True))
                        elif line:
                            self.out.append(node("para", text=line))
                    continue
                self.out.append(node("answer", text=atxt, marks=amarks))
                # A HEADING right after the answer label belongs ON that
                # line, the way the reference sets `उत्तर: बायो-सेवर्ट का
                # नियम`. Left as a block of its own it pushed the name onto
                # the next line and left the label sitting alone.
                nxt = self.peek() if self.i < len(self.L) else ""
                if not atxt and nxt:
                    mh3 = RE_H3.match(nxt.strip()) or RE_H4.match(nxt.strip())
                    if mh3 and mh3.group(1).strip():
                        self.take()
                        self.out[-1]["title"] = mh3.group(1).strip()
                continue

            m = RE_GIVEN.match(ln)
            if m:
                self.take()
                self.out.append(node("given", text=m.group(1).strip()))
                continue

            m = RE_MARKER.match(ln)
            if m:
                self.take()
                icon = (m.group("icon") + (m.group("icon2") or "")).strip()
                label = m.group("label").strip()
                rest = m.group("rest").strip()
                # EVERY marker is one line. The reference proves it: a
                # `मत भूलो` callout carries one sentence and the line under it
                # is a separate <p class="para">. Running on made my callouts
                # swallow that follow-up, so the box grew and the paragraph
                # that should sit beneath it disappeared into the box.
                if False:
                    pass
                self.out.append(_marker_node(icon, label, rest))
                continue

            # The same line without its bold label. `_marker_node` takes the
            # type from the ICON when there is one, so an empty label lands in
            # the right family (⚠️ -> `trap`) rather than the `line` floor.
            m = RE_BARE_CALLOUT.match(ln)
            if m:
                self.take()
                self.out.append(_marker_node(m.group("icon"), "",
                                             m.group("rest").strip()))
                continue

            m = RE_DEFN.match(ln)
            if m and not RE_QHEAD.match(ln):
                self.take()
                if "त्रिक" in m.group(1):
                    # a compact unit/dimension/quantity strip, not a definition
                    rest = m.group(2).strip()
                    cont = self._para_run(cont=True)
                    self.out.append(node("trio", text=(m.group(1) + ": " + rest
                                                       + (" " + cont if cont else "")).strip()))
                    continue
                rest = m.group(2).strip()
                cont = self._para_run(cont=True)
                if cont:
                    rest = (_close_open_maths(rest) + " " + cont).strip()
                term = m.group(1).strip()
                # A PROCESS CHAIN, not a definition.
                #
                # Biology's recurring rubric puts the stages of a process on a
                # `**क्रम:**` line and a relation on a `**संबंध:**` one, both
                # as a backtick run joined by arrows. Rendered as a definition
                # the backtick run went down the maths path, so Hindi nouns
                # naming tissues came out in an italic Georgia maths face —
                # fourteen of the first biology build's twenty-nine
                # inline-maths runs were prose of exactly this kind.
                #
                # Gated on the SUBJECT PROFILE. Physics writes `v = u + at` in
                # backticks and means an equation, so this must not fire
                # there; its profile says backticks are maths. See
                # book/subjects.
                # A LIST OF STANDARD RESULTS BECOMES A सूत्र PANEL.
                #
                # `**सूत्र:** $A + B = B + A$ · $(A+B)+C = A+(B+C)$ · …` —
                # eleven separate results on one line, joined by ` · `. As a
                # definition they printed as a five-line run-together
                # paragraph that no reader can pick a formula out of. One row
                # per result is what the panel is for, and the panel splits,
                # so a long list can break across a column instead of
                # cramming into one.
                if _PROFILE.get("rubric", {}).get(term) == "formula_card":
                    # A THIRD SPELLING OF THE सूत्र PANEL.
                    #
                    # Physics chapter 4 and maths write every formula on the
                    # label's own line, ` · ` separated. Physics chapter 1
                    # puts the label ALONE and the formulae in a bullet list
                    # under it:
                    #
                    #     **सूत्र:**
                    #     - $E = (1/4πε₀)·2p/r³$ · अक्षीय स्थिति पर क्षेत्र
                    #     - $E = (1/4πε₀)·p/r³$ · निरक्षीय स्थिति पर क्षेत्र
                    #
                    # With nothing after the colon there was nothing to split
                    # into rows, so no panel was built at all: the label
                    # printed as an empty definition and the formulae fell
                    # through to a plain bullet list. On the page that is a
                    # section headed सूत्र with no सूत्र box under it.
                    #
                    # A BLANK LINE MAY SEPARATE THE LABEL FROM ITS LIST.
                    #
                    # This maths chapter writes `**सूत्र:**` as its own
                    # paragraph, a blank line, THEN the bullets — the normal
                    # markdown shape for "a heading, then a list under it".
                    # `self.peek()` was the blank line, never a bullet, so
                    # the `while` below never started and this fell through
                    # to the exact same empty-box bug the comment above
                    # describes, one line-shape further. Only skipped when a
                    # bullet genuinely follows — a blank line before ordinary
                    # prose must stay a blank line.
                    rows, _notes, bl = [], [], []
                    if not rest:
                        k = 0
                        while self.i + k < len(self.L) and not self.peek(k).strip():
                            k += 1
                        if k and self.i + k < len(self.L) and RE_BULLET.match(self.peek(k)):
                            for _ in range(k):
                                self.take()
                        while not self.eof() and RE_BULLET.match(self.peek()):
                            bl.append(RE_BULLET.match(self.take()).group(1).strip())
                        # ONE BULLET, ONE ROW — see `_bullet_rows`.
                        rows, _notes = _bullet_rows(bl)
                    if not rows:
                        rows = _result_rows(rest)
                    if not rows and bl:
                        # EVERY BULLET UNDER THIS LABEL WAS A REMARK, NOT A
                        # RESULT — there is no panel to build.
                        #
                        # Physics chapter 1 writes `- अक्षीय स्थिति: $E=..$ —
                        # **शर्त:** ...`: the label sits BEFORE the formula,
                        # so `_is_result` (correctly — it opens with 6+
                        # Devanagari characters, a sentence, not a bare
                        # result) sent all three bullets to `_notes` and
                        # `rows` came back empty. The `while` loop above had
                        # already consumed them from the input with
                        # `self.take()` on the assumption a panel would
                        # follow; with no panel, `_notes` was only ever
                        # emitted BELOW one (see the `for nt in _notes`
                        # below), so nothing printed them at all — a whole
                        # `**सूत्र:**` bullet list vanished with no trace.
                        # Put the label and its bullets back as ordinary
                        # content instead of discarding what was read.
                        self.out.append(node("definition", term=term, text=rest))
                        self.out.append(node("bullets", items=bl))
                        continue
                    if rows:
                        # A REACTION IS NOT A FORMULA.
                        #
                        # Chemistry writes its reactions on a `**सूत्र:**`
                        # line — `R—OH + HX/निर्जल ZnCl₂ → R—X + H₂O` and
                        # three more like it. The panel is the right
                        # component (a list of boxed results, and it splits),
                        # but the heading was not: a panel of four reactions
                        # titled सूत्र tells a student they are formulae to
                        # memorise rather than equations to complete.
                        #
                        # Retitled from the CONTENT, not from the label.
                        ttl = (_panel_title(term, rows)
                               if _PROFILE.get("reactions") else term)
                        self.out.append(node("formula_card", title=ttl,
                                             rows=rows))
                        # The remarks that are not results, under the panel.
                        for nt in (_notes if not rest else []):
                            self.out.append(node("para", text=nt))
                        continue
                if (_PROFILE.get("backticks") == "sequence"
                        and _PROFILE.get("rubric", {}).get(term) == "flow"
                        and _flow_chain(rest)):
                    # ONLY THE BACKTICKED SPAN IS THE CHAIN.
                    #
                    # Whatever `_para_run` glued on after it is not. An icon
                    # line directly beneath a lead-in is absorbed, because
                    # RE_ICON_LINE only breaks a run that has already started
                    # — so one chain came out with its closing backtick and a
                    # whole ⚠️ trap inside its last stage. Taking the span and
                    # re-emitting the remainder is robust whatever follows,
                    # rather than relying on the run having stopped in the
                    # right place.
                    chain, tail = _split_chain_text(rest)
                    self.out.append(node("flow", text=chain, title=term))
                    if tail:
                        self.out.append(node("para", text=tail))
                    continue
                # A सूत्र DEFINITION HOLDING A REACTION IS AN अभिक्रिया.
                #
                # The panel branch above only fires when the line carries
                # SEVERAL results separated by ` · `. A `**सूत्र:**` line with
                # ONE reaction on it fell through to here and became a
                # definition whose term is "सूत्र" — so a single equation was
                # labelled "formula", which is what it is not.
                if (_PROFILE.get("reactions")
                        and _PROFILE.get("rubric", {}).get(term)
                        == "formula_card"
                        and re.search(r'[→⟶⇌⟷]|\\xrightarrow'
                                      r'|\\longrightarrow', rest)):
                    term = "अभिक्रिया"
                # A "PLAIN" RUBRIC LABEL IS ONE SENTENCE, NOT A CARD.
                #
                # `**सीमा:** …` and `**नमूना:** …` print in the reference as
                # an ordinary `<p class="para"><b>सीमा:</b> …</p>` — ONE
                # inline-bold sentence, no wrapper div, no border. Handed to
                # `definition()` instead (the fallback below, for every OTHER
                # `**Label:**` line) they came out as its two stacked
                # `.deflead`/`.def` divs, the term on its own line — a shape
                # the reference reserves for a real glossary definition, not
                # a one-line aside about a formula's limits or a sample
                # question prompt.
                if _PROFILE.get("rubric", {}).get(term) == "plain":
                    self.out.append(node("para", text="**%s:** %s" % (term, rest)))
                    continue
                self.out.append(node("definition", term=term, text=rest))
                continue

            if RE_BULLET.match(ln):
                items = []
                while not self.eof() and RE_BULLET.match(self.peek()):
                    items.append(RE_BULLET.match(self.take()).group(1).strip())
                self.out.append(node("bullets", items=items))
                continue

            if RE_NUMBERED.match(ln):
                items = []
                while not self.eof() and RE_NUMBERED.match(self.peek()):
                    items.append(RE_NUMBERED.match(self.take()).group(2).strip())
                self.out.append(node("numbered", items=items))
                continue

            m = RE_FIG_MATHPIX_STRAY.match(ln.strip())
            if m:
                self.take()
                num, trailing = m.group(1), m.group(2).strip()
                self.out.append(node("figure", mode="spec", num=num,
                                     caption="", desc=trailing, ref=None))
                continue

            m = RE_FIG_MD.match(ln.strip())
            if m:
                self.take()
                cap = m.group("alt").strip()
                # TWO SPELLINGS OF ONE IMAGE, AND A PATH THAT IS NOT A PATH.
                #
                # Chapters 4 and 6 of chemistry write the short form the other
                # subjects use — `![चित्र 6.1](source_figures/x.png)`. Chapter 1
                # writes a markdown TITLE after the path and puts the whole
                # figure description in the alt text:
                #
                #   ![चित्र 1.1 — प्रतिलोम परासरण; आयताकार पात्र बीच से «अर्द्ध…
                #    …»](figures/chitra_1_1.png "चित्र 1.1")
                #
                # Unsplit, the ref became `figures/chitra_1_1.png "चित्र 1.1"`
                # — a path with a quoted title in it, which resolves to
                # nothing, so all three of that chapter's figures were broken
                # images. And the caption became the 200-character
                # description, which is a paragraph set as a caption under an
                # empty plate.
                #
                # Ninth time a construct has arrived in two spellings with
                # code that knew one. The split is done here, once.
                ref = m.group("url").strip()
                title = ""
                mt = re.match(r'^(\S+)\s+["\u201c](.*?)["\u201d]\s*$', ref)
                if mt:
                    ref, title = mt.group(1), mt.group(2).strip()
                desc = (m.group("rest") or "").strip() or self._para_run(cont=True)
                # A caption is a LABEL; anything this long is the description.
                if len(cap) > 60:
                    desc = (cap + (" " + desc if desc else "")).strip()
                    cap = title or (re.match(r'^(चित्र\s*[\d.]+)', cap) or [""])[0]
                num = ""
                mn = re.search(r'(\d+\.\d+)', cap or title or desc)
                if mn:
                    num = mn.group(1)
                pre = (m.groupdict().get("pre") or "").strip()
                pre = re.sub(r'\*\*([^*]*)\*\*', r'\1', pre).strip()
                # `(ii) चित्र 6.5` — the enumerator, then the number. The
                # renderer prints the number itself as well, so the label came
                # out `चित्र 6.5; (ii) चित्र 6.5`. Only the enumerator is
                # new information; the rest is already on the card.
                if pre and cap.startswith("चित्र"):
                    cap = pre + " " + cap
                    pre = ""
                self.out.append(node("figure", mode="ref", num=num,
                                     caption=((pre + " " + (cap or title)).strip()
                                              if pre else (cap or title)),
                                     desc=desc, ref=ref))
                continue

            # A QUESTION STEM CAN OPEN WITH ITS FIGURE.
            #
            # `**[चित्र: परिपक्व भ्रूणकोष, …] उपरोक्त … क्या दर्शाता है?**`
            # is one bold line holding a figure AND the question that reads
            # off it. The bracket sits INSIDE the `**`, so neither the
            # standalone figure branches below nor `_ANS_FIG_RE` saw it, and
            # the whole brief printed as bold prose ahead of the question.
            # Split here: the plate first, then the stem that refers to it.
            ms = RE_FIG_STEM.match(ln.strip())
            if ms:
                self.take()
                num = (ms.group("num") or "").strip()
                self.out.append(node("figure", mode="spec", num=num,
                                     caption=("चित्र %s" % num) if num else "",
                                     desc=(ms.group("desc") or "").strip(),
                                     ref=""))
                rest = (ms.group("rest") or "").strip()
                if rest:
                    # Put the stem back with its bold markers restored, so
                    # the normal question path reads it as it always would.
                    self.L[self.i - 1] = "**%s**" % rest.rstrip("*").strip()
                    self.i -= 1
                continue

            m = RE_FIG_NUMDESC.match(ln.strip())
            if m:
                self.take()
                num, brief = m.group(1).strip(), m.group(2).strip()
                # Numbered, so it HAS a caption of its own — `चित्र 1.1` —
                # and the plate prints it. The rest is the brief, which is
                # what step11 reads to commission the art.
                self.out.append(node("figure", mode="spec", num=num,
                                     caption="चित्र %s" % num,
                                     desc=brief, ref=""))
                continue

            m = RE_FIG_DESC.match(ln.strip())
            if m:
                self.take()
                brief = m.group(1).strip()
                # The brackets hold the BRIEF, so there is no caption of its
                # own; the figure gets a reserved plate and the brief as its
                # description, exactly like `[चित्र बनाना है]`.
                mn = re.search(r'(\d+\.\d+)', brief)
                self.out.append(node("figure", mode="spec",
                                     num=mn.group(1) if mn else "",
                                     caption="", desc=brief, ref=""))
                continue

            if RE_FIG_ENV_OPEN.match(ln):
                buf = [self.take()]
                while not self.eof() and not RE_FIG_ENV_CLOSE.search(buf[-1]):
                    buf.append(self.take())
                whole = " ".join(x.strip() for x in buf)
                mc = RE_FIG_ENV_CAPTION.search(whole)
                cap = (mc.group(1).strip() if mc else "")
                mn = re.search(r'(\d+\.\d+)', cap)
                self.out.append(node("figure", mode="spec",
                                     num=(mn.group(1) if mn else ""),
                                     caption=cap, desc="", ref=None))
                continue

            m = RE_FIG_CAPTION.match(ln.strip())
            if m:
                self.take()
                num, cap = m.group(1), m.group(2).strip()
                # AN ITALIC CAPTION UNDER A REAL IMAGE IS THAT IMAGE'S
                # CAPTION, NOT A SECOND FIGURE.
                #
                # Two sources spell the same construct differently.
                # `chapter_mathematics.md` has no scan, so the italic line is
                # all there is and it must BECOME the figure:
                #
                #     *चित्र 1.1 · 156 का गुणनखंड वृक्ष*
                #     > 🖼️ यह चित्र अभी बना नहीं है। …
                #
                # `physics_chap2.md` has the scan AND describes it:
                #
                #     ![चित्र 2.1](source_figures/page_06_image_1.png)
                #     *चित्र 2.1 — एक क्षैतिज सीधी रेखा …*
                #
                # Reading the second shape the same way created a plate for
                # every real image — step02 counted 36 figures in the
                # markdown and 72 in the IR, an exact doubling, and every
                # scan would have printed beside an empty box claiming to be
                # the same figure.
                #
                # The preceding block settles it: if a figure was just
                # emitted, this line is its description. Nothing else can
                # produce that adjacency, because `RE_FIG_MD` consumes the
                # image line immediately before.
                #
                # KEEP THE RICHER OF THE TWO DESCRIPTIONS. The alt text and
                # the italic line describe the same figure, and the italic
                # one is routinely the fuller: चित्र 2.22 carried 63
                # characters of alt text against 841 in the italic line.
                # Assigning only when `desc` was EMPTY meant a figure that
                # already had alt text dropped the italic line on the floor
                # — step16 caught it as 13 words that occur in the markdown
                # and nowhere in the HTML.
                if self.out and self.out[-1].get("kind") == "figure":
                    prev = self.out[-1]
                    # THE ITALIC LINE CARRIES THE NUMBER TOO, AND A FIGURE
                    # WHOSE OWN ALT TEXT HAD NO `चित्र N` PREFIX HAS NONE YET.
                    #
                    # Biology chapter 1 writes 30-odd figures as
                    # `![long unnumbered description](url)` followed by
                    # `*चित्र 1.1 — short caption*` — the number lives only
                    # in the italic line. Without this, `prev["num"]` stayed
                    # empty, `components.figure` fell back to `caption` for
                    # its label, and — see below — that label ended up being
                    # the SAME sentence `cap_text` was about to carry,
                    # printing every one of those figures as
                    # "short caption — short caption" with no चित्र number
                    # at all, on data-figure="".
                    if not (prev.get("num") or "").strip():
                        prev["num"] = num
                    if len(cap) > len((prev.get("desc") or "").strip()):
                        prev["desc"] = cap
                    # ONE SENTENCE OF IT IS PRINTED, INSIDE THE CARD.
                    #
                    # Everything above files the italic line under `desc`,
                    # which only reaches `data-desc` — an attribute nobody
                    # reads off the page. So a figure printed as a header
                    # and an empty plate with nothing saying what it shows,
                    # while the sentence that says so sat in an invisible
                    # attribute (or, in older builds, in a second block of
                    # italic text under the box). Subjects that opt in with
                    # `caption_in_card` get the first sentence set as the
                    # card's own `<figcaption>`; the rest stays in `desc`.
                    #
                    # NEVER BOTH. `caption` is what supplies figure()'s own
                    # label when there is no number (see its "cap and num"
                    # merge) — setting it to the SAME sentence `cap_text`
                    # gets is what produced the doubled caption above; a
                    # `caption_in_card` subject prints through `cap_text`
                    # only, exactly like every figure that already had its
                    # number.
                    if _PROFILE.get("caption_in_card") and cap.strip():
                        prev["cap_text"] = first_sentence(
                            cap, _caption_limit())
                    elif not (prev.get("caption") or "").strip():
                        prev["caption"] = cap
                    continue
                # Every following `> 🖼️ …` line is the brief. Kept OUT of the
                # rendered text — `desc` is what step11 reads to commission
                # art, and `components/figure.py` puts it in `data-desc`.
                brief = []
                while not self.eof():
                    mb = RE_FIG_BRIEF.match(self.peek().strip())
                    if not mb:
                        break
                    brief.append(mb.group(1).strip())
                    self.take()
                self.out.append(node("figure", mode="spec", num=num,
                                     caption=cap, desc=" ".join(brief).strip(),
                                     ref=None))
                continue

            m = RE_FIG_TODO.match(ln.strip())
            if m:
                self.take()
                cap = m.group(1).strip()
                num = ""
                mn = re.search(r'(\d+\.\d+)', cap)
                if mn:
                    num = mn.group(1)
                # the brief is whatever prose follows, up to the next block
                desc = self._para_run(cont=True)
                self.out.append(node("figure", mode="spec", num=num, caption=cap,
                                     desc=desc, ref=None))
                continue

            if ln.lstrip().startswith("[FIGURE:") or ln.lstrip().startswith("[IMAGE:"):
                buf = [self.take()]
                while not self.eof() and "]" not in buf[-1]:
                    buf.append(self.take())
                whole = " ".join(x.strip() for x in buf)
                mm = re.match(r'^\[(FIGURE|IMAGE)\s*:\s*(.*?)\]\s*$', whole, re.S)
                body = mm.group(2) if mm else whole
                kindtag = mm.group(1) if mm else "IMAGE"
                f = parse_figure(body)
                self.out.append(node("figure", mode=("ref" if kindtag == "FIGURE" else "spec"),
                                     **f))
                continue

            # `[RXN: …]` / `[STRUCT: …]` — a supplied figure the agent
            # replaced with real chemistry instead of a `![चित्र N](path)`
            # reference, because RDKit can draw exactly what the figure
            # showed from a SMILES string. See `format/ring.py`.
            # A DIRECTIVE DOES NOT HAVE TO OPEN THE LINE.
            #
            # Matched only at the start, 23 of the organic chapter's 52
            # directives were missed — every one that carries the part label
            # the answer numbers it with:
            #
            #     (ii) [RXN: चित्र 6.5 — … | smiles: … | ऊपर: Cu₂Cl₂]
            #     उत्तर : [RXN: चित्र 6.79 — … | smiles: Ic1ccccc1.…]
            #
            # so the whole bracket printed as prose and the reader saw the
            # SMILES string instead of the structure it describes. The label
            # in front is real content, so it is kept as its own short
            # paragraph and the directive is parsed from where it starts.
            _mdir = _RING_DIRECTIVE_RE.search(ln)
            if _mdir:
                self.take()
                _pre = ln[:_mdir.start()].strip()
                d = _ring.parse_bracket(ln[_mdir.start():])
                if not d:
                    self.out.append(node("para", text=ln.strip()))
                    continue
                if _pre:
                    self.out.append(node("para", text=_pre))
                if d["kind"] == "RXN" and d.get("smiles"):
                    # `desc` is the art-direction brief that used to trail
                    # the closing bracket — see `ring.parse_bracket`. It
                    # rides along as a `data-desc`, the way a figure's brief
                    # does: kept in the HTML for the coverage check, never
                    # printed as a label.
                    self.out.append(node("rxn_smiles", smiles=d["smiles"],
                                         above=d.get("ऊपर", ""),
                                         below=d.get("नीचे", ""),
                                         caption=d.get("caption", ""),
                                         desc=d.get("tail", "")))
                elif d.get("smiles"):
                    # The caption names the compound AND carries the figure
                    # number the question refers to. Dropped here, `चित्र
                    # 6.19 — 2-क्लोरो-6-नाइट्रोफीनॉल` never reached the page
                    # and step16 counted `नाइट्रोफीनॉल` as vanished — the
                    # only word of the five it reported that really was.
                    self.out.append(node("ring", smiles=d["smiles"],
                                         name=d.get("सूत्र", ""),
                                         caption=d.get("caption", ""),
                                         desc=d.get("tail", "")))
                continue

            if _looks_like_options(ln):
                _opt = self._options(self.take())
                # The plates follow the block that carried them, so the
                # figure sits under the question it belongs to.
                _ofigs = _opt.pop("_figs", None) or []
                self.out.append(_opt)
                self.out.extend(_ofigs)
                continue

            # A line that is ONLY `[2]` is a marks tag, not a paragraph. Kept
            # as prose it rendered as `<p class="q">[2]</p>` — a whole
            # paragraph holding two characters. It belongs to the step above
            # it, which is where `C.qmarks` was always meant to put it.
            # `[2]` closing a SENTENCE, not on a line of its own — the
            # commonest form: "…निर्भर नहीं करता है। [2]". `RE_MARKS_ONLY`
            # only caught the standalone line, so these stayed as body text
            # and the marks chip they were meant to be never appeared.
            # CHECKED BEFORE THE MARKS BRANCHES.
            #
            # `$+\ \mathrm{HCl}$ **[1 अंक]**` ends with a marks tag, so
            # `RE_MARKS_TRAILING` below matched it first and emitted the
            # by-product as an ordinary paragraph — which is why `+ HCl`
            # still printed on a line of its own under the benzene ring
            # it belongs to. The continuation is the more specific shape
            # and takes the line; it lifts the marks tag itself.
            mc = RE_EQ_CONTINUES.match(ln)
            if mc and self.out and self.out[-1].get("kind") in _DRAWN_KINDS:
                self.take()
                prev = self.out[-1]
                prev["tail_eq"] = ("+ " + mc.group("rest")).strip()
                if mc.group("marks"):
                    # The group is the BARE tag, and `strip_trailing_marks`
                    # wants text in front of one, so it never matched.
                    _mv = RE_MARKS_ONLY.match(mc.group("marks").strip())
                    if _mv:
                        prev["marks"] = _mv.group(1)
                continue

            # A VARIANT LINE IS NOT A MARKS LINE, however it ends.
            #
            # `_MARKS_VALUE` accepts an unbounded `\d+` before `अंक`, so
            # `*अथवा* … **[2024 अंक]**` matched HERE first — this branch
            # emitted the text as plain prose and the `अथवा` branch 60 lines
            # below never saw the line. That is why 25 of chapter 6's 42
            # variants printed as an italic `अथवा` glued to the front of a
            # sentence instead of as a separator carrying its own year.
            mt = RE_MARKS_TRAILING.match(ln)
            if mt and not _starts_athava(ln):
                self.take()
                body = mt.group(1).rstrip()
                if body:
                    self._emit_prose(body)
                if self.out:
                    self.out[-1]["marks"] = mt.group(2)
                continue

            mm = RE_MARKS_ONLY.match(ln)
            if mm:
                # Consumed whether or not there is a block to attach it to.
                # `_starts_block` now breaks a paragraph run on this line, so
                # a marks tag with nothing above it — the first line of a
                # section — must still advance the scanner or the run would
                # break forever on a line no branch takes.
                self.take()
                if not self.out:
                    continue
                # Only the LaTeX spellings are normalised. The other
                # spellings this pattern has always matched reach the page
                # verbatim today — `½ अंक` keeps its space and its word —
                # and `marks_value` would collapse both.
                _mv = mm.group(1)
                self.out[-1]["marks"] = (
                    _inline.marks_value(_mv) if "\\" in _mv else _mv)
                continue

            # A lone `*` is decoration this chapter leaves around its `अथवा`
            # markers. Kept, it became a paragraph containing one asterisk.
            if RE_STRAY_STAR.match(ln):
                self.take()
                continue

            # `#### …` in the body. Only the blockquote form was recognised,
            # so a bare one printed its own hashes as body text. Set as a bold
            # lead-in rather than a new IR kind: it is a heading INSIDE an
            # answer, not a section container, and every kind added here has
            # to be carried by the tagger, namer, assignment and CSS too.
            # A `###` that reaches the SCANNER has no part-builder above it to
            # turn it into a section — a trailing `### 🪞 आईना` after the last
            # question of a group is the case. It was consumed and emitted
            # nothing, so its title vanished from the book.
            m3 = RE_H3.match(ln)
            if m3:
                self.take()
                t3 = m3.group(1).strip()
                if t3:
                    # A named part of a long answer, not a bold sentence.
                    # See `subhead` in render_block: a 38-block answer needs
                    # something that divides it, and this heading is the
                    # division the author already wrote.
                    self.out.append(node("para", text=t3, subhead=True))
                continue

            mh = RE_H4.match(ln)
            if mh:
                self.take()
                title = mh.group(1).strip()
                if title:
                    self.out.append(node("para", text=title, subhead=True))
                continue

            m = RE_ATHAVA.match(ln)
            if m and _starts_athava(ln):
                self.take()
                rest = m.group(1).strip()
                # The tail tag comes off the TEXT either way; whether it
                # becomes the variant's year is decided after the loop
                # below, which reads the same fact from its own line and
                # is the spelling that was already supported.
                tail_years, tail_marks = "", ""
                mty = RE_ATHAVA_YEAR_TAIL.match(rest)
                if mty:
                    rest, tail_years = mty.group(1).rstrip(), mty.group(2)
                    # `(.*\S)` is greedy and the wrapper it hands the tag
                    # to may match empty, so a `**` opened before the tag
                    # is left on the text — `… लिखिए। **`, printed as two
                    # literal asterisks. Removed only when it is UNPAIRED;
                    # a real `**bold**` ending keeps both of its markers.
                    if rest.endswith("*") and rest.count("**") % 2:
                        rest = rest.rstrip("*").rstrip()
                else:
                    rest, tail_marks = _strip_trailing_marks(rest)
                mtl = RE_ATHAVA_YEAR_LEAD.match(rest)
                if mtl:
                    tail_years, rest = mtl.group(1).strip(), mtl.group(2).strip()
                # `* *(2026)*` on the next line names the year the variant was
                # set. It parsed as an EMPTY bullet list, so the year was
                # dropped without a word. It belongs to the variant.
                years = ""
                # Bounded by the real end of input: peek() returns "" past it,
                # which the blank-line arm below would have consumed forever
                # (and take() would have raised on) for a file ending here.
                while self.i < len(self.L):
                    nxt = self.peek()
                    if RE_STRAY_STAR.match(nxt):
                        self.take()
                        continue
                    my = RE_VARIANT_YEAR.match(nxt)
                    if my:
                        years = my.group(1).strip()
                        self.take()
                        continue
                    if not nxt.strip():
                        self.take()
                        continue
                    break
                cont = self._para_run(cont=True)
                # A variant may carry its whole enumerated run on the same
                # line. Only the LEAD-IN belongs to the separator; each
                # part is its own block, which is what the paragraph path
                # does with the identical run — so the parts go back as
                # lines and take that path rather than being flattened
                # into the separator's text.
                _all = (_close_open_maths(rest) + " " + cont).strip()
                _segs = _split_enumerated_run(_all)
                if len(_segs) > 1:
                    rest, cont = _segs[0], ""
                    self.L[self.i:self.i] = _segs[1:]
                nd = node("athava", label="अथवा",
                          text=(_close_open_maths(rest) + " " + cont).strip(),
                          years=(years or tail_years))
                if tail_marks:
                    nd["marks"] = tail_marks
                self.out.append(nd)
                continue

            txt = self._para_run()
            # `… से, [1]` closing a paragraph that ran over several source
            # lines. `RE_MARKS_TRAILING` is checked per LINE in this loop, so
            # it only ever saw the FIRST line of a run — `_para_run` consumed
            # the rest without re-checking, and the tag printed as text.
            run_marks = ""
            if txt:
                mrt = re.match(
                    r'^(.*\S)\s+(?:-{3,}\s*)?\**\s*\[(' + _MARKS_VALUE
                    + r')\]\**$', txt)
                if mrt:
                    txt, run_marks = mrt.group(1).rstrip(), mrt.group(2)
                else:
                    # THE TAG MAY BE WRAPPED IN `$…$`.
                    #
                    # Fourteen of this chapter's tags are written
                    # `… देखें। $[1\frac{1}{2}]$` — inside maths delimiters
                    # and NOT alone on their line, so the pattern above (no
                    # wrapper) and `RE_MARKS_ONLY` (whole line only) both
                    # missed them and the marks printed mid-answer as a
                    # bracketed `[1½]`. `inline.strip_trailing_marks` is the
                    # one place that knows every spelling of the tag; asked
                    # here rather than restating the wrapper in a third
                    # regex. Fractions only — see `_MARKS_TAG_DOLLAR_RE`.
                    _t2, _m2 = _strip_trailing_marks(txt)
                    if _m2:
                        txt, run_marks = _t2, _m2
            if txt:
                # A `$$…$$` equation is a STEP of a derivation and belongs on
                # its own centred line, with the prose around it kept as
                # prose. Collapsed inline — which is what happened to all 282
                # of them — a two-page derivation arrives as one dense
                # run-on paragraph. See book/format/display.py.
                if _display.has_display(txt):
                    segs = list(_display.split_display(txt))
                    for i, (kind, part) in enumerate(segs):
                        if kind == "display":
                            # An equation number may follow the closing `$$`
                            # rather than sit inside it. Take it off the next
                            # prose segment and give it to this equation, or
                            # it opens the following paragraph and appears to
                            # label that instead. See take_leading_eqno.
                            eqno, marks = "", ""
                            if i + 1 < len(segs) and segs[i + 1][0] == "prose":
                                eqno, rest = _display.take_leading_eqno(segs[i + 1][1])
                                marks, rest = _display.take_leading_marks(rest)
                                if eqno or marks:
                                    segs[i + 1] = ("prose", rest)
                            self.out.append(node("formula", text=part,
                                                 display=True, eqno=eqno,
                                                 marks=marks))
                        elif part.strip():
                            self._emit_prose(part.strip())
                    continue
                # A calculation the source never marked with `$$`. Each one is
                # a step and belongs on its own line — run together inside a
                # paragraph they read as a wall of sentences with the
                # arithmetic buried in them. See book/format/answer.py.
                #
                # A MULTI-PART QUESTION OR ANSWER IS THE SAME FAULT WITHOUT
                # A CALCULATION IN IT. "(a) यदि… (b) …?" — a question stem
                # with two parts crammed onto one source line — has no `=`
                # for `has_step` to catch, but the reader cannot tell where
                # (a) ends and (b) begins any more than they could for a
                # missing calculation break. `has_part_label` is the same
                # "give it structure" check for that boundary instead.
                if _answer.has_step(txt) or _answer.has_part_label(txt):
                    self._emit_prose(txt)
                    continue
                if _looks_like_formula(txt):
                    self.out.append(node("formula", text=txt, display=True))
                elif re.search(r'\s\[\d{1,2}\s*[Mm]?\]', txt):
                    # Route a run carrying a marks tag through `_emit_prose`,
                    # which is where the splitting lives. The plain fallback
                    # emitted one paragraph with the tag inside it, so three
                    # of them printed mid-sentence.
                    self._emit_prose(txt)
                else:
                    # A CHAIN WRITTEN INTO A SENTENCE IS STILL A CHAIN.
                    #
                    # Biology states a sequence in prose as well as on a
                    # `**क्रम:**` line — "पराग/लघुबीजाणु विकास का सही क्रम:
                    # बीजाणुजन ऊतक → पराग मातृ कोशिका → …" — and those came
                    # out as a run of text with arrows in it, beside proper
                    # flowcharts saying the same thing elsewhere on the page.
                    # A one-line numbered run becomes a real list first —
                    # see _inline_enumeration.
                    elead, eitems = ("", [])
                    if _PROFILE.get("matrices"):
                        elead, eitems = _inline_enumeration(txt)
                    if eitems:
                        if elead:
                            self.out.append(node("para", text=elead))
                        self.out.append(node("numbered", items=eitems))
                        if run_marks and self.out:
                            self.out[-1]["marks"] = run_marks
                        continue
                    self.out.extend(_prose_nodes(txt))
                if run_marks and self.out:
                    self.out[-1]["marks"] = run_marks
                continue
            self.take()                      # never spin
        return self.out


def _split_on_marks(text):
    """-> [(body, marks)] split at every `[N]` tag, trailing or mid-line.

    A `[1]` sitting inside a line is the boundary between one marks-worth of
    answer and the next, so it ends a paragraph rather than belonging inside
    one.

    Also the dash-run/bold/"अंक"-word spelling (`RE_MARKS_TRAILING`'s own
    reason applies here too) — MID-text this time, not just at the very
    end: `… = I]$ -----------**[1 अंक]** **इति सिद्धम्**` has a bolded
    Q.E.D. on the line right after, so the tag is not the last thing in the
    joined paragraph run and the end-anchored trailing-marks check never
    saw it.
    """
    parts, last = [], 0
    for m in re.finditer(
            r'\s(?:-{3,}\s*)?\**\[(' + _MARKS_VALUE + r')\]\**\s*', text or ""):
        body = (text[last:m.start()] or "").strip()
        if body:
            parts.append((body, m.group(1)))
            last = m.end()
    rest = (text[last:] or "").strip()
    if rest:
        parts.append((rest, ""))
    return parts or [((text or "").strip(), "")]


def _strip_trailing_marks(text):
    """See `inline.strip_trailing_marks` — half marks (`[1/2]`) included."""
    return _inline.strip_trailing_marks(text)


def _is_oneline_marker(icon, label):
    return (icon in ("★", "☆")
            or "स्रोत-नोट" in label or "पुस्तक से बाहर" in label
            or "साल में" in label)


def _marker_node(icon, label, rest):
    """One `<emoji> **Label:** text` line -> the right IR node."""
    low = label.lower()
    if icon == "↔" or "मिलता" in label:
        return node("simchip", text=(label + ": " + rest).strip(": "))
    if "स्रोत-नोट" in label or "पुस्तक से बाहर" in label:
        return node("srcnote", text=(label + (" " + rest if rest else "")).strip())
    if icon in ("★", "☆") or re.match(r'^\d+\s*साल', label) or "साल में" in label:
        stars = 3 if "10" in label or "6 बार" in label else 2
        return node("starbadge", text=(label + " " + rest).strip(), stars=stars)
    ctype = callout_type(icon, label)
    return node("callout", ctype=ctype, label=label, text=rest,
                icon=icon or CALLOUT_ICON.get(ctype, "•"))


_FORMULA_CHARS = set("=∝≈≤≥≠⇒→∮∑∫√±×·")


def _looks_like_formula(t):
    """A short line that is mostly symbols and Latin -> display equation."""
    if len(t) > 160 or not t:
        return False
    # A SOURCE-CITATION TRAILER IS NOT A FORMULA, however short.
    #
    # `— स्रोत: `2025/set_c_in` · Set C · 322(IN) · #1` closes almost every
    # answer in the corpus. Its content — a paper code, digits, `·`, `/`,
    # `(...)` — is exactly what `_FORMULA_CHARS` and the low-Devanagari
    # check exist to catch, and when the line has only ONE citation (short
    # enough to clear the 160-char cutoff a multi-citation trailer would
    # fail) it was tagged `formula` and set as a display equation. Every
    # backtick-wrapped `YYYY/slug` inside it is still individually
    # protected as a `.ref` span by `_tick()`, but the surrounding
    # `formula` node sends the WHOLE line through the display/fraction
    # pipeline a second time — which reads the slash between `2025` and
    # the now-plain-text `set_c_in` as division and stacks them, `2025`
    # over `set_c_in`. The multi-citation trailers a few lines away never
    # hit this because they are long enough to fail the length check
    # first and fall through to an ordinary paragraph instead — the fix
    # here is to give every citation trailer that same path, not to
    # special-case the short ones.
    if re.match(r'^[—–-]?\s*स्रोत\s*[:：]', t.strip()):
        return False
    if not (_FORMULA_CHARS & set(t)):
        return False
    deva = sum(1 for c in t if 'ऀ' <= c <= 'ॿ')
    return deva <= max(3, len(t) * 0.18)


def _looks_like_options(ln):
    s = ln.strip()
    if len(s) > 300:
        return False
    if len(opt_tokens(s)) >= 2:
        # An MCQ line BEGINS with its first marker. A sentence that cites two
        # equations does not: "समी (i) व (ii) से, B·2πr = μ₀i" carries two
        # option tokens and was therefore split into options — leaving `समी`
        # alone on a line, then `(i) व`, then `(ii) से,`, which means nothing.
        #
        # Anything before the first marker other than a list bullet is prose,
        # and prose before a marker means this is a sentence about the
        # options, not the options themselves.
        first = (opt_tokens(s) or [None])[0]
        lead = s[:first.start()].strip(" -–—*•\t") if first else ""
        return not lead
    # A REFERENCE CHAIN STARTING THE LINE IS STILL NOT AN OPTIONS LIST.
    #
    # "(i) तथा (ii) को विलोपन विधि …" opens WITH its first marker, so the
    # `opt_tokens` branch above's own `lead` check (prose before the first
    # marker) never fires — there is no lead. `opt_tokens` itself already
    # refuses this text (see the connector-gap check there), but this
    # single-marker FALLBACK does not call it the same way: it only tests
    # whether the line STARTS with one marker, so "(i)" alone was enough to
    # say yes. Excluded the same way — a marker immediately followed by a
    # bare conjunction and a second marker is a citation, not option (i).
    if _RE_MARKER_CHAIN.match(s):
        return False
    # `a) text` with NO bracket is just as common as `(a)` and `i)`.
    # Omitting it hid 45 of chapter 3's 56 option blocks — they rendered as
    # ordinary paragraphs, so an MCQ lost its grid and its bold markers.
    #
    # History's devanagari-lettered statements — `(क) जल निकासी … थी` — carry
    # only ONE marker per line, same shape as `(a) text` on its own line, so
    # they need the same single-marker fallback. Without it here too, each
    # of the four statement lines individually failed `_looks_like_options`
    # (only one `opt_tokens` match, not the ≥2 the first branch needs) and
    # the whole block fell through as ordinary prose, joined into one
    # run-on paragraph with the `इनमें से : …` combination-answer line after
    # it — no separate lines, no bold markers, nothing to tell one statement
    # from the next.
    return bool(re.match(r'^\(?[ivxIVX]{1,4}\)|^\(?[a-dA-D]\)|^\(?[कखगघङअबसद]\)', s)) \
        and len(s) < 220


def _line_marker_family(ln):
    """The marker family (`roman`/`upper`/`lower`/`devanagari`) THIS line's
    own first option token belongs to, or `None` if it has none. See the
    family-change break in `_options`."""
    toks = opt_tokens(ln)
    return _marker_family(toks[0].group(0).strip("()")) if toks else None


# A bolded label opening a line: `**पहचान:**`, `**क्रम:**`, `**दिया है:**`.
# Length-bounded so a whole bolded SENTENCE ending in a colon is not taken for
# a label — biology writes those, and they are prose.
# A line that is a finished maths statement: opens with `$`, closes with `$`.
# A finished maths statement: opens with `$`, closes with `$` — and may
# carry an EQUATION NUMBER after it.
#
# `$= I$ …(i)` is a completed step. Without the eqno part of this pattern the
# run did not break after it, so it was glued to the sentence below —
# `इसी प्रकार, …` — and the combined text was no longer formula-shaped, so it
# came out as a left-aligned paragraph sitting among centred display steps.
# That is the `= I …(i)` stranded at the margin.
_MATHS_LINE_RE = re.compile(
    r'^\s*\$.*\$\s*(?:[…\.]{1,3}\s*\([^)]{1,8}\))?\s*$')


RE_LEADIN = re.compile(r'^\s*\*\*[^*\n]{1,26}:\*\*')

# `इनमें से : (i) केवल (क)  (ii) (क) और (ख)  …` — the combination-answer
# line that follows a devanagari-lettered statement list. See `_options`.
RE_AMONG_LEADIN = re.compile(r'^(?:इनमें से|निम्न में से|निम्नलिखित में से|कूट)\s*[:：]?')


def _starts_block(ln):
    return bool(
        RE_H1.match(ln) or RE_H2.match(ln) or RE_H3.match(ln) or RE_HR.match(ln)
        or RE_BQ.match(ln) or RE_TABLE_ROW.match(ln) or RE_BULLET.match(ln)
        or RE_NUMBERED.match(ln) or RE_QHEAD.match(ln) or RE_ANSWER.match(ln)
        or RE_GIVEN.match(ln) or RE_MARKER.match(ln)
        # A BARE CALLOUT ICON STARTS A BLOCK, exactly as a labelled one does.
        # Safe to put here (unlike `RE_ICON_LINE`, which would also fire on a
        # `— स्रोत:` trailer) because `run()` has a branch that consumes it,
        # so the scanner always advances.
        or RE_BARE_CALLOUT.match(ln)
        # AN `अथवा` VARIANT LINE STARTS A BLOCK — see `_starts_athava`.
        or _starts_athava(ln)
        # A MARKS-ONLY LINE STARTS A BLOCK.
        #
        # `RE_MARKS_ONLY` is checked per LINE in `run()`, so it only ever saw
        # a marks line that a paragraph run had not already eaten. Three of
        # chapter 6's sit between a sentence and the formula under it, with
        # no blank line either side; the run swallowed all three, and the
        # tag — `$[2\frac{1}{2}]$` — was carried into the middle of the
        # joined text, where the maths path set it as an upright-bracketed
        # `[2½]` between the prose and the equation. Safe as a block start
        # because `run()`'s branch consumes the line unconditionally.
        or RE_MARKS_ONLY.match(ln)
        or ln.lstrip().startswith("[FIGURE:") or ln.lstrip().startswith("[IMAGE:")
        or RE_FIG_TODO.match(ln.strip()) or RE_FIG_MD.match(ln.strip())
        or RE_FIG_CAPTION.match(ln.strip())
        or RE_FIG_ENV_OPEN.match(ln)
        or RE_FIG_MATHPIX_STRAY.match(ln.strip())
        # An option line ENDS a paragraph. Without this the question stem's
        # `_para_run` ran straight on through the options and swallowed them,
        # which is why only 11 of chapter 3's 56 option blocks survived even
        # after the marker regex was fixed — the block was never reached.
        or _looks_like_options(ln)
        # A FENCE STARTS A BLOCK.
        #
        # Without this, `_para_run` ran straight through a ```चित्र-निर्देश```
        # fence and glued the illustrator's brief onto the end of whatever
        # paragraph preceded it — so the fence branch in `run()` never saw a
        # fence at all, and all eleven of chapter 1's briefs were printed in
        # the book. The marker is not decoration; it is a boundary.
        or (_PROFILE.get("fence_breaks") and ln.lstrip().startswith("```"))
        # A LEAD-IN LABEL STARTS A BLOCK.
        #
        # `**पहचान:**`, `**क्रम:**`, `**संरचना:**` each open a new labelled
        # strip, and biology puts three or four in a row with no blank line
        # between them. `_para_run` treated everything after the first as
        # continuation prose, so ONE definition swallowed an entire section —
        # and a process chain's last stage came out carrying two more labels
        # and a figure brief inside it.
        #
        # GATED ON THE PROFILE, and only because physics is already shipped.
        # Turning both boundaries on for physics moved it from 1538 blocks to
        # 1543 — five paragraphs that had been glued together came apart,
        # which is very likely a FIX there too, since physics has 188 of these
        # labels of its own. But physics's 61-page output is tested and this
        # is not the change to verify it against. Measure that separately.
        or (_PROFILE.get("leadin_breaks") and RE_LEADIN.match(ln))
        # A MATRIX ROW STARTS A BLOCK.
        #
        # Same shape of bug as the fence in biology: `_para_run` ran straight
        # through the ASCII matrix art and glued it onto the paragraph above,
        # so the branch in `run()` never saw a matrix row and not one of the
        # 26 lines was recognised. A row of a grid is not continuation prose.
        or (_PROFILE.get("matrices")
            and (_matrix_art.is_ascii_row(ln) or _matrix_art.opens_block(ln)))
    )


# ==========================================================================
# TREE BUILDER
# ==========================================================================
def _split_on(lines, pred):
    """-> [(header_line_or_None, [body lines])], preserving order."""
    out, head, buf = [], None, []
    for ln in lines:
        if pred(ln):
            if head is not None or buf:
                out.append((head, buf))
            head, buf = ln, []
        else:
            buf.append(ln)
    if head is not None or buf:
        out.append((head, buf))
    return out


def _h3_group_boundary(lines):
    """Predicate for `_split_on`: an H3 is a Part-2 GROUP boundary — a
    year, `### महत्वपूर्ण प्रश्न` — only OUTSIDE an open question.

    A long-form essay answer uses `###` as an in-body subheading —
    `### प्रणाली की संरचना`, `### निर्माण और सामग्री` — the SAME heading
    level Part-2 uses for `### 2025`. Without this guard, the plain
    `RE_H3 and not RE_QHEAD` test (right for a YEAR heading, since a
    year never doubles as a question head) tore every such subheading
    out of its question and turned it into its own spurious top-level
    `qgroup`: no questions, no marks chip, rendered with the giant
    `.yearhead` banner a real year gets, leaving most of the page
    blank around it — one history chapter had four of its essay
    subheadings do this before the fix. A question is "open" from its
    `RE_QHEAD` line until the next `---` separator or the next
    question head; an H3 while one is open stays body content.

    A STRUCTURAL GROUP HEADING IS ALWAYS A BOUNDARY, open question or not.
    -----------------------------------------------------------------
    The "open until the next `---`" rule assumes Part 2 writes a `---`
    between questions. That separator is OPTIONAL in the spec (§6 lists
    it as a construct, not a requirement), and the maths chapter
    `maths_chapter1.md` writes none at all: its six year groups are
    `### 2026` … `### 2020` with nothing but blank lines between the
    questions. So `open_q` went True at the first `**प्र. 1**` and never
    went False again — every year heading after the first was swallowed
    as body content, all 15 questions collapsed into ONE qgroup labelled
    "2026", and five year bands vanished from the book. Nothing errored:
    step02 counts questions and answers, and all 15 of each were still
    there, just in the wrong group.

    The essay-subheading problem this guard exists for is PROSE
    (`### प्रणाली की संरचना`). A heading that is a year, a hierarchical
    topic number or a marks band cannot be that, so those three are
    checked BEFORE `open_q` rather than after it — see `_is_group_label`.

    The year form alone was not enough. `physics_chapter2.md` groups Part 2
    by TOPIC — nineteen `### 2.1 …` … `### 2.17 …` headings, and again not
    one `---` — so with only the year check its nineteen groups still
    collapsed to three, and step05 reported `marks_unsorted` because
    questions correctly sorted WITHIN each topic are of course unsorted
    once nineteen topics are concatenated into one group. That report was
    the collapse showing through, not a content error in the markdown.
    """
    open_q = [False]

    def pred(ln):
        if RE_QHEAD.match(ln):
            open_q[0] = True
            return False
        if RE_HR.match(ln):
            open_q[0] = False
            return False
        m = RE_H3.match(ln)
        if m and _is_group_label(m.group(1)):
            open_q[0] = False
            return True
        return bool(m) and not open_q[0]
    return pred


# A FREQUENCY SEAL MAY BE ITS OWN LINE, NOT ONLY A BRACKET ON THE HEADING.
#
# Two dialects were known: the bracket a heading carries
# (`### 1.5 … **[UP 2022 · 1 अंक]**`, read by `_section_meta`) and the bold
# trailer (`### 2.3 … · **13 सवाल आए · 1 व 5 अंक में**`, read by
# `render._split_topic_freq`). Maths chapter 3 writes a third: bare lines
# directly under the heading, one per year the board asked it.
#
#     ### 3.1 आव्यूह की कोटि व प्रकार (Order & Types)
#     🔥 UP 2022 · 1 अंक
#     🔥 UP 2026 · 1 अंक
#
# Unrecognised, all 42 of them fell through to paragraphs and printed as
# plain italic text — the red seal that is the loudest thing on a Part-1
# heading appeared nowhere in a 51-page book. Nothing failed: the words
# were all present, so step16's coverage stayed at 1.0, and step01 counted
# them among the 37% that "fell through to para". A construct that
# degrades to a paragraph keeps its text and loses its meaning, which is
# the one kind of loss word-counting cannot see.
RE_FREQ_LINE = re.compile(r'^\s*🔥\s*(?P<text>\S.*?)\s*$')


def _absorb_freq_lines(body, meta):
    """Move any 🔥 lines opening `body` into `meta["pyq"]`.

    Only from the TOP of the section — a 🔥 further down is prose about
    frequency (the cover says "भाग 1 की 🔥 पंक्तियाँ …"), not a seal.
    Returns the body with those lines removed.
    """
    lines = list(body)
    taken = []
    i = 0
    while i < len(lines):
        if not lines[i].strip():
            i += 1
            continue
        m = RE_FREQ_LINE.match(lines[i])
        if not m:
            break
        taken.append(m.group("text"))
        i += 1
    if not taken:
        return body
    meta["pyq"] = list(meta.get("pyq") or []) + taken
    return lines[i:]


def _section_meta(title_line):
    """`1.5 वैद्युत आवेश के मूल गुण  ·  **[UP 2022 · 1 अंक]**` -> fields."""
    raw = title_line.strip()
    pyq = re.findall(r'\[([^\]]*)\]', raw)
    # The chip block is stripped WHEREVER it sits, not only at end of line.
    # Anchoring it to `$` meant a heading that closes with a pointer note —
    # `… **[UP 2022 · 1 अंक] · [UP 2023 · 5 अंक]** ☞ *बार-बार*` — kept the
    # whole list in its title AND rendered it again as chips underneath, so
    # every year was printed twice on the same heading.
    raw_wo = re.sub(r'·?\s*\*\*\[[^\]]*\](?:\s*·\s*\[[^\]]*\])*\*\*', ' ', raw).strip()
    # THE ☞ POINTER IS A BADGE, NOT PART OF THE NAME.
    #
    # Maths flags a frequently-asked section as `☞ *बार-बार*`, and it sits
    # BEFORE the marks chip:
    #
    #     ## 3.1 कोटि, प्रकार व गणना (Order…) ☞ *बार-बार* · **[4 बार · 1 अंक]**
    #
    # The old cleanup only stripped a trailing `· *…*`, which this is not, so
    # the pointer stayed inside the title — and because it followed the
    # `(English)` gloss, the gloss stopped being recognised too. The heading
    # printed as one long italic-and-bold run instead of a numbered section
    # with a name, a gloss and a chip, which is why it looked unlike every
    # other subject's.
    flag = ""
    mf = re.search(r'☞\s*\*([^*]+)\*', raw_wo)
    if mf:
        flag = mf.group(1).strip()
        raw_wo = (raw_wo[:mf.start()] + raw_wo[mf.end():]).strip()
    raw_wo = re.sub(r'·\s*\*[^*]*\*\s*$', '', raw_wo).strip(" ·")
    m = RE_SECTION.match(raw_wo)
    num, rest = (m.group(1), m.group(2)) if m else ("", raw_wo)
    en = ""
    me = RE_EN.search(rest)
    if me:
        en = me.group(1).strip()
        rest = rest[:me.start()].strip()
    # A separator left stranded by the removal above is not part of the name.
    return dict(num=num, title=re.sub(r'\s{2,}', ' ', rest).strip(" ·"),
                en=en, pyq=pyq, flag=flag)


def _parse_questions(lines, stats):
    """A question part: `**प्र. N**` heads, `---` separators, `> ✅` banners."""
    qs, cur, pre = [], None, []
    banner_pending = None
    pending_stars = 0
    # The most recent `#### 🅾️/✏️/📝 …` divider — carries forward onto
    # every question until the next one changes it, same as `pending_stars`.
    # See `_regroup_by_qtype`, which is what actually reads this.
    pending_qtype = ""
    i = 0
    while i < len(lines):
        ln = lines[i]
        mt = RE_QTYPE_H4.match(ln)
        if mt:
            stats["consumed"] += 1
            pending_qtype = mt.group(1)
            i += 1
            continue
        # HISTORY'S OWN REPEAT-FREQUENCY SUMMARY: a line of its own, right
        # before a question head, chaining every `[year, ...]` an alternative
        # of that question ever appeared under —
        #     `[2025, 16, 15, 11] [2024, 23, 22, 14, 13, 10, 09] [2025] [2025]
        #      [2025] [2023]` ★★★
        #     **प्र. 16**
        # Each of those years is ALREADY on its own `अथवा` line's own `[...]`
        # tag — `☞ V Imp • [2025, 16, 15, 11]` — so this line adds no fact a
        # reader needs, only totals one. Unrecognised, it matched neither
        # `RE_QHEAD` nor `RE_QCHIP_CONT` and fell through as an ordinary body
        # line — glued onto the PRECEDING question (the `---` before it does
        # not close a question), so it printed as a wall of stray brackets
        # and bare years sitting after that question's own closing callout,
        # right before the next one's pink tag. The trailing `★★★` is real
        # information the tag is missing, though — no arts question head
        # otherwise carries a star rating — so it is kept, and only it.
        mr = RE_REPEAT_STARS.match(ln.strip())
        if mr:
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                j += 1
            if j < len(lines) and RE_QHEAD.match(lines[j]):
                pending_stars = len(mr.group(1) or "")
                i += 1
                continue
        mq = RE_QHEAD.match(ln)
        if mq:
            stats["consumed"] += 1
            chip_txt, stars, note = mq.group("chip"), mq.group("stars"), \
                (mq.group("note") or mq.group("note2"))
            # EVERY trailing note, not just the first — see `notes_more` in
            # RE_QHEAD. Matching the head and then dropping its second note
            # would trade a loud failure (step02 stops the build) for a
            # quiet one, and the note it drops is the cross-reference saying
            # where the same question appears at another mark value.
            note = _join_notes(note, mq.group("notes_more"))
            if mq.group("chip2"):
                chip_txt = ((chip_txt + " · ") if chip_txt else "") + mq.group("chip2")
            # `cite` is the source note that came BEFORE the marks chip —
            # see RE_QHEAD — so it leads the joined text the same way it
            # led the source line.
            if mq.group("cite"):
                chip_txt = (mq.group("cite") + " · " + chip_txt) if chip_txt \
                    else mq.group("cite")
            # See RE_QCHIP_CONT: a heading-branch head with a title and no
            # chip of its own may have its chip/stars/note on the next line.
            if mq.group("n2") and not chip_txt and i + 1 < len(lines):
                mc = RE_QCHIP_CONT.match(lines[i + 1])
                if mc:
                    chip_txt, stars, note = mc.group("chip"), mc.group("stars"), \
                        (mc.group("note") or mc.group("note2"))
                    note = _join_notes(note, mc.group("notes_more2"))
                    i += 1
            chip = parse_chip(_chip_text(chip_txt))
            cur = dict(num=qhead_num(mq), stars=(len(stars or "") or pending_stars),
                       fullnote=_clean_fullnote(note), body=[], qtype=pending_qtype,
                       **chip)
            pending_stars = 0
            qs.append(cur)
            i += 1
            continue
        if cur is None:
            pre.append(ln)
        else:
            cur["body"].append(ln)
        i += 1

    out = []
    if pre:
        out.extend(_Scanner(pre, stats).run())
    for q in qs:
        # `— स्रोत: 2025/set_jv · खण्ड अ` says which paper the question came
        # from, and that is exactly what the head's chip carries for every
        # other question — `5 अंक · 2026/set_dw · खण्ड य`. Left as a line of
        # its own it stated the same KIND of fact in a different place and a
        # different voice. Folded into the chip, so one question looks like
        # the next.
        body = q.pop("body")
        kept_body, found = [], ""
        for ln in body:
            m = RE_SOURCE_NOTE.match(ln.strip())
            # ONE CITATION FOLDS INTO THE CHIP; FOUR DO NOT.
            #
            # `5 अंक · 2026/set_dw · खण्ड य` is what the fold above was
            # measured against — a single paper code, short enough that
            # the chip stays a compact inline tag next to `प्र. N`. A
            # question repeated across four years' papers writes ALL FOUR
            # codes on its `स्रोत:` line — `` `2022/set_a_eu` · Set A ·
            # 322(EU) · #1  ·  `2023/set_b_ao` · … `` — and folding that
            # whole chain into the same chip produced a ~150-character
            # box that wrapped two lines and sat ABOVE the question's own
            # marks chip and text, not after the answer where the source
            # itself puts it. A reader repeated 3–4 times a year is
            # arts's own most common shape (`★★★`), so this was not a
            # one-off — every heavily-repeated question in both chapters
            # opened on this oversized box.
            #
            # A citation is "one" if it contains at most one backtick-
            # wrapped `` `…` `` code; more than that stays a normal body
            # paragraph, in its original end-of-question position.
            # EVERY CITATION FOLDS NOW, INCLUDING A REPEATED ONE.
            #
            # The `<= 2` threshold kept multi-paper citations OUT of the
            # chip because four codes built a ~150-character box. The cost
            # was the inconsistency it was meant to prevent: 55 questions
            # carried their source in the head chip and 31 carried it as a
            # line at the foot, in a different place and a different voice.
            # They fold too now, and the shared year is lifted out in front
            # (below) so the chip stays short enough not to wrap.
            if m and not found:
                found = m.group(1).strip()
                continue
            kept_body.append(ln)
        if found:
            # The word `स्रोत` travels with its value. Folding only the value
            # dropped the label, and `step16` caught it — one word missing
            # from the whole book, which is exactly the check's job.
            # `#54` IS A QUESTION NUMBER, SAID IN SYMBOLS.
            #
            # The source writes `— स्रोत: $2026/set_a_db$ #4`, and folded into
            # the chip that came out as `स्रोत 2026/set_a_db #4` — a bare hash
            # in the middle of a Hindi chip, where every other chip in the
            # book spells the same fact out (`· प्रश्न 12`). 43 of them.
            raw = q.get("raw") or ""
            _pairs = re.findall(r'`(\d{4}[A-Za-z]?)/([^`]*)`', found)
            _one_year = len(_pairs) > 1 and len({_y for _y, _ in _pairs}) == 1

            # A YEAR THE CHIP ALREADY CARRIES IS NOT SAID TWICE.
            #
            # `` `2026/set_a` #17 · `2026/set_c` #3 · `2026/set_d` #66 ·
            # `2026/set_e` #31 `` names one year four times, and the chip it
            # joins already opens `1 अंक · 2026 ·` — five sayings of the same
            # four digits in one box. Dropped from the codes when every one
            # of them shares it AND the chip states it already; a citation
            # spanning two years keeps every year in place, because there
            # the year is what tells the codes apart.
            if _one_year and _pairs[0][0].rstrip("ABab") in raw:
                found = re.sub(r'`(\d{4}[A-Za-z]?)/([^`]*)`', r'`\2`', found).strip()

            # `#54` IS A QUESTION NUMBER, SAID IN SYMBOLS — WHEN THERE IS ONE.
            #
            # `स्रोत 2026/set_a_db #4` put a bare hash in a Hindi chip where
            # every other chip spells the fact out (`· प्रश्न 12`), so 43 of
            # them were expanded. Four codes is the other extreme: `प्रश्न`
            # four times is 28 characters of one repeated word, and the set
            # codes beside it are what a reader actually scans. So the word
            # is spelled out for a citation naming ONE paper and left as `#`
            # for a list, which is how a list of references reads anyway.
            if len(_pairs) <= 1:
                found = re.sub(r'#\s*(\d+)', r'प्रश्न \1', found)

            # The word `स्रोत` travels with its value. Folding only the value
            # dropped the label, and `step16` caught it — one word missing
            # from the whole book, which is exactly the check's job.
            note = "स्रोत " + found
            q["raw"] = (raw + " · " + note) if raw else note
        blocks = _Scanner(kept_body, stats).run()
        blocks = [b for b in blocks if b["kind"] != "rule"]
        # A banner belongs to the GROUP, not to this question — wherever in
        # the body it sits. Physics writes a trailing "yaad rakho"-style
        # callout AFTER the `> ✅ … cover।` banner and before the next
        # year's `---` (`F₁, F₂ …` / `Aise ghoomkar aa sakta hai` at the end
        # of 2026's last question) — the OLD check only looked at
        # `blocks[-1]`, so a banner with anything after it never got
        # pulled out: it stayed a stray `qgroup`-kind node buried inside
        # this question's own `blocks`, which nothing downstream renders,
        # and "2026 का पेपर … पूरा" vanished from the page with no error
        # anywhere — same fault, 5 banners, one whole chapter. Pulling out
        # EVERY `_banner_only` block regardless of position fixes both
        # shapes; a banner still renders as the transition after this
        # question, same as when it truly was last.
        banners = [b for b in blocks if b.get("_banner_only")]
        blocks = [b for b in blocks if not b.get("_banner_only")]
        out.append(node("question", blocks=blocks, accent=0, **q))
        for trailing in banners:
            # `note` travels with the banner — this re-wrap rebuilt the node
            # from `banner` alone and dropped it, which is where biology
            # chapter 1's three banner notes were being lost even after the
            # reader started keeping them.
            out.append(node("qgroup", label="", banner=trailing["banner"],
                            note=trailing.get("note") or "",
                            children=[], _banner_only=True))
    return out


def _is_question_part(body_lines):
    # ONE question is enough. Requiring two silently dropped the 2018 and
    # 2012 groups, which have a single entry each — a whole year of the
    # book vanishing with no error.
    return any(RE_QHEAD.match(l) for l in body_lines)


# A section number is HIERARCHICAL — `1.5`, `2.4.1`. A bare leading integer
# is not enough: a Part 2 grouped by marks has headings like `### 1 अंक`
# and `### 3 अंक`, which matched the old rule, so the whole part was read
# as sections and every question inside it silently disappeared — no error,
# just a book with no questions in it.
RE_SECTION_NUM = re.compile(r'^\d+\.\d+')


def _is_section_part(head_lines):
    return sum(1 for l in head_lines if RE_SECTION_NUM.match(l.strip())) >= 2


def _body_kids(b, stats):
    """Blocks for a body whose shape is not known from its heading.

    QUESTIONS WIN, WHEREVER THE BODY CAME FROM. Three separate places used
    to hand a body straight to `_Scanner`, which has no question handling —
    the part-level fallback, and the leading `h is None` segment of each of
    the two H3 branches. Chemistry chapter 1 lost questions at all three:
    its 2024 paper parsed 4 of 19 and its महत्वपूर्ण प्रश्न part 7 of 14,
    because both contain an H3 inside an answer and everything before that
    H3 went down the plain path.

    One helper rather than three call sites that have to remember.
    """
    return (_parse_questions(b, stats) if _is_question_part(b)
            else _Scanner(b, stats).run())


def _build_part(head, body, stats):
    """One `#` part -> a `part` node whose children are inferred."""
    label = RE_H1.match(head).group(1).strip() if head else ""
    sub = ""
    j = 0
    while j < len(body) and not body[j].strip():
        j += 1
    if j < len(body) and re.match(r'^\*[^*]+\*\s*$', body[j].strip()):
        sub = body[j].strip().strip("*")
        body = body[:j] + body[j + 1:]
    # A HEADING DIRECTLY UNDER THE CHAPTER TITLE IS THE SUBTITLE.
    #
    # Chapter 6 opens `# अध्याय 6 …` then `### उ.प्र. बोर्ड · कक्षा 12 ·
    # रसायन विज्ञान — पूर्ण अध्ययन-सामग्री` on the very next line. With no
    # body of its own it became an empty section and its words were dropped
    # outright — `अध्ययन`, `सामग्री` and `विज्ञान` were three of the eight
    # the integrity check reported as vanished, and they are the chapter's
    # own masthead.
    elif (_PROFILE.get("reactions")
          and j < len(body) and RE_H3.match(body[j])
          and (j + 1 >= len(body) or not body[j + 1].strip())):
        # KEPT AS CONTENT, not as `sub`.
        #
        # Setting `sub` was not enough: the cover builds its own subtitle from
        # elsewhere, so the line was consumed here and printed nowhere —
        # `कक्षा`, `विज्ञान`, `अध्ययन` and `सामग्री` were four of the words the
        # integrity check reported vanished, and they are the chapter's own
        # masthead: board, class, subject.
        #
        # Rewritten as an italic paragraph so it survives as a block whatever
        # the cover chooses to do with `sub`.
        body = body[:j] + ["*" + RE_H3.match(body[j]).group(1).strip() + "*"] \
            + body[j + 1:]

    # `##` and `###` are a HIERARCHY, not peers. Chapter 3 opens Part 2 with
    # `## कैसे पढ़ें` and `## एक नज़र में` before the first `### 2026`, and
    # treating every H2 as a leaf section made the second one swallow all
    # thirteen year groups behind it — 210 questions reduced to 4 children,
    # with no error. So each H2 segment is split on H3 in turn, and only an
    # H2 with no H3 beneath it becomes a section of its own.
    # A QUESTION HEAD IS NOT A SECTION HEADING, whatever level it is written
    # at. Chemistry chapter 1 writes all 102 of its questions as `## प्र. N`,
    # so this splitter cut at each one, stripped the head off into the
    # segment TITLE, and left a body with no question head in it — which
    # then failed `_is_question_part` and became a leaf section. The chapter
    # parsed to 102 answers and zero questions: every answer an orphan and
    # the whole of Part 2 structurally gone, with no error anywhere.
    #
    # Excluded here rather than repaired downstream, because by the time the
    # head has become a title the number and the chip have already been
    # separated from the body they belong to.
    h2parts = _split_on(body, lambda l: (RE_H2.match(l) is not None
                                         and not RE_QHEAD.match(l)))
    body = h2parts[0][1] if (h2parts and h2parts[0][0] is None) else []
    tail_sections = []
    for h, b in h2parts:
        if h is None:
            continue
        stats["consumed"] += 1
        title = RE_H2.match(h).group(1).strip()
        # Questions win here too. Chapter 3 nests its years as `### 2026`
        # under an H2 container; chapter 4 puts the questions DIRECTLY under
        # `## 2026` with no H3 at all. Without this branch that segment fell
        # through to the plain scanner, which has no question handling — all
        # 147 of chapter 4's questions became loose paragraphs, and the
        # validator caught it as "markdown 147, IR 0".
        if _is_question_part(b):
            kids = _parse_questions(b, stats)
            banner, bnote, kept = "", "", []
            for k in kids:
                if k.get("_banner_only"):
                    banner = k["banner"]
                    bnote = k.get("note") or bnote
                else:
                    kept.append(k)
            tail_sections.append(node("qgroup", label=title, banner=banner,
                                      note=bnote,
                                      children=kept))
            continue
        if any(RE_H3.match(l) for l in b):
            # a real container: keep its own lead-in, then recurse
            # NB: not `sub` — that name already holds this part's subtitle
            # string, and overwriting it with a node dict crashed the cover.
            inner_part = _build_part(None, b, stats)
            kids = inner_part["children"]
            lead = [x for x in kids if x["kind"] not in ("section", "qgroup")]
            tail_sections.append(node("section", num="", title=title, en="", pyq=[],
                                      accent=0, blocks=lead, asides=[]))
            tail_sections.extend([x for x in kids
                                  if x["kind"] in ("section", "qgroup")])
        else:
            # A LEAF H2 THAT IS A NUMBERED SECTION GETS PARSED LIKE ONE.
            #
            # Physics and biology write their sections as `###`, maths writes
            # them as `##` — so this branch handed the whole heading through
            # as a bare title and `_section_meta` never ran on it. Every
            # maths section therefore lost its number, its English gloss and
            # its marks chip, and printed as one long italic-and-bold run.
            # That is what looked unlike the other subjects.
            #
            # Only when the heading actually starts with a section number:
            # `## कैसे पढ़ें` is a container title and must stay one.
            meta = (_section_meta(title) if RE_SECTION.match(title)
                    else dict(num="", title=title, en="", pyq=[], flag=""))
            tail_sections.append(node("section", accent=0, asides=[],
                                      blocks=_Scanner(b, stats).run(), **meta))

    h3 = _split_on(body, _h3_group_boundary(body))
    h3_titles = [RE_H3.match(h).group(1).strip() for h, _ in h3 if h]

    # Questions win. If the body contains question heads at all, this is a
    # question part whatever its headings look like — that check is about
    # content, the heading shape is only a hint.
    has_questions = any(RE_QHEAD.match(l) for l in body)

    children = []
    if h3_titles and _is_section_part(h3_titles) and not has_questions:
        for h, b in h3:
            if h is None:
                children.extend(_body_kids(b, stats))
                continue
            stats["consumed"] += 1
            meta = _section_meta(RE_H3.match(h).group(1))
            b = _absorb_freq_lines(b, meta)
            blocks = _Scanner(b, stats).run()
            asides = [x for x in blocks if x["kind"] == "card"]
            blocks = [x for x in blocks if x["kind"] not in ("card", "rule")]
            children.append(node("section", blocks=blocks, asides=asides,
                                 accent=0, **meta))
    elif h3_titles:
        # `h3_titles`, NOT `h3`. `_split_on` returns a single
        # `[(None, body)]` when it finds no heading at all, which is TRUTHY —
        # so this branch fired for a part with zero H3s, ran the plain
        # scanner on its body, and the question branch below was unreachable.
        # That is why chemistry chapter 1 still parsed 11 questions out of
        # 102 after the part-level branch was added: every year in it is an
        # H1 with `## प्र. N` directly beneath and no H3 anywhere.
        for h, b in h3:
            if h is None:
                children.extend(_body_kids(b, stats))
                continue
            stats["consumed"] += 1
            gl = RE_H3.match(h).group(1).strip()
            kids = _parse_questions(b, stats) if _is_question_part(b) else _Scanner(b, stats).run()
            banner, bnote = "", ""
            kept = []
            for k in kids:
                if k.get("_banner_only"):
                    banner = k["banner"]
                    bnote = k.get("note") or bnote
                else:
                    kept.append(k)
            children.append(node("qgroup", label=gl, banner=banner,
                                 note=bnote, children=kept))
    elif _is_question_part(body):
        # QUESTIONS WIN AT PART LEVEL TOO.
        #
        # This branch used to hand the body straight to `_Scanner`, which has
        # no question handling at all. The same mistake was already found and
        # fixed one level up, for an H2 segment holding questions with no H3
        # beneath it — but the part-level body was left on the plain scanner.
        #
        # Chemistry chapter 1 lands here: it opens each year as an H1
        # (`# 2026 का पेपर`) and puts `## प्र. N` questions directly under it
        # with no H3 anywhere. So 91 of its 102 questions became loose
        # paragraphs while their 102 answers parsed correctly — a chapter of
        # answers with nothing to answer.
        kids = _parse_questions(body, stats)
        banner, bnote, kept = "", "", []
        for k in kids:
            if k.get("_banner_only"):
                banner = k["banner"]
                bnote = k.get("note") or bnote
            else:
                kept.append(k)
        children.append(node("qgroup", label="", banner=banner,
                             note=bnote, children=kept))
    else:
        children.extend(_Scanner(body, stats).run())
    children.extend(tail_sections)
    return node("part", label=label, sub=sub, children=children)


# ==========================================================================
# POST-PASSES
# ==========================================================================
# A span that is a WHOLE reaction, worth a line of its own. Either a `$...$`
# run or a backtick run, holding an arrow and at least two species.
_RXN_SPAN_RE = re.compile(r'(\$[^$\n]{10,}\$|`[^`\n]{10,}`)')


def _is_full_reaction(span):
    """Is this span a complete equation, or an inline mention?

    `$S_N1$` and `$R-X$` are mentions and belong in the sentence. A complete
    equation has an arrow AND something on each side of it, and those are the
    ones that need a line to themselves.
    """
    t = span.strip('$`')
    if not re.search(r'[→⟶⇌⟷]|\\xrightarrow|\\longrightarrow'
                     r'|\\rightleftharpoons|\\xrightleftharpoons', t):
        return False
    # SPLIT ON THE COMMAND NAME, NOT ON ITS ARGUMENT.
    #
    # This matched the arrow's label as `\{[^{}]*\}`, which cannot match
    # `\xrightarrow{\text{पिरिडीन}}` — the braces NEST. So the split silently
    # did nothing, the span came back as one part, and every LaTeX reaction
    # whose reagent was wrapped in `\text{}` was judged "not a full reaction"
    # and left inline. That is 17 of the answers.
    #
    # The label does not need to be consumed: whichever side it lands on,
    # both sides still have content, which is all this test asks.
    parts = re.split(r'[→⟶⇌⟷]|\\xrightarrow|\\longrightarrow'
                     r'|\\xrightleftharpoons|\\rightleftharpoons', t)
    return len([x for x in parts if len(x.strip()) >= 2]) >= 2


def _split_reactions(text):
    """`prose … <reaction> … prose` -> the pieces, reactions marked.

    Yields (piece, is_reaction). A reaction set INLINE in a sentence is what
    made the organic answers look broken: `.rxn` is a three-row grid, so a
    labelled arrow inside a text line pushes that one line to two-and-a-half
    times the height of its neighbours and the prose either side of it steps
    around it. Every reference textbook puts the equation on its own centred
    line and the comment underneath, and that is what this enables.

    Only spans that are COMPLETE equations are pulled out — see
    `_is_full_reaction`. Pulling out mentions as well would leave sentences
    with holes in them.
    """
    out = []
    for piece in _RXN_SPAN_RE.split(text or ""):
        if not piece:
            continue
        if _RXN_SPAN_RE.fullmatch(piece) and _is_full_reaction(piece):
            out.append((piece, True))
        elif out and not out[-1][1]:
            out[-1] = (out[-1][0] + piece, False)
        else:
            out.append((piece, False))
    return out


# `$chain$ (description)` — a formula and the sentence that describes its
# branches, on one line. That is how the chapter writes 47 branched molecules.
_CHAIN_DESC_RE = re.compile(
    r'^\s*(?:\*\*)?(?P<lead>\([ivxIVX]{1,4}\)|\([a-zA-Z]\))?(?:\*\*)?\s*'
    r'[$`](?P<chain>[^$`\n]{6,120})[$`]\s*'
    r'\((?P<desc>[^()]{0,220}?जुड़ा[^()]{0,40}?)\)\s*(?P<tail>.*)$', re.S)


# A description ALONE in its own block, with the chain in the block before:
#
#   $CH_3-C-CH_2Br$
#   (केन्द्रीय कार्बन से ऊपर तथा नीचे एक-एक $CH_3$ जुड़ा है।)
#
# The commonest of the 47 shapes. The two blocks have to be merged before
# either can be drawn, because neither is a structure on its own.
_DESC_ONLY_RE = re.compile(
    r'^\s*\(?\s*(?P<desc>[^()]{0,220}?जुड़ा[^()]{0,40}?)\s*\)?\s*$', re.S)
_BARE_CHAIN_RE = re.compile(r'^\s*[$`](?P<chain>[^$`\n]{6,120})[$`]\s*$')


def draw_structures(doc):
    """Replace `chain + bracketed description` with a drawn structure.

    Gated on the profile, and on the description matching the grammar in
    `format/structure`. When it does not match, the block is left exactly as
    it was: a branch drawn on the wrong carbon is a different compound, and a
    correct sentence beats a wrong picture.
    """
    if not _PROFILE.get("reactions"):
        return doc

    def rewrite(blocks):
        out = []
        for b in blocks or []:
            if isinstance(b, dict):
                for key in ("children", "blocks", "asides"):
                    if b.get(key):
                        b[key] = rewrite(b[key])
            if not isinstance(b, dict) or b.get("kind") not in ("para", "answer",
                                                                "formula"):
                out.append(b)
                continue
            txt = str(b.get("text", ""))
            # The two-block form first: this block is only a description and
            # the block already emitted is only a chain.
            dm = _DESC_ONLY_RE.match(txt)
            if dm and out and isinstance(out[-1], dict) \
                    and out[-1].get("kind") in ("formula", "para"):
                cm = _BARE_CHAIN_RE.match(str(out[-1].get("text", "")))
                if cm:
                    raw0, nums0 = _structure.strip_locants(cm.group("chain"))
                    at0, bo0 = _structure.split_chain(_latex_tex(raw0))
                    br0 = (_structure.read_branches(dm.group("desc"), len(at0))
                           if at0 else [])
                    if at0 and br0:
                        out[-1] = node("structure", atoms=at0, bonds=bo0,
                                       branches=[list(x) for x in br0],
                                       numbers=nums0)
                        continue
            m = _CHAIN_DESC_RE.match(txt)
            if not m:
                out.append(b)
                continue
            raw, nums = _structure.strip_locants(m.group("chain"))
            atoms, bonds = _structure.split_chain(_latex_tex(raw))
            if not atoms:
                out.append(b)
                continue
            br = _structure.read_branches(m.group("desc"), len(atoms))
            if not br:
                out.append(b)
                continue
            lead = (m.group("lead") or "").strip()
            if b.get("kind") == "answer":
                out.append(dict(b, text=lead))
            elif lead:
                out.append(node("para", text=lead))
            out.append(node("structure", atoms=atoms, bonds=bonds,
                            branches=[list(x) for x in br], numbers=nums))
            tail = (m.group("tail") or "").strip()
            if tail:
                out.append(node("para", text=tail))
        return out

    for part in doc.get("parts") or []:
        part["children"] = rewrite(part.get("children"))
    return doc


def _caption_limit():
    """`caption_in_card` is True, or the longest caption (characters) the
    subject wants printed under a figure before falling back to its title."""
    v = _PROFILE.get("caption_in_card")
    return 340 if v is True else int(v)


def first_sentence(text, limit=340):
    """The part of a figure description that belongs UNDER the picture.

    Two shapes arrive:

      * a real caption — one sentence ending in a danda or full stop, e.g.
        `द्विबीजपत्री भ्रूण की अनुदैर्ध्य काट; दो बीजपत्र (COTYLEDON), … नामांकित।`
        Kept whole, labelled parts and all: that is what a student reads.
      * a drawing brief — `title; part to draw; part to draw; …`, often 700+
        characters and with NO sentence end at all. Only the title clause
        before the first `;` is a caption; the rest is an instruction to an
        illustrator and stays in `data-desc`.

    So: cut at the first danda / full stop (never a decimal point); and if
    there was none, or the sentence is longer than `limit`, cut at the first
    `;` instead.
    """
    t = re.sub(r'\s+', ' ', (text or "")).strip().strip("*").strip()
    m = re.search(r'।(?=\s|$)', t) or re.search(r'(?<![0-9A-Z])\.(?=\s|$)', t)
    out = t[:m.end()].strip() if m else t
    if not m or len(out) > limit:
        cut = out.find(";")
        if cut >= 12:
            out = out[:cut].rstrip(" ,")
    return out


def attach_captions(doc):
    """Fold a `*चित्र N.M — …*` paragraph into the figure it describes.

    The chapters write the caption as an ITALIC PARAGRAPH after the image,
    and it was parsed as an ordinary paragraph — so inside a question it was
    set as `<p class="q">`, at question-text size and weight, sitting under a
    dashed plate it was not part of. On a page with three figures that is
    three captions competing with the answer prose around them, which is
    most of why the figure area read as unfinished.

    Matched on the NUMBER, not on adjacency alone, so a paragraph that merely
    mentions a figure is left where it is.

    SCOPED PER SUBJECT. Applied to everything it folded 21 of biology's
    captions too, taking that chapter from its verified 932 blocks to 911 —
    a change to a tested output made as a side effect of work on another
    subject, which is not a change anyone asked for. So a profile opts in:

      `reactions`        chemistry — the sentence is folded into `desc`
      `caption_in_card`  the sentence is PRINTED inside the figure card as
                         its `<figcaption>` (physics, biology), instead of
                         being set as a free paragraph under the box
    """
    in_card = bool(_PROFILE.get("caption_in_card"))
    if not (_PROFILE.get("reactions") or in_card):
        return doc

    def rewrite(blocks):
        out = []
        for b in blocks or []:
            if isinstance(b, dict):
                for key in ("children", "blocks", "asides"):
                    if b.get(key):
                        b[key] = rewrite(b[key])
            prev = out[-1] if out else None
            if (isinstance(b, dict) and b.get("kind") in ("para", "answer")
                    and isinstance(prev, dict)
                    and prev.get("kind") == "figure"
                    and prev.get("num")):
                t = (b.get("text") or "").strip()
                m = re.match(r'^\*?\s*(चित्र\s*' + re.escape(prev["num"])
                             + r')\s*[—–·:-]\s*(.+?)\*?$', t, re.S)
                if m:
                    if in_card:
                        # PRINTED, not just remembered: the sentence becomes
                        # the card's own `<figcaption>`. The `चित्र N` prefix
                        # is dropped because the card header already carries
                        # it. `desc` is left alone — it is the brief step11
                        # commissions art from, and this is not that.
                        prev["cap_text"] = first_sentence(
                            m.group(2), _caption_limit())
                    else:
                        prev["desc"] = ((prev.get("desc") or "")
                                        + (" " if prev.get("desc") else "")
                                        + m.group(2).strip()).strip()
                    continue
            out.append(b)
        return out

    for part in doc.get("parts") or []:
        part["children"] = rewrite(part.get("children"))
    return doc


# A BARE EQUATION INSIDE A SENTENCE.
#
# 19b writes its working as 245 `$$` display blocks and gets 295 display
# lines on the page. Chapter 1 writes ZERO `$$` — its formulae are bare text
# inside the answer sentence:
#
#   **उत्तर:** F = (1/4πε₀)|q₁q₂|/r²; मान रखने पर F = 9×10⁹×2×10⁻⁷×… = 6×10⁻³ N
#
# so it got 2 display lines in 17 pages against the reference's 4.8 per page.
# The pipeline was rendering faithfully what it was given; the difference in
# formatting was a difference in the source. Rather than ask every chapter to
# be rewritten, a run that IS an equation is promoted to a display line here.
#
# The test is deliberately narrow, because turning prose into a display
# equation is worse than leaving an equation in prose:
#   * it must contain a relation sign
#   * it must contain NO Devanagari — one Hindi word and it is a sentence
#     about an equation, not an equation
#   * it must be at least 8 characters, so `E = 0` stays in its sentence
_EQ_RUN_RE = re.compile(
    r'(?<![^\s;:।(])'
    r'([^ऀ-ॿ;।\n]{8,}?[=≈≡∝][^ऀ-ॿ;।\n]{2,}?)'
    r'(?=[;।\n]|$)')


def _equation_runs(text):
    """`prose … F = ma … prose` -> [(piece, is_equation)]."""
    out, last = [], 0
    for m in _EQ_RUN_RE.finditer(text or ""):
        seg = m.group(1).strip()
        # A run that is mostly words with an `=` in it is not an equation.
        if len(re.findall(r'[A-Za-z]{4,}', seg)) >= 3:
            continue
        if m.start(1) > last:
            out.append((text[last:m.start(1)], False))
        out.append((seg, True))
        last = m.end(1)
    if last < len(text or ""):
        out.append((text[last:], False))
    return out


# An enumerated run INSIDE one paragraph: ` i) … ii) … iii) … iv) …`, or
# `A. … B. … C. … D. …`. Requires three or more of the same family, because
# two could be a citation ("समी (i) व (ii) से").
_ENUM_ROMAN_RE = re.compile(r'(?:(?<=\s)|(?<=^))((?:i{1,3}|iv|vi{0,3}|ix|x)\))\s')
_ENUM_ALPHA_RE = re.compile(r'(?:(?<=\s)|(?<=^))([A-H]\.)\s')


def _split_enumerated_run(text):
    """`lead: i) A ii) B iii) C` -> [lead, 'i) A', 'ii) B', 'iii) C'].

    Returns [] when the paragraph is not an enumerated run.

    A question that asks for four reactants gets four reactions, and the
    source writes all four on ONE line. Set as one paragraph they ran
    together — four equations in a single sentence, wrapping wherever the
    line broke. One per line is how the question is asked and how it is
    answered.

    The MCQ form is the same defect from the other direction: `A.`–`D.` are
    on their own source lines, and `_para_run` glued them into the stem.
    Whichever way they arrive, they leave here as separate blocks.
    """
    t = (text or "").strip()
    if not t:
        return []
    for rx in (_ENUM_ROMAN_RE, _ENUM_ALPHA_RE):
        marks = list(rx.finditer(t))
        if len(marks) < 3:
            continue
        # They must be in order, or this is prose that happens to cite them.
        labels = [m.group(1).rstrip(').').lower() for m in marks]
        if len(set(labels)) != len(labels):
            continue
        out = []
        lead = t[:marks[0].start()].strip()
        if lead:
            out.append(lead)
        for i, m in enumerate(marks):
            stop = marks[i + 1].start() if i + 1 < len(marks) else len(t)
            seg = t[m.start():stop].strip()
            if seg:
                out.append(seg)
        return out
    return []


def split_enumerations(doc):
    """One enumerated item per block — see `_split_enumerated_run`."""
    if not _PROFILE.get("split_enumerations"):
        return doc

    def rewrite(blocks):
        out = []
        for b in blocks or []:
            if isinstance(b, dict):
                for key in ("children", "blocks", "asides"):
                    if b.get(key):
                        b[key] = rewrite(b[key])
            if not isinstance(b, dict) or b.get("kind") not in ("para", "answer"):
                out.append(b)
                continue
            segs = _split_enumerated_run(str(b.get("text", "")))
            if not segs:
                out.append(b)
                continue
            first = True
            for seg in segs:
                if first:
                    out.append(dict(b, text=seg))
                    first = False
                else:
                    out.append(node("para", text=seg))
        return out

    for part in doc.get("parts") or []:
        part["children"] = rewrite(part.get("children"))
    return doc


def promote_equations(doc):
    """Give a bare equation inside an answer a display line of its own."""
    if not _PROFILE.get("promote_equations"):
        return doc

    def rewrite(blocks):
        out = []
        for b in blocks or []:
            if isinstance(b, dict):
                for key in ("children", "blocks", "asides"):
                    if b.get(key):
                        b[key] = rewrite(b[key])
            if not isinstance(b, dict) or b.get("kind") not in ("para", "answer"):
                out.append(b)
                continue
            parts = _equation_runs(str(b.get("text", "")))
            if not any(eq for _, eq in parts) or len(parts) < 2:
                out.append(b)
                continue
            done = b["kind"] != "answer"
            kept = []
            for piece, eq in parts:
                # THE DANDA IS PART OF THE WORD.
                #
                # `।` is U+0964, inside the Devanagari block, so the integrity
                # checker tokenises `होगा।` as ONE word. Stripping it here
                # turned that into `होगा` and the token no longer matched:
                # `होगा।` and `m।` were reported vanished the moment equation
                # promotion started splitting sentences.
                #
                # A danda left at the head of a piece belongs to the sentence
                # BEFORE it, so it is moved back onto that block rather than
                # printed floating at the start of a line.
                t = piece.strip(" \t—–-;")
                while t.startswith("।"):
                    if kept:
                        kept[-1] = dict(kept[-1],
                                        text=(kept[-1].get("text", "") + "।"))
                    t = t[1:].strip(" \t—–-;")
                if not t:
                    continue
                if eq:
                    if not done:
                        kept.append(dict(b, text=""))
                        done = True
                    kept.append(node("formula", text=t))
                elif not done:
                    kept.append(dict(b, text=t))
                    done = True
                else:
                    kept.append(node("para", text=t))
            out.extend(kept or [b])
        return out

    for part in doc.get("parts") or []:
        part["children"] = rewrite(part.get("children"))
    return doc


def promote_reactions(doc):
    """Give every complete reaction a display line of its own.

    Gated on the profile: only a subject whose notation HAS reactions. Runs
    as a post-pass over the finished IR rather than at each of the four
    places a `para` or an `answer` is emitted.
    """
    if not _PROFILE.get("reactions"):
        return doc

    def rewrite(blocks):
        out = []
        for b in blocks or []:
            if not isinstance(b, dict):
                out.append(b)
                continue
            for key in ("children", "blocks", "asides"):
                if b.get(key):
                    b[key] = rewrite(b[key])
            # EITHER DELIMITER. The revision half writes its reactions in
            # BACKTICKS and the answers write them in `$...$`; this guard
            # looked for `$` alone (through a concatenation that could never
            # have worked), so every backtick reaction was skipped — which is
            # most of them, and they are the ones sitting inline in a
            # sentence where a three-row arrow grid breaks the line.
            if (b.get("kind") not in ("para", "answer")
                    or not re.search(r'[$`]', str(b.get("text", "")))):
                out.append(b)
                continue
            parts = _split_reactions(b.get("text", ""))
            # `len(parts) < 2` EXCLUDED THE BEST CASE.
            #
            # A block whose whole text IS one reaction gives exactly one part,
            # and it is the block that most needs a display line — it has no
            # prose around it to keep it company. The guard was meant to skip
            # pointless rewrites and skipped 43 whole-reaction paragraphs
            # instead, leaving them inline in prose where the line breaker put
            # one molecule on the next line.
            if not any(isrx for _, isrx in parts):
                out.append(b)
                continue
            # THE ANSWER BADGE SURVIVES THE SPLIT.
            #
            # When the answer's whole text IS the reaction, the first piece
            # is the reaction — so emitting it as a `formula` and moving on
            # dropped the `answer` node entirely, and four of chapter 6's
            # answers lost their उत्तर badge. The question/answer counts
            # stopped matching, which is the one invariant this pipeline
            # checks hardest. The answer is always emitted, with empty text
            # if the reaction was all it had.
            emitted_answer = b["kind"] != "answer"
            kept = []
            for piece, isrx in parts:
                txt = piece if isrx else piece.strip(" —–-")
                if not txt.strip(" $`"):
                    continue
                if isrx:
                    if not emitted_answer:
                        kept.append(dict(b, text=""))
                        emitted_answer = True
                    kept.append(node("formula", text=txt))
                elif not emitted_answer:
                    kept.append(dict(b, text=txt))
                    emitted_answer = True
                else:
                    kept.append(node("para", text=txt))
            out.extend(kept or [b])
        return out

    for part in doc.get("parts") or []:
        part["children"] = rewrite(part.get("children"))
    return doc


def assign_accents(doc):
    """Six-accent rotation, nudged so no two adjacent items share one.

    The rotation is what makes the book read as one system: a section's
    `.secno` border, its `.swipe` fill and its bullet dots all take the
    same accent, and neighbours never collide. Returns the last index
    used, so a later pass (`_regroup_by_qtype`) can continue the same
    rotation rather than restarting it."""
    n = 6
    prev = -1
    for part in doc["parts"]:
        for ch in part.get("children", []):
            if ch["kind"] == "section":
                a = (prev + 1) % n
                ch["accent"] = a
                prev = a
            elif ch["kind"] == "qgroup":
                for q in ch.get("children", []):
                    if q["kind"] == "question":
                        a = (prev + 1) % n
                        q["accent"] = a
                        prev = a
    return prev


# THE FINALISED EDITION POOLS PART 2 BY QUESTION FORMAT, NOT BY TOPIC.
#
# `content/physics_chap2.md` nests every topic's question bank as
# ऑब्जेक्टिव -> लघु उत्तरीय -> दीर्घ उत्तरीय (see `RE_QTYPE_H4`), one bank
# per topic — so today's parser builds one `qgroup` per TOPIC, each
# holding a flat run of questions of every format in source order. The
# reference instead gives Part 2 one banner per FORMAT — बहुविकल्पीय /
# अतिलघु उत्तरीय / लघु उत्तरीय-I / लघु उत्तरीय-II / विस्तृत उत्तरीय — each
# pooling every topic's questions of that format, newest year first.
#
# ऑब्जेक्टिव splits again into MCQ vs very-short-answer by whether the
# question actually carries an `options` block — "ऑब्जेक्टिव" labels both
# in the source, and only the question's own shape tells them apart.
# लघु उत्तरीय splits by its own marks value (2 अंक vs 3 अंक). दीर्घ उत्तरीय
# does not split — the reference shows one "विस्तृत उत्तरीय" banner for
# both its 4- and 5-mark questions.
#
# NOT MODELLED: the reference's sixth banner, "आंकिक प्रश्न" (numerical),
# which cuts across mark values by question CONTENT rather than by any
# authored label or marks value this parser can read confidently — a
# numerical question stays in its natural marks-based bucket instead of
# being guessed into a bucket that might be wrong.
_QTYPE_BUCKETS = [
    # (match against `qtype`,      test on the question,              label)
    ("ऑब्जेक्टिव",   lambda q, has_opts: has_opts,
     "बहुविकल्पीय प्रश्न (1 अंक)"),
    ("ऑब्जेक्टिव",   lambda q, has_opts: not has_opts,
     "अतिलघु उत्तरीय प्रश्न (1 अंक)"),
    ("लघु उत्तरीय", lambda q, has_opts: (q.get("marks") or 0) <= 2,
     "लघु उत्तरीय प्रश्न-I (2 अंक)"),
    ("लघु उत्तरीय", lambda q, has_opts: (q.get("marks") or 0) > 2,
     "लघु उत्तरीय प्रश्न-II (3 अंक)"),
    ("दीर्घ उत्तरीय", lambda q, has_opts: True,
     "विस्तृत उत्तरीय प्रश्न (5 अंक)"),
]


def _qtype_bucket(q, has_opts):
    raw = (q.get("qtype") or "").strip()
    if not raw:
        return None
    raw = re.sub(r'\s+', ' ', raw)
    for key, test, label in _QTYPE_BUCKETS:
        if raw.startswith(key) and test(q, has_opts):
            return label
    return None


def _year_sort_key(q):
    y = q.get("year") or ""
    # Newest year first; a question with no year (an "अतिरिक्त" numerical
    # one, say) sorts after every dated one, in source order among itself.
    return (0, -int(y)) if y.isdigit() else (1, 0)


def _regroup_by_qtype(children, start_accent, part_label="", part_sub=""):
    """Part 2's topic-grouped `qgroup`s -> one `qgroup` per question
    format, each format's questions pooled across every topic and sorted
    newest-year-first. A no-op — returns `children` unchanged — unless at
    least one question actually carries a `qtype` (this chapter's dialect
    uses the `#### 🅾️/✏️/📝` dividers at all); every other chapter's
    Part 2 keeps parsing exactly as it always has."""
    buckets = {}   # label -> [question, …], insertion order == bucket order
    order = []
    others = []    # non-qgroup children (loose leading content) untouched
    any_tagged = False
    for ch in children:
        if ch["kind"] != "qgroup" or ch.get("_banner_only"):
            others.append(ch)
            continue
        for q in ch.get("children", []):
            if q["kind"] != "question":
                continue
            has_opts = any(b.get("kind") == "options" for b in q.get("blocks", []))
            label = _qtype_bucket(q, has_opts)
            if label is None:
                continue
            any_tagged = True
            if label not in buckets:
                buckets[label] = []
                order.append(label)
            buckets[label].append(q)
    if not any_tagged:
        return children

    n = 6
    prev = start_accent
    out = list(others)
    canon_order = [lbl for _, _, lbl in _QTYPE_BUCKETS]
    sorted_labels = sorted(order, key=lambda l: canon_order.index(l))
    order_first = sorted_labels[0]
    for label in sorted_labels:
        qs = sorted(buckets[label], key=_year_sort_key)
        a = (prev + 1) % n
        prev = a
        kids = []
        last_year = object()
        for q in qs:
            q["accent"] = a
            y = q.get("year") or "बिना वर्ष"
            if y != last_year:
                kids.append(node("qgroup", label=y, children=[],
                                 _year_marker=True))
                last_year = y
            kids.append(q)
        out.append(node("qgroup", label=label, banner="", note="",
                        children=kids, _qtype_banner=True, accent=a,
                        part_label=part_label if label == order_first else "",
                        part_sub=part_sub if label == order_first else ""))
    return out


def hoist_cards(doc):
    """Pull every `card` out of the linear flow into its part's aside pool.

    A card is a sticky note that floats BESIDE the text. Left in the flow
    it renders full-width and the page stops looking like the book. Cards
    appear at two depths in the markdown (inside a section, and loose
    between sections), so this sweeps both rather than handling one and
    quietly mis-rendering the other."""
    for part in doc["parts"]:
        pool = []

        # Which part child the sweep is currently inside, so a card can
        # remember it.
        home = [-1]

        def sweep(container, key):
            kept = []
            for n in container.get(key) or []:
                if n["kind"] == "card":
                    n["_home"] = home[0]
                    pool.append(n)
                    continue
                for sub in ("blocks", "children"):
                    if sub in n:
                        sweep(n, sub)
                if n.get("asides"):
                    for a in n["asides"]:
                        if a["kind"] == "card":
                            a["_home"] = home[0]
                            pool.append(a)
                    n["asides"] = []
                kept.append(n)
            container[key] = kept

        def sweep_part():
            kept = []
            for i, n in enumerate(part.get("children") or []):
                home[0] = i
                if n["kind"] == "card":
                    n["_home"] = i
                    pool.append(n)
                    continue
                for sub in ("blocks", "children"):
                    if sub in n:
                        sweep(n, sub)
                if n.get("asides"):
                    for a in n["asides"]:
                        if a["kind"] == "card":
                            a["_home"] = i
                            pool.append(a)
                    n["asides"] = []
                kept.append(n)
            part["children"] = kept

        sweep_part()
        # WHERE each note came from, kept alongside the pool.
        #
        # The sweep flattens every card into one part-level list and clears
        # each section's own `asides`, so the association with the section it
        # belonged to was simply gone. The single-column layout does not miss
        # it — the packer deals the pool down the margin column one note per
        # page — but a two-column layout has no margin column and had nothing
        # to go on, so all five notes of a part rendered in a stack at the very
        # end of it.
        #
        # `_home` is the index of the part child the card was found inside, or
        # -1 for one that was loose between sections.
        for c in pool:
            c.setdefault("_home", -1)
        part["asides"] = pool


RE_COND = re.compile(r'\*\*\s*शर्त\s*[:：]?\s*\*\*\s*(.*)$')


def _split_outside_code(text, sep):
    """Split on `sep` (one character), ignoring occurrences inside `backticks`.

    `·` separates a formula from its caption, but it is also a legal part of
    the formula: ``R = ρ · l/A`` split blindly gave the box `R = ρ` and a
    caption beginning with a stray backtick and `l/A`.
    """
    out, buf, in_code = [], [], False
    for ch in text:
        if ch == "`":
            in_code = not in_code
            buf.append(ch)
        elif ch == sep and not in_code:
            out.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
    out.append("".join(buf))
    return out


def _split_formula_bullet(text):
    r"""`\`expr\` · caption · **शर्त:** cond`  ->  (expr, caption, cond).

    The reference sets each of these three parts differently — the formula
    in a bordered box, the caption as plain text under it, the condition on
    a coloured left rule — so they have to be separated here rather than
    printed as one run-on bullet."""
    cond = ""
    # CHOOSE THE SEPARATOR ONCE, and prefer the colon.
    #
    # `·` is the separator in chapter 3 and a MULTIPLICATION SIGN in prose:
    # chapter 4 closes a शर्त with `M = I·A`, and splitting on `·` first cut
    # the row there — the `A` became the caption and formula, caption and
    # शर्त all stayed jammed in the bordered box together.
    #
    # A COLON WITH SPACES BOTH SIDES cannot be mistaken for anything else:
    # `**शर्त:**` and `मात्रक टेस्ला (T) = …` carry colons, but with no space
    # before them. So a row that has one is a colon-separated row, and `·`
    # is left alone as part of the maths.
    by_colon = _split_outside_code(
        re.sub(r'(?<=\s):(?=\s)', "\u241f", text), "\u241f")
    parts = [p.strip() for p in
             (by_colon if len(by_colon) > 1
              else _split_outside_code(text, "·"))]
    keep = []
    for p in parts:
        m = RE_COND.match(p)
        if m:
            cond = m.group(1).strip()
        else:
            keep.append(p)
    expr = keep[0] if keep else text
    expr = expr.strip("` ")
    caption = " · ".join(keep[1:]).strip()
    return expr, caption, cond


def fold_formula_cards(doc):
    """`**सूत्र:**` followed by a bullet list becomes ONE formula card.

    Left as a definition plus bullets it renders as ordinary prose; the
    reference gives it the bordered सूत्र panel, which is the most
    recognisable block on a Part-1 page."""
    from ..core.ir import walk
    n = 0
    for holder in walk(doc.get("parts", [])):
        blocks = holder.get("blocks")
        if not blocks:
            continue
        out, i = [], 0
        while i < len(blocks):
            b = blocks[i]
            is_head = (b.get("kind") == "definition"
                       and "सूत्र" in (b.get("term") or "")
                       and not (b.get("text") or "").strip())
            if is_head and i + 1 < len(blocks) and blocks[i + 1].get("kind") == "bullets":
                rows = [_split_formula_bullet(t) for t in blocks[i + 1]["items"]]
                out.append(node("formula_card", title=b.get("term") or "सूत्र",
                                rows=[list(r) for r in rows]))
                n += 1
                i += 2
                continue
            out.append(b)
            i += 1
        holder["blocks"] = out
    return n


def derive_group_summary(doc):
    """One `कुल N प्रश्न · M अंक` tag per group.

    The reference has exactly 17 `.marktag`s for 17 groups — it is a GROUP
    SUMMARY, not a per-marks band. Inserting a band at every marks change
    produced 55 tags for the same content and broke the rhythm of the page.
    The numbers are counted from the IR, so this holds for any grouping."""
    for part in doc["parts"]:
        for ch in part.get("children", []):
            if ch["kind"] != "qgroup":
                continue
            qs = [q for q in ch.get("children", []) if q["kind"] == "question"]
            if not qs:
                continue
            marks = sum((q.get("marks") or 0) for q in qs)
            ch["summary"] = ("कुल %d प्रश्न · %g अंक" % (len(qs), marks)
                             if marks else "कुल %d प्रश्न" % len(qs))


def derive_marks_bands(doc):
    """Insert a `marks_band` wherever the marks value changes inside a group.

    The MD never states these bands — questions are simply sorted by marks
    within a year. The design requires the yellow `.marktag` that opens
    each run, so the parser synthesises it. This is the ONE place the
    parser adds structure rather than recognising it."""
    for part in doc["parts"]:
        for ch in part.get("children", []):
            if ch["kind"] != "qgroup":
                continue
            out, last = [], object()
            for q in ch["children"]:
                if q["kind"] == "question":
                    label = q.get("marks_label")
                    if label and label != last:
                        out.append(node("marks_band", label=label))
                        last = label
                out.append(q)
            ch["children"] = out


# ==========================================================================
# ENTRY POINT
# ==========================================================================
# An HTML comment is never content.
#
# The maths chapter opens with 1084 characters of production notes inside
# `<!-- … -->` — token counts, which lines were left untranslated, why. All
# of it was parsed as prose and printed in the book, and because the notes
# discuss LaTeX (`\command`, `sin → \sin`) they also accounted for most of
# the 681 stray-backslash findings in the render scan.
#
# Removed for every subject. There is no reading of a markdown comment on
# which it belongs on the page.
_COMMENT_RE = re.compile(r'<!--.*?-->', re.S)


def parse(path, report=False, subject=None):
    src = io.open(path, encoding="utf-8").read()
    # `lstrip` MATTERS HERE, and it is not tidiness.
    #
    # Removing the comment left two blank lines before the chapter's `# H1`.
    # `_split_on` then produced a leading segment with no header and a body
    # of whitespace, which became a part — so by the time the real `# अध्याय
    # 3` line was reached, `doc["parts"]` was no longer empty and the
    # front-matter branch (which requires it to be) was skipped.
    #
    # The whole cover went with it: the maths chapter opened on a bare
    # heading and its index tables instead of the analytics page physics and
    # biology get, and nothing reported an error because every part was
    # simply classified `body`.
    src = _COMMENT_RE.sub("", src).lstrip("\ufeff \t\r\n")
    # WHICH SUBJECT'S RULES APPLY. Detected from the notation unless the
    # caller names one — see book/subjects. Not a close call on any real
    # chapter: the physics chapter carries 583 LaTeX commands and 1537
    # inline-maths spans, the biology one none and fifteen.
    prof = set_profile(subject or _subjects.detect(src))
    if report:
        sys.stderr.write("md_reader: subject=%s\n" % prof["name"])
    # CRLF IS NOT A DIALECT, IT IS AN ENCODING DETAIL — STRIP IT HERE.
    #
    # A chapter edited on Windows (or round-tripped through a tool that
    # rewrites line endings) arrives with `\r\n`. Splitting on `\n` alone
    # leaves a trailing `\r` on EVERY line, and every regex in this file that
    # anchors with `$` then has to match it: `RE_H1`'s `(.*)$` swallows the
    # `\r` into the chapter title, a marks chip `[1 अंक]\r` stops matching
    # `RE_MARKS_TRAILING`, and `ln.strip() == "$$"` — the display-block
    # toggle — is false for `"$$\r"`. None of it errors; the chapter simply
    # parses as if half its constructs were not there.
    #
    # `physics_edited.md` is the first source to arrive this way.
    lines = src.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    stats = dict(total=len([l for l in lines if l.strip()]), consumed=0)

    parts_raw = _split_on(lines, lambda l: RE_H1.match(l) is not None)

    chapter = dict(num="", title="", raw="")
    doc = dict(meta=dict(source=os.path.basename(path), subject=prof["name"]),
               chapter=chapter, parts=[])

    for head, body in parts_raw:
        label = RE_H1.match(head).group(1).strip() if head else ""
        if head:
            stats["consumed"] += 1
        if head and not doc["parts"] and re.search(r'अध्याय|Chapter', label):
            chapter["raw"] = label
            mm = re.match(r'^\s*(?:अध्याय|Chapter)\s*([\d.]+)\s*[:：]?\s*(.*)$', label)
            if mm:
                chapter["num"], chapter["title"] = mm.group(1), mm.group(2).strip()
            else:
                chapter["title"] = label
            # front matter: everything before the first real part
            h2 = _split_on(body, lambda l: RE_H2.match(l) is not None)
            # A CHAPTER MAY OPEN ITS ANALYTICS AT `###`, WITH NO `##` AT ALL.
            #
            # `render_cover` starts with `secs = [c for c in front.children
            # if c.kind == "section"]` and returns None when that list is
            # empty — no cover, no error. A `section` in the front matter is
            # only ever made from a `##`, so a chapter that goes straight
            # from the `#` chapter title to `###` produces none: chapter 2
            # writes `# अध्याय 2` then `### 🎯 वो 12 अंक …` with no `##`
            # anywhere, all three analytics headings fell through to the
            # flat scanner — which has no `###` rule — and came out as plain
            # `para`. The chapter printed its cover as loose paragraphs and
            # a bare table, with none of `cvhero`/`cvcard`/`cvrow` that
            # every other chapter's cover is built from.
            #
            # When no `##` exists, `###` IS the top level of this front
            # matter, so split on it instead. Chapters that do write `##`
            # are untouched — the fallback only fires when the H2 split
            # found nothing to split on.
            _front_rx = RE_H2
            if not any(h for h, _ in h2) and any(RE_H3.match(l) for l in body):
                h2 = _split_on(body, lambda l: RE_H3.match(l) is not None)
                _front_rx = RE_H3
            kids = []
            front_sub = ""
            for h, b in h2:
                if h is None:
                    kids.extend(_Scanner(b, stats).run())
                    continue
                stats["consumed"] += 1
                h2_title = _front_rx.match(h).group(1).strip()
                # `##` and `###` are a HIERARCHY in the front matter too.
                # Chapter 3 writes each analytics block as its own `##`;
                # chapter 4 nests six `###` under a single `## नक़्शा`. Read
                # flat, all six collapsed into ONE section: their titles were
                # dropped (the scanner has no `###` rule) and the cover — which
                # builds one card per SECTION — had a single card to make from
                # four tables, so three tables and a list never reached a page.
                # Only when `##` is the section level can `###` nest under
                # it. If the fallback above already made `###` the section
                # level, splitting on it again would re-split a section on
                # its own heading.
                h3 = (_split_on(b, lambda l: RE_H3.match(l) is not None)
                      if _front_rx is RE_H2 else [(None, b)])
                if any(h3h for h3h, _ in h3):
                    # The `##` line is the COVER PAGE's own title — "अध्याय 4
                    # का नक़्शा, पढ़ना शुरू करने से पहले एक पेज". Splitting the
                    # `###` blocks out of it discarded that line entirely.
                    front_sub = front_sub or h2_title
                    for h3h, h3b in h3:
                        if h3h is None:
                            # The lead-in before the first `###` — usually the
                            # pull-quote. Loose, so render_cover collects it as
                            # a note and the first `###` stays secs[0], which
                            # is where the cover reads its mark count from.
                            kids.extend(_Scanner(h3b, stats).run())
                            continue
                        stats["consumed"] += 1
                        kids.append(node("section", num="",
                                         title=RE_H3.match(h3h).group(1).strip(),
                                         en="", pyq=[], accent=0,
                                         blocks=_Scanner(h3b, stats).run(),
                                         asides=[]))
                    continue
                kids.append(node("section", num="", title=h2_title,
                                 en="", pyq=[], accent=0,
                                 blocks=_Scanner(b, stats).run(), asides=[]))
            doc["parts"].append(node("part", label="", sub=front_sub,
                                     children=kids, role="front"))
            continue
        doc["parts"].append(_build_part(head, body, stats))

    # `## 🪞 आईना` and friends can trail the last part — promote them
    for part in doc["parts"]:
        part.setdefault("role", "body")

    hoist_cards(doc)
    fold_formula_cards(doc)
    split_enumerations(doc)
    promote_reactions(doc)
    promote_equations(doc)
    draw_structures(doc)
    attach_captions(doc)
    _last_accent = assign_accents(doc)
    for _part in doc["parts"]:
        _part["children"] = _regroup_by_qtype(
            _part.get("children", []), _last_accent,
            _part.get("label", ""), _part.get("sub", ""))
    derive_group_summary(doc)

    if report:
        doc["_stats"] = stats
    return doc


if __name__ == "__main__":
    import json
    d = parse(sys.argv[1], report=True)
    from ir import count_kinds
    print(json.dumps(d["chapter"], ensure_ascii=False))
    for p in d["parts"]:
        print("PART %-34r role=%-6s children=%d" % (p["label"][:34], p.get("role"), len(p["children"])))
    print(dict(count_kinds(d["parts"])))
    print("lines: %d/%d consumed" % (d["_stats"]["consumed"], d["_stats"]["total"]))
