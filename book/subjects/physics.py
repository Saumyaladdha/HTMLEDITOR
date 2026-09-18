# -*- coding: utf-8 -*-
"""
PHYSICS — the tested profile.

Everything here states what the pipeline already did before subjects existed,
so switching a physics build to go through a profile must change nothing. That
is verified by rebuilding chapter 4 and diffing the HTML, not by assertion.
"""

PROFILE = {
    "name": "physics",
    "label": "भौतिक विज्ञान",

    # A BACKTICK RUN IS MATHS. `v = u + at` is an equation written without
    # the trouble of dollar signs, and the reference sets it as one.
    "backticks": "maths",

    # The rubric labels that get a component of their own rather than being
    # rendered as an ordinary definition lead-in.
    "rubric": {
        "सूत्र": "formula_card",
        "दिया है": "given",
        "त्रिक": "trio",
        "शर्त": "condition",
    },

    # Which IR kinds may be broken across a column boundary to use the dead
    # space in front of them. A सूत्र panel is a list of formulas, so it can;
    # see book/layout/split.py and render.split_payload.
    "splittable": ("formula_card", "bullets", "options"),

    # Figures are declared inline, with a description the decorator step reads.
    "figures": "inline",

    # `\\vec`, `\\frac`, `$$` — the LaTeX validator has real work to do.
    "latex": True,

    # A BARE EQUATION IN AN ANSWER GETS A DISPLAY LINE.
    #
    # Chapter 4 writes 245 `$$` blocks and reads well. Chapter 1 writes none
    # — its working sits inside the answer sentence as plain text — and got 2
    # display lines in 17 pages against chapter 4's 4.8 per page. Same
    # subject, same renderer, completely different page. See
    # `readers.markdown.promote_equations`.
    "promote_equations": True,

    # Does a `**label:**` line end the paragraph before it? YES.
    #
    # This was False, and it was the wrong answer — it just happened not to
    # matter for chapter 4, whose rubric lines are short. Chapter 1
    # (विद्युत आवेश एवं क्षेत्र) writes four rubric labels in a row:
    #
    #     **क्रम:** `+q, −q आवेश दूरी 2a पर रखें → …`
    #     **पहचान:** वैद्युत द्विध्रुव — … · द्विध्रुव आघूर्ण — … · त्रिक — …
    #     **सूत्र:**
    #     - $E = (1/4πε₀)·2p/r³$ · अक्षीय स्थिति पर क्षेत्र
    #
    # With this False, `_para_run` swallowed all four into ONE paragraph. So
    # the section printed as a single run-together blob — a process chain, an
    # identification list and a triple all in one sentence — and the
    # `**सूत्र:**` label was consumed with them, which is why the section had
    # a सूत्र heading and no सूत्र box under it.
    #
    # Biology, maths and chemistry all set this True; physics was the outlier
    # and there was no reason for it. Turning it on splits those runs in
    # chapter 4 too — its block count goes 1538 -> 1543, which is five
    # paragraphs that were also glued together and should not have been.
    "leadin_breaks": True,
    # Does a ``` fence line end the paragraph before it?
    "fence_breaks": False,
}
