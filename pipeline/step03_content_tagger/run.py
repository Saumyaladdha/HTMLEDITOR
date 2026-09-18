#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""step03_content_tagger — confirm the semantic kind of every block.

The deterministic reader classifies what it can. This step scores every
result against the element catalogue and hands anything it cannot settle to
an agent, WITH its neighbours, because the ambiguous cases turn on meaning
rather than shape.
"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _step import args, head, line, finish, artifact                 # noqa: E402
from book.core.ir import walk, KINDS                                 # noqa: E402
from book.taggers import confidence                                  # noqa: E402
from book import elements                                            # noqa: E402
from collections import Counter                                      # noqa: E402

a = args()
doc = artifact.load(a.stem, "02_validated")
decisions = artifact.read_decisions(a.stem, "step03_content_tagger")

nodes = list(walk(doc["parts"]))
counts = Counter(n["kind"] for n in nodes)
cat = {s["ir_kind"]: s for s in elements.catalogue()}

head("step03_content_tagger")
line(True, "catalogue", "%d element(s), %d with an ir_kind" % (len(elements.ids()), len(cat)))
line(True, "kinds", "%d distinct across %d blocks" % (len(counts), len(nodes)))

# --- apply decisions the agent has already made -------------------------
applied = 0
by_id = {}
for n in nodes:
    nid = n.get("id") or n.get("_tid")
    if nid:
        by_id[nid] = n
for nid, d in decisions.items():
    n = by_id.get(nid)
    if n and d.get("kind") in KINDS and d["kind"] != n["kind"]:
        n["kind"] = d["kind"]
        for extra in ("ctype", "layout", "text"):
            if d.get(extra):
                n[extra] = d[extra]
        applied += 1
if applied:
    line(True, "agent decisions", "%d block(s) re-tagged" % applied)

# --- what the reader could not settle ------------------------------------
unsure = confidence.survey(doc)
kinds_without_element = sorted({n["kind"] for n in nodes
                                if n["kind"] not in cat
                                and n["kind"] not in ("part", "section", "qgroup",
                                                      "question", "slot", "work")})
line(len(kinds_without_element) == 0, "catalogue cover",
     "every kind has an element" if not kinds_without_element
     else "no element for: %s" % ", ".join(kinds_without_element))

open_items = []
seq = {id(n): i for i, n in enumerate(nodes)}
for n, conf, why in unsure:
    nid = n.get("id") or artifact.item_id(a.stem, (n.get("text") or "")[:60])
    n["_tid"] = nid
    if nid in decisions:
        continue
    i = seq.get(id(n), 0)
    ctx_before = (nodes[i - 1].get("text") or nodes[i - 1]["kind"]) if i else ""
    ctx_after = (nodes[i + 1].get("text") or nodes[i + 1]["kind"]) if i + 1 < len(nodes) else ""
    open_items.append(dict(
        id=nid, kind="uncertain_tag", current=n["kind"], confidence=conf,
        why=why, text=(n.get("text") or "")[:240],
        before=str(ctx_before)[:110], after=str(ctx_after)[:110]))

# --- the cover's stat tiles -----------------------------------------------
# The reference prints three headline figures as tiles. Reading value/label
# pairs out of free Hindi prose is not something a regex should be trusted
# with, so the deterministic path only detects that comparable figures are
# PRESENT and asks the agent to read them.
from book.assemble import render as _R                               # noqa: E402
if "cover_tiles" not in decisions:
    evidence = []
    for part in doc.get("parts", []):
        if part.get("role") != "front":
            continue
        for sec in part.get("children", []):
            if sec.get("kind") == "section":
                t = _R.tile_candidates(sec)
                if t:
                    evidence.append(t)
    if evidence:
        open_items.append(dict(
            id="cover_tiles", kind="stat_tiles_candidate", current="list",
            text=" ".join(evidence)[:700],
            why="the front matter states three or more comparable figures; the "
                "reference sets them as stat tiles on the cover's last card"))

line(len(open_items) == 0, "uncertain", "%d block(s) below the threshold" % len(open_items))
by_reason = Counter(i["why"].split(" —")[0] for i in open_items)
for r, c in by_reason.most_common(5):
    line(None, "", "%3d  %s" % (c, r[:64]))

doc["_tagging"] = dict(counts=dict(counts), applied=applied, unsure=len(open_items))
artifact.save(a.stem, "03_tagged", doc)
finish(a.stem, "step03_content_tagger", "ok", open_items,
       question="For `uncertain_tag`: decide the true element, reply "
                "[{id, kind, ctype?, layout?}]. For `stat_tiles_candidate`: reply "
                "[{id, tiles:[{value, unit, label, note}]}] reading the figures out "
                "of the prose, or {id, tiles:[]} to leave it as a list. "
                "For each block decide its true element. Reply "
                "[{id, kind, ctype?, layout?}] using ONLY ids from the element "
                "catalogue (book/elements/*/spec.json). Read `before`/`after` — "
                "these turn on meaning, not shape.",
       distinct_kinds=len(counts), applied=applied)
