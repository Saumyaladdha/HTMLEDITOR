import html as _h
# -*- coding: utf-8 -*-
"""
Display maths and the सूत्र (formula) card.

`.dm` is a centred display line. `.fcard` is the bordered purple panel that
collects a section's formulas; inside it each `.frow` is one formula with an
optional caption (`.fd`) and condition (`.fc`).

The card sets `columns:370px` rather than a fixed column count, so it runs
two formulas side by side on a full-width page and one beside a floated note
or inside a question column — with no layout switch to maintain.
"""
import re as _re

from ..format import display as _display
from ..format import reaction as _reaction
from ..format.inline import inline, plain
from ..format import inline as _inline                        # noqa: E402
from ..validators.latex_convert import tex as _latex_tex

WIDE_ROWS = 5          # rows from which a two-column card pays off

FCOLOURS = ["#c2337a", "#2fa356", "#2456c9", "#ef8e2a", "#7b3fd0", "#0e7c8c"]


# How many `=` a single display line may carry before it is broken up.
MAX_CHAIN_EQ = 2

# ONE matched `$…$` or `$$…$$` span, DOTALL so a chain wrapped across a
# source line break is still one match. See the single-span case in
# _split_chain.
_DOLLAR_SPAN_RE = _re.compile(r'\${1,2}(.+?)\${1,2}', _re.S)


