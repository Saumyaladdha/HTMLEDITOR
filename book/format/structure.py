# -*- coding: utf-8 -*-
"""
STRUCTURAL FORMULAE — drawing what the sentence was describing.

The organic chapter writes a branched molecule as a straight chain plus a
sentence in brackets telling the reader where the branches go:

    $\\mathrm{CH}_3-\\mathrm{CH}{=}\\mathrm{CH}-\\mathrm{CH}-\\mathrm{CH}_3$
    (चौथे कार्बन से ऊपर की ओर $\\mathrm{Br}$ जुड़ा है)

That is a correct description and a poor drawing. It makes the student do the
work the page should have done: read the sentence, count to the fourth
carbon, and build the molecule mentally before they can start the question.
A textbook prints the structure:

                  Br
                   |
    CH₃ — CH = CH — CH — CH₃

There are 47 of these descriptions in the chapter and their grammar is small
and regular — measured across all 47:

    ordinal      केन्द्रीय / बीच के 21 · दूसरे 12 · तीसरे 5 · चौथे 3
    direction    नीचे 41 · ऊपर 34 · बाईं 2 · दाईं 2
    verb         जुड़ा है, in every one of them

So the sentence can be read and the branch drawn where it says. Nothing is
invented: this module only MOVES information the source already states. When
the sentence does not match the grammar it is left as prose, because a
half-understood description drawn as a structure would be a different
molecule — and a wrong structure is worse than a correct sentence.

WHAT IS NOT DONE HERE. Rings are not drawn. `\\bigcirc` labelled बेन्जीन is a
benzene ring and is rendered as the circle the source asks for; a hexagon
with alternating bonds inferred from a formula string would be a guess, and
the chapter supplies 79 real structure images for exactly this reason.
"""
import re

# Where a branch hangs. `बीच के` and `केन्द्रीय` both mean the middle carbon;
# the chapter uses them interchangeably in the same paragraph.
_ORDINAL = {
    "पहले": 1, "प्रथम": 1, "पहला": 1,
    "दूसरे": 2, "द्वितीय": 2, "दूसरा": 2,
    "तीसरे": 3, "तृतीय": 3, "तीसरा": 3,
    "चौथे": 4, "चतुर्थ": 4, "चौथा": 4,
    "पाँचवें": 5, "पांचवें": 5, "पाँचवाँ": 5,
    "छठे": 6, "छठवें": 6,
}
_CENTRAL = ("केन्द्रीय", "केंद्रीय", "बीच के", "बीच का", "मध्य")

_UP = ("ऊपर",)
_DOWN = ("नीचे",)

# A bond in a condensed chain. The chapter writes single bonds as a hyphen or
# an en/em dash and draws double bonds with `=` inside braces (`{=}`), which
# has already become a bare `=` by the time this runs.
_BOND_RE = re.compile(r'\s*([=≡]|[-–—])\s*')

# ONE SENTENCE CAN CARRY TWO CLAUSES, AND ONE VERB FOR BOTH.
#
#   दूसरे कार्बन से ऊपर Cl तथा तीसरे कार्बन से नीचे CH₃ जुड़ा है
#
# A single `जुड़ा है` at the end governs both halves. Matched with one regex
# per clause requiring the verb, the first match ran from `दूसरे` to the end
# of the sentence and read BOTH directions as belonging to carbon 2 — so a
# chloro and a methyl on different carbons became two methyls on one, which
# is a different compound.
#
# So the sentence is split on `तथा`/`और` first. A fragment naming a carbon
# starts a new clause; one that does not is a continuation of the clause
# before it, which is what `ऊपर तथा नीचे एक-एक CH₃` is — two directions for
# the same carbon.
_JOIN_RE = re.compile(r'\s*(?:तथा|और|एवं|;|,)\s*')
# NOT a regex with a lazy prefix group. `(?P<where>[^,;।]{0,40}?)\s*कार्बन`
# with `.search()` matches at the EARLIEST position where the whole pattern
# fits — which is immediately before `कार्बन`, so `where` captured the empty
# string every time and no ordinal was ever found. The word is located
# directly and the text either side of it taken by slicing.
_CARBON_RE = re.compile(r'कार्बन(?:ों)?\s*(?:से|पर)?')
_GROUP_RE = re.compile(r'[$`]\s*(?P<tex>[^$`]{1,24}?)\s*[$`]'
                       r'|(?<![A-Za-z])(?P<bare>[A-Z][A-Za-z]?[0-9₀-₉]{0,3})'
                       r'(?![A-Za-z])')


