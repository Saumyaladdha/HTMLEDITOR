# How the editor knows what it is editing

The editor is generic: it opens any HTML, detects whether the document is
paginated or flowing, and gives you selection, drag, find/replace, images,
undo and versioning either way. Nothing below changes that.

What it did NOT know was **this pipeline's vocabulary**.

## What was broken

`propertyRegistry.ts` was written against an older BEM element library —
`text-body`, `figure__img`, `def-item__qual`. A chapter the pipeline emits
today carries **145 distinct classes and not one of them is BEM**, so every
registry lookup missed and every block fell through to `directText: true`.
Concretely, on real output:

| Symptom | Cause |
| --- | --- |
| Clicking the सूत्र panel made all ten formula rows one editable blob | no entry, so the whole block became `contenteditable` |
| "Add an image" replaced the figure's caption | `findFigureImageSlot` picked the first non-caption child; `.fh` *is* the first child, `.figspace` is second |
| Uploading an image changed the page's height | the placeholder was **replaced** by an `<img class="figure__img">` — a class with no rule in the current stylesheet |
| No box could be recoloured or resized | no controls were registered for any current class |
| The insert palette offered "Page" and "Flowwrap" | scaffolding was indistinguishable from components |

The last one matters more than it looks: `.page` is `overflow:hidden`, and the
pipeline measures every page in a headless browser. A figure that changes
height *after* layout silently clips whatever it pushes off the sheet.

## How it works now

Hardcoding 145 class names into the editor would fix today and rot tomorrow.
The element library already declares itself, so the editor reads it:

```
HTML_Automation/book/elements/<id>/
    spec.json       what it is, which classes it emits, when it's used
    template.html   its internal structure
    style.css       its colours, its variants, its flex wrappers
                            │
                            ▼
       tools/export_editor_manifest.py
                            │
                            ▼
   book_editor/frontend/src/editor/elementManifest.json
                            │
                            ▼
                     editor/manifest.ts
```

Add an element to the library, re-run the exporter, and it appears in the
editor with its parts, colours and variants — **no editor change at all**.
`tools/selftest.sh` regenerates the manifest, so it cannot drift.

Everything derived, and where it comes from:

- **Named regions** (`.ft`, `.fx`, `.figspace`) — from `template.html`, plus
  the spec `notes` for regions the template hides behind a `{rows}`
  placeholder, plus child selectors in `style.css`. Three sources because no
  single one is complete.
- **Colour controls** — offered only where the CSS actually paints a border
  or background, so a control can never be a no-op.
- **Variants** — `.po-warn`, `.po-trap` … all 19, read from the stylesheet
  and offered as one picker, because each carries a *matched* border,
  background and label colour that a user should not have to coordinate by
  hand.
- **Side-by-side** — `figcard/style.css` already ships
  `.figrow { display:flex }` with `.figrow > .figcard { flex:1 }`. Nothing
  ever created that wrapper, so "put text beside this picture" was impossible
  despite being fully implemented in CSS. It is now detected, not named, so
  any element whose CSS grows the same pattern gets the behaviour free.
- **Scaffolding** — anything the library marks `_shell` (`.page`,
  `.flowwrap`, `.acol`, `.u`, `.stickycol`) is excluded from the palette.

## What this does not do

The manifest is **additive**. `documentUsesManifest()` gates it, so a
document that is not ours matches nothing and behaves exactly as it did
before — a foreign file's `.callout` is still labelled "Callout", not
"Sticky note", because it means its own thing by that name.

## Editing rules worth knowing

- **A picture fills its plate; it never replaces it.** `.figspace` is at its
  final size from the first build — that is what lets artwork be dropped in
  without moving the page. The image goes *inside* at
  `width:100%;height:100%;object-fit:contain`.
- **Boxes resize by `min-height`, not `height`.** A fixed height on a text
  box clips whatever does not fit, and `.page` is `overflow:hidden`, so the
  overflow would vanish rather than push. `min-height` grows a short box
  without ever truncating a long one. The picture plate is the exception:
  its height *is* the reserved area, so it takes a real `height`.
- **Recolouring writes an inline property**, which beats all three mechanisms
  the elements use (hardcoded rule, variant class, pipeline-written inline
  style). "Reset to default" removes it and lets the designed look return.

## Regenerating

```sh
cd HTML_Automation
python3 tools/export_editor_manifest.py     # or just run tools/selftest.sh
```

## Verifying

`src/editor/currentPipeline.test.ts` runs against the real
`HTML_Automation/build/chapter-03.html` and asserts each of the failures in
the table above is fixed. It skips cleanly when the build is absent.

```sh
cd book_editor/frontend && npx vitest run
```

---

# The art library

`HTML_Automation/decorators/cropped/` holds **130 pieces of art** in six
categories, and `book/decorators/policy.py` holds a real policy for using
them. Neither was reachable: `slots.py` says so in its own docstring —
*"nothing calls this in the default build"* — `assets/manifest.json` does not
exist, so every reserved slot resolved to nothing and all 130 files sat unread.

Choosing art for a page is a judgement call. That is precisely what the
pipeline defers to an agent, and what a person looking at the page is best at,
so the editor is where it belongs.

## Two rules, both from the pipeline

**1. A decorator never enters the content flow.** `.page` is
`height:1527px; overflow:hidden`, and pagination was measured in a headless
browser and is not re-run. Anything inserted *between* two blocks pushes
everything after it down, and whatever crosses the page boundary is clipped —
not moved to the next page, not reported, just gone. So art is absolutely
positioned inside the page (already `position:relative`). It cannot move a
single line of text, which is what makes one click a safe interaction and
free dragging afterwards safe too.

**2. Density is inversely proportional to content density.** Quoting
`policy.py`: in the reference book the 23 full Q&A pages carry zero doodles
and zero characters. `advisePlacement()` measures a page's real slack and
applies the same thresholds — 260px for a doodle, 520px for a character, max
2 doodles and 1 character per page — and **warns rather than forbids**,
because it is a judgement, not a rule.

## Weight

The source PNGs are ~234KB each (30MB) for images only ~200-260px across —
near display size already, just encoded wastefully. Re-encoded as WebP the
whole library is 3.5MB, and one decorator inlines into a chapter as ~14KB of
base64. The panel browses via `/decorators/…` served by Vite; art is inlined
only at the moment it is placed, so a chapter stays self-contained without the
editor bundle carrying 30MB it mostly will not use.

## Regenerating

```sh
cd HTML_Automation
python3 tools/export_decorator_library.py    # needs Pillow
```

Only necessary when the decorator art itself changes. `selftest.sh` runs it if
the library is missing.
