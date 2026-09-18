# -*- coding: utf-8 -*-
"""
EXPORT EDITOR MANIFEST — teach book_editor this pipeline's vocabulary.

The editor's property registry was written against an older BEM element
library (`text-body`, `figure__img`, `def-item__qual`). The current pipeline
emits none of that: chapter 3 carries 145 distinct classes and NOT ONE of
them is BEM, so every registry lookup missed and every block fell through to
`directText: true`. In practice that meant clicking the सूत्र panel turned
all ten formula rows into a single contenteditable blob, and the image
uploader aimed at the caption instead of the picture box.

Hardcoding 145 class names into the editor would fix today and rot tomorrow.
The element library already DECLARES itself — `book/elements/<id>/spec.json`
says what an element is and which classes it emits, and `template.html`
shows its internal parts — so the manifest is generated from those and the
editor reads it. Add an element to the library and it appears in the editor
with no editor change at all.

    python3 tools/export_editor_manifest.py

Writes book_editor/frontend/src/editor/elementManifest.json.
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ELEMENTS = os.path.join(ROOT, "book", "elements")
OUT = os.path.join(os.path.dirname(ROOT), "book_editor", "frontend", "src",
                   "editor", "elementManifest.json")

# `_shell` and friends are scaffolding — a page, a column, a margin-collapse
# guard. They must never be offered as insertable components, and clicking
# one should select the block inside it rather than the wrapper.
SHELL_KINDS = {"_shell", "_screen"}
INLINE_KINDS = {"_inline", "_derived"}

# What each part class IS, so the editor can offer the right control. Keyed on
# the class the template emits. Anything not listed is inferred: a leaf with
# text is editable richtext, a wrapper is skipped.
PART_ROLES = {
    "figspace": ("Picture", "image"),
    "ft":       ("Panel title", "text"),
    "fh":       ("Caption", "richtext"),
    "fd":       ("Description", "richtext"),
    "fc":       ("Condition (शर्त)", "richtext"),
    "fx":       ("Formula", "richtext"),
    "ch":       ("Heading", "text"),
    "ci":       ("Line", "richtext"),
    "ic":       ("Icon", "icon"),
    "pin":      ("Pin", "icon"),
    "t":        ("Label", "text"),
    "qnum":     ("Question number", "text"),
    "chip":     ("Marks chip", "text"),
    "secno":    ("Section number", "text"),
    "basetag":  ("Base tag", "text"),
    "hdu":      ("Heading text", "richtext"),
    "cond":     ("Condition", "richtext"),
    "anslabel": ("Answer label", "text"),
    "anstext":  ("Answer text", "richtext"),
}

# Friendlier names than the bare id, where the id is cryptic. Anything absent
# is title-cased from the id.
LABELS = {
    "formula-card":  "Formula panel (सूत्र)",
    "figcard":       "Figure",
    "pointer":       "Callout line",
    "callout":       "Sticky note",
    "question-head": "Question heading",
    "question-text": "Question paragraph",
    "display-math":  "Centred formula",
    "working":       "Working line",
    "sechead":       "Section heading",
    "partbanner":    "Part banner",
    "stat-tiles":    "Stat tiles",
    "separator":     "Divider line",
    "examchip":      "Exam chip",
    "srcnote":       "Source note",
    "starline":      "Star badge",
    "yearhead":      "Year heading",
    "acols":         "Two-column area",
    "trio":          "Triple (formula · unit · dimension)",
}

CLASS_RE = re.compile(r'class="([^"]+)"')


def _classes_of(spec):
    """The classes an element emits, minus template placeholders.

    `heading-underline` declares `hdu hd-{accent}`; the second is filled in
    per accent colour and is not a stable selector.
    """
    return [c for c in (spec.get("classes") or "").split()
            if c and "{" not in c]


CHILD_RE = re.compile(r'\.%s\s*>?\s*(?:[a-z]+)?\.([a-z][a-z0-9-]*)')
DOTTED_RE = re.compile(r'\.([a-z][a-z0-9-]*)')


def _parts_of(eid, own, notes):
    """Named regions inside an element.

    Three sources, because no single one is complete:

      template.html  ground truth for structure, and the reason the uploader
                     aims at `.figspace` and not at the caption beside it.
      spec notes     the only place a REPEATED region is written down —
                     `formula-card/template.html` is just `{rows}`, so the
                     `.fx`/`.fd`/`.fc` that make up a row appear nowhere else.
      style.css      child selectors like `.callout>div.ci`, which catch
                     regions the template also hides behind a placeholder.

    All three are filtered through PART_ROLES, so a structural wrapper picked
    up by the CSS sweep never becomes a fake editable region.
    """
    found = []

    def add(cls):
        if cls in own or any(p["selector"] == "." + cls for p in found):
            return
        label, editable = PART_ROLES.get(cls, (None, None))
        if editable is None:
            return          # a wrapper, not a region worth exposing
        found.append({"selector": "." + cls, "label": label,
                      "editable": editable})

    tpl = os.path.join(ELEMENTS, eid, "template.html")
    if os.path.exists(tpl):
        for m in CLASS_RE.finditer(io.open(tpl, encoding="utf-8").read()):
            for cls in m.group(1).split():
                if "{" not in cls:
                    add(cls)

    for cls in DOTTED_RE.findall(notes or ""):
        add(cls)

    css = os.path.join(ELEMENTS, eid, "style.css")
    if os.path.exists(css):
        body = io.open(css, encoding="utf-8").read()
        for base in own:
            for cls in re.findall(CHILD_RE.pattern % re.escape(base), body):
                add(cls)
    return found


def _variant_prefix(spec, classes):
    """The prefix of an element's variant family.

    Declared, not guessed: `heading-underline` says `classes: "hdu hd-{accent}"`,
    so its six accent colours are `.hd-*` and NOT `.hdu-*`. Guessing from the
    base class missed every one of them, which is why a section heading had no
    colour control at all — the underline accent IS how a heading is coloured
    in this design.
    """
    for c in (spec.get("classes") or "").split():
        if "{" in c:
            return c.split("{", 1)[0]
    return (classes[0] + "-") if classes else ""


def _colour_controls(css_path, selector, prefix):
    """Offer a colour control only where the CSS lets one take effect.

    Three different mechanisms are in play and they are not interchangeable:
    `.po` leaves `border` colourless and gets its palette from `.po-*` variant
    classes; `.callout` also leaves it colourless and is coloured by an INLINE
    style the pipeline writes per note; `.fcard` hardcodes both in the rule.
    Writing `border-color` inline works for all three, so the control is
    offered whenever the element paints a border or a background at all — but
    variants are surfaced separately so a user picking "trap" gets the
    designed border+background+label triple rather than one lone colour.
    """
    if not os.path.exists(css_path):
        return [], []
    css = io.open(css_path, encoding="utf-8").read()
    base = selector.lstrip(".")
    controls, variants = [], []

    own = re.findall(r'\.%s\b[^{]*\{([^}]*)\}' % re.escape(base), css)
    body = " ".join(own)
    if re.search(r'\bborder(-color)?\s*:', body):
        controls.append({"type": "color", "label": "Border colour",
                         "property": "border-color"})
    if re.search(r'\bbackground\s*:', body) or re.search(r'\bborder\s*:', body):
        controls.append({"type": "color", "label": "Background",
                         "property": "background"})

    # `.po-trap { background:…; border-color:… }` — a designed pair, offered
    # as one choice rather than two independent colour wells.
    for m in re.finditer(r'\.(%s[a-z0-9]+)\s*>?\s*[a-z]*\s*\{([^}]*)\}'
                         % re.escape(prefix), css):
        name, decl = m.group(1), m.group(2)
        if not re.search(r'background|border-color', decl):
            continue
        if any(v["class"] == name for v in variants):
            continue
        variants.append({"class": name,
                         "label": name.split("-", 1)[1].replace("-", " ").title()})
    return controls, variants


def _paints(css_path, classes):
    """Does this element draw a visible box of its own?

    Decided HERE, from the element's own stylesheet, rather than from
    `getComputedStyle` in the editor. That call depends on the browser having
    expanded shorthands like `background:` into `background-color`, which is
    not something every environment does — and getting it wrong either welds
    an exam chip into its heading or puts a selection box around all 1197
    inline maths spans in the chapter.
    """
    if not os.path.exists(css_path):
        return False
    css = io.open(css_path, encoding="utf-8").read()
    for base in classes:
        for m in re.finditer(r'\.%s\b[^{]*\{([^}]*)\}' % re.escape(base), css):
            decl = m.group(1)
            if re.search(r'\b(background|border)\s*:', decl):
                return True
    return False


def _size_controls(spec, classes):
    """Width/height, where resizing is meaningful.

    A picture box is resized by its height (`figcard/template.html` writes
    `height:{h}px` on `.figspace`, so height is the dimension the pipeline
    itself parameterises). A boxed block is resized by width. Inline and
    shell elements get neither.
    """
    if spec.get("ir_kind") in SHELL_KINDS | INLINE_KINDS:
        return []
    out = [{"type": "size", "label": "Width", "property": "width",
            "min": 120, "max": 944, "unit": "px"},
           # MIN-height, not height. A fixed height on a text box clips
           # whatever does not fit — `.page` is already overflow:hidden, so
           # the overflow would vanish silently rather than push the page.
           # min-height grows a short box without ever truncating a long one.
           {"type": "size", "label": "Minimum height", "property": "min-height",
            "min": 0, "max": 700, "unit": "px"}]
    if "figcard" in classes or "figbox" in classes:
        # The plate's height IS the reserved artwork area — figcard/template
        # writes `height:{h}px` on it — so here a fixed height is the right
        # control, and it is the one thing a teacher most often needs to
        # change after dropping a real picture in.
        out.append({"type": "size", "label": "Picture height",
                    "property": "height", "target": ".figspace",
                    "min": 60, "max": 520, "unit": "px"})
    return out


SIDE_BY_SIDE_RE = re.compile(
    r'\.([a-z][a-z0-9-]*)\s*>\s*\.%s\s*\{[^}]*\bflex\s*:')


FLOAT_RE = re.compile(r'\.%s\.([a-z][a-z0-9-]*)\s*\{[^}]*\bfloat\s*:\s*(left|right)')


def _float_options(css_path, classes):
    """Variants of this element that let text wrap around it.

    Read from the stylesheet rather than named here, so a float added to any
    element's CSS becomes an editor option without an editor change. A float
    is not the same thing as `sideBySide`: a flex row places exactly two
    things beside each other, while a float lets a long paragraph run down the
    side of a small picture and then continue full width underneath it.
    """
    if not os.path.exists(css_path):
        return []
    css = io.open(css_path, encoding="utf-8").read()
    out = []
    for base in classes:
        for m in re.finditer(FLOAT_RE.pattern % re.escape(base), css):
            cls, side = m.group(1), m.group(2)
            if any(o["class"] == cls for o in out):
                continue
            out.append({"class": cls, "side": side,
                        "label": "Text wraps on the %s"
                                 % ("right" if side == "left" else "left")})
    return out


def _side_by_side(css_path, classes):
    """A wrapper this element can sit inside to place things beside it.

    `figcard/style.css` already ships `.figrow { display:flex; gap:12px }`
    with `.figrow > .figcard { flex:1; min-width:0 }` — everything needed to
    put a picture and text next to each other — but nothing ever offered it,
    so "content beside an image" was impossible in the editor despite being
    fully implemented in the CSS. Detected rather than named here, so the
    same works for any future element whose CSS grows one.
    """
    if not os.path.exists(css_path):
        return None
    css = io.open(css_path, encoding="utf-8").read()
    for base in classes:
        m = re.search(SIDE_BY_SIDE_RE.pattern % re.escape(base), css)
        if m:
            return {"wrapper": m.group(1),
                    "label": "Place side by side"}
    return None


def build():
    elements = []
    for eid in sorted(os.listdir(ELEMENTS)):
        spec_path = os.path.join(ELEMENTS, eid, "spec.json")
        if not os.path.exists(spec_path):
            continue
        spec = json.load(io.open(spec_path, encoding="utf-8"))
        classes = _classes_of(spec)
        if not classes:
            continue
        kind = spec.get("ir_kind", "")
        role = ("shell" if kind in SHELL_KINDS
                else "inline" if kind in INLINE_KINDS else "content")
        selector = "." + classes[0]
        prefix = _variant_prefix(spec, classes)
        controls, variants = _colour_controls(
            os.path.join(ELEMENTS, eid, "style.css"), selector, prefix)
        if role == "content":
            controls = controls + _size_controls(spec, classes)
        else:
            # An inline element is never resized or given a background, but it
            # can absolutely have a designed palette — the heading underline
            # has six. Dropping its variants left headings uncolourable.
            controls = []
        elements.append({
            "id": eid,
            "label": LABELS.get(eid, eid.replace("-", " ").title()),
            "classes": classes,
            "selector": selector,
            "kind": kind,
            "role": role,
            "description": spec.get("when", ""),
            "notes": spec.get("notes", ""),
            "parts": _parts_of(eid, set(classes), spec.get("notes", "")),
            "controls": controls,
            "variants": variants,
            "variantPrefix": prefix,
            # True when the element draws its own box — a chip, a card, a
            # note. False for a text run like inline maths.
            "paints": _paints(os.path.join(ELEMENTS, eid, "style.css"), classes),
            "sideBySide": (_side_by_side(os.path.join(ELEMENTS, eid, "style.css"), classes)
                           if role == "content" else None),
            "floats": (_float_options(os.path.join(ELEMENTS, eid, "extra.css"), classes)
                       + _float_options(os.path.join(ELEMENTS, eid, "style.css"), classes)
                       if role == "content" else []),
        })
    return {"version": 1,
            "source": "HTML_Automation/book/elements",
            "note": "GENERATED by tools/export_editor_manifest.py — do not edit by hand.",
            "elements": elements}


def main():
    man = build()
    d = os.path.dirname(OUT)
    if not os.path.isdir(d):
        sys.stderr.write("editor not found at %s\n" % d)
        return 1
    io.open(OUT, "w", encoding="utf-8").write(
        json.dumps(man, ensure_ascii=False, indent=1, sort_keys=False) + "\n")
    content = [e for e in man["elements"] if e["role"] == "content"]
    print("wrote %s" % os.path.relpath(OUT, os.path.dirname(ROOT)))
    print("  %d elements — %d editable, %d shell, %d inline"
          % (len(man["elements"]), len(content),
             sum(1 for e in man["elements"] if e["role"] == "shell"),
             sum(1 for e in man["elements"] if e["role"] == "inline")))
    # Variants counted across ALL elements, not just content ones: the
    # heading underline is inline and carries six accents, and reporting
    # "1 with variants" hid them.
    print("  %d with named parts, %d with colour controls, "
          "%d with variant palettes (%d options)"
          % (sum(1 for e in content if e["parts"]),
             sum(1 for e in content if any(c["type"] == "color" for c in e["controls"])),
             sum(1 for e in man["elements"] if e["variants"]),
             sum(len(e["variants"]) for e in man["elements"])))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
