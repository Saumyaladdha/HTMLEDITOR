import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseDocument, serializeDocument } from "./model";
import { collectBlocks, collectPages, detectStructure } from "./structure";
import { serializeForSave } from "./sanitize";
import { detectCapabilities } from "./capabilities";

/**
 * Integration test against a REAL packaged chapter — 6.5MB, 38 pages, a
 * multi-MB inlined stylesheet, Hindi throughout.
 *
 * Synthetic fixtures cannot reproduce what actually broke this editor: a
 * stylesheet big enough to matter for memory, a build comment inside that CSS
 * that literally quotes `<div class="page">` as example markup, and a shared
 * <style> block sitting in the body between two pages. Those are exactly the
 * inputs the parser has historically lost content on.
 *
 * Skipped automatically when the pipeline output isn't present, so the suite
 * still runs on a checkout without it.
 */

const CHAPTER_PATH = resolve(
  __dirname,
  "../../../../HTML_Automation/chapter-01.packaged.html",
);
const available = existsSync(CHAPTER_PATH);
const suite = available ? describe : describe.skip;

suite("real packaged chapter", () => {
  const html = available ? readFileSync(CHAPTER_PATH, "utf-8") : "";

  // Parsed ONCE and shared. jsdom is far heavier than a real browser DOM, and
  // re-parsing a 6.5MB document per test exhausts the default Node heap.
  // (Cheap in the browser, where this is native — but the test process is
  // not a browser.)
  const model = available ? parseDocument(html) : null!;
  const doc = available ? new DOMParser().parseFromString(html, "text/html") : null!;
  const structure = available ? detectStructure(doc) : null!;

  it("parses into the expected page structure", () => {
    // 38 real pages — verified against the DOM, not against grep.
    //
    // The raw file contains FORTY occurrences of the string `class="page"`.
    // Two of them are inside <style> blocks (build documentation quoting
    // example markup), so any parser that scans the raw text finds 40 pages
    // and invents two that do not exist. Same for `.page__cols`: 39 string
    // hits, 38 real elements. This is the concrete reason parseDocument
    // walks the parsed tree instead of searching the string.
    expect(model.pages).toHaveLength(38);
    expect(model.prefix.length).toBeGreaterThan(1_000_000); // the inlined stylesheet
  });

  it("round-trips without losing content", () => {
    const out = serializeDocument(model);
    const reparsed = parseDocument(out);

    expect(reparsed.pages).toHaveLength(model.pages.length);
    model.pages.forEach((page, i) => {
      expect(reparsed.pages[i].blocks.length, `page ${i + 1} blocks`).toBe(page.blocks.length);
      expect(reparsed.pages[i].fullBlocks.length, `page ${i + 1} fullBlocks`).toBe(
        page.fullBlocks.length,
      );
    });
  });

  it("is stable across repeated round trips — undo/redo does this repeatedly", () => {
    const once = parseDocument(serializeDocument(model));
    const twice = parseDocument(serializeDocument(once));
    expect(twice.pages).toHaveLength(model.pages.length);
    expect(twice.pages.map((p) => p.blocks.length)).toEqual(model.pages.map((p) => p.blocks.length));
  });

  it("preserves the chapter title, which lives in .page__full", () => {
    const out = serializeDocument(model);
    expect(out).toContain("page__full");
    expect(out).toContain("title-1");
  });

  it("preserves each page's own --fs-base", () => {
    const withFsBase = model.pages.filter((p) => (p.attrs.style ?? "").includes("--fs-base"));
    expect(withFsBase.length).toBeGreaterThan(0);
    const out = serializeDocument(model);
    expect(out).toContain("--fs-base");
  });

  it("shares one copy of the multi-MB shell between snapshots", () => {
    // 50 undo snapshots x a 3MB prefix was ~150MB retained for one chapter.
    const again = parseDocument(serializeDocument(model));
    expect(again.prefix).toBe(model.prefix); // identity, not equality
  });

  it("detects it as paginated, with the pipeline's containers", () => {
    const s = structure;
    expect(s.mode).toBe("paginated");
    expect(s.pageSelector).toBe(".page");
    expect(s.blockContainerSelectors).toEqual(
      expect.arrayContaining([".page__cols", ".page__full"]),
    );
    expect(collectPages(doc, s)).toHaveLength(38);
  });

  it("finds a substantial number of editable blocks", () => {
    const blocks = collectBlocks(doc, structure);
    expect(blocks.length).toBeGreaterThan(100);
  });

  it("detects the pipeline's inline-formatting classes, so colouring uses them", () => {
    const caps = detectCapabilities(doc);
    // jsdom only exposes cssRules for <style> it could parse; if it managed
    // to, the semantic class must be chosen over the inline-style fallback.
    if (caps.textColor.className !== null) {
      expect(caps.textColor.className).toBe("text-color");
      expect(caps.textColor.cssVar).toBe("--tc-c");
    }
  });

  it("saving strips editor scaffolding but keeps the chapter intact", () => {
    // Simulate an editing session having marked everything up.
    collectBlocks(doc, structure).forEach((el, i) => {
      el.dataset.blockId = `b-${i}`;
      el.draggable = true;
    });
    const saved = serializeForSave(doc);
    expect(saved).not.toContain("data-block-id");
    expect(saved).not.toContain('draggable="true"');
    expect(parseDocument(saved).pages).toHaveLength(38);
  });
});