def split_chain(text):
    """`CH₃-CH=CH-CH-CH₃` -> (atoms, bonds).

    Returns ([], []) when the text is not a plain chain — anything with a
    space, a plus, an arrow or a bracket is an equation or a phrase, not a
    single molecule, and must not be redrawn.
    """
    t = (text or "").strip().strip("$`").strip()
    if not t or re.search(r'[\s+()\[\]→⟶⇌<>]', t):
        return [], []
    parts = _BOND_RE.split(t)
    if len(parts) < 3:
        return [], []
    atoms = parts[0::2]
    bonds = parts[1::2]
    if not all(atoms) or len(atoms) < 3:
        return [], []
    # Every atom must look like one: a capital, then letters and subscripts.
    if not all(re.fullmatch(r'[A-Z][A-Za-z]?[₀-₉0-9]{0,3}[A-Za-z]{0,3}'
                            r'[₀-₉0-9]{0,3}', a) for a in atoms):
        return [], []
    return atoms, bonds


def read_branches(sentence, n_atoms):
    """The bracketed description -> [(atom_index, "up"|"down", group)].

    Returns [] when nothing in the sentence matches the grammar, which is the
    signal to leave it as prose. Drawing a half-understood description would
    put a branch on the wrong carbon, and that is a different molecule.
    """
    out = []
    if not sentence or "जुड़ा" not in sentence:
        return out
    mid = (n_atoms - 1) // 2

    clauses = []
    for frag in _JOIN_RE.split(sentence):
        if not frag.strip():
            continue
        if "कार्बन" in frag or not clauses:
            clauses.append(frag)
        else:
            clauses[-1] += " तथा " + frag

    for cl in clauses:
        m = _CARBON_RE.search(cl)
        if not m:
            continue
        where, rest = cl[:m.start()], cl[m.end():]
        idx = None
        if any(c in where for c in _CENTRAL):
            idx = mid
        else:
            for word, k in _ORDINAL.items():
                if word in where:
                    idx = k - 1
                    break
        if idx is None or not (0 <= idx < n_atoms):
            continue
        gm = _GROUP_RE.search(rest)
        if not gm:
            continue
        group = (gm.group("tex") or gm.group("bare") or "").strip()
        if not group:
            continue
        up = any(w in rest for w in _UP)
        down = any(w in rest for w in _DOWN)
        if up:
            out.append((idx, "up", group))
        if down:
            out.append((idx, "down", group))
        if not up and not down:
            out.append((idx, "up", group))
    return out


def draw(atoms, bonds, branches, numbers=None, render=None):
    """The structure as a grid: substituents, bonds, the chain, numbering.

    A GRID, so a branch sits exactly over the carbon it belongs to. That is
    the whole reason this is not built from text: in a text line the browser
    decides where `CH₃` lands, and it landed anywhere.

    Column 2i is atom i; column 2i+1 is the bond after it. Substituent rows
    are only emitted when something is in them, so a straight chain costs no
    extra height.
    """
    r = render or (lambda x: x)
    ncol = max(1, len(atoms) * 2 - 1)
    up = {i: g for i, d, g in branches if d == "up"}
    dn = {i: g for i, d, g in branches if d == "down"}
    rows = []

    def row(cls, cells):
        out = ['<div class="cst-r %s">' % cls]
        for c in range(ncol):
            out.append('<span>%s</span>' % cells.get(c, ""))
        out.append('</div>')
        return "".join(out)

    # THE NUMBER ROW SITS DIRECTLY OVER THE CHAIN, UNDER THE SUBSTITUENTS.
    #
    # Emitted first it came out at the very TOP of the grid — above the
    # `up` substituent and its bond, three rows clear of the atoms it
    # labels. On `CH3-C(-CH3)(-CH3)-CH2-Br` that put "3 2 1" over the
    # branch methyl instead of over the chain, so the locants looked like
    # they belonged to the substituent. They are the numbering OF THE
    # CHAIN, so they go immediately above it.
    if up:
        rows.append(row("cst-sub", {2 * i: r(g) for i, g in up.items()}))
        rows.append(row("cst-bond", {2 * i: "|" for i in up}))
    if numbers:
        rows.append(row("cst-n", {2 * i: str(numbers[i])
                                  for i in range(len(atoms))
                                  if i < len(numbers) and numbers[i]}))
    chain = {}
    for i, a in enumerate(atoms):
        chain[2 * i] = r(a)
    for i, b in enumerate(bonds):
        chain[2 * i + 1] = {"=": "=", "≡": "≡"}.get(b, "—")
    rows.append(row("cst-c", chain))
    if dn:
        rows.append(row("cst-bond", {2 * i: "|" for i in dn}))
        rows.append(row("cst-sub", {2 * i: r(g) for i, g in dn.items()}))

    return ('<div class="cst" style="--n:%d">%s</div>'
            % (ncol, "".join(rows)))


# ==========================================================================
# READING A NUMBERED CHAIN
#
# The chapter numbers a chain by putting the number over each atom:
#
#   $\overset{3}{\mathrm{CH}_3}-\overset{2}{\mathrm{CH}}-\overset{1}{\mathrm{CH}_2}-\mathrm{Br}$
#
# 52 of them. Those numbers are the locants the question turns on, and they
# belong in a row of their own above the chain rather than as a mark on each
# atom — which is also the only way they line up with each other.
# ==========================================================================

