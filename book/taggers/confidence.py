# -*- coding: utf-8 -*-
"""
CONFIDENCE — how sure is the deterministic tagger, and when must an agent decide?

The reader's patterns are good at recognising a block that follows a known
convention and bad at judging an ambiguous one. Measured on real chapters:
option detection went 11 → 129 → 72 against a true 56 while I tuned a regex.
No regex distinguishes

    (iv) दोनों प्रतिरोधों में विभव पतन समान होगा ।     <- an OPTION
    अतः सही कथन (iv) है, विभव पतन समान होगा।          <- PROSE about an option

because the difference is meaning, not shape.

So the reader stops guessing. It scores each block, and anything it cannot
settle goes to `step03_content_tagger`'s agent with its neighbours attached.
The agent's answer is written back to a decisions file and applied on the
next run, so the build stays reproducible and a judgement is made once.

Scores are deliberately blunt — CERTAIN / LIKELY / UNSURE. A finer scale
would imply a precision the signals do not have.
"""
import re

CERTAIN, LIKELY, UNSURE = 1.0, 0.7, 0.3

_DEVA = re.compile(r'[ऀ-ॿ]')
_MATH = re.compile(r'[=∝≈≤≥≠⇒→∮∑∫√]')
_OPT_MARK = re.compile(r'^\(?([ivxIVX]{1,4}|[a-dA-D])\)')

# A block whose kind was decided by an UNAMBIGUOUS marker — a line that
# cannot mean anything else — needs no second opinion.
UNAMBIGUOUS = {
    "answer", "given", "card", "figure", "table", "options",
    "formula_card", "trio", "srcnote", "starbadge", "callout",
    "qsep", "rule", "marks_band", "athava", "simchip",
}


def score(block, prev=None, nxt=None, in_question=False):
    """-> (confidence, reason). Only `para` is genuinely uncertain."""
    k = block.get("kind")
    if k in UNAMBIGUOUS:
        return CERTAIN, "matched an unambiguous marker"
    if k in ("section", "qgroup", "question", "part", "bullets", "numbered"):
        return CERTAIN, "structural"

    text = (block.get("text") or "").strip()
    if k == "formula":
        if not _DEVA.search(text):
            return CERTAIN, "no Devanagari — it is notation"
        return LIKELY, "mostly notation but contains Devanagari"

    if k != "para":
        return LIKELY, "no specific signal"

    # ---- the genuinely ambiguous cases --------------------------------
    if _OPT_MARK.match(text):
        return UNSURE, ("starts with an option marker — is this a CHOICE, or "
                        "prose referring to one?")
    if not _DEVA.search(text) and _MATH.search(text):
        return (UNSURE if len(text) > 26 else LIKELY), \
               "pure notation — working step, display equation, or inline?"
    if len(text) < 25 and text.endswith(":"):
        return UNSURE, "short and ends in a colon — a lead-in for the block below?"
    if text.count("|") >= 3:
        return UNSURE, "pipe-heavy — a table the reader failed to open?"
    if len(text) < 12:
        return UNSURE, "too short to classify from shape alone"
    return CERTAIN, "ordinary prose"


def survey(doc, threshold=LIKELY):
    """-> [(node, confidence, reason)] for everything below `threshold`."""
    from ..core.ir import walk
    out = []
    for part in doc.get("parts", []):
        for ch in part.get("children", []):
            in_q = ch["kind"] in ("qgroup", "question")
            for n in walk([ch]):
                c, why = score(n, in_question=in_q)
                if c < threshold:
                    out.append((n, c, why))
    return out
