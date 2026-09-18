# -*- coding: utf-8 -*-
"""
MATRICES — the one construct where losing the brackets loses the meaning.

Maths chapter 3 carries 496 `\\begin{bmatrix}` matrices. Before this module
the general maths pass reduced every one of them to loose digits:

    $A=\\begin{bmatrix}1&2&3\\\\2&3&1\\end{bmatrix}$

    ->  A= 1 2 3<br>2 3 1

Nothing was dropped, which is why the source's own token round-trip passed —
and the mathematical object was gone. `1 2 3 2 3 1` is six numbers; a matrix
is a bracketed grid whose columns line up, and a reader cannot recover the
second from the first.

Two notations, both real, both in this chapter:

  1. LaTeX `bmatrix`, 496 of them, inside `$…$` and often several in one
     expression: `A³ − 6A² + 7A + 2I = [..] − 6[..] + 7[..] + 2[..]`.

  2. MULTI-LINE ASCII ART, about 26 lines, where each source line is one
     matrix ROW and several matrices sit side by side:

         [ 3  −2   1 ] [ 3  −2   1 ]   [ 1   12    8 ]
         [ 4   2   1 ] [ 4   2   1 ]   [ 14   6   15 ]

     The chapter's own header says these were left untranslated because "it
     is not determined which line belongs to which matrix". By source order
     that is true; by COLUMN POSITION it is not, which is what `ascii_block`
     uses. And they cannot simply be left alone: HTML collapses runs of
     spaces, so the alignment that makes them readable is destroyed the
     moment they reach a page.

The brackets are DRAWN with CSS borders rather than typed as `[` and `]`, so
they grow with the number of rows — a 3×3 between two typed brackets has the
brackets ending a line and a half short.
"""
import re

# Environments that mean "a bracketed grid", and the bracket style each wants.
ENVIRONMENTS = {
    "bmatrix": "square",
    "pmatrix": "round",
    "vmatrix": "bars",       # a determinant
    "Vmatrix": "bars",
    "matrix": "none",
    # AN AUGMENTED MATRIX.
    #
    # `\\left[\\begin{array}{ccc|ccc} 2&0&-1 & 1&0&0 \\\\ … \\end{array}\\right]`
    # is how the chapter writes `[A | I]` for a matrix inversion — three of
    # its answers are built this way. `array` takes a COLUMN SPEC argument,
    # `{ccc|ccc}`, and the `|` in it is the augment rule.
    #
    # Missing from this list, the whole environment was flattened: the answer
    # printed as `[ 2 0 -1 1 0 0` on one line, `5 1 0 0 1 0` on the next and
    # `0 1 3 0 0 1 ]` on a third, with the brackets stranded at the ends and
    # the augment bar gone. The row operations beneath it then read as
    # commentary on nothing.
    "array": "square",
    # `aligned` IS NEVER A MATRIX — see `_is_stack` below, which always
    # intercepts it before this style value would matter. Present only so
    # `_ENV_RE` matches the environment at all; missing from this dict
    # entirely, `\begin{aligned}…\end{aligned}` fell through untouched and
    # printed as raw LaTeX — physical chemistry's colligative-property
    # derivations write ten of them in this chapter alone.
    "aligned": "square",
    # A SINGLE NUMBERED LINE, not a grid at all — `\begin{equation*}
    # \sqrt2=\frac{a}{3b} \tag{1} \end{equation*}` is how this maths
    # chapter writes a step it wants to refer back to later ("समी. (1)
    # ... सत्य नहीं हो सकता"). Missing from this dict, the wrapper and
    # its `\tag{1}` were never recognised as an environment at all —
    # `_ENV_RE` didn't match, so the whole `$$…$$` reached the page as
    # raw LaTeX, three times in one chapter. `_stack_lines` always
    # intercepts both spellings before this style value matters (a
    # numbered line is never a bracketed grid), same as `aligned`.
    "equation": "square",
    "equation*": "square",
    # `align`/`align*`/`gather` ARE `aligned` BY ANOTHER NAME.
    #
    # `aligned` is the inline form; `align*` is the display form, and a
    # source that writes its derivations at top level uses the starred one.
    # `physics_edited.md` has four, and with the name missing from this dict
    # `_ENV_RE` never matched them — so the whole `$$…$$` fell through
    # unconverted and its `\tag{ii}` reached the page as the bare word
    # "tagii", printed in italics beside the step it was meant to number.
    # Same failure `aligned` itself had before it was added here.
    "align": "square",
    "align*": "square",
    "gather": "square",
    "gather*": "square",
}

