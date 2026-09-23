# -*- coding: utf-8 -*-
"""
RING STRUCTURES — real 2D chemistry, for what a chain-and-branch grid cannot
draw at all.

`format/structure.py` draws a branched CHAIN as a text grid: substituents
sit in a row above/below a row of atoms, joined by ASCII bond characters. A
ring has no "above/below a row" to sit in — every atom bonds to two ring
neighbours AND, from a fixed direction, to whatever substituent sits there.
That is real 2D geometry, and reproducing it as another grid variant would
mean re-deriving bond-angle placement by hand for every substitution
pattern. RDKit already does this correctly for any ring the agent can name
in SMILES, so this module hands the ring off to it rather than drawing a
worse version.

The line this module draws against `structure.py` is the same one that
module draws against prose: DO NOT GUESS THE SMILES FROM THE HINDI. An
agent that reads "ऑर्थो-क्लोरोटॉलूईन" writes `Clc1ccccc1C` — the connectivity
decision is the agent's, same as which carbon a chain branch sits on. This
module renders exactly the SMILES it is given and infers nothing.
"""
import html as _html
import io
import re

# The fence name, parallel to `structure.FENCE`. Kept in its own file
# because a ring and a chain are different problems solved by different
# code — see the module docstring — even though the agent reaches for
# whichever fence fits from the same SKILL.
FENCE = "रिंग"

_FIELD_RE = re.compile(r'^\s*(smiles|name|नाम)\s*:\s*(.*)$', re.I)


def parse_fence(lines):
    """The lines inside a ```रिंग fence -> {"smiles": …, "name": …}, or
    None. `smiles` is required; an unparseable fence is reported the same
    way `structure.parse_fence` reports one — nothing is guessed."""
    f = {}
    for ln in lines or []:
        m = _FIELD_RE.match(ln)
        if m:
            key = m.group(1).lower()
            f["name" if key == "नाम" else key] = m.group(2).strip()
    if not f.get("smiles"):
        return None
    return dict(smiles=f["smiles"], name=f.get("name", ""))

try:
    from rdkit import Chem
    from rdkit.Chem import AllChem
    from rdkit.Chem.Draw import rdMolDraw2D
    from rdkit.Chem import rdAbbreviations
    _HAVE_RDKIT = True
except ImportError:
    _HAVE_RDKIT = False


# SIZED FROM THE MOLECULE'S OWN GEOMETRY, AT A FIXED SCALE — not from atom
# count. Atom count alone does not say how much PAPER a structure needs:
# biphenyl (12 atoms, two rings side by side) is more than twice as WIDE as
# benzene (6 atoms, one ring) but the old `90 + 14*atoms` formula grew the
# canvas only linearly, so RDKit auto-shrank the bond length to fit — every
# extra ring in a reaction (biphenyl from a Fittig coupling, a substituted
# ring from a Wurtz-Fittig) drew visibly smaller than the plain rings next
# to it in the same equation, which is what made the reaction read as
# cluttered. Measuring the molecule's actual 2D coordinate span after
# `Compute2DCoords` and multiplying by ONE fixed pixels-per-unit constant
# means a bond is the same length everywhere — the canvas grows to fit the
# molecule instead of the molecule shrinking to fit the canvas.
# px per RDKit coordinate unit. RDKit scales its atom labels to the canvas,
# so this is what sets how big a drawn label ends up — and the page then
# shrinks the SVG again (see `.cring svg` in elements/chem-ring). At 29
# with a 78% display the labels measured about 10px printed against 17px
# body text, which is why a drawn structure read as a faint diagram rather
# than as part of the sentence. Drawing at 33 and displaying at 78% puts
# the label back on the same visual footing as the type around it.
_SCALE = 33


_ABBREV_CACHE = []