_OVERSET_RE = re.compile(r'\\overset\s*\{\s*([0-9]{1,2})\s*\}\s*\{')


def _balanced(s, i):
    depth, j = 0, i
    while j < len(s):
        if s[j] == '{':
            depth += 1
        elif s[j] == '}':
            depth -= 1
            if depth == 0:
                return j + 1, s[i + 1:j]
        j += 1
    return len(s), s[i + 1:]


def strip_locants(latex):
    """`\\overset{3}{CH_3}-…` -> (`CH_3-…`, [3, …]).

    Returns the chain with the numbers removed and the numbers in atom order,
    or (latex, []) when the chain is not numbered.
    """
    if "\\overset" not in latex:
        return latex, []
    out, nums, i = [], [], 0
    while i < len(latex):
        m = _OVERSET_RE.search(latex, i)
        if not m:
            out.append(latex[i:])
            break
        out.append(latex[i:m.start()])
        j, body = _balanced(latex, m.end() - 1)
        # A locant belongs to the atom it sits over, and the atoms are read in
        # order, so position in this list IS the atom index.
        nums.append(m.group(1))
        out.append(body)
        i = j
    return "".join(out), nums


# ==========================================================================
# THE EXPLICIT NOTATION — what an AGENT writes, and this module renders
#
# Everything above reads the chapter's Hindi prose with a regex grammar, and
# it drew 3 of the 47 descriptions. That is not a bug to tune: most of them
# describe a species sitting INSIDE a reaction ("दोनों केन्द्रीय कार्बनों से
# ऊपर तथा नीचे एक-एक CH₃ जुड़ा है" refers to two carbons of a t-butyl cation
# in the middle of an S_N1 step), and deciding which carbon of which species
# a Hindi sentence means is comprehension, not pattern matching. A regex that
# guessed would put a branch on the wrong carbon, and that is a different
# compound.
#
# LaTeX cannot express it either. `\underset` and `\overset` attach ONE thing
# to ONE atom; a quaternary carbon with a branch above and below, numbered,
# inside a reaction arm, has no LaTeX spelling that survives a linear pass.
#
# So the division of labour is the same one the rest of this pipeline uses:
# the AGENT reads the markdown and writes the structure down explicitly; the
# CODE renders exactly what it is given and infers nothing. The agent's
# instructions are in
# `pipeline/subjects/chemistry/step07_formatting_agent/SKILL.md`.
#
# The notation is a fence, so it cannot be confused with prose:
#
#     ```संरचना
#     chain: CH3-CH=CH-CH-CH3
#     no:    1 2 3 4 5
#     up:    4=Br
#     down:  2=CH3
#     name:  4-ब्रोमो-पेन्ट-2-ईन
#     ```
#
# `chain` is required. `no` is the locants in atom order. `up` and `down` are
# `position=group`, semicolon-separated for several. `name` is the IUPAC name,
# printed under the structure. Positions are 1-based and refer to the atom's
# place in `chain`, NOT to the locant — a chain numbered from the right still
# has its third atom at position 3.
# ==========================================================================

FENCE = "संरचना"

_FIELD_RE = re.compile(
    r'^\s*(chain|no|up|down|name|नाम|src)\s*:\s*(.*)$', re.I)


def parse_fence(lines):
    """The lines inside a ```संरचना fence -> a structure dict, or None.

    Returns None when `chain` is missing or unparseable. Nothing is guessed:
    a fence the agent got wrong is reported by step17 rather than drawn.
    """
    f = {}
    for ln in lines or []:
        m = _FIELD_RE.match(ln)
        if m:
            key = m.group(1).lower()
            f["name" if key == "नाम" else key] = m.group(2).strip()
    if not f.get("chain"):
        return None
    atoms, bonds = split_chain(f["chain"])
    if not atoms:
        return None
    nums = (f.get("no") or "").split()
    branches = []
    for key, direction in (("up", "up"), ("down", "down")):
        for item in (f.get(key) or "").split(";"):
            item = item.strip()
            if not item or "=" not in item:
                continue
            pos, group = item.split("=", 1)
            try:
                i = int(pos.strip()) - 1
            except ValueError:
                continue
            if 0 <= i < len(atoms) and group.strip():
                branches.append((i, direction, group.strip()))
    return dict(atoms=atoms, bonds=bonds,
                branches=[list(b) for b in branches],
                numbers=nums, name=f.get("name", ""),
                # THE SENTENCE THE DRAWING REPLACED.
                #
                # When a description becomes a picture its words leave the
                # page, and the integrity check reports them as vanished —
                # correctly, because it cannot know a drawing says the same
                # thing. Carried through to a `data-desc` attribute, which
                # `_html_words` already reads, so the audit still sees them
                # and the reader does not.
                src=f.get("src", ""))