def _split_chain(body):
    """`A = B = C = D` -> ["A", "= B", "= C", "= D"], or [] if not a chain.

    A four-step chain written on one line is one of the commonest shapes in
    these derivations, and set as a single centred equation it simply wrapped:
    `B = ∫dB = μ₀I/4πr ∫cos φ dφ = μ₀I/4πr [sin φ] = μ₀I/4πr` on one line and
    `[sin(+φ₂) − sin(−φ₁)]` orphaned on the next, centred under it. A textbook
    breaks before each `=` and aligns them, so each step reads as a step.

    Only TOP-LEVEL `=` count — one inside brackets belongs to its operand.
    """
    # A BACKTICK MEANS THIS IS QUOTED, NOT BARE MATHS.
    #
    # A maths-chapter tip line reads `🔢 "HCF(306, 657) = 9 दिया है, LCM
    # ज्ञात कीजिए" → \`HCF × LCM = a × b\` से सीधे \`LCM = (a×b)/HCF\`
    # निकालो …` — three unrelated `=` signs across a quoted question, a
    # backtick-quoted formula NAME, and a second backtick-quoted formula
    # NAME, in one Hindi sentence of ADVICE about when to use which
    # formula. That is prose citing formulas, not a four-step derivation,
    # but the plain-text branch below only counts `=` signs and cannot
    # tell the difference — it split this exact sentence into a 3-row
    # aligned chain, stripping the backticks' own quoting and leaving a
    # bare `` ` `` on the page where a formula name should have stayed
    # inside its quote. A real derivation, matched elsewhere in this same
    # chapter, is never written with markdown backticks around a piece of
    # it — only a reference TO a formula is.
    if "`" in body:
        return []
    # PLAIN TEXT ONLY. Splitting a LaTeX body at its `=` cuts the source in
    # half before the converter sees it — `\begin{aligned} … \\ &= …` came out
    # printing its own command names, 342 defects from one change. LaTeX
    # already has `aligned` for a chain and says where its own breaks go.
    #
    # A SINGLE `$…$`/`$$…$$` SPAN IS A DIFFERENT CASE FROM SEVERAL.
    #
    # Physics chapter 1 never writes a bare-text chain at all — every
    # derivation stays inside ONE `$…$`, often with a short label before it
    # and a short note after: `(c) प्लेटों के मध्य $E=…=…=…=1.92×10⁻¹⁰ N/C$
    # (धनात्मक से ऋणात्मक प्लेट की ओर)।`. That is exactly ONE equation, a
    # four-step chain wearing prose on both sides — not the "जब $x = 4$, तब
    # समी (iv) से, $y = 6 - 4 = 2$" shape below, which is TWO separate
    # equations in one sentence and must stay a sentence. The difference is
    # the delimiter count: one matched `$…$` span, with no `$` or `\` left
    # over in what surrounds it, is safe to open and chain-split on its own
    # converted content; two or more spans are not, and fall through to the
    # bail-out beneath this.
    if "$" in body:
        m = _DOLLAR_SPAN_RE.search(body)
        if m:
            lead, inner, trail = body[:m.start()], m.group(1), body[m.end():]
            if "$" not in lead and "$" not in trail and "\\" not in lead and "\\" not in trail:
                converted = _latex_tex(inner).strip()
                if converted and "\\" not in converted and "$" not in converted:
                    parts = _split_chain(converted)
                    if parts:
                        lead, trail = lead.strip(), trail.strip()
                        if lead:
                            parts[0] = (lead + " " + parts[0]).strip()
                        if trail:
                            parts[-1] = (parts[-1] + " " + trail).strip()
                        return parts
        return []
    # PLAIN TEXT ONLY, part two. Splitting a LaTeX body at its `=` cuts the
    # source in half before the converter sees it — `\begin{aligned} … \\
    # &= …` came out printing its own command names, 342 defects from one
    # change. LaTeX already has `aligned` for a chain and says where its own
    # breaks go.
    if "\\" in body:
        return []
    # NOR A BODY THAT STILL CARRIES `$` DELIMITERS.
    #
    # Those mark maths spans inside prose, and an `=` inside one belongs to
    # that span. The maths chapter writes lines like
    #
    #     जब $x = 4$, तब समी (iv) से, $y = 6 - 4 = 2$
    #
    # which is a sentence with three equations in it, not a four-step chain.
    # Split at its top-level `=` the left-hand side came out as `जब $x` — an
    # orphaned delimiter printed on the page, and the rest of the sentence
    # scattered across grid cells.
    #
    # A chain is a chain of BARE expressions. If the body still has
    # delimiters in it, it has not been through the maths converter and this
    # is not the pass to guess at its structure.
    if "$" in body:
        return []
    # A DANDA IN THE MIDDLE MEANS SENTENCES, NOT STEPS.
    #
    # A derivation is ONE statement and carries at most a single danda, at
    # the very end — `शंट प्रतिरोध, S = Ig G/(I − Ig) = … ≈ 0·505 ओम।`.
    # Prose that merely happens to contain `=` signs runs across several
    # sentences, and split at its top-level `=` it comes out shredded into
    # grid cells. Chapter 2 wrote five prose lines as one paragraph —
    # "किसी वस्तु पर बल F लगाकर … कार्य W = F·d cosθ होता है। θ = 90° पर
    # cos90° = 0 होने से …" — four top-level `=` and no `$`, `\` or
    # backtick to disqualify it, so it became a 3-row chain 1600px tall.
    # That is taller than the 1432px page, and `.page` is overflow:hidden,
    # so the tail of the paragraph was silently deleted.
    #
    # Measured over every chapter already built: 21 chains carry no danda
    # and 26 end with one — all untouched — and the only two with a danda
    # in the MIDDLE are this bug, here and in the maths regression file.
    if "।" in body.rstrip().rstrip("।"):
        return []
    cuts, depth = [], 0
    for i, ch in enumerate(body):
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth = max(0, depth - 1)
        elif ch == "=" and depth == 0:
            # not `≠`, `≈`, `≡`, nor the `=` of `<=`/`>=`
            if i and body[i - 1] in "<>=!≠≈≤≥":
                continue
            if i + 1 < len(body) and body[i + 1] == "=":
                continue
            cuts.append(i)
    if len(cuts) <= MAX_CHAIN_EQ:
        return []
    parts, last = [], 0
    for c in cuts:
        seg = body[last:c].strip()
        if seg:
            parts.append(seg)
        last = c
    tail = body[last:].strip()
    if tail:
        parts.append(tail)
    return parts if len(parts) >= 3 else []