# The optional `{ccc|ccc}` argument that `array` takes, captured so the
# augment rule can be placed. `\\left[` / `\\right]` around the environment
# are delimiters LaTeX needs and HTML does not — the grid draws its own.
#
# `\left\{` / `\right.` is the SAME optional-delimiter shape, one-sided: a
# textbook's "hal" (solution) often ends several conclusion lines grouped
# under a single left brace with nothing on the right — `\left\{\begin
# {array}{l} यह संख्या 13 से विभाजित होती है। \\ … \end{array}\right.` —
# and `\right.` is LaTeX's own spelling for "no visible right delimiter",
# not a typo missing its bracket. Unmatched by the old class (only
# `[`/`(`/`|` on the left, `]`/`)`/`|` on the right), this environment
# never matched `_ENV_RE` at all, so NOTHING inside it converted — the
# whole `$$…$$` reached the page as raw LaTeX, `\times` and all, for
# every proof that closes this way.
_ENV_RE = re.compile(
    r'(\\left\s*(?:[\[\(\|]|\\\{))?\s*'
    r'\\begin\{(' + "|".join(re.escape(e) for e in ENVIRONMENTS) + r')\}'
    r'\s*(?:\{([^}]*)\})?'
    r'(.*?)\\end\{\2\}'
    r'\s*(?:\\right\s*(?:[\]\)\|]|\.))?', re.S)

# LaTeX's own equation-numbering command, `\tag{1}` or the starred
# `\tag*{1}` (no auto-parens — this chapter's `\tag*{1}` still writes its
# own digit bare, so the parens below are added either way).
_TAG_RE = re.compile(r'\\tag\*?\{([^}]*)\}')


# Joining alignment cells: NOTHING between them, EXCEPT where that would
# weld a LaTeX command onto the next cell's first letter.
#
# §8.4's rule is to recombine an aligned row's cells with nothing — the join
# is what puts the `=` back where the alignment point took it from view. That
# is right whenever a cell ends in a symbol or a brace. It is wrong when a
# cell ends in a COMMAND NAME and the next opens with a letter:
#
#     \Rightarrow  +  x_{1}+1   ->  \Rightarrowx_{1}+1
#     \because     +  f(x_{1})  ->  \becausef(x_{1})
#
# `\[A-Za-z]+` is greedy, so the converter reads `\Rightarrowx` as ONE
# unknown command, fails to match `\Rightarrow`, and drops the backslash —
# putting the bare word "Rightarrowx" on the page. Nine of them in
# `physics_edited.md`'s one-one proofs, where every step's leading `⇒` sits
# in its own alignment cell.
#
# A single space restores the command boundary and is invisible in maths
# once set, so it is added only at that boundary and nowhere else.
_CMD_TAIL_RE = re.compile(r'\\[A-Za-z]+\s*$')


def _join_cells(cells):
    out = ""
    for c in cells:
        if out and c[:1].isalpha() and _CMD_TAIL_RE.search(out):
            out += " "
        out += c
    return out


def _augment_at(spec):
    """Which column the augment rule follows, from a spec like `ccc|ccc`.

    -> the number of columns before the bar, or 0 for none.
    """
    if not spec or "|" not in spec:
        return 0
    before = spec.split("|", 1)[0]
    return len([c for c in before if c in "lcr"])


def _cells(body):
    """The rows of a LaTeX matrix body. `&` separates columns, `\\\\` rows."""
    rows = []
    for raw in re.split(r'\\\\', body):
        raw = raw.strip()
        if not raw:
            continue
        rows.append([c.strip() for c in raw.split("&")])
    return rows


