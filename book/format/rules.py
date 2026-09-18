# -*- coding: utf-8 -*-
"""
FORMAT RULES — how each semantic kind should be set, as DATA not code.

The point of keeping this as a table is that changing how definitions look,
or making bullets tighter, is a one-line edit here rather than a hunt
through the renderer. Nothing in this file emits markup; it decides
attributes that `format/assignment.py` then hands to a component.

    atomic     may this block be split across a column/page boundary?
    density    how much vertical room it deserves relative to body text
    accent     does it take the section's accent colour?
    emphasis   normal | strong | quiet — drives which component variant

A kind with no rule falls back to DEFAULT and is reported, so a new kind
shows up as a decision to make rather than as a silently plain paragraph.
"""
DEFAULT = dict(atomic=False, density=1.0, accent=False, emphasis="normal")

RULES = {
    # text ---------------------------------------------------------------
    "para":        dict(atomic=False, density=1.0, accent=False, emphasis="normal"),
    "bullets":     dict(atomic=False, density=1.0, accent=True,  emphasis="normal"),
    "numbered":    dict(atomic=False, density=1.0, accent=False, emphasis="normal"),
    "definition":  dict(atomic=False, density=1.05, accent=True, emphasis="strong"),
    "trio":        dict(atomic=True,  density=0.9, accent=False, emphasis="quiet"),
    # maths --------------------------------------------------------------
    "formula":     dict(atomic=True,  density=1.1, accent=False, emphasis="normal"),
    "formula_box": dict(atomic=True,  density=1.2, accent=True,  emphasis="strong"),
    "formula_card":dict(atomic=True,  density=1.3, accent=True,  emphasis="strong"),
    # question parts -----------------------------------------------------
    "options":     dict(atomic=False, density=1.0, accent=False, emphasis="normal"),
    "answer":      dict(atomic=True,  density=1.05, accent=False, emphasis="strong"),
    "given":       dict(atomic=True,  density=1.0, accent=False, emphasis="strong"),
    "athava":      dict(atomic=True,  density=0.9, accent=False, emphasis="quiet"),
    "marks_band":  dict(atomic=True,  density=1.0, accent=False, emphasis="strong"),
    # notes --------------------------------------------------------------
    "callout":     dict(atomic=True,  density=1.1, accent=False, emphasis="strong"),
    "card":        dict(atomic=True,  density=1.2, accent=False, emphasis="strong"),
    "simchip":     dict(atomic=True,  density=0.85, accent=False, emphasis="quiet"),
    "srcnote":     dict(atomic=True,  density=0.85, accent=False, emphasis="quiet"),
    "refbox":      dict(atomic=True,  density=1.0, accent=False, emphasis="normal"),
    "starbadge":   dict(atomic=True,  density=0.8, accent=False, emphasis="quiet"),
    # data & media -------------------------------------------------------
    "table":       dict(atomic=True,  density=1.1, accent=False, emphasis="normal"),
    "figure":      dict(atomic=True,  density=1.0, accent=False, emphasis="normal"),
    # A BRIEF IS NOT CONTENT — it occupies NO vertical room.
    #
    # `figure_brief` holds a ```चित्र-निर्देश``` fence: instructions for
    # whoever draws the figure. `format/assignment.py` lists it in
    # RENDERS_NOTHING, so it maps to no component and prints nothing; step11
    # reads its text to choose art. Every other row here describes how much
    # room a block deserves, and the honest answer for one that renders
    # nothing is none — `density=1.0` (the DEFAULT it was falling back to)
    # claims a full body paragraph's worth of space for a block the page
    # never shows.
    #
    # `atomic=True` for the same reason a `slot` is: it is one indivisible
    # object, and there is nothing inside it a column boundary could fall
    # between.
    "figure_brief":dict(atomic=True,  density=0.0, accent=False, emphasis="quiet"),
    "slot":        dict(atomic=True,  density=1.0, accent=False, emphasis="quiet"),
    # structure ----------------------------------------------------------
    "qsep":        dict(atomic=True,  density=0.4, accent=False, emphasis="quiet"),
    "rule":        dict(atomic=True,  density=0.4, accent=False, emphasis="quiet"),
    "section":     dict(atomic=True,  density=1.2, accent=True,  emphasis="strong"),
    "question":    dict(atomic=False, density=1.0, accent=True,  emphasis="normal"),
    "qgroup":      dict(atomic=False, density=1.0, accent=False, emphasis="normal"),
    "part":        dict(atomic=False, density=1.0, accent=False, emphasis="normal"),
}


def rule_for(kind):
    return dict(RULES.get(kind, DEFAULT))


def apply(doc):
    """Attach a `fmt` dict to every node. -> list of kinds with no rule."""
    from ..core.ir import walk
    unknown = []
    for n in walk(doc.get("parts", [])):
        k = n.get("kind")
        if k not in RULES and k not in [u["kind"] for u in unknown]:
            unknown.append(dict(kind=k, id=n.get("id"),
                                detail="no formatting rule; using DEFAULT"))
        n["fmt"] = rule_for(k)
    return unknown
