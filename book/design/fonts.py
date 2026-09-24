# -*- coding: utf-8 -*-
"""
FONTS — the book's two typefaces, embedded, never from a CDN.

Lifted verbatim from the reference file's first <style> block:

    Kalam  400   1 x ttf      Devanagari body  (400 ONLY — every bold in
                              the book is SYNTHETIC, and that is the look)
    Caveat 500   12 x woff2   display accent, unicode-range subsets
    STIX Two Text
           400/700/400i
                 9 x woff2   THE NOTATION FACE — see stix.css

The third one was missing for a long time and the omission was invisible.
Maths asked for Georgia, which is a SYSTEM font: the notation was the one
part of this book that rendered differently on different machines, and —
because the packer measures pages in headless Chrome with this same CSS —
a build box without Georgia measured a different book from the one it laid
out. Everything the note below says about Kalam applies to it.

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

_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_PATH = os.path.join(_ROOT, "fonts", "vidyut", "fonts.css")
# The notation face, kept in its own file so regenerating one cannot
# disturb the other.
_MATH_PATH = os.path.join(_ROOT, "fonts", "vidyut", "stix.css")
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
        try:
            _CACHE += "\n" + io.open(_MATH_PATH, encoding="utf-8").read()
        except Exception:
            import sys
            sys.stderr.write(
                "fonts: %s missing — maths will fall back to a system serif "
                "and every measured height in it will shift.\n" % _MATH_PATH)
    return _CACHE


def available():
    return os.path.exists(_PATH)
