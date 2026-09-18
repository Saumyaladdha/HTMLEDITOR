---
name: step00_extract
description: Extract a raw chapter source (Word doc, PDF, transcript) into the reader-edition markdown the pipeline parses. Use for step00_extract — the only non-deterministic step in the pipeline.
---

> **Read `docs/FORMAT_SPEC.md` first.** It is the complete list of constructs
> the pipeline understands and exactly what each one becomes on the page,
> derived by diffing two real chapters against the finalised reference. Every
> answer you give here has to be consistent with it — and if a chapter uses a
> convention the spec does not cover, say so: the fix is to add it to the spec
> and the reader, never to contort the content.


# step00_extract — agent

The **only** judgment step. Everything from `step01_md_reader` onward is
deterministic: same input, same bytes out.

**Input:** whatever raw source arrives — a teacher's Word doc, an NCERT PDF,
a rough Hindi transcript, an image-based deck to be re-derived.

**Output:** ONE file, `HTML_Automation/content/<NN>_reader_edition.md`.

Read `content/17_reader_edition.md` as the worked example before writing
anything, and match its notation exactly. Then check your work:

```bash
python3 pipeline/run_all.py --md content/<NN>_reader_edition.md \
                            --stem chapter-<NN> --to step05
```

The reconciliation in `step02` is the real test: if the file has 80
`**प्र.` headers and the parser reports 78 questions, two are malformed.

---

## Document shape

The parser infers structure from shape, so shape is the contract. It does
**not** know how many sections a chapter has, or that Part 2 is grouped by
year — a chapter grouped by marks or by topic parses just as well. What it
needs is consistency.

```markdown
# अध्याय N : <chapter name>

> <one-line framing note>

## 🎯 <front-matter heading>          ← analytics / how-to-read; tables fine here

---

# PART 1 · QUICK REVISION
*भाग 1, त्वरित रिवीज़न*                 ← italic line under a part = its subtitle

> #### 📌 ⚠️ Common Mistake            ← a CARD — floats into the margin
> ✗ …

### 1.5 आवेश के मूल गुण  ·  **[UP 2022 · 1 अंक] · [UP 2026 · 1 अंक]**
**परिभाषा:** …
- bullet
⚠️ **मत भूलो:** …

---

# PART 2 · QUESTIONS & ANSWERS
*भाग 2, प्रश्न एवं उत्तर*

### 2026                               ← a group: year, marks, topic — anything

**प्र. 1**  `[1 अंक · 2026/set_ds · खण्ड अ]`  ★★ *पूरा उत्तर यहीं, 2022 में भी*

<question text>

i) …          ii) …
iii) …          iv) …   [1]

**उत्तर:** <answer>

**दिया है, ** <values>

🔗 **Ye wahi question hai:** …
---

> ✅ **2026 का पेपर (इस अध्याय से) पूरा, 18 अंक cover।**
```

---

## The rules that actually matter

### 1. The question header is structured data, not prose

```
**प्र. <n>**  `[<marks> अंक · <year>/<set> · खण्ड <x>]`  ★★ *<repeat note>*
```

Every field becomes a separate component — the number a coloured tag, the
bracket a chip, the stars a badge, the italic tail a note. Written as prose
they all collapse into body text. Use `· पुस्तक` instead of a year/set for a
book question.

### 2. Sort questions by marks inside a group

The yellow **1 अंक / 3 अंक** bands are **synthesised** wherever the marks
value changes. They are not written in the markdown. Unsorted questions make
the bands repeat and the page stops making sense.

### 3. Callouts: emoji + bold label + colon

Both dialects are accepted and a file may mix them — the reference does
(Part 1 Hindi, Part 2 Hinglish). All normalise to eight families, so an
unlisted marker degrades sensibly rather than disappearing.

