# -*- coding: utf-8 -*-
"""
ASSIGNMENT — which component renders which kind.

One table, one direction: semantic kind -> component name. Keeping it
explicit (rather than an if-chain inside the renderer) means you can read
the whole mapping in one screen, and a kind with no component is a loud
gap rather than a paragraph that silently swallowed a table.

The component NAMES here match `book/components/` exports, so a rename is
caught immediately by `verify()` instead of at render time.
"""
MAP = {
    "para":        "para",
    "bullets":     "bullets",
    "numbered":    "numbered",
    "definition":  "definition",
    "trio":        "trio",
    # Biology's process chain. `flow` sets the stages as upright chips with
    # arrows between them — see components/text.flow.
    "flow":        "flow",
    # Multi-line ASCII matrix art -> side-by-side bracketed grids.
    "matrix_art":  "matrix_art",

    "formula":     "eq",
    "formula_box": "fbox",
    "formula_card": "fcard",
    "options":     "options",
    "answer":      "answer",
    "given":       "given",
    "athava":      "athava",
    "marks_band":  "marktag",
    "callout":     "pointer",
    "card":        "sticky",
    "simchip":     "simchip",
    "srcnote":     "srcnote",
    "refbox":      "refbox",
    "starbadge":   "starline",     # renamed in the finalised edition
    "table":       "table",
    "figure":      "figure",
    "slot":        "slot",
    "qsep":        "qsep",
    "rule":        "qsep",
    "section":     "section_head",
    "question":    "qhead",
    "qgroup":      "year_head",
}


def component_for(kind):
    return MAP.get(kind)


# KINDS THAT RENDER TO NOTHING, ON PURPOSE.
#
# Not the same thing as a kind nobody has mapped yet, and the difference
# matters: an unmapped kind is a defect that loses content, while these are
# metadata the document carries for a later step to read.
#
# `figure_brief` holds a ```चित्र-निर्देश``` fence — instructions for whoever
# draws the figure, which step11 chooses art from and which must never be
# printed. Reporting it as "unassigned; it will not render" made an open
# review item that could never be closed, and a review that is always open is
# a review nobody reads.
RENDERS_NOTHING = {"figure_brief"}


def apply(doc):
    """Attach `component` to every node. -> kinds with no component."""
    from ..core.ir import walk
    missing = []
    for n in walk(doc.get("parts", [])):
        k = n.get("kind")
        c = MAP.get(k)
        if k in RENDERS_NOTHING:
            n["component"] = None
            continue
        if c is None and k not in ("part",) and k not in [m["kind"] for m in missing]:
            missing.append(dict(kind=k, id=n.get("id"),
                                detail="no component assigned; it will not render"))
        n["component"] = c
    return missing


def verify():
    """Every name in MAP must actually exist in book.components."""
    from .. import components as C
    return sorted({c for c in MAP.values() if not hasattr(C, c)})