def grid(rows, style="square", render=None, augment=0):
    """A matrix as a bracketed CSS grid.

    `render` formats each cell — the caller passes its inline formatter so a
    cell holding `3a + 8c` or `-\\frac{1}{2}` is set the same way that
    expression would be set anywhere else. Without one the cell is used as
    plain text.

    EVERY CELL IS THE SAME SIZE, ALWAYS — no per-matrix shrink.

    A long cell such as `\\cos x \\cos y - \\sin x \\sin y + 0` is wider
    than a two-column page's matrix can hold at normal size, and an
    earlier version of this function shrank that ONE matrix's font to
    make it fit. Tried two ways — shrinking just the wide matrix, then
    sharing that shrink across every matrix in the same expression so a
    short input matrix and a long result matrix at least matched each
    other — and both read as worse than the problem they solved: a
    visibly smaller matrix sitting next to normal ones on the SAME page
    ("why is one font small, it looks weird"), because the shrink a
    nearby heavy derivation needed made its own short cells — `cos x`,
    `0` — noticeably tinier than the same `cos x` in a neighbouring
    question that never had a long cell to justify shrinking anything.
    `.subj-maths .mx>.mxg>span` already allows a cell to WRAP instead of
    running the matrix off the page (see maths-steps/base.rules.json);
    a long cell now wraps at its own word/operator boundaries — "cos x
    cos y - sin x sin y +" then "0" — rather than shrinking, which is a
    smaller cost than a matrix whose size no longer matches its
    neighbours.
    """
    rows = [r for r in rows if r]
    if not rows:
        return ""
    width = max(len(r) for r in rows)
    fmt = render or (lambda x: x)
    cells = []
    for r in rows:
        for i, c in enumerate(r):
            # The cell that the augment rule runs down the right of.
            cls = ' class="aug"' if augment and i + 1 == augment else ""
            cells.append('<span%s>%s</span>' % (cls, _bind_terms(fmt(c))))
        # A short row is padded, so the grid stays rectangular and the
        # columns of the rows below it do not shift left.
        for _ in range(width - len(r)):
            cells.append('<span></span>')
    # WHICH MATRICES EARN THE SMALLER STEP.
    #
    # Measured against a 440px answer column: once the two 13px gaps, the
    # padding, the bracket rules and the margin are paid for, about 140px
    # is left per cell in a 3-wide grid. At the maths sizes (18px in a
    # column) a cell of ~15 characters needs ~148px, so it wraps mid-sum —
    # `21 - 30 + 7 +` on one line and `2` on the next. Ten characters is
    # comfortably inside the budget at full size, so only cells past that
    # trigger the step, and a short `[1 2; 3 4]` is left alone.
    longest = max((len(_TAG_RE.sub("", re.sub(r'<[^>]+>', '', str(c))))
                   for r in rows for c in r), default=0)
    dense = " mx-dense" if longest > _DENSE_CELL else ""
    cls = ("mx mx-det" if style == "bars" else "mx") + dense
    return ('<span class="%s" style="--c:%d"><i></i>'
            '<span class="mxg">%s</span><i></i></span>'
            % (cls, width, "".join(cells)))


_BREAK_OPS = "+\u2212\u00b1=<>\u2264\u2265\u00d7\u00b7"


_DENSE_CELL = 10       # characters in a cell before the matrix steps down


def _bind_terms(html):
    """Spaces INSIDE a term become non-breaking; only operators may break.

    A long matrix cell is allowed to wrap rather than run the matrix off
    the sheet, but a plain space is a break opportunity, so
    `cos x cos y - sin x sin y + 0` came apart as "cos x cos y - sin x"
    then "sin y + 0" — the two halves of one product on different lines,
    which reads as two different terms. Binding the spaces inside each
    term and leaving them loose around the operators makes the cell break
    where the docstring above always said it would: after the `-` or the
    `+`, never through `sin x sin y`.
    """
    out = []
    for m in re.finditer(r'<[^>]+>|[^<]+', html or ""):
        seg = m.group(0)
        if seg.startswith("<"):
            out.append(seg)
            continue
        parts = re.split(r'(\s*[%s]\s*|\s+-\s+)' % re.escape(_BREAK_OPS), seg)
        for i, part in enumerate(parts):
            if part is None:
                continue
            if i % 2:                      # the separator itself: stays breakable
                out.append(part)
            else:
                # ONLY a space with real text on BOTH sides of it, inside
                # this one segment. A leading or trailing space sits next to
                # whatever follows the segment — and the operators are
                # already wrapped (`<span class="up">+</span>`) by the time
                # this runs, so binding an edge space glued the cell to its
                # own `+` and left `-` as the only break in the row.
                out.append(re.sub(r'(?<=\S) +(?=\S)', '\u00a0', part))
    html = "".join(out)
    # BREAK *BEFORE* A BINARY OPERATOR, NEVER AFTER IT.
    #
    # The TeXbook's rule, and every printed textbook follows it: a formula
    # that runs on carries the operator down to the next line, so the
    # reader sees at a glance that the line is a continuation. Leaving the
    # space after the operator breakable produced the opposite —
    # "cos x cos y -" hanging at the end of one line and "sin x sin y + 0"
    # starting the next, which reads as a finished line followed by a new
    # term. Gluing the operator to what FOLLOWS it moves the break in front
    # of it: "cos x cos y" then "- sin x sin y + 0".
    html = re.sub(r'([+\u2212\u00b1\u00d7\u00b7=<>-])(</span>)?[ ]+(?=\S)',
                  lambda m: m.group(1) + (m.group(2) or "") + "\u00a0", html)
    return html


