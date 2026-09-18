# How an answer is laid out

An answer is not one kind of thing. Three shapes come out of the reference
book, and the pipeline now sets each one differently. **Nothing here is about
physics** — the tests are about the shape of a line, so a biology answer and a
numerical get the right treatment from the same rules.

---

## 1. Prose — an explanation, a definition, a law in words

Plain paragraphs. Nothing to do.

```markdown
सन्धि की ओर आने वाली सभी धाराएँ धनात्मक तथा सन्धि से दूर जाने वाली सभी
धाराएँ ऋणात्मक ली जाती हैं।
```

Renders as `.q` — an ordinary justified paragraph.

---

## 2. A calculation step — one per line

**Write one step per source line.** The pipeline gives each its own centred
line; it does not need `$$`.

```markdown
परिपथ का कुल प्रतिरोध = r + 2 + 2 = 5 Ω
I = ε/(R + r) = 10/5 = 2 ऐम्पियर
बैटरी की टर्मिनल वोल्टता, V = ε − I r = 10 − 2 × 1 = 8 वोल्ट
```

Each becomes its own line, stacked in order, so the solution reads as a
worked calculation instead of a paragraph with arithmetic buried in it.

A line qualifies when it is short, contains `=`, and what follows the `=` is
mostly maths. That is deliberately about SHAPE, so a biology answer works the
same way:

```markdown
कुल गुणसूत्र = 23 × 2 = 46
```

A sentence that merely mentions a number stays prose — there is no `=`, or
the right-hand side is words:

```markdown
संधारित्र वाली शाखा में धारा शून्य है, अतः उसके 3 Ω पर कोई विभव-पतन नहीं होता।
```

---

## 3. A derivation step — `$$…$$`

Use `$$…$$` when the equation is a step of a derivation being built up, and
prose around it explains each move.

```markdown
प्रथम नियम : किसी सन्धि पर धाराओं का बीजगणितीय योग शून्य होता है, अर्थात्
$$\sum i = 0 \qquad \ldots(i)$$

माना कि धाराएँ $i_1, i_2, i_3$ सन्धि $O$ पर मिलती हैं।

या $$i_1 + i_2 = i_3 + i_4 + i_5$$
```

- `$$…$$` → a centred line of its own (`.dm`)
- `$…$` → inline, part of the sentence
- `\qquad \ldots(i)` → the equation number, set apart from the maths

Prose either side of a `$$…$$` stays prose — the paragraph is split around
the equation rather than swallowing it.

---

## Writing subscripts

Both of these work, including a written-out Hindi subscript:

```markdown
$i_1$          →  i₁
ε_परिणामी      →  ε with "परिणामी" set as a subscript
```

---

## What this fixed

Before, `$$…$$` was collapsed to inline and calculation lines were left inside
paragraphs, so a derivation arrived as one dense run-on block:

> किरचॉफ के नियम के अनुसार, i₁+i₂−i₃−i₄−i₅=0 या i₁+i₂=i₃+i₄+i₅ अत: परिपथ के
> किसी बिन्दु पर आने वाली धाराओं का योग…

Measured against the reference for chapter 3:

| | before | after | reference |
| --- | --- | --- | --- |
| centred equation lines (`.dm`) | 48 | **233** | 257 |
| working lines (`.work`) | 23 | **55** | 56 |
| prose paragraphs (`.q`) | 432 | **470** | 516 |

LaTeX commands that were printing their own names into the page —
`\therefore`, `\ldots`, `\because`, `\hline`, `\max` — are gone. A derivation
step that read `Σ i = 0 ldots(i)` now reads `Σ i = 0 …(i)`.

---

## Where the rules live

| File | Decides |
| --- | --- |
| `book/format/display.py` | `$$…$$` vs `$…$`, and the equation number |
| `book/format/answer.py` | whether an unmarked line is a calculation step |
| `book/validators/latex_convert.py` | LaTeX command → Unicode |

`book/format/answer.py` carries the two thresholds worth knowing: a step is at
most 150 characters, and at least 72% of what follows its first `=` must be
maths rather than words.
