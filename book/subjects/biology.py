# -*- coding: utf-8 -*-
"""
BIOLOGY — what the physics profile gets wrong, and why.

Each entry below corresponds to a defect measured in the first biology build
(build/bio-01-cols.html, 41 pages, produced with no pipeline changes at all).
"""

PROFILE = {
    "name": "biology",
    "label": "जीव विज्ञान",

    # A BACKTICK RUN IS A SEQUENCE, NOT MATHS.
    #
    # This is the single most consequential difference. Biology's `**क्रम:**`
    # and `**संबंध:**` lines carry process chains:
    #
    #     `बीजाणुजन ऊतक → पराग मातृ कोशिका → लघुबीजाणु चतुष्क → परागकण`
    #
    # Sent down the maths path — which is what physics wants — five Hindi
    # nouns came out in an italic Georgia maths face with the arrows wrapped
    # as upright operators. Fourteen of the chapter's twenty-nine inline-maths
    # runs were Hindi prose; the longest ran to 213 characters. A chain is not
    # an equation and must not borrow an equation's face.
    "backticks": "sequence",

    # Biology's recurring rubric. Physics asks for a formula and what is
    # given; biology asks what to identify, in what order it happens, how it
    # is built, and what relates to what. Each earns a component, the way
    # सूत्र does in physics.
    "rubric": {
        "क्रम": "flow",          # a process chain — the flowchart
        "संबंध": "flow",         # a relation, also a chain
        "पहचान": "identify",     # what to name in an answer
        "संरचना": "structure",   # how the thing is built
    },

    # NO सूत्र PANELS AT ALL — there were zero in the whole chapter, so the
    # splitter that reclaimed a thousand pixels a page in physics had nothing
    # to divide, and biology's first build carried a 1026px worst hole against
    # physics's 436. Its reclaimable space is in lists and tables instead:
    # options (41), numbered (14), table (10), bullets (4).
    # `numbered` is NOT here despite being a list. An `<ol>` continuation
    # restarts at 1, and a wrong number is worse than a hole — it would tell
    # a student that item 4 is item 1. It needs a `start` attribute before it
    # can join this list; there are 14 of them, so it is worth doing.
    "splittable": ("bullets", "options", "table"),

    # FENCED FIGURE INSTRUCTIONS.
    #
    # Biology writes figures as a markdown image plus an italic caption, and
    # adds a ```चित्र-निर्देश``` fence describing what the illustrator should
    # draw. That fence is a NOTE TO THE PRODUCTION TEAM and must never be
    # printed. In the first build all eleven of them were typeset into the
    # student's page — in the maths face, carrying the words चित्र-निर्देश,
    # NCERT and ref:, along with 100 stray backticks.
    "figures": "fenced",

    # No LaTeX anywhere in the chapter: zero `\\frac`, zero `\\vec`, zero
    # `$$`. The validator has nothing to check, and a rule written for
    # physics notation firing here would be a false positive.
    "latex": False,

    # Does a `**label:**` line end the paragraph before it?
    "leadin_breaks": True,
    # Does a ``` fence line end the paragraph before it?
    "fence_breaks": True,
}
