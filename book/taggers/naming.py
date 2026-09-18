# -*- coding: utf-8 -*-
"""
NAMING — a stable, readable id for every block.

Later steps refer to blocks by name: a formatting override, a decorator
placement, an agent decision, a visual-QA finding. Those references have to
survive a rebuild, so the id must be:

    stable   same content in the same place -> same id, every run
    readable `p2.g2026.q4.answer` beats `blk_00417` when you are reading a
             review queue or a diff
    scoped   a duplicate short name inside one parent gets a suffix, never
             a silent collision

Format:  <part>.<container>.<block><#n>
    p1.s1-5.bul2          Part 1, section 1.5, second bullet list
    p2.g2026.q4.answer    Part 2, group 2026, question 4, its answer
    front.s2.tbl1         front matter, second heading, first table
"""
import re
import unicodedata

_ABBR = {
    "para": "p", "bullets": "bul", "numbered": "num", "definition": "def",
    "trio": "trio", "formula": "eq", "formula_box": "fbox", "options": "opt",
    "answer": "answer", "given": "given", "athava": "alt", "marks_band": "band",
    "callout": "note", "card": "card", "simchip": "sim", "srcnote": "src",
    "starbadge": "star", "refbox": "ref", "table": "tbl", "figure": "fig",
    "slot": "slot", "qsep": "sep", "rule": "hr",
}


def _slug(text, maxlen=18):
    t = unicodedata.normalize("NFKD", (text or "").strip())
    t = re.sub(r"[^\wऀ-ॿ.-]+", "-", t, flags=re.U).strip("-").lower()
    return t[:maxlen] or "x"


def assign(doc):
    """Walk the document and set `id` on every node. Returns {id: path}."""
    index = {}

    def name_blocks(blocks, prefix):
        seen = {}
        for b in blocks or []:
            kind = b.get("kind", "blk")
            ab = _ABBR.get(kind, kind[:4])
            if kind == "callout":
                ab = "note-" + b.get("ctype", "x")
            seen[ab] = seen.get(ab, 0) + 1
            n = seen[ab]
            bid = "%s.%s%s" % (prefix, ab, n if n > 1 or ab in ("p", "bul", "eq") else "")
            b["id"] = bid
            index[bid] = dict(kind=kind, part=prefix)
            for sub in ("blocks", "children"):
                if sub in b:
                    name_blocks(b[sub], bid)

    for pi, part in enumerate(doc.get("parts", []), 1):
        role = part.get("role", "body")
        pref = "front" if role == "front" else "p%d" % (pi if role != "front" else 0)
        part["id"] = pref
        index[pref] = dict(kind="part", part=pref)
        for ci, ch in enumerate(part.get("children", []), 1):
            k = ch["kind"]
            if k == "section":
                cid = "%s.s%s" % (pref, _slug(ch.get("num") or str(ci)).replace(".", "-"))
            elif k == "qgroup":
                cid = "%s.g%s" % (pref, _slug(ch.get("label") or str(ci)))
            elif k == "question":
                cid = "%s.q%s" % (pref, ch.get("num", ci))
            else:
                cid = "%s.b%d" % (pref, ci)
            if cid in index:                       # never collide silently
                cid = "%s~%d" % (cid, ci)
            ch["id"] = cid
            index[cid] = dict(kind=k, part=pref)
            name_blocks(ch.get("blocks"), cid)
            name_blocks(ch.get("asides"), cid + ".aside")
            for qi, q in enumerate(ch.get("children", []) or [], 1):
                qk = q["kind"]
                qid = ("%s.q%s" % (cid, q.get("num", qi)) if qk == "question"
                       else "%s.%s%d" % (cid, _ABBR.get(qk, qk[:4]), qi))
                if qid in index:
                    qid = "%s~%d" % (qid, qi)
                q["id"] = qid
                index[qid] = dict(kind=qk, part=pref)
                name_blocks(q.get("blocks"), qid)
        name_blocks(part.get("asides"), pref + ".aside")
    return index
