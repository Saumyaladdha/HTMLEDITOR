# -*- coding: utf-8 -*-
"""
LATEX — LaTeX -> Unicode, standalone.

Lifted out of `engine_qa.py` (which imported the whole old rendering
engine just to reach this table) so the new pipeline has no dependency on
the retired `engine.py`.

WHY IT WAS EXTRACTED, NOT RE-IMPORTED. When `engine.py` was archived,
`engine_qa` stopped importing, and the caller's `except: lambda x: x`
fallback passed LaTeX through untouched — `$$\\tau = pE \\sin\\theta$$`
printed as the literal backslash command in the middle of a physics book,
with no error anywhere. A silent fallback around a converter is worse
than no converter.

The `_CMD` table and the group scanner are unchanged from the original;
`engine_qa.py`'s own docstring warns that this layer was reconstructed
from a structural description rather than recovered, so spot-check any
unusual command before trusting it.
"""
import re
import re as _re


def _frac_text(t):
    """One side of a fraction, bracketed only if that changes the reading."""
    t = (t or "").strip()
    if not t:
        return "()"
    simple = _re.fullmatch(r'[\w.\u0900-\u097F\u2080-\u209c\u00b2\u00b3'
                           r'\u2070-\u207f\u03b1-\u03c9\u0391-\u03a9]+', t)
    return t if simple else '(%s)' % t


