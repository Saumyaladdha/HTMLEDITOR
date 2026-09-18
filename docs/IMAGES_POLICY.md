# Policy — figures, diagrams and decoration

Not a step and not a skill. These are the rules `skill_extractor` and
`book/components.py` both have to follow when they hit anything visual, kept
in one file so neither carries its own drifting copy.

## The position, unchanged and now vindicated

The pipeline does **not** ask an image model for a labelled physics figure. A
mis-drawn `q₁` is not a cosmetic bug — it is incorrect content a student will
memorise — and image models do not reliably render Devanagari or correct
subscripted notation *inside* a picture.

The reference book proves the alternative works: 28 of its 30 diagrams are
**hand-authored inline SVG**, ~1.5 KB each, with correct Devanagari, correct
subscripts, crisp in print and editable afterwards.

## Three kinds of visual, and what happens to each today

| In the markdown | Kind | Today | Eventually |
|---|---|---|---|
| `[FIGURE: … \| ref: source_figures/x.png — desc]` | a scan of an existing figure | reserved `figure` slot, `ref` and `desc` carried in the markup | crop the scan, add to the manifest |
| `[IMAGE: … नामांकित चित्र — desc]` | must be drawn | reserved `diagram-md` slot | parameterised SVG (`diagrams.py`) |
| no marker | decoration | reserved `doodle-*` / `character` slot | reuse `decorators/cropped/`, or generate |

**Nothing is generated right now.** That is a deliberate scope line, not an
omission.

## The rule that makes "later" cheap

> A slot is rendered at its **final size** from the very first build.

So filling one is a pure substitution. The box does not grow, the page does
not reflow, and pagination does **not** have to be re-run. This is why art can
be added without redesigning anything — and why a slot must never be sized
"roughly, we'll fix it when the image arrives."

Screen shows a faint hatched box; print shows nothing. `assets.report(html)`
lists what is still outstanding.

## For whoever writes the descriptions

`desc` is the whole brief. Write it for an illustrator who cannot see the
source: which objects, where, which labels, which arrows. It is carried into
the HTML as `data-desc` and it is the figure's only record until the art
exists. Never write a description you would not be willing to see printed in
place of the figure.

## Decoration density — the rule that stops it looking AI-scattered

**Decoration is inversely proportional to content density.** In the reference,
the 23 full Q&A pages carry *zero* doodles and *zero* characters — the
coloured question tags and dashed rules carry them. Only pages with real slack
get art.

* at most **one** character illustration per page, at a natural pause
  (end of a section, foot of a cover page), 90–180 px, never inside a text column;
* at most **two** margin doodles per page, never within 200 px of each other,
  never beside running text, never over a diagram;
* doodles: ≤200 px native, transparent, one or two hues, 3–8 strokes.

## Style, when generation is added

Keep two style strings, not one. The old `STYLE` in the retired
`generate_figures.py` (coloured pencil, light watercolour, warm palette)
is still correct for **character** art — four of the reference book's images
are byte-identical to files already in `decorators/cropped/`. It is wrong for
**doodles**, which are tiny, flat, single-hue line art on transparent ground.

And the rule that string learned the hard way: **never put a subject in a
style string.** "Indian characters, Indian setting" once went into `STYLE`,
and every figure in the book grew people — including the ones that were diagrams.
