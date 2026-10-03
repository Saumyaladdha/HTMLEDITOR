import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectBlocks, detectStructure, minSafeViewportWidth } from "./structure";
import { discoverTemplates } from "./blockTemplates";
import { isPaired, makeNestedItemsDraggable, pairRefusal, pairUnit, placeSideBySide, unpairSideBySide } from "./dragDrop";
import { canClip, clipPanel, rowLabels, unclipPanel } from "./panelSplit";
import { selectionTouchesMath, toggleMathEmphasis, mathTargetOf, MATH_EMPHASIS_CLASS } from "./textEditing";
import { splitItemGroup, itemGroupFor } from "./itemEditing";
import { stampBlockIds } from "./selection";
import { applyImageToFigureSlot, findFigureImageSlot, isEmptyImageSlot } from "./selection";
import { toggleSideBySide } from "./blockEditing";
import { isImageSubPart, registryEntryFor } from "./propertyRegistry";
import {
  SHELL_CLASSES,
  documentUsesManifest,
  manifestElementFor,
  manifestPartFor,
} from "./manifest";

/**
 * Integration test against what the pipeline emits TODAY.
 *
 * `realChapter.test.ts` points at `chapter-01.packaged.html`, which the
 * pipeline stopped producing — so that suite has been skipping silently
 * while the editor drifted out of step with the real output. This one
 * targets the current build and asserts the things that were actually
 * broken: 145 classes, none of them BEM, every registry lookup missing,
 * every block collapsing to one contenteditable blob, and the image
 * uploader aiming at a caption.
 *
 * Skipped when the build isn't present, so a fresh checkout still runs.
 */
/**
 * THE FIRST BUILD THAT EXISTS, newest design first.
 *
 * This pointed at a single hard-coded `chapter-03.html`. The pipeline
 * stopped producing that name, so `existsSync` was false, the suite
 * skipped, and 24 assertions about real output went dark — exactly as
 * `realChapter.test.ts` had already gone dark before it. A test that
 * silently stops running is worse than no test: the green tick remains.
 *
 * The reference edition is listed last as a floor. It is the design
 * source of truth and its name does not move, so if any build is present
 * these assertions run against something real.
 */
const CANDIDATES = [
  "../../../../HTML_Automation/build/chapter-02-build.html",
  "../../../../HTML_Automation/build/REFERENCE_chapter-02.html",
];
const CHAPTER = CANDIDATES.map((p) => resolve(__dirname, p)).find(existsSync) ?? "";
const available = CHAPTER !== "";
const suite = available ? describe : describe.skip;