_CMD = {
    "varepsilon": "ε", "epsilon": "ε", "theta": "θ", "vartheta": "ϑ",
    "pi": "π", "Delta": "Δ", "delta": "δ", "Sigma": "Σ", "sigma": "σ",
    "alpha": "α", "beta": "β", "gamma": "γ", "Gamma": "Γ", "lambda": "λ",
    "Lambda": "Λ", "mu": "μ", "nu": "ν", "phi": "φ", "varphi": "φ",
    "Phi": "Φ", "psi": "ψ",
    "omega": "ω", "Omega": "Ω", "rho": "ρ", "tau": "τ", "chi": "χ",
    "rightarrow": "→", "leftarrow": "←", "Rightarrow": "⇒", "Leftarrow": "⇐",
    # `\to` is the arrow of a ROW OPERATION — `$R_1 \to \frac{1}{2}R_1$`,
    # "replace row 1 with half of row 1". Unlisted it printed the word "to":
    # every step of the maths chapter's three matrix-inversion answers read
    # `R₁ to …`, which looks like an English word dropped into the notation.
    # `\gets`, `\mapsto` and `\implies` are the same family.
    "to": "→", "gets": "←", "mapsto": "↦", "implies": "⇒", "iff": "⇔",
    "longrightarrow": "⟶", "longleftarrow": "⟵",
    "leftrightarrow": "↔", "Leftrightarrow": "⇔",
    "leq": "≤", "geq": "≥", "neq": "≠", "approx": "≈", "equiv": "≡",
    "propto": "∝", "sim": "∼", "cong": "≅",
    "times": "×", "cdot": "·", "div": "÷", "pm": "±", "mp": "∓",
    # `\mid` is the bar of an augmented matrix — `$[A \mid I]$` — and of
    # set-builder notation. Unlisted it printed the word "mid": the maths
    # chapter's three matrix-inversion answers all opened with
    # "[A mid I] लिखकर", which reads as a typo rather than as notation.
    "mid": "|", "vert": "|", "Vert": "‖", "parallel": "∥",
    # CHEMISTRY SYMBOLS. Every one of these printed its own name on the
    # organic chapter's pages — measured in the built HTML: `ddot` 17 times,
    # `ominus` 5, `uparrow` 5, `downarrow` and `bigcirc` once each.
    #
    # None is decoration:
    #   `SO_2\uparrow`  the gas is EVOLVED — that arrow is the observation
    #   `\downarrow`    a precipitate comes out of solution
    #   `\ominus`       the charge, and `:C≡N` versus `⁻:C≡N` are different
    #                   species. Drawn as a MINUS, not as the circled form
    #                   `⊖` this used to emit: at body size a circled minus
    #                   reads as a theta, and a reader seeing "θ" over a
    #                   carbon learns the wrong symbol. Every one of the 15
    #                   `\ominus` and 21 `\oplus` in the corpus is a formal
    #                   charge in the chemistry family — `$\ominus$ आवेश` —
    #                   and none is a direct sum, so neither needs the ring
    #   `\bigcirc`      a BENZENE RING, drawn the way a textbook draws it
    "ominus": "−", "oplus": "+", "odot": "⊙", "otimes": "⊗",
    "uparrow": "↑", "downarrow": "↓", "updownarrow": "↕",
    "Uparrow": "⇑", "Downarrow": "⇓",
    "bigcirc": "◯", "circ": "°", "bullet": "•",
    "prime": "′", "degree": "°", "Angstrom": "Å", "angstrom": "Å",
    # SET, LOGIC AND RELATION SYMBOLS.
    #
    # `\ne`, `\in` and `\cap` were printing their own names in this
    # chapter — `R_1 cap R_2` for an intersection, `{(a,b) in z × z}` for
    # set membership, `cos α ne ± 1` for an inequality. Each read as an
    # English word dropped into the notation.
    #
    # The rest of the family is listed with them rather than waiting to be
    # found one chapter at a time: a maths book that discusses matrices will
    # discuss sets and relations somewhere, and an unlisted command fails
    # silently by printing itself.
    "ne": "≠", "neq": "≠", "in": "∈", "notin": "∉", "ni": "∋",
    "cap": "∩", "cup": "∪", "setminus": "∖", "emptyset": "∅",
    "subset": "⊂", "subseteq": "⊆", "supset": "⊃", "supseteq": "⊇",
    "forall": "∀", "exists": "∃", "nexists": "∄",
    "land": "∧", "lor": "∨", "neg": "¬", "lnot": "¬",
    "equiv": "≡", "sim": "∼", "simeq": "≃", "cong": "≅",
    "perp": "⊥", "angle": "∠", "triangle": "△", "square": "□",
    # `oplus` is NOT repeated here. It is set with the chemistry symbols
    # above, and a dict literal keeps the LAST spelling of a duplicate key —
    # so this line silently overrode that one and a formal `+` charge kept
    # printing as `⊕` however the entry above was edited.
    "circ": "∘", "bullet": "∙", "star": "⋆", "otimes": "⊗",
    "infty": "∞", "partial": "∂", "nabla": "∇", "perp": "⊥", "parallel": "∥",
    "ll": "≪", "gg": "≫", "circ": "°", "prime": "′", "degree": "°",
    "sum": "Σ", "int": "∫", "oint": "∮", "prod": "∏",
    "sin": "sin", "cos": "cos", "tan": "tan", "log": "log", "ln": "ln",
    "quad": " ", "qquad": "  ", "left": "", "right": "", "displaystyle": "",
    "limits": "", ",": " ", ";": " ", "!": "",
    # Found by scanning the chapter for commands the converter did not know:
    # each one was printing its own NAME into the page, so a derivation step
    # read `Σ i = 0 ldots(i)` and a conclusion read `therefore Q = ...`.
    "therefore": "∴", "because": "∵",
    "ldots": "…", "dots": "…", "cdots": "⋯", "vdots": "⋮", "ddots": "⋱",
    "max": "max", "min": "min", "hline": "",
}


# `\,` `\;` `\:` `\ ` are LaTeX spaces of different widths; `\!` closes one
# up. On a page set in Kalam the width distinctions do not survive anyway, so
# they all become one thin space — except `\!`, which becomes nothing.
_SPACING = {',': '\u2009', ';': ' ', ':': ' ', ' ': ' ', '!': ''}

def _group(s, i):
    """Given the position right after a command name, capture its argument:
    a brace-group `{...}` (nesting-aware), or a bare command `\\word`/single
    char if no `{` follows (e.g. `x^\\theta`). Returns (end_index, content)."""
    n = len(s)
    while i < n and s[i] == ' ':
        i += 1
    if i < n and s[i] == '{':
        depth = 1
        j = i + 1
        while j < n and depth:
            if s[j] == '{':
                depth += 1
            elif s[j] == '}':
                depth -= 1
            j += 1
        return j, s[i + 1:j - 1]
    if i < n and s[i] == '\\':
        m = re.match(r'\\[a-zA-Z]+|\\.', s[i:])
        if m:
            return i + m.end(), s[i:i + m.end()]
    if i < n:
        return i + 1, s[i]
    return i, ''


