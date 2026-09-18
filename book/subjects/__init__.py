# -*- coding: utf-8 -*-
"""
SUBJECT PROFILES — what differs between physics and biology, in one place.

The pipeline is subject-agnostic almost everywhere. Measured on chapter 1 of
biology against chapter 4 of physics, the biology markdown parsed into 917
blocks — 3 parts, 138 questions with 138 answers, 21 figures, 10 tables — with
no change to the reader at all. The packer, paginator, splitter, decorators
and QA steps all work on the IR and never mention a subject.

So a profile is deliberately SMALL. It holds only the differences that are
real, and each one below was measured rather than guessed:

                                  physics   biology
    $...$ inline maths               1537        15
    $$ display maths                  490         0
    \\frac / \\vec                      422 / 161   0 / 0
    सूत्र panels (formula_card)         10         0
    ![](...) images + captions          0    21 + 21
    ```चित्र-निर्देश fences              0        11
    → process chains                   11        50
    अथवा                               43         1
    callouts                          108       214

Two consequences drive everything here:

  1. A BACKTICK RUN MEANS DIFFERENT THINGS. In physics it is maths. In biology
     it is a process chain — `बीजाणुजन ऊतक → पराग मातृ कोशिका → …` — and
     sending it down the maths path set five Hindi nouns in an italic Georgia
     maths face. Half of the biology chapter's inline-maths runs (14 of 29)
     were Hindi prose, one of them 213 characters long.

  2. DEAD SPACE LIVES IN DIFFERENT BLOCKS. Physics reclaims it by splitting
     सूत्र panels; biology has none, so its reclaimable space is in options
     (41), numbered lists (14) and tables (10). The same splitter, pointed at
     different kinds.

What is NOT here matters as much. There is no per-subject copy of the reader,
the packer or the assembler. A bug fixed once is fixed for both — the `.u`
wrapper bug alone was found four times in the editor, and a forked pipeline
would have needed each fix applied twice and would have drifted the first time
one was forgotten.
"""
from . import physics as _physics
from . import biology as _biology
from . import maths as _maths
from . import chemistry as _chemistry
from . import arts as _arts
from . import economics as _economics

PROFILES = {
    "physics": _physics.PROFILE,
    "biology": _biology.PROFILE,
    "maths": _maths.PROFILE,
    "chemistry": _chemistry.PROFILE,
    "arts": _arts.PROFILE,
    "economics": _economics.PROFILE,
}

DEFAULT = "physics"


def get(name):
    """The profile called `name`, or the default with a warning."""
    if not name:
        return PROFILES[DEFAULT]
    key = str(name).strip().lower()
    for full in PROFILES:
        if full == key or full.startswith(key):
            return PROFILES[full]
    raise SystemExit("unknown subject %r — known: %s"
                     % (name, ", ".join(sorted(PROFILES))))


def detect(md_text):
    """Which subject this markdown is, from its notation.

    Not a close call on any real chapter: the physics chapter carries 1537
    inline-maths spans and 583 LaTeX commands, the biology one 15 and none.
    A document with neither — a chapter of pure prose — is physics by
    default, because that is the tested path.
    """
    # MATRICES DECIDE FIRST.
    #
    # `\\begin{bmatrix}` appears 496 times in the maths chapter and zero times
    # in either of the others, so it is not a close call and nothing else has
    # to be weighed against it. Without this the maths chapter was detected as
    # PHYSICS — it has 137 fractions and 321 Greek letters, which is a
    # physics signature — and every matrix in it went down the linear maths
    # path that flattens a grid into loose digits.
    if md_text.count("\\begin{bmatrix}") + md_text.count("\\begin{pmatrix}") \
            + md_text.count("\\begin{vmatrix}") >= 4:
        return "maths"

    # CHEMISTRY BEFORE PHYSICS, and for the same reason maths goes before
    # both: its signature notation is unambiguous and its OTHER notation is
    # a physics signature.
    #
    # Chapter 1 (विलयन) has 218 fractions and 228 display-maths blocks. That
    # is a physics fingerprint, and detected as physics the chapter would
    # have had reaction handling switched off — costing chapter 4 all twelve
    # of its labelled arrows and chapter 6 all 107.
    #
    # `\xrightarrow`, `\underset` and `\overset` appear 0 times in either
    # physics chapter, 0 in biology and 0 in maths, so no threshold has to be
    # balanced against anything. `\mathrm{...}` counts too but only as a
    # TIE-BREAKER on top of that unambiguous signal, never on its own — a
    # physics chapter that typesets units with `\mathrm{N/C}`, `\mathrm{m}`
    # etc. can carry hundreds of them (one chapter has 407, not "a handful"
    # as first assumed here) with ZERO reaction arrows, and `407 // 8 = 50`
    # alone cleared this threshold — the chapter built as chemistry with no
    # `\xrightarrow`/`\underset`/`\overset` anywhere in it. Every real
    # chemistry chapter checked already clears 12 from the arrow/underset/
    # overset signal alone (22 to 1054), so gating `\mathrm` on that signal
    # being present costs those nothing.
    chem_signal = (md_text.count("\\xrightarrow") * 4
                   + md_text.count("\\underset") * 3
                   + md_text.count("\\overset") * 3
                   + md_text.count("\\xrightleftharpoons") * 4
                   + md_text.count("\\rightleftharpoons") * 2)
    chem = chem_signal + (md_text.count("\\mathrm") // 8 if chem_signal else 0)
    if chem >= 12:
        return "chemistry"

    # ONE BACKSLASH, NOT TWO.
    #
    # These literals were written `"\\\\frac"`, which is the six-character
    # string `\\frac` at runtime — a sequence that never appears in markdown.
    # So the LaTeX side of this function has only ever counted `$$`, and it
    # got the right answer for the physics chapters purely because they carry
    # 490 of those.
    #
    # `chapter_1_v4_ready.md` (विद्युत आवेश एवं क्षेत्र) has 40 `\\frac`, 20
    # `\\vec` and ZERO `$$`. Its LaTeX score was therefore 0 against a
    # biology score of 60 — sixteen `**पहचान:**` lines, which physics uses
    # too — so a physics chapter was detected as biology, which would have
    # sent every one of its equations down the sequence path that sets maths
    # in an upright prose face.
    latex = (md_text.count("\\frac") + md_text.count("\\vec")
             + md_text.count("$$") + md_text.count("\\int")
             + md_text.count("\\theta") + md_text.count("\\mu"))
    bio = (md_text.count("```चित्र-निर्देश") * 4
           + md_text.count("**क्रम:**") * 3
           + md_text.count("**पहचान:**") * 3
           + md_text.count("**संरचना:**") * 2)
    if latex >= 20 and latex > bio:
        return "physics"
    if bio >= 6 and bio > latex:
        return "biology"
    return DEFAULT
