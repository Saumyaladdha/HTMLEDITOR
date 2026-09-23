import re as _re
# -*- coding: utf-8 -*-
"""
Figures — a captioned card with a reserved empty plate.

The finalised edition made the placeholder part of the DESIGN rather than a
build-time stand-in: `.figcard.figbox` draws a dashed blue card, `.fh` the
caption, and `.figspace` an empty white plate the artwork is drawn or pasted
into later.

That is the same contract the slot system already had — the box is at its
FINAL size from the first build, so dropping art in cannot move the page or
invalidate pagination — but now it reads as intentional on a printed sheet
instead of looking like something missing.
"""
from ..format.inline import inline, plain
from .slot import SLOT_SIZES


# The reference sizes every plate individually — 108px to 215px — because a
# two-line graph needs less room than a full circuit. A single flat height
# gave simple figures more space than they will ever use and left it empty on
# the page.
#
# The thresholds are this book's OWN brief lengths (quartiles 8 / 11 / 14
# clauses), and every height is one the reference actually uses. They sit in
# the lower half of its range on purpose: matching its median of 174 would
# cost pages, and a plate only has to hold the artwork, not fill the sheet.
PLATE_BANDS = ((6, 108), (8, 116), (11, 132), (14, 151))
PLATE_MAX = 174


def plate_height(desc, fallback=158):
    """Reserve room in proportion to how much artwork is described.

    The brief lists the parts to draw, separated by clause marks, so the
    count of those clauses is a fair proxy for how busy the finished figure
    is. With no brief there is nothing to go on and the slot size stands.
    """
    text = (desc or "").strip()
    if not text:
        return fallback
    clauses = sum(text.count(c) for c in ";,।") + 1
    for limit, px in PLATE_BANDS:
        if clauses <= limit:
            return px
    return PLATE_MAX