_SUB_MAP = {'0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆',
            '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
            'a': 'ₐ', 'e': 'ₑ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ',
            'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
            'v': 'ᵥ', 'x': 'ₓ'}
_SUP_MAP = {'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶',
            '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
            'n': 'ⁿ', 'i': 'ⁱ'}

_SUB_O, _SUB_C = '', ''
_SUP_O, _SUP_C = '', ''
# UPRIGHT/ROMAN — `\mathrm{}`/`\text{}`/`\operatorname{}` content.
# A unit symbol (`\mathrm{C}`, `\mathrm{N}/\mathrm{m}^2`) is the
# author's own explicit "set this upright, not italic" instruction —
# LaTeX's `\mathrm` exists for exactly this — and it was being
# discarded: the handler recursed into the argument and returned it as
# bare text, so `\mathrm{C}` and a bare `C` came out identically
# styled. Inside `.m`'s italic default, a unit then reads exactly like
# a variable — `N/C` looked no different from a stray product of two
# variables `N` and `C`. Parked behind these marks the same way a
# sub/superscript is; `reopen_sentinels` turns them into a real
# `<span class="up">`, the same class the upright pass already gives
# every digit, for the same reason.
_RM_O, _RM_C = '', ''


def _small(t, table, wrap):
    """Recursively tex()'s sub/superscript content and wrap it in private-use
    sentinel markers, converted to real <sub>/<sup> by untag() later (after
    ix()'s HTML-escaping pass, so a literal `<sub>` written here doesn't get
    escaped).

    ALWAYS THE TAG FORM, NEVER A COMPOSED UNICODE CHARACTER — `table`
    (`_SUB_MAP`/`_SUP_MAP`) still exists to answer "is this content SMALL
    enough to be a sub/superscript at all" elsewhere, but composing it into
    a single pre-shaped glyph like `⁴` bet the exponent's SIZE on that
    glyph's own design. Georgia happens to draw a clean small `⁴`; Times
    New Roman does not — `2⁴` came out with a `4` at very nearly full body
    size, just nudged up a few pixels, while `2²` on the very same line
    (composed from `²`, a LEGACY Latin-1 character with universal font
    support) stayed properly small. Every digit but 1, 2, 3 was affected,
    which is most of the exponents an algebra chapter actually writes. A
    real `<sup>` tag around the plain digit `4` asks the BROWSER to shrink
    it, which every font supports identically, instead of asking the FONT
    for a dedicated small-4 glyph, which not every font drew."""
    conv = tex(t)
    o, c = wrap
    return f'{o}{conv}{c}'


