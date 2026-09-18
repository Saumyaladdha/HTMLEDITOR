# -*- coding: utf-8 -*-
"""
ELEMENTS — the catalogue. One directory per element:

    book/elements/<id>/
        spec.json        what it is, when to use it, what signals it
        template.html    the markup shape
        style.css        its CSS, human-readable
        base.rules.json  its CSS rules WITH their original index
        a4.rules.json    …for the A4-only bundle

Two things depend on this being real rather than documentation:

* `bundle()` reassembles the stylesheet FROM these files. Editing one
  element's CSS changes the book and nothing else.
* the tagger agent reads `spec.json` as its vocabulary, so "which element is
  this?" is answered against a catalogue instead of a regex.

CASCADE. Each rule carries the index it had in the reference stylesheet, and
`bundle()` re-sorts by it. Splitting CSS across files and re-joining in
directory order would silently change which rule wins — the order is
semantic, not cosmetic.
"""
import io
import json
import os

DIR = os.path.dirname(os.path.abspath(__file__))


def ids():
    return sorted(d for d in os.listdir(DIR)
                  if os.path.isdir(os.path.join(DIR, d)) and not d.startswith("_"))


def spec(eid):
    f = os.path.join(DIR, eid, "spec.json")
    if not os.path.exists(f):
        return None
    return json.load(io.open(f, encoding="utf-8"))


def specs(eid):
    """All specs an element declares. An element may own a SECONDARY ir_kind
    (`separator` owns both `qsep` and `rule`), declared as spec.<kind>.json,
    so the catalogue covers every kind without inventing a folder for each."""
    out = []
    d = os.path.join(DIR, eid)
    if not os.path.isdir(d):
        return out
    for f in sorted(os.listdir(d)):
        if f == "spec.json" or (f.startswith("spec.") and f.endswith(".json")):
            out.append(json.load(io.open(os.path.join(d, f), encoding="utf-8")))
    return out


def catalogue():
    """-> [spec, …] across every element, including secondary kinds."""
    out = []
    for e in ids():
        out.extend(specs(e))
    return out


def template(eid):
    f = os.path.join(DIR, eid, "template.html")
    return io.open(f, encoding="utf-8").read().strip() if os.path.exists(f) else ""


def bundle(mode="a4"):
    """Reassemble the stylesheet, restoring the reference's cascade order.

    Three tiers, in cascade order:

        base.rules.json   the reference's shared rules
        a4.rules.json     the reference's A4 rules
        extra.css         OUR additions — hand written, never regenerated

    `extra.css` exists because `tools/split_css.py` rebuilds the rules.json
    files FROM the archive, so anything added to them by hand disappears on
    the next split. A `clear:right` rule for wide formula panels was added
    that way and silently vanished; the card kept rendering in one column
    with the class correctly applied and no rule behind it. Additions go
    here, last in the cascade, and survive.
    """
    rules = []
    for eid in ids():
        for label in ("base",) + (("a4",) if mode == "a4" else ()):
            f = os.path.join(DIR, eid, "%s.rules.json" % label)
            if not os.path.exists(f):
                continue
            for r in json.load(io.open(f, encoding="utf-8")):
                rules.append((0 if label == "base" else 1, r["i"], r["css"]))
    rules.sort(key=lambda t: (t[0], t[1]))
    out = [r[2] for r in rules]
    for eid in ids():
        f = os.path.join(DIR, eid, "extra.css")
        if os.path.exists(f):
            out.append("/* --- %s/extra.css --- */" % eid)
            out.append(io.open(f, encoding="utf-8").read().strip())
    return _scale_type("\n".join(out))


def _scale_type(sheet):
    """Apply `tokens.TYPE_SCALE` to every `font-size:Npx` in the sheet.

    Shrinks only, and never below `tokens.TYPE_FLOOR` — a size already at
    or under the floor is left alone rather than dragged down with the
    rest, because those are the captions and chips that are already as
    small as print allows.
    """
    import re
    from ..design import tokens
    scale = float(getattr(tokens, "TYPE_SCALE", 1.0) or 1.0)
    floor = float(getattr(tokens, "TYPE_FLOOR", 0.0) or 0.0)
    if scale >= 1.0:
        return sheet

    def one(m):
        px = float(m.group(1))
        if px <= floor:
            return m.group(0)
        return "font-size:%gpx" % round(max(floor, px * scale), 1)

    return re.sub(r'font-size:\s*([0-9.]+)px', one, sheet)