def _stack_lines(env, rows, spec=None, delim=None):
    """Is this body a STACK of independent lines, not a matrix — and if so,
    the one raw string to render for each row?  `None` when it is a real
    matrix and wants `grid()`'s bracket.

    TWO SHAPES REACH THIS, for two different reasons:

    `array` gets written with no `&` at all — chemistry writes
    `\\begin{array}{l} Ti = 1s^2… \\ Ti^{3+} = 1s^2… \\end{array}` to show a
    species and its ion together, one full equation per row. `_cells` still
    parses it — no `&` means every row is a single-element list — so it fell
    into `grid()` regardless, which gave two whole equations one column of a
    bracketed matrix: the `[`/`]` implied a mathematical object that was not
    there, and the matrix cell's font (sized for a short numeric entry)
    shrank two full display equations to fit. A row is DATA needing the
    bracket only when some row actually has a second column; with none, the
    environment is a typesetting shorthand for "stack these lines".

    `aligned` is ever this, regardless of `&` count — its `&` marks where
    the `=` should line up down the column, not a second column of data.
    `\\begin{aligned} \\Delta T_b &= T_b - T_b^0 = … \\\\ \\Delta T_b &= …
    \\end{aligned}` was not in `ENVIRONMENTS` at all until this module
    learned it, so it fell through UNCONVERTED and printed raw LaTeX
    command names on the page — ten times in one physical-chemistry
    chapter's worked derivations. Once matched, its rows must be
    RECOMBINED, not split: the two cells either side of `&` are the two
    halves of one equation, and joining them with nothing is what puts the
    `=` back where the alignment point removed it from view.

    `equation`/`equation*` is this for a third reason: it never had rows or
    columns to begin with — one line, the number LaTeX writes as `\\tag{1}`
    rather than as `…(1)` trailing the maths. `_TAG_RE` below turns that
    into the same trailing-`(1)` shape every other numbered line in this
    book already uses, so it reads as a label, not a stray LaTeX command.

    Scoped to `array`/`aligned`/`equation*` alone — `bmatrix`/`pmatrix`/
    `vmatrix` are never this; a width-1 `bmatrix` is a genuine column
    VECTOR, and a vector is exactly the case this module exists to keep
    bracketed.
    """
    if not rows:
        return None
    # `\tag{}` IS A LINE NUMBER WHEREVER IT APPEARS, not only in `equation`.
    # It was stripped for `equation`/`equation*` alone, so the same `\tag{ii}`
    # inside an `aligned`/`array` block kept its backslash only until the
    # general maths pass ate it, and printed as the word "tagii".
    if env == "array" and all(len(r) == 1 for r in rows):
        return [_TAG_RE.sub(r' (\1)', r[0]) for r in rows]
    # AN `array` THAT WAS NEVER BRACKETED IS AN ALIGNMENT BLOCK, `&` OR NOT.
    #
    # §8.4's rule — "a row needs a SECOND column before it is data worth
    # bracketing" — reads `&` as evidence of data, and for a BRACKETED array
    # it is. For a bare one it is not: `{rlrl}`, `{lrl}`, `{rcl}` are LaTeX
    # alignment specs (the eqnarray idiom), where `&` marks the point the `=`
    # lines up on — exactly what `&` means in `aligned`.
    #
    # `physics_edited.md` closes its one-one proof with
    # `\begin{array}{rlrl} \Rightarrow & & (x_1-3)(x_2-5)=… \\ …` and it
    # was drawn as a bracketed grid: six derivation STEPS fenced in `[ ]` as
    # though they were one matrix, each `⇒` sitting in its own column like a
    # matrix entry. A reader cannot tell that from a real 6x2 object — which
    # is the exact confusion this module exists to prevent, manufactured here
    # instead of avoided.
    #
    # The discriminator is the DELIMITER, not the `&`. §8.3's augmented
    # matrix is `\left[\begin{array}{ccc|ccc}…\end{array}\right]` — it is
    # bracketed in the source AND carries the augment bar. With neither, no
    # bracket was ever asked for, so none is drawn; the rows recombine the
    # way `aligned`'s do, which is what puts each `=` back on its own line.
    if env == "array" and not delim and "|" not in (spec or ""):
        return [_TAG_RE.sub(r' (\1)', _join_cells(r)) for r in rows]
    if env in ("aligned", "align", "align*", "gather", "gather*"):
        return [_TAG_RE.sub(r' (\1)', _join_cells(r)) for r in rows]
    if env in ("equation", "equation*"):
        return [_TAG_RE.sub(r' (\1)', r[0]) for r in rows]
    return None