def has_chain(text):
    """True if `eq(text)` would render this as an aligned multi-row chain.

    Lets a caller outside this module (the generic paragraph dispatch in
    render.py) decide whether a block of prose is really a derivation
    wearing prose on both ends, and route it to `eq()` instead of `para()`
    — see the render.py `k == "para"` branch."""
    body, _ = _display.split_eqno(text or "")
    return bool(_split_chain(body.strip().strip("$").strip()))


# `\boxed{…}` -> the gold-bordered `.math-result` highlight around a
# derivation's final answer — the reference boxes EXACTLY what the source
# itself wraps in `\boxed{}`, never a guessed "last line" heuristic. Brace
# balance goes one level deep, which is every real case in this book's
# derivations (`\boxed{\;E = \frac{1}{2}CV^2\;}`, `\boxed{C_{eq} = ...}` —
# the subscript's own `{eq}` is the one nested pair `\boxed` ever needs to
# survive).
#
# MARK THE POSITION; DO NOT EXTRACT AND CONVERT SEPARATELY.
#
# A first version pulled the inner LaTeX out into a side list and ran
# `inline(inner, math=True)` on it alone once the surrounding text was
# fully converted — cleaner-looking, and wrong: a bare `\frac{1}{2}`
# never stacks into a fraction outside the `\begin{aligned}…\end{aligned}`
# wrapper that made the REST of the derivation convert correctly (that
# wrapper is what routes a row through the environment-aware LaTeX pass;
# `inline()` alone does not re-trigger it for an arbitrary fragment). So
# the boxed content is left exactly where it was, inside the same
# environment, and converts by the SAME pass as every sibling line —
# only its start/end position is marked, with a sentinel pair that
# carries no digit and no LaTeX meaning of its own, so nothing in
# between (a fraction, a subscript, whatever it converts to) can trip a
# formatting pass into eating the marker itself.
_BOXED_RE = _re.compile(r'\\boxed\{((?:[^{}]|\{[^{}]*\})*)\}')
_BOXED_OPEN, _BOXED_CLOSE = "\ue050", "\ue051"
_BOXED_SPAN_RE = _re.compile(_BOXED_OPEN + r'(.*?)' + _BOXED_CLOSE, _re.S)


def _stash_boxed(text):
    return _BOXED_RE.sub(
        lambda m: _BOXED_OPEN + m.group(1) + _BOXED_CLOSE, text or "")


def _restore_boxed(html):
    return _BOXED_SPAN_RE.sub(
        lambda m: '<span class="math-result">%s</span>' % m.group(1), html)


def _wrap_eqlines(html, eqno=""):
    """One `.eqline > .math-line` div per row of a `.dm` — the reference's
    shape for EVERY display equation, one row or many. A multi-step
    derivation (`\\begin{aligned}`, or a plain `A = B = C` chain) still
    reaches here as one `<br>`-joined string from the matrix/chain
    conversion below; splitting on it and dropping the `<br>` in favour of
    block-level rows is what makes each step its own centred line instead
    of a soft wrap glued to the one above it."""
    parts = html.split("<br>") if "<br>" in html else [html]
    # THE EQUATION NUMBER RIDES THE LAST LINE, INSIDE IT.
    #
    # `…(ii)` is a label ON the step, and the reference sets it in the
    # step's own `.math-line` as a `.k` run — `= U/V′   …(i)` reads as one
    # line with a reference hanging off its right. Put in a row of its own
    # it sat under the equation with air above and below, which reads as a
    # second, empty step. Only the MARKS chip is a row of its own; see
    # `_tail_html`.
    if eqno and parts:
        parts[-1] = '%s <span class="k">%s</span>' % (parts[-1], eqno)
    return "".join(
        '<div class="eqline"><span class="math-line">%s</span></div>' % p
        for p in parts)


def _tail_html(marks):
    """The marks-chip row that follows a `.dm`, or `""`.

    A SIBLING OF `.dm`, NOT PART OF IT. The reference right-aligns the
    chip below the equation rather than gluing it to the last line, so a
    `2 अंक` tag cannot be mistaken for part of the maths — see `.eq-tail`
    in `elements/display-math/extra.css`. The equation NUMBER is not this;
    it stays inline, see `_wrap_eqlines`."""
    if not marks:
        return ""
    return '<div class="eq-tail">%s</div>' % _inline.marks_chip(marks)