suite("current pipeline output", () => {
  const html = available ? readFileSync(CHAPTER, "utf-8") : "";
  const doc = available ? new DOMParser().parseFromString(html, "text/html") : null!;
  const structure = available ? detectStructure(doc) : null!;

  it("is recognised as this pipeline's own output", () => {
    expect(documentUsesManifest(doc)).toBe(true);
  });

  it("detects real pages", () => {
    expect(structure.mode).toBe("paginated");
    expect(doc.querySelectorAll(".page").length).toBeGreaterThan(20);
  });

  it("finds editable blocks inside .flowwrap / .acol", () => {
    const blocks = collectBlocks(doc, structure);
    expect(blocks.length).toBeGreaterThan(100);
  });

  it("gives the सूत्र panel named regions instead of one editable blob", () => {
    const card = doc.querySelector(".fcard");
    expect(card).toBeTruthy();
    const { entry } = registryEntryFor(card!);
    // The bug: with no registry match this fell to `directText: true`, so a
    // click made the whole panel — every formula row — one contenteditable.
    expect(entry.directText).toBeFalsy();
    expect(Object.keys(entry.subParts ?? {})).toEqual(
      expect.arrayContaining(["ft", "fx", "fd"]),
    );
  });

  it("aims the image uploader at the picture plate, not the caption", () => {
    const fig = doc.querySelector(".figcard");
    expect(fig).toBeTruthy();
    const slot = findFigureImageSlot(fig!);
    // A FIGURE HAS TWO LEGITIMATE SHAPES and the editor must aim correctly
    // in both: `.figcard.figbox > .figspace` when no art has resolved yet,
    // and `.figcard.has-img > .figure-image` once a real picture is in
    // place. This asserted `.figspace` alone, so it could only ever pass
    // on a chapter with no artwork.
    //
    // What must hold either way is that the uploader aims at the block's
    // OWN declared picture region and never at `.fh`, the caption, which
    // is the figure's first child and what the structural fallback used
    // to pick — uploading replaced the words.
    expect(slot).toBeTruthy();
    expect(
      slot!.classList.contains("figspace") ||
        slot!.classList.contains("figure-image") ||
        slot!.tagName === "IMG",
    ).toBe(true);
    expect(slot!.classList.contains("fh")).toBe(false);

    const { entry } = registryEntryFor(fig!);
    expect(isImageSubPart(fig!, slot, entry)).toBe(true);
    expect(isImageSubPart(fig!, fig!.querySelector(".fh"), entry)).toBe(false);
  });

  it("offers colour and size controls on boxes", () => {
    const { entry } = registryEntryFor(doc.querySelector(".callout")!);
    const props = (entry.styleControls ?? []).map((c) => c.property);
    expect(props).toContain("border-color");
    expect(props).toContain("background");
    expect(props).toContain("width");
  });

  it("offers the pointer's designed variants as one picker", () => {
    const { entry } = registryEntryFor(doc.querySelector(".po")!);
    const names = entry.variantGroup?.options.map((o) => o.className) ?? [];
    expect(names).toContain("po-warn");
    expect(names).toContain("po-trap");
    // Every variant the stylesheet defines, not a hand-picked subset.
    expect(names.length).toBeGreaterThan(10);
  });

  it("resizes a picture on .figspace, not on the card around it", () => {
    const { entry } = registryEntryFor(doc.querySelector(".figcard")!);
    const h = (entry.styleControls ?? []).find((c) => c.property === "height");
    expect(h?.target).toBe(".figspace");
  });

  it("routes a click inside a region to that region", () => {
    // THE सूत्र PANEL HAS TWO SHAPES. Part 2 sets each result in a boxed
    // `.fx`; Part 1's crib sheet sets a bulleted `.formula-list` whose rows
    // are `.formula-body`. Asserting `.fx` alone passed only while every
    // panel was Part 2's. What must hold either way is that a click inside
    // the panel resolves to the FORMULA region and not to the panel.
    const cards = Array.from(doc.querySelectorAll(".fcard"));
    expect(cards.length).toBeGreaterThan(0);
    let checked = 0;
    for (const card of cards) {
      const formula = card.querySelector(".fx") ?? card.querySelector(".formula-body");
      if (!formula) continue;
      expect(manifestPartFor(card, formula)?.label).toBe("Formula");
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("never offers page scaffolding as an insertable component", () => {
    const templates = discoverTemplates(collectBlocks(doc, structure));
    for (const t of templates) {
      expect(SHELL_CLASSES.has(t.key)).toBe(false);
    }
    expect(SHELL_CLASSES.has("flowwrap")).toBe(true);
    expect(SHELL_CLASSES.has("page")).toBe(true);
  });

  it("fills the picture plate in place instead of replacing it", () => {
    const fig = doc.querySelector(".figcard")!.cloneNode(true) as HTMLElement;
    const plate = findFigureImageSlot(fig)!;
    // THE RESERVED HEIGHT is what must survive, not the style attribute
    // verbatim. Filling a plate clears the placeholder's dashed border, so
    // a `.figure-image` box that started with no style attribute at all
    // ends up with one — harmless, and not what this is about. The page was
    // measured in a headless browser against THIS height with `.page` set
    // to overflow:hidden, so a figure that grows after layout silently
    // clips whatever it pushes off the sheet.
    const before = plate.style.height;

    // An empty reserved plate reports empty; one already holding a photo
    // does not, and must not — every click would reopen the file picker
    // and the figure could never simply be selected to resize.
    // A SLOT IS EITHER A PLATE OR THE PICTURE ITSELF, and both are real:
    // a chapter with no art yet reserves a `.figspace` plate, one built
    // from real photographs has `.figure-image` holding an <img>, and a
    // legacy document's slot IS the <img>. Asking "does it contain an img"
    // answered for the container shape only, so on a chapter of real
    // photographs this asserted `false === true`. What holds for all three
    // is that empty means no picture, however the slot carries one.
    const hasPicture =
      plate.tagName === "IMG"
        ? !!plate.getAttribute("src")
        : plate.querySelector("img") !== null || !!plate.style.backgroundImage;
    expect(isEmptyImageSlot(plate)).toBe(!hasPicture);
    const held = applyImageToFigureSlot(plate, "data:image/png;base64,AAA");

    // The plate itself must survive with its reserved height untouched: the
    // pipeline measures pages in a headless browser and `.page` is
    // overflow:hidden, so a figure that changes height after layout silently
    // clips whatever it pushes off the sheet.
    // The region itself SURVIVES — it is never swapped for a bare <img>.
    // The pipeline measures pages in a headless browser and `.page` is
    // overflow:hidden, so a figure that changes height after layout
    // silently clips whatever it pushes off the sheet.
    expect(fig.contains(plate)).toBe(true);
    expect(plate.style.height).toBe(before);
    expect(held.tagName).toBe("IMG");
    expect(plate.contains(held)).toBe(true);
    // And a filled plate must stop reporting empty, or every click would
    // reopen the file picker and the figure could never just be selected.
    expect(isEmptyImageSlot(plate)).toBe(false);
  });

  it("puts a figure and its neighbour side by side, then back", () => {
    const host = doc.createElement("div");
    host.innerHTML = `<figure class="figcard figbox"><div class="fh">Fig</div>` +
      `<div class="figspace" style="height:150px"></div></figure><p class="para">Text</p>`;
    const fig = host.querySelector(".figcard") as HTMLElement;

    toggleSideBySide(doc, fig, "figrow", () => doc.createElement("p"));
    const row = host.querySelector(".figrow")!;
    // The EXISTING paragraph is pulled in beside the figure — inventing an
    // empty box next to real content is never what was meant.
    expect(row.children.length).toBe(2);
    expect(row.children[1].textContent).toBe("Text");

    toggleSideBySide(doc, fig, "figrow", () => doc.createElement("p"));
    expect(host.querySelector(".figrow")).toBeNull();
    expect(host.children.length).toBe(2);
  });

  it("colours a section heading through its underline accent", () => {
    const head = doc.querySelector(".sechead");
    expect(head).toBeTruthy();
    // The heading's colour lives on `.hdu` inside it, not on the heading
    // block — six `.hd-*` accents, each a differently-stroked SVG underline.
    const hdu = head!.querySelector(".hdu");
    expect(hdu).toBeTruthy();
    const { entry } = registryEntryFor(hdu!);
    const names = entry.variantGroup?.options.map((o) => o.className) ?? [];
    expect(names).toEqual(
      expect.arrayContaining(["hd-pink", "hd-blue", "hd-green"]),
    );
    // Guessing the family prefix from the base class gives `.hdu-*` and finds
    // nothing; it has to come from the spec's declared `hd-{accent}`.
    expect(entry.variantGroup?.prefix).toBe("hd-");
  });

  it("makes each cover card its own block, not one slab", () => {
    // A GRID OF CARDS MUST NOT BECOME ONE BLOCK. Taking only the
    // DIRECT children of a block container made the entire grid — both
    // columns, every card — a single block: selecting one card selected all
    // of them and dragging moved them together.
    const host = doc.createElement("div");
    host.innerHTML =
      `<div class="acol"><div class="cvgrid" style="display:flex">` +
      `<div class="cvcol" style="display:flex"><div class="cvcard">A</div>` +
      `<div class="cvcard">B</div></div>` +
      `<div class="cvcol" style="display:flex"><div class="cvcard">C</div></div>` +
      `</div></div>`;
    doc.body.appendChild(host);
    try {
      const found = collectBlocks(doc, structure).filter((b) => host.contains(b));
      expect(found.map((b) => b.textContent)).toEqual(["A", "B", "C"]);
      // The wrappers themselves are never blocks — they render no box.
      expect(found.some((b) => b.classList.contains("cvgrid"))).toBe(false);
      expect(found.some((b) => b.classList.contains("cvcol"))).toBe(false);
    } finally {
      host.remove();
    }
  });

  it("keeps a flex COMPONENT whole", () => {
    // `.po` and `.sechead` are both `display:flex`, and both are one thing a
    // user edits — the wrapper rule must not take them apart.
    const host = doc.createElement("div");
    host.innerHTML = `<div class="acol"><div class="po po-warn" style="display:flex">` +
      `<span class="ic">!</span><span>text</span></div></div>`;
    doc.body.appendChild(host);
    try {
      const found = collectBlocks(doc, structure).filter((b) => host.contains(b));
      expect(found).toHaveLength(1);
      expect(found[0].classList.contains("po")).toBe(true);
    } finally {
      host.remove();
    }
  });

  it("makes repeated units inside a block individually draggable", () => {
    // A small document, not the 69-page chapter: this exercises a generic
    // function, and `getComputedStyle` over 3MB of DOM is seconds in jsdom.
    const d = new DOMParser().parseFromString(
      `<div data-block-id="b1" class="sechead" style="display:flex">` +
      `<span class="examchip" style="display:block">UP 2025 · 1 अंक</span>` +
      `<span class="examchip" style="display:block">UP 2026 · 3 अंक</span>` +
      `</div>`, "text/html");
    makeNestedItemsDraggable(d);
    const chips = Array.from(d.querySelectorAll(".examchip"));
    // Two stamps on one heading are two units. Before this they had no
    // handle of their own, so dragging either moved the whole heading.
    expect(chips).toHaveLength(2);
    expect(chips.every((c) => c.hasAttribute("data-nested-item"))).toBe(true);
  });

  it("makes a question's exam tags and its marks chip movable one by one", () => {
    const d = new DOMParser().parseFromString(readFileSync(CHAPTER, "utf-8"), "text/html");
    stampBlockIds(d, detectStructure(d));
    makeNestedItemsDraggable(d);

    // The tags sit at `.qhead > .question-meta > .paper-refs > .paper-ref`,
    // which is three levels below the block — past the depth the outward
    // scan can afford to walk. Every one of them was therefore fixed in
    // place: a question's provenance could be read but never rearranged.
    const tags = Array.from(d.querySelectorAll<HTMLElement>(".paper-ref"));
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.every((t) => t.hasAttribute("data-nested-item"))).toBe(true);

    // The band they sit in, and the marks chip beside it, are objects too —
    // the three things on a question head, each movable on its own.
    const band = d.querySelector<HTMLElement>(".paper-refs")!;
    expect(band.hasAttribute("data-nested-item")).toBe(true);
    expect(itemGroupFor(tags[0])?.noun).toBe("paper tag");

    // …and the separator between tags is CSS, not a text node, so moving one
    // tag past another cannot leave its dots behind.
    expect((band.textContent ?? "").includes("\u00b7")).toBe(false);
  }, 20_000);

  it("splits a set of options so two can go above and two below", () => {
    const d = new DOMParser().parseFromString(readFileSync(CHAPTER, "utf-8"), "text/html");
    stampBlockIds(d, detectStructure(d));
    makeNestedItemsDraggable(d);

    const opts = d.querySelector<HTMLElement>(".opts")!;
    const rows = Array.from(opts.children) as HTMLElement[];
    expect(rows.length).toBe(4);
    const textOf = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim();
    const before = rows.map(textOf);

    const group = itemGroupFor(rows[2])!;
    const half = splitItemGroup(group, rows[2])!;

    // Four options were one indivisible block: a column with room for two
    // had to send all four to the next one. Now there is a seam.
    expect(Array.from(opts.children).map(textOf)).toEqual(before.slice(0, 2));
    expect(Array.from(half.children).map(textOf)).toEqual(before.slice(2));
    // The second half is a real `.opts` box, not a bare wrapper — everything
    // that works on the first half works on it.
    expect(half.className).toBe(opts.className);
    expect(half.hasAttribute("data-block-id")).toBe(false);
    // Splitting at the first row would leave an empty box above.
    expect(splitItemGroup(itemGroupFor(rows[0])!, rows[0])).toBeNull();
  }, 20_000);

  it("offers a cut line on both shapes of सूत्र panel, and puts it back", () => {
    const d = new DOMParser().parseFromString(readFileSync(CHAPTER, "utf-8"), "text/html");
    stampBlockIds(d, detectStructure(d));

    // THE PANEL'S ROWS CHANGED SHAPE AND THE CUT DID NOT FOLLOW. Part 2 sets
    // each result in a boxed `.frow`; Part 1's crib sheet uses a bulleted
    // `.formula-list > li`. Asking only for `.frow` reported zero rows for
    // the second shape, so the whole clip panel — row list, cut line, join —
    // vanished for every सूत्र panel in Part 1: atomic again, which is the
    // state clipping exists to undo.
    const panels = Array.from(d.querySelectorAll<HTMLElement>(".fcard"));
    const clippable = panels.filter((p) => canClip(p));
    expect(clippable.length).toBeGreaterThan(0);

    const panel = clippable[0];
    const before = rowLabels(panel);
    expect(before.length).toBeGreaterThanOrEqual(2);

    const [head, tail] = clipPanel(panel, 0)!;
    expect(rowLabels(head).length).toBe(1);
    expect(rowLabels(tail).length).toBe(before.length - 1);
    // The rows keep their own wrapper: `<li>`s loose in a `.fcard` would be
    // unstyled and unbulleted.
    expect(Array.from(tail.children).some((c) => c.tagName === "LI")).toBe(false);

    // …and the cut is reversible, in the original order.
    expect(unclipPanel(head, tail)).toBe(true);
    expect(rowLabels(head)).toEqual(before);
  }, 20_000);

  it("sizes the canvas past the chapter's own responsive breakpoints", () => {
    // THE CANVAS IS NOT A PHONE, and for a long time it was treated as one.
    // The iframe was sized to the page — 1080px — and this chapter's own
    // stylesheet carries `@media (max-width:1100px)`, which shrinks `.page`
    // padding from 56/68/58 to 26/22/34 and collapses `.opts` from a
    // two-column grid to one. So OPENING a file fired its mobile layout:
    // every line re-wrapped against a different content box, every set of
    // options roughly doubled in height, and four of twenty-six pages spilled
    // past the sheet — on a build the pipeline had just measured as fitting
    // exactly. Measured in headless Chrome: 4 pages overflowing at 1080px, 0
    // at 1101px, with and without the editor's own stylesheet.
    //
    // The rule that does the damage really is in the shipped chapter:
    const css = readFileSync(CHAPTER, "utf-8");
    expect(css).toMatch(/@media\s*\(max-width:\s*1100px\)/);

    // And the width is READ from the document, never hardcoded, so a chapter
    // that moves its breakpoint moves the canvas with it. Exercised on a
    // document whose sheet is actually in the CSSOM — a DOMParser document's
    // <style> is not parsed into `styleSheets` under jsdom.
    const style = document.createElement("style");
    style.textContent =
      "@media (max-width:1100px){.opts{grid-template-columns:1fr}}" +
      "@media (max-width:640px){.page{padding:4px}}" +
      // A `max-width` PROPERTY must not be mistaken for a breakpoint.
      ".shell{max-width:1240px}";
    document.head.appendChild(style);
    try {
      expect(minSafeViewportWidth(document)).toBe(1101);
    } finally {
      style.remove();
    }
  });

  it("marks a formula without rebuilding it", () => {
    const d = new DOMParser().parseFromString(readFileSync(CHAPTER, "utf-8"), "text/html");

    // BOLD AND HIGHLIGHT GO THROUGH execCommand, which rewrites the markup it
    // spans — and a formula IS markup: `.fr > span + span.dn` for a stacked
    // fraction, `.m > .up + sup` for a term. Applied to maths it left the
    // formula rendering as ordinary text ("I highlighted one formula and it
    // goes to normal"). Those are refused now; this is what replaces them.
    const fr = d.querySelector<HTMLElement>(".fr")!;
    const target = mathTargetOf(fr)!;
    expect(target).toBeTruthy();

    const before = target.innerHTML;
    expect(toggleMathEmphasis(target)).toBe(true);
    // Nothing INSIDE the formula is touched — that is the whole point.
    expect(target.innerHTML).toBe(before);
    expect(target.classList.contains(MATH_EMPHASIS_CLASS)).toBe(true);
    expect(target.style.fontWeight).toBe("700");

    // …and it comes off again cleanly, leaving no inline residue behind.
    expect(toggleMathEmphasis(target)).toBe(false);
    expect(target.classList.contains(MATH_EMPHASIS_CLASS)).toBe(false);
    expect(target.getAttribute("style") || "").toBe("");
    expect(target.innerHTML).toBe(before);
  }, 20_000);

  it("never turns inline math runs into draggable items", () => {
    // A chapter carries 5077 `.up` and 1197 `.m` spans. Marking those would
    // make every digit in the book independently draggable.
    const d = new DOMParser().parseFromString(
      `<p data-block-id="b1" class="q">` +
      `<span class="m" style="display:inline">a</span>` +
      `<span class="m" style="display:inline">b</span></p>`, "text/html");
    makeNestedItemsDraggable(d);
    expect(d.querySelectorAll("[data-nested-item]")).toHaveLength(0);
  });

  it("does not weld a section heading to its wrapper", () => {
    const blocks = collectBlocks(doc, structure);
    const sec = doc.querySelector(".sec") as HTMLElement;
    const head = doc.querySelector(".sechead") as HTMLElement;
    // `.sec` and `.exp` have no CSS rule at all — pure grouping. Treating
    // them as blocks meant clicking a heading selected the wrapper around it.
    expect(blocks).not.toContain(sec);
    expect(blocks).toContain(head);
  });

  it("makes the frequency seal inside a heading selectable on its own", () => {
    const head = doc.querySelector(".sechead") as HTMLElement;
    const { entry } = registryEntryFor(head);
    // The seal is its own element in the library, not a named part of the
    // heading, so clicking the red badge used to select the whole heading.
    // It is `.topic-frequency` now — the reference's name and design for
    // what `.examchip` used to draw, and the reference carries no
    // `.examchip` at all.
    expect(Object.keys(entry.subParts ?? {})).toContain("topic-frequency");
  });

  it("does not make every maths span selectable", () => {
    // 1197 `.m` spans in this chapter. They are text runs, not objects — a
    // selection box round half the words on a page is worse than none.
    const para = doc.querySelector(".q") as HTMLElement;
    const { entry } = registryEntryFor(para);
    expect(Object.keys(entry.subParts ?? {})).not.toContain("m");
  });

  it("treats a frequency seal on a heading as its own unit", () => {
    const d = new DOMParser().parseFromString(readFileSync(CHAPTER, "utf-8"), "text/html");
    stampBlockIds(d, detectStructure(d));
    makeNestedItemsDraggable(d);
    const seals = Array.from(d.querySelectorAll<HTMLElement>(".topic-frequency"));
    expect(seals.length).toBeGreaterThan(0);
    // A seal is a `<span>` that only becomes block-level because its heading
    // is a flex container. Testing display alone missed every one of them.
    //
    // AND THERE IS ONLY EVER ONE PER HEADING — which is the other half of
    // this. A heading holds an `<h2>` and one seal: different shapes, so the
    // "two siblings alike" rule that guards the chapter's 1197 inline maths
    // runs excluded every seal in the book. Being a declared element that
    // draws its own box is the stronger statement and now stands alone.
    expect(seals.every((c) => c.hasAttribute("data-nested-item"))).toBe(true);
    expect(itemGroupFor(seals[0])?.noun).toBe("seal");
    // …and the 1197 maths runs are still left out of it.
    expect(d.querySelectorAll(".m[data-nested-item]")).toHaveLength(0);
    // Re-parses and re-scans the whole 3.3MB chapter, which is seconds in
    // jsdom (milliseconds in a browser). The default 5s limit was marginal.
  }, 30000);

  it("leaves foreign documents alone", () => {
    // A document with none of our classes must behave exactly as it did
    // before the manifest existed, rather than having our vocabulary
    // imposed on it.
    const plain = new DOMParser().parseFromString(
      "<article><h1>Hi</h1><p>Body</p></article>",
      "text/html",
    );
    expect(documentUsesManifest(plain)).toBe(false);
    expect(manifestElementFor(plain.querySelector("p")!)).toBeNull();
  });

  /**
   * The सूत्र panel beside the box above it.
   *
   * Reported as "I want to place this at the side, I am not able to". The
   * panel is `<column> > .u > .fcard`, so its own `nextElementSibling` /
   * `previousElementSibling` are both null and pairing has to reach the
   * `.u`. This asserts it against the real build, not a hand-written
   * fixture.
   *
   * THE WRAPPER IS `.u`, AND MAY CARRY MORE THAN THAT. A Part-1 block is
   * `.u.revision-unit` — Part 1 is its own design, not Part 2 restyled —
   * so an exact `className === "u"` check passed only while every page was
   * Part 2. What matters is that pairing reaches the `.u` wrapper, not
   * that the wrapper carries nothing else.
   *
   * Nor is the column still `.flowwrap`: both halves are now packed into
   * `.acols > .acol`. The assertion is that the pair lands in the SAME
   * container the unit came from, whichever that is — which is the real
   * invariant, since a pair that moved container would jump the page.
   */
  it("can put the सूत्र panel beside the block above it", () => {
    stampBlockIds(doc, structure);
    const card = doc.querySelector<HTMLElement>(".fcard")!;

    expect(card.previousElementSibling).toBeNull();          // the symptom
    const unit = pairUnit(card);
    expect(unit.classList.contains("u")).toBe(true);
    const container = unit.parentElement!;
    expect(container).toBeTruthy();

    const prev = unit.previousElementSibling as HTMLElement;
    expect(prev).toBeTruthy();
    expect(pairRefusal(prev, card)).toBeNull();
    expect(placeSideBySide(doc, prev, card)).toBe(true);

    const row = card.closest(".sxs")!;
    expect(row.parentElement).toBe(container);
    expect(row.children.length).toBe(2);
    expect(isPaired(card)).toBe(true);
    expect(unpairSideBySide(card)).toBe(true);
  });

  /**
   * The त्रिक box beside the figure — screenshot 1 of the same report.
   * A figure card is a block like any other, and pairing must not care that
   * one half is a picture and the other a line of text.
   */
  it("can put a block beside a figure card", () => {
    stampBlockIds(doc, structure);
    const fig = doc.querySelector<HTMLElement>(".figcard")!;
    const after = pairUnit(fig).nextElementSibling as HTMLElement | null;
    expect(after).toBeTruthy();

    expect(pairRefusal(fig, after!)).toBeNull();
    expect(placeSideBySide(doc, fig, after!)).toBe(true);
    expect(fig.closest(".sxs")!.children.length).toBe(2);
    expect(isPaired(fig)).toBe(true);
  });
});