def _board_abbreviations():
    """RDKit's groups, relabelled the way a board answer writes them.

    Two of the defaults are chemist's shorthand rather than exam
    shorthand: `Ac` for an acetyl group, which a student writes out as
    COCH3, and no entry at all for a methyl, which is drawn as a bare
    stick and has to be read off the geometry. The rest — NO2, SO3H,
    CCl3, CHO — already match what the syllabus asks for.
    """
    if _ABBREV_CACHE:
        return _ABBREV_CACHE[0]
    # A FUNCTIONAL GROUP MAY BE A LABEL; A CARBON SKELETON MAY NOT.
    #
    # RDKit's 37 defaults include the chemist's alkyl shorthand — `Et`,
    # `nPr`, `iPr`, `nBu`, `tBu`, `iPent`, `nHex` … — and those collapse
    # exactly the chain the question is asking about. चित्र 6.8 asks which
    # alkene a pentyl bromide gives, and with the defaults on it drew
    # `nPr` and `Et` in place of the two ends: the reader cannot count the
    # carbons, which is the whole task. Only groups a board answer itself
    # writes as a label are kept.
    _KEEP = {"NO2", "NO", "SO3H", "CN", "COOH", "CO2H", "CHO", "CCl3",
             "CF3", "Ac"}
    defs = [d for d in rdAbbreviations.GetDefaultAbbreviations()
            if d.label in _KEEP]
    for d in defs:
        if d.label == "Ac":
            # `label` is what reaches the drawing as `atomLabel`;
            # `displayLabel` alone left `Ac` on the page.
            d.label = "COCH3"
            d.displayLabel = "COCH3"
            d.displayLabelW = "COCH3"
    try:
        defs += list(rdAbbreviations.ParseAbbreviations("CH3\t[CH3]\tCH3\n"))
    except Exception:
        pass
    _ABBREV_CACHE.append(defs)
    return defs


def _condense(mol):
    """Collapse known groups to their textbook labels, or return `mol`."""
    if not _HAVE_RDKIT:
        return mol
    try:
        return rdAbbreviations.CondenseMolAbbreviations(
            mol, _board_abbreviations(), maxCoverage=0.55)
    except Exception:
        # A drawing in software style beats no drawing at all.
        return mol
_PAD = 48     # room for labels, substituents and atom text at the edges


def _canvas_size(mol):
    conf = mol.GetConformer()
    n = mol.GetNumAtoms()
    if n == 0:
        return 90, 90
    xs = [conf.GetAtomPosition(i).x for i in range(n)]
    ys = [conf.GetAtomPosition(i).y for i in range(n)]
    x_span = max(xs) - min(xs)
    y_span = max(ys) - min(ys)
    w = max(int(x_span * _SCALE) + _PAD, 90)
    h = max(int(y_span * _SCALE) + _PAD, 90)
    return w, h


def draw_ring(smiles, name=""):
    """SMILES -> inline SVG, or None if RDKit is unavailable or the SMILES
    does not parse (the caller falls back to the source's own words —
    see RULES in step07_formatting_agent/SKILL.md: a wrong structure is
    worse than the sentence it replaced)."""
    if not _HAVE_RDKIT:
        return None
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    # BOARD STYLE, NOT SOFTWARE STYLE.
    #
    # RDKit draws every atom it is given, so a nitro group came out as
    # `N⁺(=O)O⁻` and a sulphonic acid as `S(=O)(=O)OH` — correct chemistry
    # drawn the way a modelling package draws it, not the way a student is
    # told to write it. `CondenseMolAbbreviations` collapses the 37 groups
    # RDKit knows into the labels a textbook uses: NO2, SO3H, CH3, COCH3.
    #
    # `maxCoverage` is the guard: a group covering most of the molecule
    # would leave a drawing that is one label and nothing else, so a small
    # molecule keeps its atoms.
    mol = _condense(mol)
    AllChem.Compute2DCoords(mol)
    w, h = _canvas_size(mol)
    d = rdMolDraw2D.MolDraw2DSVG(w, h)
    opts = d.drawOptions()
    opts.clearBackground = False
    # WEIGHT TO MATCH THE PAGE, NOT RDKIT'S DEFAULTS.
    #
    # RDKit sizes its atom labels and bonds for a screen thumbnail: measured
    # against this book they came out near 10px beside 17px body type, with
    # hairline bonds, so a drawn structure read as a faint diagram dropped
    # into a dark page instead of as part of the text. `minFontSize` is the
    # one that matters — RDKit shrinks labels to fit the canvas and will go
    # well below the legibility floor unless told where to stop. `-1` on the
    # max lets a small molecule's labels grow to the same measure.
    opts.bondLineWidth = 2.6
    opts.padding = 0.12
    opts.useBWAtomPalette()  # the book's structures are monochrome line art
    opts.additionalAtomLabelPadding = 0.05
    rdMolDraw2D.PrepareAndDrawMolecule(d, mol)
    d.FinishDrawing()
    svg = d.GetDrawingText()
    # STRIP THE XML PROLOG AND NAMESPACE CRUFT.
    #
    # `<?xml version=...?>` is illegal inside an HTML document body — the
    # page is not re-parsed as XML, so a literal `<?xml ...?>` printed as
    # visible text instead of being consumed as a processing instruction.
    svg = re.sub(r"^<\?xml[^>]*\?>\s*", "", svg)
    svg = svg.replace(" xmlns:rdkit='http://www.rdkit.org/xml'", "")
    svg = svg.replace(" version='1.1' baseProfile='full'", "")
    html = ['<span class="cring">', svg]
    if name:
        html.append('<span class="cring-name">%s</span>'
                    % _html.escape(name, quote=False))
    html.append('</span>')
    return "".join(html)


