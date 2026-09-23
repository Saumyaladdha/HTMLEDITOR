# -*- coding: utf-8 -*-
"""
ASSETS — fill reserved slots with real art, later, without moving anything.

No chapter art is generated yet. Every place art will eventually go is
already rendered by `components.slot()` at its FINAL size, so filling a
slot is a pure substitution: the box does not grow, the page does not
reflow, and pagination does not have to be re-run.

    assets/manifest.json
    {
      "doodle-sm":      "doodles/star.png",
      "character":      "decorators/cropped/teacher-callouts/keep-going.png",
      "emblem":         "assets/emblem-atom.svg"
    }

Lookup is by <role> alone. Anything unresolved simply stays an empty
reserved box.

Real figures do NOT go through this file — `components/figure.py` resolves
its own `ref` (a local path or an upload URL, see `util/upload_image.py`)
and renders the photo directly, no manifest involved. This module is only
for the generic decorator `.slot()` placeholders (character art, doodles,
the emblem) that `components/slot.py` emits.

Nothing calls this in the default build. It is the seam the diagram and
doodle generators will plug into, and it exists now so that adding them
later is not a redesign.
"""
import base64
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MANIFEST = os.path.join(ROOT, "assets", "manifest.json")

_SLOT_RE = re.compile(
    r'<div class="(?P<cls>slot[^"]*)" data-slot="(?P<role>[^"]*)" '
    r'style="(?P<style>[^"]*)">(?P<body>.*?)</div>', re.S)


def load_manifest(path=None):
    try:
        return json.load(io.open(path or MANIFEST, encoding="utf-8"))
    except Exception:
        return {}


def _embed(path):
    """-> inline markup for one asset file, or None."""
    full = path if os.path.isabs(path) else os.path.join(ROOT, path)
    if not os.path.exists(full):
        return None
    ext = os.path.splitext(full)[1].lower()
    if ext == ".svg":
        svg = io.open(full, encoding="utf-8").read()
        i = svg.find("<svg")
        return svg[i:] if i >= 0 else None
    mime = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".webp": "image/webp", ".gif": "image/gif"}.get(ext)
    if not mime:
        return None
    b64 = base64.b64encode(open(full, "rb").read()).decode("ascii")
    return '<img src="data:%s;base64,%s" alt="">' % (mime, b64)


def apply(html, manifest=None, verbose=True):
    """Fill every slot the manifest can resolve. Returns (html, filled, total)."""
    man = manifest if manifest is not None else load_manifest()
    if not man:
        return html, 0, html.count('data-slot=')

    filled = [0]
    total = [0]

    def sub(m):
        total[0] += 1
        role = m.group("role")
        if role in man:
            body = _embed(man[role])
            if body:
                filled[0] += 1
                return ('<div class="%s slot--filled" data-slot="%s" style="%s">%s</div>'
                        % (m.group("cls"), role, m.group("style"), body))
        return m.group(0)

    out = _SLOT_RE.sub(sub, html)
    if verbose:
        print("assets: filled %d/%d slot(s)" % (filled[0], total[0]))
    return out, filled[0], total[0]


def report(html):
    """What art this book is still waiting for — grouped by role."""
    from collections import Counter
    c = Counter(m.group("role") for m in _SLOT_RE.finditer(html)
                if "slot--filled" not in m.group("cls"))
    return dict(c)
