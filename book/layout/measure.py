# -*- coding: utf-8 -*-
"""
MEASURE — real block heights, cached.

Old NIYAM #11a: measure, never estimate. Character-count estimates were
wrong by up to 100% PER BLOCK in the previous system. The total came out
within 4%, which is worthless — a page break is decided one block at a
time, not in aggregate.

Cache key is (rendered html, width, stylesheet). The stylesheet is in it
because geometry lives there: tightening `.cvstats .cvrow` padding by 4px
changed no HTML at all, so every block came back from the cache at its old
height and the packer kept a decision the new CSS had already invalidated.
Re-measuring after a CSS edit costs one batched Chrome run; a silently
stale height costs a wrong page break, and `.page` is overflow:hidden.
Deliberately NOT a position or an index, so reordering content is free.
"""
import hashlib
import io
import json
import os
import re
import sys

from .probe import block_heights

CACHE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    ".cache", "heights.json")


_CSSFP = {}


def css_fingerprint(mode="a4"):
    """Short hash of the stylesheet the probe will actually apply."""
    if mode not in _CSSFP:
        from ..design import tokens as _theme
        _CSSFP[mode] = hashlib.md5(
            _theme.stylesheet(mode).encode("utf-8")).hexdigest()[:8]
    return _CSSFP[mode]


def key(html, width, mode="a4"):
    return "%s@%s@%s" % (hashlib.md5(html.encode("utf-8")).hexdigest()[:20],
                         width, css_fingerprint(mode))


def load_cache():
    try:
        return json.load(io.open(CACHE_PATH, encoding="utf-8"))
    except Exception:
        return {}


def save_cache(c):
    d = os.path.dirname(CACHE_PATH)
    if d and not os.path.isdir(d):
        os.makedirs(d)
    io.open(CACHE_PATH, "w", encoding="utf-8").write(
        json.dumps(c, ensure_ascii=False, indent=0, sort_keys=True))


def measure(items, width, mode="a4", extra_class="", timeout=300):
    """Attach a real `h` to every item. Only uncached blocks hit the browser."""
    cache = load_cache()
    todo = []
    for it in items:
        it["_key"] = key(it["html"], width, mode)
        if it["_key"] not in cache:
            todo.append(it)

    if todo:
        cells = "".join('<div data-mid="%s" style="width:%spx;">%s</div>'
                        % (it["_key"], width, it["html"]) for it in todo)
        got = block_heights(cells, width, mode=mode, extra_class=extra_class,
                            timeout=timeout)
        if not got:
            raise SystemExit("measure: Chrome returned no measurements — check "
                             "the browser and the scratch dir")
        cache.update(got)
        save_cache(cache)

    missing = 0
    for it in items:
        h = cache.get(it["_key"])
        if h is None:
            # A silent fallback here is how the old system produced wrong pages,
            # so it is loud and counted.
            h = 40 + len(re.sub(r"<[^>]+>", "", it["html"])) // 3
            missing += 1
        it["h"] = int(h)
    if missing:
        sys.stderr.write("measure: %d block(s) fell back to an ESTIMATE\n" % missing)
    return items