# A BRACKETED REASON IS A NOTE, NOT PART OF THE EQUATION.
#
# A derivation step often ends by saying WHY:
#
#     … = cos 2A  [∵ cos²A − sin²A = cos 2A तथा 2 sin A cos A = sin 2A]
#
# Set as ordinary maths it welded onto the line before it (`7A[∵`, no
# space), took the same italic notation face as the working, and wrapped
# wherever the column ran out — so a reader met half a justification, a
# line break, and then `Acos A = sin 2A]` with no way to tell it apart
# from the next step of the proof. Reported as "whenever there is a
# formula line it is very confusing".
#
# Pulled out and marked so the stylesheet can set it back: smaller,
# unslanted, muted, and on its own line when it is long. The brackets are
# kept — they are the author's, and a reader looking for the reason a
# step is allowed is looking for them.
#
# Matched only at the END of a line and only when the bracket actually
# carries a justification marker (`∵`/`∴`) or Devanagari prose. A bare
# `[1 0]` is a matrix and `[1]` is a marks chip; neither is a note.
_EQ_NOTE_RE = _re.compile(
    r'\s*\[\s*(?=[^\]]*(?:[\u2235\u2234]|[\u0900-\u097F]))([^\]]{4,})\]\s*$')


def _split_eq_note(text):
    """-> (equation without its trailing reason, the reason or "")."""
    m = _EQ_NOTE_RE.search(text or "")
    if not m:
        return text, ""
    return text[:m.start()].rstrip(), m.group(1).strip()


def _eq_note_html(note):
    """The `[∵ …]` reason, set apart from the working it explains."""
    if not note:
        return ""
    return '<span class="eq-why">[%s]</span>' % inline(note, math=True)


def eq(text, eqno="", step=None, marks=""):
    """One display equation, centred on its own line — see `_eq` for the
    real body. This wrapper only stashes/restores `\\boxed{…}` around it,
    so every return path (chain, stepped, reaction, plain) gets the same
    treatment without repeating it at each one."""
    return _restore_boxed(_eq(_stash_boxed(text), eqno, step, marks))