_CHARGE_SUP = {1: "\u207a", -1: "\u207b", 2: "\u00b2\u207a", -2: "\u00b2\u207b",
               3: "\u00b3\u207a", -3: "\u00b3\u207b"}


def _lone_ion_text(frag):
    """A ONE-ATOM FRAGMENT IS A FORMULA, NOT A DRAWING.

    RDKit scales every fragment to fill its own canvas, so `[Cl-]` — a
    single atom — was given a 90x90 box all to itself and its label drawn
    at roughly five times the size of the atoms in the benzene ring next
    to it. On the diazonium reaction the counter-ion towered over the
    compound it belongs to.

    A counter-ion is written as a formula in this book anyway (`Cl⁻`,
    `Br⁻`, `Na⁺`), never sketched, so it is set as text at the surrounding
    type size. Returns None for anything with more than one heavy atom,
    which still draws.
    """
    if not _HAVE_RDKIT:
        return None
    try:
        m = Chem.MolFromSmiles(frag)
    except Exception:
        return None
    if m is None or m.GetNumAtoms() != 1:
        return None
    a = m.GetAtomWithIdx(0)
    # A BARE ION ONLY. Anything carrying hydrogens is a molecule with its
    # own conventional spelling — water is `H₂O`, not `OH2` — and the
    # by-product escape (`!H₂O`) is where those belong.
    if a.GetTotalNumHs():
        return None
    return "%s%s" % (a.GetSymbol(),
                     _CHARGE_SUP.get(a.GetFormalCharge(), ""))


def _one_side(smiles_side):
    """`A.B` -> the rings for A and B joined by a plain-text `+`. A
    fragment RDKit cannot parse falls back to its bare SMILES as text —
    still wrong-looking, but visible and greppable, never a blank.

    A fragment written `!text` is LITERAL TEXT, not a structure.

    An inorganic by-product is a formula in this book, not a drawing:
    `2NaCl`, `HCl`, `H₂O`, `N₂`. Drawn from SMILES they come out as ion
    fragments (`[Na+]` and `[Cl-]` side by side) or, for the ones that are
    not valid SMILES at all, they fell through to the fallback above and
    printed as raw SMILES. Both are wrong, and the alternative — leaving
    them out, which is what the chapter did — makes the equation
    unbalanced: a Wurtz-Fittig with no `2NaCl` is not the reaction.
    The `!` says "set this as written"; it is dropped from the output.
    """
    parts = [p for p in smiles_side.split(".") if p]
    pieces = []
    for p in parts:
        if p.startswith("!"):
            pieces.append('<span class="m">%s</span>'
                          % _html.escape(p[1:], quote=False))
            continue
        ion = _lone_ion_text(p)
        if ion:
            pieces.append('<span class="m">%s</span>'
                          % _html.escape(ion, quote=False))
            continue
        r = draw_ring(p)
        pieces.append(r if r else ('<span class="m">%s</span>'
                                   % _html.escape(p, quote=False)))
    return ' <span class="m">+</span> '.join(pieces)