def convert_latex(s, render=None):
    """Replace every `\\begin{bmatrix}…\\end{bmatrix}` with a grid.

    Runs BEFORE the general maths transforms, which is the whole point: they
    treat `&` as a stray character and `\\\\` as a line break, so by the time
    they have finished there is no grid left to build.
    """
    if "\\begin{" not in s:
        return s

    def one(m):
        delim, env, spec, body = (m.group(1), m.group(2),
                                   m.group(3), m.group(4))
        rows = _cells(body)
        lines = _stack_lines(env, rows, spec, delim)
        if lines is not None:
            r = render or (lambda x: x)
            return "<br>".join(r(l) for l in lines)
        return grid(rows, ENVIRONMENTS.get(env, "square"), render,
                    _augment_at(spec))

    return _ENV_RE.sub(one, s)


# --------------------------------------------------------------------------
# ASCII ART
# --------------------------------------------------------------------------

# A bracketed group of values: `[ 3  -2   1 ]`.
_GROUP_RE = re.compile(r'\[([^\[\]]+)\]')

# What may sit between two groups on one line, or before the first: an
# operator, a multiplier, an `=`. Anything else means the line is prose that
# happens to contain a bracket.
#
# `$` IS DELIBERATELY NOT HERE. A `$-$`-wrapped operator between two
# groups looks the same, character for character, as the gap in a
# STANDALONE display line that happens to hold two SEMICOLON matrices —
# `X = 1/3 ([10 -10; 20 10; -25 5] + [-16 0; -8 4; -6 -12])`, its own
# complete equation, no relation to the line above or below it. Allowing
# `$` here made both kinds of line match `opens_block`, and the "a lone
# row belongs to the paragraph above it" reach-back a few lines down in
# the reader then fused two UNRELATED standalone lines into one fake
# multi-row matrix purely because they each happened to hold two groups —
# a worse bug than the one the widening fixed. See `_operators_between`
# for the narrower, line-scoped place a `$`-wrapped operator is unwrapped
# instead.
_BETWEEN_RE = re.compile(r'^[\s\d=+\-−×·*/]*$')


def _is_values(group):
    """Is this bracketed group a row of values rather than a sentence?

    A cell may be highlighted `**2x + 3**` or set as maths `$0 - 14+24$` —
    the author marking which entry an answer came from, same content
    either way. Without `*`/`$` in the allowed set, `[ **$0 - 14+24$** ]`
    failed this test, so `opens_block`/`is_ascii_row` never recognised the
    line as a matrix row at all: a whole run of AC/BC column-vector
    products (chapter 3's `(A+B)C = AC + BC` proof and its neighbours)
    stayed as literal, un-gridded bracket text on the page.
    """
    g = (group or "").strip()
    if not g:
        return False
    return bool(re.match(r'^[\s\d\w\.\+\-−×/;\*\$]+$', g)) and re.search(r'[\d\w]', g)


def is_ascii_row(line):
    """A CONTINUATION row: the line is nothing but bracketed value groups.

    `[ 3  -2   1 ] [ 3  -2   1 ]   [ 1   12    8 ]`
    """
    if "[" not in line or "]" not in line:
        return False
    groups = _GROUP_RE.findall(line)
    if not groups or not all(_is_values(g) for g in groups):
        return False
    # Everything outside the groups must be spacing or an operator.
    return all(_BETWEEN_RE.match(part) for part in _GROUP_RE.split(line)[0::2])