def _eq(text, eqno="", step=None, marks=""):
    """One display equation, centred on its own line.

    A trailing `…(i)` is an equation NUMBER, not maths: the reference sets its
    226 of them in the handwritten face, which also keeps them out of the
    fraction stacker — `…(ii)` has no business being read as an operand.
    """
    # A marks tag written INSIDE the equation — `⇒ W = MB(cosθ₁ − cosθ₂) [1]`.
    # `marks_chips` in format/inline runs on prose only, so 23 of these stayed
    # as literal text in the middle of the maths. Pulled off here and handed
    # to the chip this function already renders.
    m_in = _re.search(r'\s\[(\d{1,2})\s*[Mm]?\]\s*$', text or "")
    if m_in and not marks:
        marks = m_in.group(1)
        text = text[:m_in.start()] + text[m_in.end():]
    text, eq_note = _split_eq_note(text)
    body, inside = _display.split_eqno(text)
    # A number can be written INSIDE the delimiters or after the closing
    # `$$`; the reader hands the second form in as `eqno`.
    eqno = inside or eqno
    # A long `=` chain becomes one aligned step per line — see _split_chain.
    chain = _split_chain(body.strip().strip("$").strip())
    if chain:
        # ONE `.eqline` PER STEP — same shape a `\begin{aligned}` derivation
        # gets below, not a separate aligned-grid design. The reference
        # never draws a chain as a grid: it puts the left-hand side on the
        # SAME row as the first `=`, then one bare `= …` row per step after
        # it, each just another `.eqline` in the same `.dm`.
        lhs, steps = chain[0], chain[1:]
        rows = []
        for i, part in enumerate(steps):
            rows.append(("%s %s" % (lhs, part)).strip() if i == 0 else part)
        html = "<br>".join(inline(r, math=True) for r in rows)
        html = _wrap_eqlines(html, eqno)
        return '<div class="dm">%s%s</div>%s' % (
            html, _eq_note_html(eq_note), _tail_html(marks))

    html = inline(body, math=True)
    html = _wrap_eqlines(html, eqno)
    tail = _tail_html(marks)

    # THE MD'S OWN NUMBER, and only that.
    #
    # A derived `①②③` down the gutter was a SECOND numbering system on top of
    # the author's `...(i)`, and the prose cites the author's — "समी (iii) व
    # (iv) से स्पष्ट है". Two numbers on one equation told a reader nothing
    # about which the text meant, so the invented one is gone. What the
    # markdown says is what the page shows.
    #
    # `.eq-tail` IS A ROW OF ITS OWN, NOT GLUED TO THE LAST LINE.
    #
    # The reference never puts `…(i)` or a marks chip inside `.dm` — both
    # sit in a `<div class="eq-tail">` sibling below it, right-aligned. A
    # single string return still carries this: the caller drops whatever
    # `eq()` returns into one IR item, so two adjacent divs work exactly
    # like one.
    #
    # The step number sits in the gutter the left hairline already occupies,
    # so it costs no width and reads as a marker on the step rather than as
    # part of the maths.
    if step:
        return ('<div class="dm dm-step"><span class="stepno">%s</span>%s%s</div>%s'
                % (plain(step) if isinstance(step, str) else step, html,
                   _eq_note_html(eq_note), tail))
    # A REACTION IS NOT A LINE OF TEXT — see format/reaction.structure.
    #
    # Given no structure in the DOM, the line breaker decided the geometry of
    # every equation: species split mid-formula, products drifted a line away
    # from the arrow that made them, and a substituent's vertical bond landed
    # under the wrong carbon when the chain wrapped. Wrapping each side of the
    # arrow makes the equation one object whose parts cannot be separated.
    #
    # Returns `html` untouched when there is no arrow, so an ordinary display
    # equation keeps the geometry it has always had.
    return '<div class="dm">%s%s</div>%s' % (
        _reaction.structure(html), _eq_note_html(eq_note), tail)


PAIR_CHARS = 20        # a formula this short can share a row with the next


def _short_fx(expr):
    """Is this result short enough to sit beside another in half a column?

    Measured on the plain text, with the LaTeX stripped: a half of a 440px
    answer column is about 205px once the panel padding, the box borders and
    the gap are paid for, and the boxed face runs about 10px a character at
    18.5px. Twenty characters is the point where the pair still fits with a
    little air; past it the second box would wrap inside itself.
    """
    t = _re.sub(r'\\[a-zA-Z]+|[{}$]', '', str(expr or ""))
    return len(t.strip()) <= PAIR_CHARS


def frow(expr, caption="", cond="", colour="#c2337a"):
    out = ['<div class="frow">']
    out.append('<span class="fx" style="border-color:%s;">%s</span>'
               % (colour, inline(expr, math=True)))
    if caption:
        out.append('<span class="fd">%s</span>' % inline(caption))
    if cond:
        out.append('<span class="fc" style="border-left-color:%s;">'
                   '<b>शर्त:</b> %s</span>' % (colour, inline(cond)))
    out.append('</div>')
    return "".join(out)


def formula_list(rows, title="सूत्र", cont=False):
    """The सूत्र panel, PART 1's skin — a bulleted list, not boxed rows.

    In the crib sheet the formulas are a LIST to read down: the reference
    sets each one as a `.formula-list` item with a small purple dot, all
    inside one flat purple card. `frow`'s per-result box is right in Part
    2, where a formula is an answer you are meant to memorise and there
    are one or two of them; applied to a six-formula topic in a 449px
    column it drew six separate bordered cards down the column and the
    topic read as six things rather than one.

    A caption or condition is not dropped — it follows the expression
    inside the same item, which is how the reference sets `सामान्य V =
    …` and `तीनों में शर्त r ≫ a`.
    """
    def _parts(r):
        expr = r[0] if isinstance(r, (list, tuple)) else r
        cap = r[1] if isinstance(r, (list, tuple)) and len(r) > 1 else ""
        cond = r[2] if isinstance(r, (list, tuple)) and len(r) > 2 else ""
        return expr, cap, cond

    items = []
    for r in rows:
        expr, cap, cond = _parts(r)
        body = [inline(expr, math=True)]
        if cap:
            body.append('<span class="fd">%s</span>' % inline(cap))
        if cond:
            body.append('<span class="fc"><b>शर्त:</b> %s</span>' % inline(cond))
        items.append('<li><div class="formula-body">%s</div></li>'
                     % " ".join(body))
    head = "" if cont else '<div class="ft"><b>%s:</b></div>' % inline(title)
    return ('<div class="fcard%s">%s<ul class="formula-list">%s</ul></div>'
            % (" fcard-cont" if cont else "", head, "".join(items)))