# THE DIRECTIVE ENDS WHERE ITS OWN BRACKET CLOSES — BY DEPTH, NOT BY POSITION.
#
# Neither end of the line is the right place to look:
#
#   greedy `.*\]`   ran past the closing bracket and swallowed the
#                    art-direction brief that five directives trail on the
#                    same line, so a 384-character paragraph became the
#                    label over the arrow, `&quot;` entities and all.
#   lazy `.*?\]`    stopped at the FIRST `]` — which in a SMILES is part
#                    of an atom: `Clc1ccccc1>>[O-][N+](=O)c1ccc(Cl)cc1`
#                    was cut to `…>>[O-` and the product drew as a stub.
#
# A SMILES bracket is always balanced, so counting depth from the opening
# `[RXN:` skips `[O-]` and `[N+]` and stops at the directive's own `]`.
_DIRECTIVE_OPEN_RE = re.compile(r'\[(RXN|STRUCT):\s*')
_FIG_NO_RE = re.compile(r'चित्र\s+([\d.]+)')


def _split_directive(line):
    """`(kind, body, tail)` for one directive, or None."""
    m = _DIRECTIVE_OPEN_RE.match(line.strip())
    if not m:
        return None
    s = line.strip()
    depth, i = 1, m.end()
    while i < len(s):
        if s[i] == '[':
            depth += 1
        elif s[i] == ']':
            depth -= 1
            if depth == 0:
                return m.group(1), s[m.end():i], s[i + 1:]
        i += 1
    return m.group(1), s[m.end():], ""


def parse_bracket(line):
    """`[RXN: चित्र 6.2 — caption | smiles: A>>B | ऊपर: x | नीचे: y]` or
    `[STRUCT: चित्र 6.10 — caption | smiles: A | सूत्र: F]` -> a dict, or
    None if the line is not one of these.

    One line, not a fence, because this replaces a single `![चित्र
    N](path)` image reference — the chapter's own convention for where a
    supplied figure used to sit. `caption` keeps the figure number so a
    build step can still match this brief to the `data-fig` it replaces."""
    parts = _split_directive(line)
    if not parts:
        return None
    kind, body, tail = parts
    fields = [f.strip() for f in body.split('|')]
    d = {"kind": kind, "caption": fields[0] if fields else ""}
    for f in fields[1:]:
        if ':' in f:
            k, v = f.split(':', 1)
            d[k.strip()] = v.strip()
    fm = _FIG_NO_RE.search(d["caption"])
    d["fig"] = fm.group(1) if fm else ""
    # Anything after the closing bracket is the brief, not a field value.
    d["tail"] = (tail or "").strip().rstrip("]").strip()
    return d


def draw_reaction(smiles_rxn, above="", below=""):
    """`reactant(.reactant)*>>product(.product)*` -> the same `.rxn-eq`
    markup every other reaction arrow in the book already uses, with a
    drawn ring on each side instead of a typed formula — see
    `format/reaction.py` for the arrow this matches.

    Returns None (never a half-drawn reaction) if the `>>` split fails or
    either side has nothing that parses at all."""
    if not _HAVE_RDKIT or ">>" not in (smiles_rxn or ""):
        return None
    left, right = smiles_rxn.split(">>", 1)
    left_html, right_html = _one_side(left.strip()), _one_side(right.strip())
    if not left_html or not right_html:
        return None
    arrow = ('<span class="rxn rxn-fwd" data-g="→"><span class="rxn-t">%s</span>'
            '<span class="rxn-a"></span><span class="rxn-b">%s</span></span>'
            % (_html.escape(above, quote=False), _html.escape(below, quote=False)))
    return ('<span class="rxn-eq"><span class="rxn-side">%s</span>%s'
           '<span class="rxn-side">%s</span></span>'
           % (left_html, arrow, right_html))