def opens_block(line):
    """An OPENING row: a matrix row with prose before it, after it, or both.

    `A² = A·A = [ 1  2  3 ] [ 1  2  3 ] = [ 19  4  8 ]`
    `    [ 2  5 ] [ a  b ] − [ 2  −1 ] [ 5  2 ] = O`

    The first version required the line to END with a bracket. That missed
    every derivation line that closes with prose — `= O`, `= I।  ← पहला
    गुणनफल` — so the matrices on it stayed literal text while the row beneath
    them became a stranded one-row grid.

    TWO OR MORE value groups are required, and that is the guard that makes
    the loose form safe: a marks tag `[2]`, a reference `[NCERT | 4 अंक]` or a
    bracketed aside is a single group, and a line carrying one must not be
    torn out of its paragraph. Two bracketed value groups side by side, with
    only an operator between them, is a matrix row and nothing else.
    """
    if "[" not in line or "]" not in line:
        return False
    groups = list(_GROUP_RE.finditer(line))
    values = [g for g in groups if _is_values(g.group(1))]
    if len(values) < 2:
        return False
    # The gaps BETWEEN the value groups must be operators only. Anything
    # before the first or after the last is prose and may be whatever it is.
    for a, b in zip(values, values[1:]):
        if not _BETWEEN_RE.match(line[a.end():b.start()]):
            return False
    return True


def split_opening(line):
    """-> (prose before the first matrix, the line from the first group on)."""
    m = _GROUP_RE.search(line)
    if not m:
        return line, ""
    return line[:m.start()].rstrip(), line[m.start():]


# `[ a b c ; d e f ; g h i ]` — rows separated by semicolons inside ONE pair
# of brackets. A third notation, used where a matrix had to fit on a single
# line; chapter 3 writes four of them, inside `**bold**`.
# The `;` must be a bare one, NOT the tail of `\;`.
#
# `\;` is a thin space, and maths writes row vectors with it:
# `[-1 \; 2 \; 1]`. Read as a semicolon matrix that became a three-row grid
# whose cells were `-1 \`, `2 \` and `1` — a literal backslash printed in
# each one, which is what the stray `\` in `−1 \ 2 \ 1` on the page was.
#
# A genuine semicolon matrix is bare values: `[ -23 -46 -69 ; -69 46 -23 ]`.
# So the separator is a `;`, and a body carrying a BARE backslash — real
# LaTeX this module does not otherwise understand — is not this notation.
#
# A backslash INSIDE a `$…$` CELL IS DIFFERENT.
#
# `A = [ 3  $\sqrt{3}$  2 ; 4  2  0 ]` — one cell is `$\sqrt{3}$`, a single
# atomic maths value the pipeline converts on its own once `_ws_split`
# keeps it together (see above). The old blanket "any backslash anywhere
# disqualifies the row" check could not tell that from unrelated raw
# LaTeX, so this exact matrix — √3 appears in most of this chapter's
# transpose and symmetric-matrix proofs — never matched `_SEMI_RE` at all
# and reached the page as literal, un-gridded `[ 3  $\sqrt{3}$  2 ; … ]`
# text. A body is now allowed to contain complete `$…$` spans (backslash
# and all) between the brackets; a bare backslash OUTSIDE one still rules
# the row out, same as before.
_SEMI_ATOM = r'(?:\$[^$]*\$|[^\[\]\\$])'
_SEMI_RE = re.compile(r'\[(' + _SEMI_ATOM + r'*;' + _SEMI_ATOM + r'*)\]')

# A CELL CAN BE `$…$` WITH A SPACE INSIDE IT — OR `**…**` WITH ONE.
#
# `B = [ 2  $- 1$  2 ; 1  2  4 ]` — the negative sign and the digit are one
# LaTeX span, `$- 1$`, with a literal space between them (the source writes
# `\sqrt{3} - 1` the same way). A row was split into cells with a plain
# `.split()`, which does not know `$…$` is one token — `$- 1$`.split() gives
# `['$-', '1$']`, two cells where the value is one, and those two half-cells
# landed in ADJACENT matrix columns: a `-` alone in one, a stray `1$` — the
# literal, unconverted delimiter — in the next. Masking every `$…$` run
# before splitting on whitespace, then restoring it, keeps a maths cell atomic
# regardless of what is inside it.
#
# The identical failure happens for a cell the author highlighted with bold
# instead of maths: `[ **2x + 3**  2z - 3 ]` (chapter 3's comparison-of-
# unknowns proofs mark the SOLVED entry this way). `**2x + 3**` is one cell,
# but the space inside it is invisible to `.split()` the same way `$- 1$`'s
# is, and with only `$…$` masked it split into THREE — `**2x`, `+`, `3**` —
# turning a 2×2 matrix into a 6-column grid with literal, unconverted `**`
# stuck to two of the cells. `**…**` is masked the same way `$…$` is.
_CELL_MATH_RE = re.compile(r'\$[^$]*\$|\*\*[^*]*\*\*')