def fcard(rows, title="सूत्र", cont=False):
    """The सूत्र panel. `rows` is a list of (expr, caption, cond) tuples.

    `cont` is the SECOND half of a panel the splitter broke over a column
    boundary. It carries no title.

    That is not only a matter of taste. A split used to rebuild both halves
    with the full heading, so breaking one panel produced two complete cards
    with two heading bars and two sets of padding — and the duplicated chrome
    cost almost exactly what the split reclaimed. Measured on chapter 4, all
    three candidate splits moved the total by about 65px and were reverted as
    not worth doing, which is why formula rows stayed put in front of 400px
    holes. A reader does not need telling twice that these are सूत्र.
    """
    def _parts(r):
        expr = r[0] if isinstance(r, (list, tuple)) else r
        cap = r[1] if isinstance(r, (list, tuple)) and len(r) > 1 else ""
        cond = r[2] if isinstance(r, (list, tuple)) and len(r) > 2 else ""
        return expr, cap, cond

    # TWO SHORT FORMULAE SHARE A ROW.
    #
    # `.flowwrap:not(.cover) .fcard` asks for `columns:370px`, which needs
    # 766px before the browser will make two of them. A Part-2 answer column
    # is 440px, so every सूत्र panel in an answer collapsed to ONE column and
    # a result as short as `A + B = B + A` — about 130px of type — sat alone
    # on a 440px row. Eleven of those is most of a page of white.
    #
    # Pairing is done HERE rather than in CSS because it has to depend on how
    # long the formula actually is: `(A + B) + C = A + (B + C)` needs roughly
    # 240px and will not sit beside anything in a half-column. Only when two
    # CONSECUTIVE results are both short does the pair go out as one row, so
    # the panel keeps its reading order and a long result still gets the full
    # measure.
    body = []
    i = 0
    while i < len(rows):
        e1, c1, k1 = _parts(rows[i])
        nxt = _parts(rows[i + 1]) if i + 1 < len(rows) else None
        if (nxt and not c1 and not k1 and not nxt[1] and not nxt[2]
                and _short_fx(e1) and _short_fx(nxt[0])):
            body.append(
                '<div class="frow frow-pair">'
                '<span class="fx" style="border-color:%s;">%s</span>'
                '<span class="fx" style="border-color:%s;">%s</span>'
                '</div>'
                % (FCOLOURS[i % len(FCOLOURS)], inline(e1, math=True),
                   FCOLOURS[(i + 1) % len(FCOLOURS)], inline(nxt[0], math=True)))
            i += 2
            continue
        body.append(frow(e1, c1, k1, FCOLOURS[i % len(FCOLOURS)]))
        i += 1
    # A सूत्र panel with enough rows to fill two columns must CLEAR the
    # floated note column. Squeezed beside it the card is 624px wide, below
    # `columns:370px`, so eleven formulas stacked in one column and ate a
    # whole page. Clearing gives it the full 944px and two columns.
    wide = " fcard-wide" if len(rows) >= WIDE_ROWS else ""
    # A PANEL THAT IS NOT FORMULAE DOES NOT GET FORMULA BOXES.
    #
    # `frow` draws each row as a coloured box, which is right for a result
    # you are meant to memorise. Chemistry writes two other things on the
    # same label — a list of REAGENTS and a list of USES:
    #
    #     उपयोग:      CH₂Cl₂ पेन्ट हटाने में · CHCl₃ विलायक व निश्चेतक · …
    #     अभिकर्मक:   X₂/निर्जल FeX₃ · सांद्र HNO₃ + सांद्र H₂SO₄ · …
    #
    # Boxed like formulae they read as things to learn by heart, in six
    # different border colours, which is what looked wrong. They are a
    # two-column list: the thing, and what it is for. `fcard--list` strips
    # the boxes and sets them as one.
    LIST_TITLES = ("उपयोग", "अभिकर्मक", "तथ्य", "पहचान")
    plain_list = "" if cont else (
        " fcard--list" if any(t in (title or "") for t in LIST_TITLES) else "")
    head = "" if cont else '<div class="ft">%s</div>' % inline(title)
    return ('<div class="fcard%s%s%s">%s%s</div>'
            % (wide, plain_list, " fcard-cont" if cont else "",
               head, "".join(body)))