def tex(s):
    """LaTeX source (no `$`/`$$` delimiters) -> plain Unicode/backtick-math
    text, matching the DSL's own convention."""
    out = []
    i, n = 0, len(s)
    while i < n:
        ch = s[i]
        if ch == '\\':
            if s[i:i + 2] == '\\\\':
                out.append(' ')
                i += 2
                continue
            # SPACING commands. Their names are punctuation, not letters, so
            # the `\\[a-zA-Z]+` lookup below never saw them and the backslash
            # fell through as a literal: `B\,dl` printed as "B\,dl" and
            # `a\,b\,c\,d` as "a\,b\,c\,d" — a backslash and a comma in the
            # middle of a formula, 60-odd times in chapter 4 alone.
            #
            # `\!` is a NEGATIVE thin space and contributes nothing.
            if s[i + 1:i + 2] in _SPACING:
                out.append(_SPACING[s[i + 1]])
                i += 2
                continue
            # ESCAPED BRACKETS AND BRACES.
            #
            # `\{`, `\}`, `\(`, `\)`, `\[`, `\]` are the LITERAL characters
            # — LaTeX needs the escape because the bare forms are grouping or
            # delimiters, and HTML does not. Their names are punctuation too,
            # so the `\[a-zA-Z]+` lookup below missed them and the backslash
            # printed: the set-builder `R = \{(a,b) ∈ z × z : …\}` came out as
            # `R = \ (a,b) in z × z : … \` with a stray backslash at each end
            # and the braces gone — the notation reversed.
            # `\%` is LaTeX for a literal percent sign — `%` alone would
            # start a comment. Its name is punctuation too, so it fell
            # through the `\[a-zA-Z]+` lookup below and printed the
            # backslash: `(20\%)` on the page instead of `(20%)`.
            # `\_` IS A FILL-IN-THE-BLANK, AND `\&`/`\#` ARE LITERALS TOO.
            #
            # A one-mark objective question writes its blank as escaped
            # underscores inside maths — `दोनों संख्याएँ $\_\_\_\_$ हैं।` —
            # because a BARE `_` in LaTeX means "subscript the next token".
            # `_` was missing from this class, so each `\_` fell through the
            # `\[a-zA-Z]+` lookup below (its name is punctuation, not
            # letters) and printed its backslash: the blank came out as
            # `\ \ \ \` on the page instead of `____`, eight times on
            # `chapter_mathematics.md` — and a blank the student cannot see
            # is a question they cannot answer.
            #
            # `\&` and `\#` are the same shape: LaTeX must escape them
            # (alignment separator, macro parameter) and HTML must not.
            if s[i + 1:i + 2] in "{}()[]|%_&#":
                out.append(s[i + 1])
                i += 2
                continue
            m = re.match(r'\\([a-zA-Z]+)', s[i:])
            if m:
                cmd = m.group(1)
                j = i + m.end()
                if cmd in ('frac', 'dfrac', 'tfrac'):
                    j, num = _group(s, j)
                    j, den = _group(s, j)
                    num_t, den_t = tex(num), tex(den)
                    # BRACKETS ONLY WHEN THEY CHANGE THE READING —
                    # the same rule `\\sqrt` already follows a few lines up.
                    #
                    # `\\frac{1}{4\\pi\\varepsilon_0}` came out `(1)/(4πε₀)`, and
                    # `format/inline` then STACKS that — so the page showed a
                    # fraction whose numerator was `(1)` and whose denominator
                    # was `(4πε₀)`, brackets and all. Wrapped again by an outer
                    # `\\left(...\\right)` it read `((1) (4πε₀))`, which is a
                    # product, not a quotient: the brackets swallowed the
                    # division they were supposed to protect.
                    #
                    # A single token needs no brackets — `1/2` is unambiguous.
                    # Anything with an operator or a space in it keeps them,
                    # because `a + b/c` and `(a + b)/c` are different numbers.
                    #
                    # A SECOND `\frac` RIGHT AFTER THIS ONE NEEDS A SEPARATOR.
                    #
                    # `\frac{1}{4\pi\epsilon_0}\frac{q_1q_2}{r^2}` — Coulomb's
                    # law written as two adjacent fractions, implicit
                    # multiplication, the commonest shape for "constant ×
                    # ratio" in this chapter. Each converts to flat text on
                    # its own ("1/4πε₀", "q₁q₂/r²") and with nothing between
                    # them the two concatenate into ONE run carrying TWO
                    # slashes: "1/4πε₀q₁q₂/r²". `format.inline.stack_fracs`
                    # takes the first `/` as ITS split point and everything
                    # after — second fraction, second slash and all — as one
                    # denominator, which it then stacks AGAIN: a fraction
                    # nested inside a fraction, and worse, a different
                    # number than the source ever wrote (1/(A·B/C), not
                    # (1/A)·(B/C)). A bare space is enough — it is in
                    # `stack_fracs`'s own `_FR_STOP`, so the scanner stops
                    # there and reads two independent fractions, exactly the
                    # side-by-side pair the source meant.
                    nxt = re.match(r'\\(frac|dfrac|tfrac)\b', s[j:])
                    out.append(_frac_text(num_t) + '/' + _frac_text(den_t)
                               + (' ' if (den_t and den_t[0] in '(\\') or nxt
                                  else ''))
                    i = j
                    continue
                if cmd == 'sqrt':
                    j, arg = _group(s, j)
                    inner = tex(arg)
                    # BRACKETS ONLY WHEN THEY CHANGE THE READING.
                    #
                    # `\sqrt{3}` came out as `√(3)`, and a matrix cell then
                    # read `3 √(3) 2` — the brackets look like a factor and
                    # make the row wider than the numbers in it. A single
                    # token needs none: `√3` is unambiguous. Anything with an
                    # operator or a space in it keeps them, because `√a + b`
                    # and `√(a + b)` are different quantities.
                    simple = bool(_re.fullmatch(r'[\w.\u0900-\u097F]+', inner or ''))
                    out.append(('√%s' if simple else '√(%s)') % inner)
                    i = j
                    continue
                # WRAPPERS WHOSE ARGUMENT IS THE CONTENT.
                #
                # `\underline{2x + 3y = 5}` printed `underline2x + 3y = 5`:
                # the command name ran straight into the equation it was
                # meant to decorate. Unlisted commands fall through with
                # their name intact, which is right for a command whose name
                # IS the symbol (`\alpha`) and wrong for one that only wraps
                # something.
                #
                # The decoration itself is dropped rather than reproduced.
                # An underline or an overline is emphasis, and the page has
                # its own emphasis layer; a rule drawn under one equation in
                # a chapter that never draws another would read as an error.
                if cmd in ('underline', 'overline', 'boxed', 'mathbb',
                           'mathcal', 'mathsf', 'mathit', 'emph',
                           'textbf', 'textit', 'textrm', 'displaystyle',
                           'limits', 'nolimits'):
                    j, arg = _group(s, j)
                    out.append(tex(arg))
                    i = j
                    continue
                if cmd in ('text', 'mathrm', 'mathbf', 'operatorname'):
                    j, arg = _group(s, j)
                    # THE SPACE INSIDE `\text{ }` IS A REAL SPACE.
                    #
                    # `tex()` strips its own result, which is right at the top
                    # level and wrong for a recursive call on an argument:
                    # `X\text{ और }Y` came back `XऔरY`, a Hindi word fused to
                    # the formulae on both sides of it. Chemistry writes 299
                    # of these in one chapter — a reagent, a state, a
                    # condition — and each one is a word set between two
                    # formulae, so the padding is the only thing keeping them
                    # apart.
                    lead = ' ' if arg[:1] in (' ', '\t') else ''
                    tail = ' ' if arg[-1:] in (' ', '\t') else ''
                    inner = tex(arg)
                    out.append(lead + (_RM_O + inner + _RM_C if inner else '')
                               + tail)
                    i = j
                    continue
                if cmd in ('vec', 'overrightarrow'):
                    j, arg = _group(s, j)
                    inner = tex(arg)
                    # A COMBINING ARROW as well as the bold. `**X**` alone
                    # gave a bold letter and no arrow at all, so every one of
                    # the chapter's 36 `\vec{}` vectors printed unmarked
                    # while the ones written `X⃗` in the source got theirs.
                    # `format/inline._vectors` turns the arrow into `.vec`,
                    # which draws it.
                    #
                    # `\overrightarrow{BP}` is the SAME construct as `\vec` —
                    # physics writes it for a two-point vector (B to P) where
                    # `\vec` names a single symbol. Unhandled, `cmd` fell
                    # through to "unknown command — pass through the bare
                    # word": `overrightarrow` printed literally, glued
                    # straight onto its argument with no braces or spacing
                    # (`overrightarrowdA`, `overrightarrowBP`) — a whole
                    # physics chapter's Gauss's-law derivations read this way
                    # everywhere a flux or displacement vector appeared.
                    # `_vectors` in `format/inline.py` already matches up to
                    # TWO letters under the arrow, so no separate handling is
                    # needed for the two-point case — same output as `\vec`.
                    #
                    # And `d\vec{l}` is ONE symbol: the `d` sits outside the
                    # braces, so marking only what is inside them put the
                    # arrow over the `l` and left the `d` plain — half a
                    # differential element marked as a vector.
                    if out and re.search(r'(?<![A-Za-z])[a-z]$', out[-1]):
                        inner = out[-1][-1] + inner
                        out[-1] = out[-1][:-1]
                    out.append('**%s\u20d7**' % inner)
                    i = j
                    continue
                # ACCENTS THAT ARE NOT DECORATION.
                #
                # `\\ddot{O}` is oxygen carrying a LONE PAIR — two dots above
                # the symbol — and it is how the chapter draws the nucleophile
                # in every S_N2 transition state. Dropped as decoration (which
                # is right for an underline) the atom loses the electrons the
                # mechanism is about; printed as its own name it read
                # `ddotO:`. `\\dot` is a radical, `\\bar` an overbar.
                if cmd in ('ddot', 'dot', 'bar', 'vec_', 'breve'):
                    j, arg = _group(s, j)
                    mark = {'ddot': '\u0308', 'dot': '\u0307',
                            'bar': '\u0304', 'breve': '\u0306'}.get(cmd, '')
                    out.append(tex(arg) + mark)
                    i = j
                    continue
                if cmd == 'hat':
                    j, arg = _group(s, j)
                    out.append(tex(arg) + '̂')
                    i = j
                    continue
                if cmd in _CMD:
                    out.append(_CMD[cmd])
                    i = j
                    continue
                # unknown command — pass through the bare word
                out.append(cmd)
                i = j
                continue
            out.append(ch)
            i += 1
            continue
        if ch == '_':
            j, arg = _group(s, i + 1)
            out.append(_small(arg, _SUB_MAP, (_SUB_O, _SUB_C)))
            i = j
            continue
        if ch == '^':
            # `^(mn)` — A PARENTHESISED EXPONENT.
            #
            # Strictly LaTeX reads that as "superscript of `(`", and that is
            # what happened: `2^(mn)` came out as a 2 with a raised opening
            # bracket and `mn)` sitting on the baseline beside it. Nobody
            # writes an exponent consisting solely of a bracket, so in a real
            # document `^(…)` always means `^{…}` — the author reached for
            # the bracket they had on the keyboard.
            #
            # The parentheses are dropped with the group, so `2^(mn)` sets as
            # 2 to the mn rather than as 2 to the (mn).
            if s[i + 1:i + 2] == '(':
                depth, k = 0, i + 1
                while k < n:
                    if s[k] == '(':
                        depth += 1
                    elif s[k] == ')':
                        depth -= 1
                        if depth == 0:
                            break
                    k += 1
                if depth == 0 and k < n:
                    inner = s[i + 2:k]
                    out.append(_small(tex(inner), _SUP_MAP, (_SUP_O, _SUP_C)))
                    i = k + 1
                    continue
            j, arg = _group(s, i + 1)
            out.append(_small(arg, _SUP_MAP, (_SUP_O, _SUP_C)))
            i = j
            continue
        if ch in '{}$':
            i += 1
            continue
        # `~` IS LATEX'S OWN NON-BREAKING SPACE, not a literal tilde.
        #
        # `10^{-4} \mathrm{~N}` is how the source writes "10⁻⁴ N" with a
        # protected space before the unit — real LaTeX would render the
        # `~` as a space, not a character. Left as a literal tilde, it
        # survived into the general `inline()` pass, whose LATER step
        # reads `~x~` as swipe-highlight markup (see its ORDER docstring).
        # A sentence with two such units — `$10^{-4} \mathrm{~N}$ से
        # प्रतिकर्षित करते हैं… बल $2.5 \times 10^{-5} \mathrm{~N}$` —
        # left one stray `~` after each "N", and the swipe regex paired
        # the FIRST with the SECOND, wrapping everything between them —
        # the whole sentence and the second formula — in one highlight
        # span, un-closed `<b>` tags and all. Converting to a plain space
        # here, before that pass ever runs, is what real LaTeX does with it.
        if ch == '~':
            out.append(' ')
            i += 1
            continue
        out.append(ch)
        i += 1
    return re.sub(r'[ \t]{2,}', ' ', ''.join(out)).strip()