def _ws_split(text):
    """`str.split()`, but a `$…$` span is one token even with spaces in it."""
    stashed = []

    def _mask(m):
        stashed.append(m.group(0))
        return "\x00%d\x00" % (len(stashed) - 1)

    masked = _CELL_MATH_RE.sub(_mask, text)
    return [re.sub(r'\x00(\d+)\x00', lambda m: stashed[int(m.group(1))], part)
            for part in masked.split()]


def has_semicolon_matrix(s):
    return bool(_SEMI_RE.search(s or ""))


def _has_bare_backslash(text):
    """A `\\` OUTSIDE any `$…$` span — real LaTeX this module does not
    handle. One INSIDE a span (`$\\sqrt{3}$`) is a single atomic cell
    value, not a reason to leave the whole row unconverted; see `_SEMI_RE`.
    """
    return "\\" in _CELL_MATH_RE.sub("", text or "")


def convert_semicolon(s, render=None):
    """Turn `[a b ; c d]` into a grid."""
    def one(m):
        body = m.group(1)
        if _has_bare_backslash(m.group(1)):
            return m.group(0)
        rows = [_ws_split(r) for r in body.split(";") if r.strip()]
        if len(rows) < 2:
            return m.group(0)
        return grid(rows, "square", render)
    return _SEMI_RE.sub(one, s or "")


def _operators_between(line):
    """The operator text sitting between the bracketed groups, in order.

    An operator set as maths, `$-$`, is unwrapped to the bare `-` — the
    grid's `<span class="op">` is plain text, not run through the inline
    maths formatter, so a `$…$`-wrapped operator would otherwise print its
    own delimiters as literal characters on the page.

    `**` IN THE GAP IS A BOLD BOUNDARY, NOT AN OPERATOR.
    ``**[10-3  5-4; 12+21  6+28]** = [7 1; 33 34]`` bold-highlights the raw
    calculation before its simplified result — `_BETWEEN_RE` allows `*` in a
    gap on purpose, so this still passes as a matrix row, but nothing
    strips the marker back out afterwards: the gap this function returns
    was `** =`, printed onto the page in `<span class="op">` verbatim,
    where — unlike a value cell — it is never run through the inline
    formatter that would otherwise turn `**` into `<b>`. Three chapters
    highlight an intermediate matrix this way, so it always surfaces as a
    literal, unconverted `**` beside the operator. A single `*` is left
    alone: `_BETWEEN_RE` also allows it as a plain multiplication sign, and
    that reading only ever appears alone, never paired.
    """
    out = []
    for x in _GROUP_RE.split(line)[2::2]:
        x = x.strip().replace("**", "").strip()
        m = re.match(r'^\$(.+)\$$', x)
        out.append(m.group(1) if m else x)
    return out


def _group_rows(group):
    """The rows one bracketed group holds — usually one, but `;` breaks rows.

    Chapter 3 mixes the two notations ON THE SAME LINE: an ASCII matrix's
    second row, then two whole 3x3 matrices written inline as
    `[ -23 -46 -69 ; -69 46 -23 ; -92 -46 -23 ]`. `_GROUP_RE` finds all
    three groups, so `ascii_block` handled the semicolon ones too — and split
    them on whitespace, which made `;` a CELL. The result printed as a single
    row of eleven entries with two semicolons in it, side by side with the
    proper grids above it.

    A semicolon inside a group has exactly one meaning here, and it is the
    same meaning `stash_semicolon` gives it.
    """
    if ";" not in group:
        return [_ws_split(group)]
    rows = [_ws_split(r) for r in group.split(";") if r.strip()]
    return rows or [_ws_split(group)]


