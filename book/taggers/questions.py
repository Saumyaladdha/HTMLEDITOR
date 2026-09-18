# -*- coding: utf-8 -*-
"""
QUESTIONS — the question model, separate from the parser that found them.

`readers/markdown.py` recognises a question head; this module works out what
the question actually IS: how many parts, which of them are options, where
the answer starts, what marks are on offer, and how the questions in a group
relate to each other.

Anything it cannot decide it reports, rather than guessing — a question whose
answer got merged into its stem is a content error, and it should surface as
one, not as a slightly odd-looking page.
"""
from collections import Counter, OrderedDict

STRUCTURAL = ("options", "answer", "given", "athava", "marks_band")


def analyse(doc):
    """-> (per-question records, group summaries, problems)."""
    records, groups, problems = [], [], []

    for part in doc.get("parts", []):
        for ch in part.get("children", []):
            if ch["kind"] != "qgroup":
                continue
            qs = [q for q in ch.get("children", []) if q["kind"] == "question"]
            marks = []
            for q in qs:
                kinds = Counter(b["kind"] for b in q.get("blocks", []))
                rec = OrderedDict(
                    id=q.get("id"), group=ch.get("label"), num=q.get("num"),
                    marks=q.get("marks"), year=q.get("year"), set=q.get("set"),
                    khand=q.get("khand"), source=q.get("source"),
                    stars=q.get("stars", 0), fullnote=bool(q.get("fullnote")),
                    has_options=bool(kinds.get("options")),
                    n_option_items=sum(len(b.get("items", []))
                                       for b in q.get("blocks", [])
                                       if b["kind"] == "options"),
                    has_answer=bool(kinds.get("answer")),
                    has_given=bool(kinds.get("given")),
                    has_athava=bool(kinds.get("athava")),
                    n_figures=kinds.get("figure", 0),
                    n_callouts=kinds.get("callout", 0),
                    n_blocks=len(q.get("blocks", [])),
                )
                records.append(rec)
                if q.get("marks") is not None:
                    marks.append(q["marks"])

                # --- the checks that catch real content damage -------------
                if not rec["has_answer"]:
                    problems.append(dict(id=rec["id"], kind="no_answer",
                                         detail="question has no **उत्तर:** block"))
                if rec["marks"] is None:
                    problems.append(dict(id=rec["id"], kind="no_marks",
                                         detail="chip has no parsable marks; "
                                                "the marks band will not open"))
                if rec["has_options"] and rec["n_option_items"] < 2:
                    problems.append(dict(id=rec["id"], kind="thin_options",
                                         detail="only %d option parsed — the stem "
                                                "may have been swallowed"
                                                % rec["n_option_items"]))
                if rec["n_blocks"] == 0:
                    problems.append(dict(id=rec["id"], kind="empty",
                                         detail="question head with no body"))

            # marks should ascend inside a group, or the bands thrash
            asc = all(a <= b for a, b in zip(marks, marks[1:]))
            groups.append(dict(id=ch.get("id"), label=ch.get("label"),
                               n_questions=len(qs),
                               total_marks=round(sum(marks), 2) if marks else 0,
                               marks_sorted=asc,
                               banner=bool(ch.get("banner"))))
            if not asc:
                problems.append(dict(id=ch.get("id"), kind="marks_unsorted",
                                     detail="questions are not in ascending marks "
                                            "order; marks bands will repeat"))
    return records, groups, problems