| Family | Write any of |
|---|---|
| `trap` | `⚠️ **मत भूलो:**` · `⚠ **Board ka jaal:**` · `🔄 **Aise ghoomkar aa sakta hai:**` |
| `mark` | `🎯 **Yahan 1 mark bachta hai:**` · `🧮 **Calculation me galti:**` |
| `write` | `✍️ **Bas itna likhna:**` · `🗝️ **Ye words zaroor likhna:**` · `📝 **Marks aise bantte hain:**` |
| `save` | `🛟 **Kuch yaad na aaye to:**` · `🔢 **आंकिक; विधि:**` · `💡 **टिप:**` |
| `line` | `🧠 **Bas ye ek Line:**` · `✏️ **व्याख्या:**` |
| `link` | `🔗 **Ye wahi question hai:**` |
| `rep` | `🔁 **यह सवाल N बार पूछा जा चुका है:**` |
| `conf` | `💪 **Ye ban gaya to:**` |

Three markers are their own components: `↔ **मिलता-जुलता:**` (dashed chip),
`⚠ **पुस्तक से बाहर …**` / `⚠️ **स्रोत-नोट:**` (source note),
`★ **5 साल में N बार …**` (star badge).

Labels may be Hinglish — the renderer prints the Hindi equivalent.

### 4. Cards float; callouts don't

`> #### 📌 <Label>` becomes a **rotated sticky note that floats beside the
Part-1 text**, one per page. The label picks its colour (*Common Mistake* →
yellow+red, *Most Asked* → pink, *Just Read* → green, *Derivation Steps* →
blue, *Don't Mix* → purple). Leading `✗ ✓ ★ • ①` becomes the row's marker.

**Never put something in a card that the student must read to follow the
argument** — it floats into the margin and can land a page away.

### 5. Figures — write the brief as if the artist cannot see the source

```
[FIGURE: चित्र 1.15 — <caption> | ref: source_figures/page_14_image_1.png — <full description>]
[IMAGE:  चित्र 1.13 — नामांकित चित्र — <full description of what to draw>]
```

`[FIGURE: … | ref: <path>]` means a scan exists; `[IMAGE:]` means it must be
drawn. **No art is generated today** — both render as a correctly-sized
reserved box, and the description is carried into the HTML as the figure's
only record. Say which objects, where, which labels, which arrows. Never
write a description you would not be willing to see printed in place of the
figure.

**A physics source PDF converted through Mathpix carries a seventh shape:**
`चित्र N — ![](https://cdn.mathpix.com/cropped/...jpg?height=…&width=…)` — a
crop URL that was never saved to `source_figures/`. This is not a `[FIGURE: …
| ref: …]`; there is no local file. It happened 21 times in one physics
chapter (`content/physics_new.md`) before the reader learned to drop the URL
and reserve an empty plate captioned `चित्र N`. Leave such a line exactly as
the source has it — do not invent a `ref:` path, do not fetch the URL, and do
not fold it into a `[FIGURE:]`/`[IMAGE:]` rewrite. See FORMAT_SPEC §9 for the
full six-shape table and decision tree.

### 6. Maths

Backticks `` `q/e` `` or real LaTeX `$x$` / `$$x$$` — both work. Units belong
**outside** backticks (`N·m²/C` is a unit, not a fraction); write `\/` for a
slash that must stay flat inside maths.
`> **[सूत्र]** $$ … $$` renders as a coloured boxed result.

### 7. Subject detection — a heavy-units physics chapter can read as chemistry

A physics chapter that typesets units as `\mathrm{N/C}`, `\mathrm{m}`,
`\mathrm{~N}` can carry hundreds of them (407, measured) with zero reaction
arrows anywhere in it. `book/subjects/__init__.py`'s auto-detector once let
`\mathrm` count toward the chemistry score unconditionally and silently
misclassified exactly such a chapter as chemistry — wrong rubric, wrong
splittable rules. The gate that fixed it (`\mathrm` only ever pushes an
ALREADY-chemistry chapter further into certainty, never manufactures
chemistry from nothing) is documented in FORMAT_SPEC §10. It does not change
what you write here, but it is why the safest habit for a new physics
chapter is still to run the pipeline with `--subject physics` given
explicitly, rather than leaving it to auto-detection.

---

## Never

- No HTML, CSS or inline styles.
- No Python, no `emit_*` calls — that convention is gone.
- No colour, page-break or component choices. Accents rotate automatically;
  pagination is measured in a real browser.
- No hand-written marks bands — sort by marks and they appear.
