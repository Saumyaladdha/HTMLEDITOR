#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""step12_table_formatter — tables, independently.

Isolated on purpose: change the table design and this is the only step,
and `book/components/table.py` the only module, that has to move.
"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _step import args, head, line, finish, artifact                 # noqa: E402
from book.core.ir import walk                                        # noqa: E402
from book.design import tokens                                       # noqa: E402
import re                                                            # noqa: E402


def re_is_num(c):
    return bool(re.match(r"^[\s\d.,·%+\-–—]*$", c or ""))

WIDE_COLS = 5              # beyond this a table will not fit a 449px column
LONG_CELL = 46             # chars — a cell this long forces an ugly wrap

a = args()
doc = artifact.load(a.stem, "08_assigned")
decisions = artifact.read_decisions(a.stem, "step12_table_formatter")

tables, open_items = [], []
for n in walk(doc["parts"]):
    if n.get("kind") != "table":
        continue
    head_row = n.get("head") or []
    rows = n.get("rows") or []
    ncols = max([len(head_row)] + [len(r) for r in rows] or [0])
    longest = max([len(c) for r in rows for c in r] + [0])
    ragged = [i for i, r in enumerate(rows) if len(r) != ncols]

    # left-align the first column when it holds labels rather than numbers
    numeric_first = all(re_is_num(r[0]) for r in rows if r) if rows else False
    align = list(n.get("align") or [])
    if not align:
        align = ["c"] * ncols
    if not numeric_first and ncols > 1:
        align[0] = "l"
    n["align"] = align

    # THE QUEUE'S ID AND THE DECISION'S KEY MUST BE THE SAME STRING.
    #
    # The open item used to publish `artifact.item_id(stem, "tbl", <table id>)`
    # — a hash — while this lookup used the TABLE id (`front.s12.tbl`). An
    # agent answering with the id it was handed therefore keyed its decision
    # under the hash, `decisions.get()` never found it, and the answer was
    # silently discarded: the maths chapter's reading-order table kept the
    # auto-detected `['c','c']` (its 78-char instruction column centred,
    # because a numeric first column suppresses the left-align default) no
    # matter what the agent replied. Nothing errored — the decision file was
    # read, parsed, and matched nothing.
    #
    # The table id is what the queue shows a human and what step04 already
    # guarantees is unique and stable, so it is the id on both sides now.
    d = decisions.get(n.get("id"))
    if d and d.get("align"):
        n["align"] = d["align"]
    # A DECIDED TABLE LEAVES THE QUEUE. Without this it is re-flagged on
    # every run — the flags are shape facts (6 columns, a 78-char cell) that
    # answering cannot change — so the queue never drained and the build
    # could never report anything but REVIEW. Same rule step03 already
    # applies to a tag it has been given.
    # RECORDED AFTER THE DECISION, NOT BEFORE. This summary is what the step
    # PRINTS, and built above the lookup it captured the auto-detected align
    # and reported that — so the run said `front.s12.tbl … align=cc` on the
    # very build where the agent's `['c','l']` had just been applied to the
    # node. The step was working; only its own report was wrong, which is the
    # worst place for a discrepancy to hide.
    tables.append(dict(id=n.get("id"), cols=ncols, rows=len(rows),
                       longest_cell=longest, ragged=len(ragged),
                       align=n["align"], decided=bool(d)))

    if d:
        continue
    if ncols > WIDE_COLS or longest > LONG_CELL or ragged:
        why = []
        if ncols > WIDE_COLS:
            why.append("%d columns — will not fit a %gpx column" % (ncols, tokens.COL_W))
        if longest > LONG_CELL:
            why.append("a cell is %d chars — it will wrap badly" % longest)
        if ragged:
            why.append("%d row(s) have the wrong cell count" % len(ragged))
        open_items.append(dict(id=n.get("id")
                               or artifact.item_id(a.stem, "tbl", longest, ncols),
                               table=n.get("id"), cols=ncols, rows=len(rows),
                               head=head_row, sample=rows[:2],
                               detail="; ".join(why)))

head("step12_table_formatter")
line(True, "tables", "%d" % len(tables))
line(len(open_items) == 0, "fit", "%d need attention" % len(open_items))
for t in tables:
    line(True, t["id"] or "table", "%d cols x %d rows, align=%s"
         % (t["cols"], t["rows"], "".join(t["align"])))

doc["_tables"] = tables
artifact.save(a.stem, "12_tables", doc)
finish(a.stem, "step12_table_formatter", "ok", open_items,
       question="How should this table be set so it fits and reads? Reply "
                "{id, align: ['l','c',...], full_width: bool, note}.",
       tables=len(tables))