def figure(num, caption, desc="", ref=None, size="figure", place="center",
           height=None, narrow=False, cap_text=""):
    label = ("चित्र %s" % num) if num else (caption or "चित्र")
    # THE CAPTION USUALLY *IS* THE LABEL, SPELLED OUT.
    #
    # This tested whether the CAPTION sits inside the short label — and a
    # caption is the longer string, so it never does and the two were always
    # joined. Where the markdown names the figure twice, once as the image's
    # alt text and once as the italic line under it, the header came out as
    # "चित्र 2.4; चित्र 2.4—समविभव पृष्ठ": the number said twice with a
    # semicolon between. 28 of physics chapter 2's 36 figures read that way.
    # Only a figure whose caption is a DIFFERENT title from "चित्र N" has
    # anything to add, so the test runs the other way round now.
    cap = _re.sub(r'\s+', ' ', (caption or "")).strip()
    lab = _re.sub(r'\s+', ' ', label).strip()
    if cap and num:
        if cap.startswith(lab):
            label = cap                      # already names itself
        elif lab not in cap:
            label = "%s; %s" % (lab, cap)
    h = int(height or plate_height(desc, SLOT_SIZES.get(size, (456, 158))[1]))
    # A real <figure>, and `.fh` as TWO spans — that is what the reference
    # emits, and `.fh` is a flex row whose gap only applies between children.
    # Collapsed into one text node the icon sat flush against the label.
    # `fig-solo` narrows a full-width figure to 66% and centres it; inside a
    # column it stays full width.
    variant = " fig-solo" if place == "center" and not narrow else ""
    # A REF THAT IS A REAL URL IS A PICTURE, NOT A PLACEHOLDER.
    #
    # `ref` reaches this component already resolved — see
    # `assemble.render`'s figure branch, which hands every reference
    # through `util.upload_image.resolve_ref` before it gets here. That
    # function's own contract is "a browser-fetchable URL, or the original
    # string unchanged" — so testing for `http(s)://` here is exactly the
    # line between "there is a real image" and "still just a path (or
    # nothing) with no art behind it yet", without this component needing
    # to know anything about uploads, credentials, or storage.
    #
    # `.is-photo` drops the dashed placeholder look (border, background,
    # reserved height) a real picture has no use for — those exist so an
    # EMPTY plate still reads as intentional, not so a real photo sits in
    # a box built for one.
    has_image = bool(ref) and ref.startswith(("http://", "https://"))

    # A REAL PHOTO IS A DIFFERENT, SIMPLER CARD — NOT THE PLACEHOLDER SHELL
    # WITH AN IMAGE DROPPED IN.
    #
    # The reference's photo state has no `.fh` icon+label row and no dashed
    # `.figspace` plate — those exist so an EMPTY reservation still reads as
    # intentional, and a real picture has no use for either.
    #
    # THE CAPTION IS STILL `cap_text` FIRST, EXACTLY AS THE PLACEHOLDER
    # BRANCH BELOW PRIORITISES IT.
    #
    # A chapter with real photos writes its own detailed caption as a
    # separate italic paragraph after the image — `attach_captions` lifts
    # it into `cap_text`, prefix stripped of the "चित्र N —" `label`
    # already carries. Using `label` alone here (the short alt-text inside
    # the `![...]`) silently dropped that whole sentence: 162 distinct
    # words on physics chapter 2's 29 real figures, every one of them the
    # chapter's own circuit-diagram description, caught by step16 as
    # content nowhere on the page.
    if has_image:
        cap = ("%s — %s" % (label, cap_text)) if (cap_text or "").strip() else label
        return ('<figure class="figcard has-img" data-figure="%s" data-ref="%s">'
                '<div class="figure-image">'
                '<img src="%s" alt="%s" loading="lazy"></div>'
                '<figcaption>%s</figcaption></figure>'
                % (plain(num or ""), plain(ref), plain(ref), plain(cap),
                   inline(cap)))

    # A FIGURE NAMES ITSELF TWO WAYS, AND BOTH CAN BE TRUE AT ONCE.
    #
    # `cap_text` is a REAL caption sentence the chapter wrote as its own
    # italic paragraph after the image — `attach_captions` in the reader
    # lifts it off the page and hands it here. Where it exists it is the
    # more specific of the two and is printed as the card's own
    # `<figcaption>`, inside the border, under the plate — see the note
    # there for why a free paragraph after the card was wrong.
    #
    # Chemistry never sets `cap_text` (`attach_captions` folds a chemistry
    # caption straight into `desc` instead — same profile, see its own
    # docstring), and a `[RXN:`/`[STRUCT:`/`[IMAGE:` directive's own tail
    # text is `desc` from the reader, with no separate caption paragraph at
    # all. For those the only chapter-authored text there is IS `desc`, and
    # 27 of chem_06's figures — no art yet, no `cap_text`, nothing but a
    # dashed box and a bare `चित्र 6.1` — read as unfinished without it.
    # `.fd` is the class the book already uses for a description line under
    # a plate, so the fallback matches the same place, same styling,
    # `cap_text` would use if the chapter had written one.
    if (cap_text or "").strip():
        cap_html = ('<figcaption class="fcap">%s</figcaption>'
                   % inline(cap_text))
    elif (desc or "").strip():
        cap_html = '<div class="fd">%s</div>' % inline(desc)
    else:
        cap_html = ""
    return ('<figure class="figcard figbox%s" data-fig="%s" data-ref="%s" data-desc="%s">'
            '<div class="fh"><span>📐</span><span>%s</span></div>'
            '<div class="figspace" style="height:%dpx;"></div>'
            '%s</figure>'
            % (variant, plain(num or ""), plain(ref or ""), plain(desc or ""),
               inline(label), h, cap_html))


def figure_note(text):
    """The small pencil line under a figure card."""
    return ('<div class="po po-fig"><span class="ic">✏️</span>'
            '<span>%s</span></div>' % inline(text))
