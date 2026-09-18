# -*- coding: utf-8 -*-
"""
IR — the normalised block model that sits between content and design.

Everything is a plain dict, so the whole document is JSON-serialisable and
`step_01_parse` can write it to disk for inspection and diffing. That is
deliberate: the moment the IR is a live Python object graph, the content
step and the design step are coupled again.

A node NEVER carries a class name, a colour or a pixel value. It carries a
`kind` and the fields that kind needs. `renderer.py` is the only module
allowed to turn a kind into markup.

CONTAINERS   part · section · qgroup · question
LEAVES       everything else (see KINDS)
"""

KINDS = [
    # ---- containers -------------------------------------------------------
    "part",           # label, sub, children[]
    "section",        # num, title, en, pyq[], accent, blocks[], asides[]
    "qgroup",         # label, banner, children[]  (a year, a marks bucket, …)
    "question",       # num, marks, year, set, khand, stars, fullnote, accent, blocks[]
    # ---- text -------------------------------------------------------------
    "para",           # text
    "bullets",        # items[]
    "numbered",       # items[]
    "definition",     # term, text
    "trio",           # text        (a short "triple" fact strip)
    # A biology process chain: the stages of a process, arrow-joined. Set
    # UPRIGHT with arrows between the stages, never in the maths face — see
    # components/text.flow and book/subjects/biology.py.
    "flow",           # text, title
    # A DRAWN ORGANIC STRUCTURE. The chapter writes a branched molecule as a
    # straight chain plus a bracketed sentence saying where the branches go;
    # this is the chain with those branches put back where the sentence says.
    # A GRID whose columns are atoms, so a substituent sits over its own
    # carbon and its bond meets it — see book/format/structure.py.
    "structure",      # atoms[], bonds[], branches[[i,dir,group]], numbers[], name, src
    "ring",           # smiles, name — a ring compound, drawn by RDKit (format/ring.py)
    "rxn_smiles",     # smiles ("A>>B"), above, below, caption — a reaction, both
                      # sides drawn by RDKit (format/ring.py:draw_reaction)
    # A note to whoever draws a figure, from a ```चित्र-निर्देश``` fence.
    # Renders to NOTHING; kept because it is the only description of the
    # artwork that exists, and step11 chooses art from it.
    "figure_brief",   # text, ref
    # Multi-line ASCII matrix art, one matrix ROW per source line and
    # several matrices side by side. See format/matrix.ascii_block.
    "matrix_art",     # rows[]
    # ---- math -------------------------------------------------------------
    "formula",        # text, display(bool)
    "formula_box",    # text, colour
    "formula_card",   # title, rows[] of (expr, caption, cond)
    # ---- question parts ---------------------------------------------------
    "options",        # items[], layout ("grid"|"stack")
    "answer",         # text
    "given",          # text
    "athava",         # label, text
    "marks_band",     # label       (SYNTHESISED by the parser, never in the MD)
    # ---- callouts & notes -------------------------------------------------
    "callout",        # ctype in CALLOUT_TYPES, label, text
    "card",           # label, icon, rows[], tone     -> floated sticky note
    "simchip",        # text
    "srcnote",        # text
    "starbadge",      # text, stars
    "refbox",         # text
    # ---- data & media -----------------------------------------------------
    "table",          # head[], rows[], align[]
    "figure",         # num, caption, desc, ref, mode ("ref"|"spec")
    "slot",           # role, w, h, hint      -> reserved empty space
    # ---- structure --------------------------------------------------------
    "qsep",
    "rule",
]

# The eight rendered callout families. Both MD dialects (Part-1 Hindi and
# Part-2 Hinglish) normalise into these, so the renderer never sees a
# dialect.
# Widened from 8 to 16 in the finalised edition. These are real distinctions
# the book makes — a calculation slip is not a board trap — so each keeps its
# own colour rather than being folded into a neighbour.
CALLOUT_TYPES = ["mark", "calc", "trap", "warn", "turn", "opt",
                 "write", "key", "num", "save", "step", "ratt",
                 "line", "link", "rep", "conf", "tip", "fig", "sim",
                 "concl"]

CALLOUT_ICON = {
    "mark": "🎯", "calc": "🧮", "trap": "⚠️", "warn": "⚠️", "turn": "🔄",
    "opt": "🔍", "write": "✍️", "key": "🗝️", "num": "📝", "save": "🛟",
    "step": "🪜", "ratt": "⭐", "line": "🧠", "link": "🔗", "rep": "🔁",
    "conf": "💪", "tip": "💡", "fig": "✏️", "sim": "↔", "concl": "✅",
}

# The reference book prints every callout label in Hindi, while the source
# markdown writes most of them in Hinglish ("Board ka jaal", "Ye wahi
# question hai"). Translating here keeps the PAGE consistent without
# forcing the writer to change how they type.
#
# Lookup is by lowercased substring, so a label the table has never seen
# passes through unchanged rather than being dropped or mangled.
import re

CALLOUT_LABEL_HI = [
    ("board ka jaal",        "बोर्ड का जाल"),
    ("ye wahi question hai", "यह वही सवाल है"),
    ("yahan 1 mark bachta",  "1 अंक यहीं बचता है"),
    ("calculation me galti", "गणना की गलती"),
    ("bas itna likhna",      "बस इतना लिखना"),
    ("ye words zaroor",      "ये शब्द ज़रूर लिखना"),
    ("marks aise bantte",    "अंक ऐसे बँटते हैं"),
    ("kuch yaad na aaye to", "कुछ याद न आए तो"),
    ("pehle ye karo",        "पहले यह करो"),
    ("ratt lo",              "रट लो"),
    ("bas ye ek line",       "बस यह एक लाइन"),
    ("aise ghoomkar",        "ऐसे घूमकर आ सकता है"),
    ("options ka farak",     "विकल्पों का फ़र्क"),
    ("ye ban gaya to",       "यह बन गया तो"),
]


def canonical_label(label):
    low = (label or "").lower()
    for needle, hindi in CALLOUT_LABEL_HI:
        if needle in low:
            # A PARENTHETICAL QUALIFIER IS THE AUTHOR'S, NOT THE TABLE'S.
            #
            # This translates the Roman-script label a chapter writes —
            # "Board ka jaal" -> "बोर्ड का जाल" — by matching a NEEDLE
            # inside it, so everything written AROUND that needle went with
            # it. Biology chapter 1 writes `⚠ **Board ka jaal
            # (self-written):**` on the one diagram it could not source,
            # and that "(self-written)" is the warning that the figure is
            # not from a real paper — the opposite of decoration. It was
            # dropped, and step16 caught it as two words occurring in the
            # markdown and nowhere in the HTML.
            m = re.search(r'\(([^)]{1,40})\)\s*$', (label or "").strip())
            if m:
                return "%s (%s)" % (hindi, m.group(1).strip())
            return hindi
    return label


def node(kind, **fields):
    if kind not in KINDS:
        raise ValueError("unknown IR kind: %r" % kind)
    d = {"kind": kind}
    d.update(fields)
    return d


def walk(nodes):
    """Depth-first over every node, containers included."""
    for n in nodes or []:
        yield n
        for key in ("children", "blocks", "asides"):
            if key in n:
                for sub in walk(n[key]):
                    yield sub


def count_kinds(nodes):
    from collections import Counter
    return Counter(n["kind"] for n in walk(nodes))
