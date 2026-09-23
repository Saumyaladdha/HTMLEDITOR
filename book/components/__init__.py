# -*- coding: utf-8 -*-
"""
COMPONENTS — the visual vocabulary, one module per family.

Split so a change to one kind of thing touches one file:

    slot.py      reserved space for art that does not exist yet
    inline.py    hdu underline · chip · examchip · marktag · stars
    heading.py   chapter · section · part banner · year head · part cover
    text.py      para · work · bullets · numbered · definition · trio · note
    math.py      dm display line · fcard सूत्र panel · frow
    callout.py   pointer (16 variants) · sticky · srcnote · simchip
    question.py  qhead · options · answer · given · qsep
    table.py     table            <- change the table look HERE and nowhere else
    figure.py    figcard + figspace

Everything is re-exported, so callers never care which file a component
lives in and moving one is not a breaking change.
"""
from . import cover                                                    # noqa: F401
from .slot import slot, SLOT_SIZES, accent                                   # noqa: F401
from .inline import (hdu, swipe, chip, examchip, marktag, qmarks,            # noqa: F401
                     starline, stars, starnote, athava)
from .heading import (chapter_header, section_head, sub_head, part_banner,   # noqa: F401
                      type_banner, year_head, year_banner, part_cover)
from .text import (para, work, bullets, numbered, definition, trio, note,    # noqa: F401
                   rule, sep, flow, looks_like_flow, flow_stages,             # noqa: F401
                   matrix_art)                                   # noqa: F401
from .math import eq, fbox, fcard, formula_list, frow, chem_structure, chem_ring, chem_rxn, has_chain       # noqa: F401
from .callout import (pointer, pointer_flat, sticky, callout_block,          # noqa: F401
                      simchip, srcnote, refbox, fullnote, PO, FLAT)
from .question import subhead, is_subhead_text, qhead, question_text, options, answer, given, qsep     # noqa: F401
from .table import table                                                     # noqa: F401
from .figure import figure, figure_note                                      # noqa: F401
from ..design import tokens as theme                                         # noqa: F401

__all__ = [
    "cover",
    "slot", "SLOT_SIZES", "accent",
    "hdu", "swipe", "chip", "examchip", "marktag", "qmarks",
    "starline", "stars", "starnote", "athava",
    "chapter_header", "section_head", "sub_head", "part_banner", "type_banner",
    "year_head", "year_banner", "part_cover",
    "para", "work", "bullets", "numbered", "definition", "trio", "note",
    "rule", "sep",
    "eq", "fbox", "fcard", "formula_list", "frow", "chem_structure", "chem_ring", "chem_rxn", "has_chain",
    "subhead", "is_subhead_text", "pointer", "pointer_flat", "sticky", "callout_block", "simchip", "srcnote", "refbox",
    "fullnote", "PO",
    "qhead", "question_text", "options", "answer", "given", "qsep",
    "table", "figure", "figure_note",
]