def ascii_block(lines, render=None):
    """Turn consecutive ASCII matrix rows into side-by-side grids.

    Each LINE is a row; the Nth bracketed group on every line belongs to the
    Nth matrix. That is the pairing the chapter's header called undetermined:
    undetermined by reading order, determined by position.
    """
    rows_per_line = [_GROUP_RE.findall(ln) for ln in lines]
    if not rows_per_line or not rows_per_line[0]:
        return ""
    count = max(len(r) for r in rows_per_line)
    # THE OPERATOR MAY SIT ON ANY ROW, NOT JUST THE FIRST.
    #
    # A 3x3 addition transcribed as three side-by-side matrices over three
    # lines sometimes carries the `+`/`=` on the MIDDLE line rather than the
    # first — the source is laid out as if printed, and the operator is
    # vertically centred on the whole matrix, which lines it up with row 2
    # of 3, not row 1: `A + B = [row1][row1][row1]` / `[row2] + [row2] =
    # [row2]` / `[row3][row3][row3]`. Reading only `lines[0]`'s gaps left
    # every `+` and `=` between the matrices silently dropped — the grids
    # rendered side by side with nothing to say how they combine. Every
    # line is checked at each gap, first non-empty one wins.
    ops_per_line = [_operators_between(ln) for ln in lines] if lines else []
    ops = []
    for i in range(count - 1):
        op = ""
        for ol in ops_per_line:
            if i < len(ol) and ol[i]:
                op = ol[i]
                break
        ops.append(op)

    out = ['<div class="mxrow">']
    for i in range(count):
        if i and i - 1 < len(ops) and ops[i - 1]:
            out.append('<span class="op">%s</span>' % ops[i - 1])
        rows = []
        for groups in rows_per_line:
            if i < len(groups):
                rows.extend(_group_rows(groups[i]))
        out.append(grid(rows, "square", render))
    out.append('</div>')
    return "".join(out)


def stash(s, build):
    """Replace each matrix environment using `build(rows, style) -> token`.

    Kept here rather than in inline.py so the environment list and the cell
    splitting live in one place — the caller supplies only what to do with
    the rows it gets back.

    `style` is `"stack"`, instead of one of `ENVIRONMENTS`' values, for a
    body `_stack_lines` finds to be a stack of independent lines rather than
    a matrix — the caller (which alone has the inline `render` needed to
    format a whole equation, not just a cell) is what must turn that into
    plain stacked lines instead of `grid()`; this function only detects it
    and, for `aligned`, does the row recombination `_stack_lines` describes
    (each row arrives as ONE cell already, same shape `array`'s stack rows
    take, so the caller does not need to know which of the two produced it).
    """
    if "\\begin{" not in s:
        return s

    def one(m):
        delim, env, spec, body = (m.group(1), m.group(2),
                                   m.group(3), m.group(4))
        rows = _cells(body)
        lines = _stack_lines(env, rows, spec, delim)
        if lines is not None:
            return build([[l] for l in lines], "stack", 0)
        return build(rows, ENVIRONMENTS.get(env, "square"), _augment_at(spec))

    return _ENV_RE.sub(one, s)


def stash_semicolon(s, build):
    """Replace each `[a b ; c d]` using `build(rows, style) -> token`.

    A third notation, used where a matrix had to fit on one line — chapter 3
    writes four, inside `**bold**`. It cannot go through `ascii_block`: the
    bold markers sit between the groups, so the line is not a pure row.
    """
    if ";" not in s:
        return s

    def one(m):
        if _has_bare_backslash(m.group(1)):
            return m.group(0)
        rows = [_ws_split(r) for r in m.group(1).split(";") if r.strip()]
        if len(rows) < 2:
            return m.group(0)
        return build(rows, "square", 0)

    return _SEMI_RE.sub(one, s)


def split_around(line):
    """-> (prose before the matrices, the matrix segment, prose after).

    For an opening line whose matrices sit in the MIDDLE:

        AB = [ 2  3 ][ 2  -3 ] = [ 1  0 ] = I।   <- पहला गुणनफल I है।
             [ 1  2 ][ -1  2 ]   [ 0  1 ]

    `opens_block` requires the line to end with a bracket, so lines like this
    were not recognised: the top row stayed as literal text in a paragraph
    and the second line — a pure row — was left stranded as a one-row block
    of its own. That is what the loose `[ 1 2 ] [ -1 2 ]` fragments sitting
    between the derivation steps were.
    """
    groups = list(_GROUP_RE.finditer(line))
    if not groups:
        return line, "", ""
    a, b = groups[0].start(), groups[-1].end()
    return line[:a].rstrip(), line[a:b], line[b:].strip()


def value_groups(line):
    """The bracketed VALUE groups on a line, ignoring bracketed prose."""
    return [g for g in _GROUP_RE.findall(line) if _is_values(g)]
