# -*- coding: utf-8 -*-
"""
LATEX VALIDATOR — is the maths going to render, or print as backslashes?

`latex_convert.tex()` does the conversion. This module checks the RESULT,
which is a different job and the one that actually caught a bug: when the
old engine was archived the converter stopped importing, a bare
`except: lambda x: x` passed LaTeX straight through, and
`$$\\tau = pE \\sin\\theta$$` printed as literal backslash commands in the
middle of a physics book with no error anywhere.

A converter that silently returns its input is worse than no converter, so
these checks look for evidence of exactly that.
"""
import re

from .latex_convert import tex        # noqa: F401 — kept for callers

# Anything still looking like TeX after conversion did not convert.
RESIDUE = [
    # Private-use sentinels marking a multi-character sub/superscript. If one
    # survives into the page it prints as a tofu box, which is how
    # `\tau_{अधिकतम}` shipped as `τ□अधिकतम□` across a whole chapter.
    ("unreopened_sentinel", '[\ue010-\ue013]'),
    ("backslash_command", r'\\[A-Za-z]{2,}'),
    ("unclosed_brace",    r'(?<!\\)\{[^}]*$'),
    ("stray_dollar",      r'(?<!\\)\$'),
    ("raw_frac",          r'\\frac'),
    ("double_subscript",  r'_\{[^}]*_\{'),
]


def check_text(src):
    """-> list of problems found rendering one string.

    Checks the FULL render path (`format.inline.inline`), not `tex()` alone.
    `tex()` legitimately leaves private-use sentinels behind for a
    multi-character subscript; `inline()` reopens them as <sub>/<sup>. Testing
    the converter in isolation flagged every one of those as a fault and
    reported 29 problems in a book that had none."""
    from ..format.inline import inline as _render
    out = []
    for m in re.finditer(r'\$\$(.+?)\$\$|\$([^$\n]+?)\$', src, re.S):
        raw = m.group(1) or m.group(2) or ""
        try:
            conv = _render("$" + raw + "$")
        except Exception as e:
            out.append(dict(kind="convert_failed", src=raw[:80], detail=str(e)))
            continue
        for name, pat in RESIDUE:
            if re.search(pat, conv):
                out.append(dict(kind=name, src=raw[:80], got=conv[:80],
                                detail="conversion left TeX behind — it will "
                                       "print as-is"))
                break
        if raw.strip() in conv and re.search(r'\\[A-Za-z]', raw):
            out.append(dict(kind="passthrough", src=raw[:80], got=conv[:80],
                            detail="converter returned its input unchanged"))
    return out


def validate(doc):
    """Walk every text-bearing block and check its maths."""
    from ..core.ir import walk
    findings = []
    for n in walk(doc.get("parts", [])):
        for field in ("text", "caption", "desc", "fullnote"):
            v = n.get(field)
            if isinstance(v, str) and "$" in v:
                for p in check_text(v):
                    p.update(id=n.get("id"), field=field, severity="high")
                    findings.append(p)
        for item in (n.get("items") or []):
            if isinstance(item, str) and "$" in item:
                for p in check_text(item):
                    p.update(id=n.get("id"), field="items", severity="high")
                    findings.append(p)
    return findings
