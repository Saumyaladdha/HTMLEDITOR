# -*- coding: utf-8 -*-
"""
FONTS — the book's two typefaces, embedded, never from a CDN.

Lifted verbatim from the reference file's first <style> block:

    Kalam  400   1 x ttf      Devanagari body  (400 ONLY — every bold in
                              the book is SYNTHETIC, and that is the look)
    Caveat 500   12 x woff2   display accent, unicode-range subsets

Two reasons this is a file in the repo and not a Google Fonts <link>
(old NIYAM #20):

  1. The build must produce byte-identical output with no network.
  2. Google's Kalam ships weights the reference does not use. Loading
     Kalam 700 gives REAL bold where the reference has synthetic bold,
     and every measured height shifts.

The same CSS must be used when MEASURING as when rendering, or the packer
is measuring a different book from the one it lays out.
"""
import io
import os

_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                     "fonts", "vidyut", "fonts.css")
_CACHE = None

# Only used if the embedded file is missing — flagged loudly, because the
# fallback silently changes every measurement in the book.
CDN_FALLBACK = (
    '@import url("https://fonts.googleapis.com/css2?'
    'family=Caveat:wght@500&family=Kalam:wght@400&display=swap");')


def css():
    global _CACHE
    if _CACHE is None:
        try:
            _CACHE = io.open(_PATH, encoding="utf-8").read()
        except Exception:
            import sys
            sys.stderr.write(
                "fonts: %s missing — falling back to the CDN. Heights will "
                "differ from the reference.\n" % _PATH)
            _CACHE = CDN_FALLBACK
    return _CACHE


def available():
    return os.path.exists(_PATH)