def fbox(text, colour="blue", tail=""):
    """A single boxed formula — a one-row fcard."""
    cap = ("[%s]" % tail) if tail else ""
    return fcard([(text, cap, "")])


def chem_structure(b):
    """One drawn organic structure from a `structure` IR block.

    The cells go through `inline` so a group carries the same notation
    treatment as the rest of the page — `CH_3` has to subscript here exactly
    as it does in a sentence.
    """
    from ..format import structure as _structure
    # A DIGIT AFTER AN ELEMENT IS A SUBSCRIPT, AND NOTHING SAYS SO.
    #
    # The atoms arrive as the source writes them in a chain — `CH3`, `CH2Br`,
    # `C14H9Cl5` — with no `_`. Handed to `inline` as maths, a bare trailing
    # digit has nothing marking it, so it came out in `.up`, which is
    # `font-style:normal` and neither raised nor lowered: 40 of the 41
    # structure grids printed `CH3` at full size, and a formula with
    # full-size digits is a different formula.
    #
    # The lookbehind is what keeps a COEFFICIENT safe: in `2H` the digit
    # comes before the letter and must stay full size, while in `CH3` and
    # `Cl5` it follows one and is a subscript.
    cell = chem_text
    # RAW atoms — `draw` applies `render` to every cell itself, so rendering
    # them here as well escaped the HTML from the first pass and the chain
    # printed `&lt;span class=` in place of each atom.
    html = _structure.draw(
        b.get("atoms") or [],
        b.get("bonds") or [],
        [(i, d, g) for i, d, g in (b.get("branches") or [])],
        numbers=b.get("numbers") or None,
        render=cell)
    if b.get("name"):
        # THE NAME GOES INSIDE THE GRID, NOT AFTER IT.
        #
        # `.cst-name` is styled `grid-column:1/-1; text-align:center` so the
        # name centres on the MOLECULE. Appended after the closing `</div>`
        # it was not in the grid at all: a plain block filling the column,
        # centred on the COLUMN. For a narrow molecule — `CH₃—C—CH₃` with
        # OH above and CCl₃ below — that put `क्लोरीटोन` far to the right of
        # the structure it names, with the empty column between them reading
        # as a missing figure. Inside the grid the existing rule does what
        # its own comment says it does.
        # Before the GRID's own closing tag — `replace(..., 1)` takes the
        # first `</div>` in the string, which is the end of the first ROW,
        # and put the name inside the chain instead of under it.
        tag = '<div class="cst-name">%s</div>' % inline(b["name"])
        html = (html[:-len("</div>")] + tag + "</div>"
                if html.endswith("</div>") else html + tag)
    html += _tail_eq(b)
    if b.get("src"):
        html = html.replace('<div class="cst"', '<div class="cst" data-desc="%s"'
                            % _h.escape(b["src"], quote=True), 1)
    return html


