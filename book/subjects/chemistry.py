# -*- coding: utf-8 -*-
"""
CHEMISTRY — one subject, three dialects, and only one profile.

The obvious design was three profiles: physical, inorganic, organic. It was
wrong, and the measurement says why. Taken across the three chapters supplied
(1 विलयन, 4 d- एवं f-ब्लॉक, 6 हैलोऐल्केन तथा हैलोऐरीन):

                              physical  inorganic   organic
    $...$ inline maths             775        547       987
    $$ display maths               228         92       138
    \\frac                          218          0        14
    \\begin{aligned} numericals      10          1         0
    \\xrightarrow[..]{..}             0         12       107
    \\underset{name}{formula}         2         36       217
    \\overset{+}{atom}                0          0        95
    \\mathrm                        254        431      2126
    unicode subscripts (CH₃)         17         47       335
    ![](structure.png)                3          7        78
    tables                            5          7         8
    \\rightleftharpoons               8          1         5

Read down the columns and there is no clean split. Physical chemistry is
physics — fractions, `aligned` numericals, no reaction arrows. Organic is
almost entirely reaction notation. Inorganic sits in the middle and uses
BOTH: 36 named species and 12 labelled arrows alongside oxidation states and
periodic-trend tables.

But read ACROSS and the profile keys do not differ. All three want maths
backticks, all three want LaTeX validated, all three want `सूत्र` as a panel,
all three break paragraphs on a lead-in. The only thing that varies is how
OFTEN each construct appears — and a profile that switches on frequency is a
profile that mis-detects the chapter which happens to be light on its own
notation. Chapter 4 has twelve reaction arrows; a rule that turned reaction
handling off below some threshold would have destroyed all twelve.

So the three areas are handled by CAPABILITY, not by dialect: reaction
notation is always on, fractions are always on, and a chapter uses what it
uses. `reactions: True` is the flag, and it is the exact analogue of maths's
`matrices: True` — both mark notation that is TWO-DIMENSIONAL and must not
reach the linear scanner in `format/inline`. See `format/reaction.py`.

WHAT THIS PROFILE INHERITS UNCHANGED, and why that is the point: the reader,
the packer, the paginator, the splitter, the decorators and every QA step.
Chapter 6 parsed into its blocks with no reader change at all. A forked
chemistry pipeline would have needed each of the ten bugs fixed during the
maths build applied a second time, and would have drifted the first time one
was forgotten.

THE ONE THING MEASURED AND NOT FIXED: structures arrive as IMAGES. All 78
organic structures are `![चित्र 6.n](source_figures/*.png)` — benzene rings,
skeletal formulae, Newman projections, SN2 transition states. Nothing here
draws a benzene ring, and nothing should pretend to: a ring drawn from a
formula string would be a different molecule half the time. What this
pipeline owes them is a figure slot of the right size with its caption
attached, which is what `figures: inline` gives. The image files themselves
have to be supplied — see the missing-figure report at the end of a build.
"""

PROFILE = {
    "name": "chemistry",
    "label": "रसायन विज्ञान",

    # A backtick run is maths, as in physics and maths. Chemistry writes
    # `[1 अंक · 2026/set_a_ea]` chips in backticks and formulae in `$...$`;
    # there are no biology-style prose chains in any of the three chapters.
    "backticks": "maths",

    # TWO-DIMENSIONAL NOTATION — the flag every reaction-aware pass keys on.
    #
    # Exactly parallel to maths's `matrices`. A reaction arrow carries its
    # reagent above and its condition below; a species carries its name
    # below and its charge above. Four of those are off the line of the
    # equation, and the linear converter destroyed all four: 419 constructs
    # in chapter 6, 81 in chapter 4, with the literal word "xrightarrow"
    # printing 107 times and no error raised anywhere.
    "reactions": True,

    # ONE ENUMERATED ITEM PER LINE.
    #
    # "निम्नलिखित अभिक्रियाओं के अभिकारक लिखिए : i) … ii) … iii) … iv) …"
    # arrives as ONE line carrying four complete reactions, and an MCQ's
    # `A.`–`D.` compounds get glued into the stem by `_para_run`. Either way
    # the reader gets four equations in one sentence, breaking wherever the
    # line happened to end. See `readers.markdown.split_enumerations`.
    "split_enumerations": True,

    # The rubric, pooled across all three areas.
    #
    # Pooled deliberately. `सूत्र` is physical, `अभिक्रिया` is organic,
    # `पहचान` is inorganic, and a single chapter uses three or four of them —
    # chapter 1 uses सूत्र, त्रिक and सीमा together. Splitting the rubric by
    # area would mean detecting the area, and the columns above show the
    # areas are not separable.
    "rubric": {
        # A LIST OF FORMULAE, ` · ` separated — the same shape maths writes
        # its standard results in, and the same reason it needs a panel:
        # `**सूत्र:** $n = m/M$ · $n = N/N_A$ · $n = V/22·4$ (STP)`. Three
        # results on one line printed as one run-together definition that no
        # reader can pick a formula out of. The panel is splittable, so a
        # long list breaks across a column instead of cramming.
        "सूत्र": "formula_card",
        "मानक परिणाम": "formula_card",

        # QUANTITY · SYMBOL · UNIT, on one line, three fields:
        # `**त्रिक:** mol · $N_A = 6·022 × 10²³ mol⁻¹$ · मोलर द्रव्यमान का
        # मात्रक g mol⁻¹`. This is the `trio` element exactly — physics has
        # the same construct and the same component. Chapter 1 has five.
        "त्रिक": "trio",

        # WHERE A FORMULA STOPS BEING TRUE. `**सीमा:** $n = V/22·4` केवल
        # गैस पर और केवल STP पर लागू है।` — a condition on the formula above
        # it, and the single most common source of a lost mark. Twelve
        # across the three chapters.
        "सीमा": "condition",
        "शर्त": "condition",

        # ORGANIC. A reaction, and a mechanism, are both sequences of steps.
        # `**अभिक्रिया:**` appears nine times in chapter 6 and each one is a
        # reaction or a short series of them.
        "अभिक्रिया": "flow",
        "क्रियाविधि": "flow",     # a mechanism IS an ordered sequence
        "पद": "flow",              # `पद I.` / `पद II.` — the steps of one

        # INORGANIC. What to name in an answer, how the thing is built, and
        # the order a preparation runs in. Eleven `पहचान`, three `क्रम` and
        # two `संरचना` in chapter 4 — the same three components biology
        # earned, for the same reasons.
        "पहचान": "identify",
        "संरचना": "structure",
        "क्रम": "flow",
        "संबंध": "flow",

        "दिया है": "given",
        "परिभाषा": "definition",
        "अनुनाद": "structure",     # resonance forms — a structure, plural
        "काइरलता": "identify",
    },

    # Where the reclaimable space is. Measured across the three chapters:
    # formula_card panels (17), tables (20), options and bullets throughout.
    # `numbered` is excluded for the same reason as in biology — an `<ol>`
    # continuation restarts at 1, and telling a student that step 4 is step 1
    # is worse than the hole it would fill.
    "splittable": ("formula_card", "bullets", "options", "table"),

    # Structures are markdown images with a caption, as in biology — but
    # WITHOUT the ```चित्र-निर्देश``` fence, which is a biology convention and
    # appears zero times in all three chemistry chapters.
    "figures": "inline",

    "latex": True,

    # A `**label:**` line and a fence both end the paragraph before them.
    # 180 lead-in labels across the three chapters, and a run that swallows
    # the next one puts a reaction inside a sentence.
    "leadin_breaks": True,
    "fence_breaks": True,
}
