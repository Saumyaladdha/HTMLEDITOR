# -*- coding: utf-8 -*-
"""
MATHS — a third dialect, and the one whose notation carries the most meaning.

Measured on chapter 3 (आव्यूह / Matrices) against the other two:

                                physics   biology     MATHS
    $...$ inline maths             1537        15       939
    \\begin{bmatrix}                   0         0       496
    & column separators               7         1      1731
    \\frac                           422         0       137
    \\sin / \\cos / \\tan                81         0       355
    A' transpose                     14         0        95
    ```चित्र-निर्देश fences            0        11         0
    → process chains                 11        50         8

What makes maths its own subject is not that it has more notation than
physics — it has less inline maths, in fact. It is that its notation is
TWO-DIMENSIONAL. A physics formula is a line: `F = ma`, a fraction, a
subscript. A matrix is a grid, and the grid IS the content.

That distinction has a hard consequence. Every pass in `format/inline` scans
text linearly for operands, so a matrix handed to it came out as loose
digits: `A = [1 2 3; 2 3 1]` became `A= 1 2 3<br>2 3 1`. Nothing was dropped
— the chapter's own token round-trip passed — and the mathematical object was
destroyed. Six numbers are not a 2x3 matrix, and no reader can recover one
from the other. See `format/matrix.py`.

Two notations, both present:

  1. LaTeX `bmatrix`, 496 of them, usually several in one expression:
     `A³ - 6A² + 7A + 2I = [..] - 6[..] + 7[..] + 2[..]`

  2. Multi-line ASCII art, about 26 lines, several matrices side by side and
     one matrix ROW per source line. The chapter's header says these were
     left untranslated because "it is not determined which line belongs to
     which matrix" — undetermined by reading order, determined by COLUMN
     POSITION, which is what `matrix.ascii_block` uses. They could not be
     left alone in any case: HTML collapses runs of spaces, so the alignment
     that makes them readable does not survive reaching a page.

NOT IN THIS CHAPTER, and so not verified against anything: integrals. `\\int`
appears 0 times here (physics has 25). Determinants appear once. The profile
below names them because the next maths chapter will have them, but no claim
is made that they render correctly yet — that needs a chapter that contains
them.
"""

PROFILE = {
    "name": "maths",
    "label": "गणित",

    # A backtick run is maths, as in physics. `A' A = I` written in backticks
    # is an equation, not a sequence.
    "backticks": "maths",

    # TWO-DIMENSIONAL NOTATION. The flag every matrix-aware pass keys on.
    "matrices": True,

    # The rubric. Maths asks for the standard result, what is given, and the
    # steps of a proof — `उपपत्ति के चरण` is a section of this chapter.
    "rubric": {
        # A `**सूत्र:**` line in maths is a LIST of standard results
        # separated by ` · ` — one of them carries eleven. Rendered as a
        # single definition they came out as a five-line run-together
        # paragraph. The सूत्र panel is exactly the component for this, and
        # it is splittable, so a long list can break across a column
        # boundary and use the space below instead of cramming.
        "सूत्र": "formula_card",
        "दिया है": "given",
        "मानक परिणाम": "formula_card",
        "उपपत्ति के चरण": "flow",     # a proof IS a sequence of steps
        "शर्त": "condition",
    },

    # No सूत्र panels in chapter 3, but a maths chapter can have them
    # (`मानक परिणाम` is exactly that), so the kind stays splittable. Tables
    # too: this chapter has 72 table rows, more than either other subject.
    "splittable": ("formula_card", "bullets", "options", "table"),

    "figures": "inline",
    "latex": True,

    # A `**label:**` line and a fence both end a paragraph, as in biology.
    # 59 lead-in labels here, and a run that swallows the next one puts a
    # matrix inside a sentence.
    "leadin_breaks": True,
    "fence_breaks": True,
}