def chem_text(t):
    """Set a chemical formula's digits as subscripts.

    `C7H7Cl` -> `C₇H₇Cl`. The lookbehind is what keeps a COEFFICIENT safe:
    in `2H` the digit comes before the letter and stays full size, while in
    `CH3` and `Cl5` it follows one and is a subscript.

    Lifted out of `chem_structure`'s cell renderer, which had the only copy,
    so a figure CAPTION gets the same treatment its structure grid already
    did — `चित्र 6.44 — C7H7Cl बनना` printed its formula flat while the
    drawing beside it was correctly subscripted.
    """
    if not t:
        return ""
    return inline("$%s$" % _re.sub(r'(?<=[A-Za-z\)])(\d+)', r'_{\1}', t))


def _tail_eq(b):
    """The `+ X` the source wrote on the line after a drawn molecule.

    Inline and in the same maths face as the rest of the equation, so the
    by-product reads as part of it — see `RE_EQ_CONTINUES` in the reader,
    which is what puts it here instead of leaving it a block of its own.
    """
    tail = (b or {}).get("tail_eq", "")
    # `inline("$…$")` already returns a `.m` run; wrapping it again nested
    # one `.m` span inside another.
    return (" " + inline("$%s$" % tail)) if tail else ""


def chem_ring(b):
    """One drawn ring compound from a `ring` IR block — see format/ring.py.

    Falls back to the plain `◯` + name the chapter already uses for a ring
    it does NOT try to draw (see `.sp` in format/reaction.py) rather than
    to a blank span, so RDKit being unavailable or a bad SMILES never
    loses the compound's name from the page."""
    from ..format import ring as _ring
    html = _ring.draw_ring(b.get("smiles", ""), plain(b.get("name", "")))
    if html:
        # A drawn structure names itself, exactly as `chem_rxn` does — the
        # drawing shows the compound, the caption says which figure it is.
        cap = plain(b.get("caption", ""))
        if cap:
            html += '<div class="cst-name">%s</div>' % chem_text(cap)
        return html + _tail_eq(b)
    name = plain(b.get("name", ""))
    return ('<span class="sp"><span class="sp-c">◯</span>'
            '<span class="sp-u">%s</span></span>' % name) if name else "◯"


def chem_rxn(b):
    """One reaction, both sides drawn by RDKit — see format/ring.py.

    Falls back to the bare caption (what a `data-desc` figure brief
    already carried) if RDKit is unavailable or the SMILES fails, so a
    reaction that cannot be drawn still names itself on the page instead
    of vanishing."""
    from ..format import ring as _ring
    html = _ring.draw_reaction(b.get("smiles", ""), plain(b.get("above", "")),
                               plain(b.get("below", "")))
    # THE ART BRIEF RIDES ALONG, IT DOES NOT PRINT.
    #
    # `ring.parse_bracket` hands back the prose that used to trail the
    # closing bracket. Printed, it was a wall of `&quot;` and raw
    # `\mathrm{}` where a label belonged; dropped, step16 counted its words
    # as vanished (`निकलते`, `अँधेरा`, `पंचकोण`). A figure's brief already
    # has a home — the `data-desc` attribute — so it goes there: in the
    # HTML for the coverage check and for whoever draws the art, never on
    # the page.
    desc = plain(b.get("desc", "") or "")
    attr = ' data-desc="%s"' % _h.escape(desc, quote=True) if desc else ""
    cap = plain(b.get("caption", ""))
    if html:
        # A DRAWN REACTION STILL NAMES ITSELF.
        #
        # The caption was a FALLBACK — used only when the drawing failed —
        # so the moment RDKit succeeded, `चित्र 6.19 — 2-क्लोरो-6-नाइट्रो
        # फीनॉल` disappeared. Every other figure in the book carries its
        # number and its subject; step16 counted the words as vanished
        # (`नाइट्रोफीनॉल`, `बेन्जिलऐमीन`, `उलमान`) and it was right to —
        # the drawing shows a structure, the caption says which reaction it
        # is and which figure number the question refers to.
        return ('<div class="dm"%s><span class="m">%s</span>%s</div>'
                % (attr, html,
                   '<div class="cst-name">%s</div>' % chem_text(cap) if cap else ""))
    return ('<div class="dm"%s><span class="m">%s</span></div>' % (attr, cap)
            if cap else "")
