import { describe, expect, it } from "vitest";
import { discoverTemplates, SEMANTIC_TEMPLATES } from "./blockTemplates";
import { collectBlocks, detectStructure } from "./structure";

/**
 * The palette learns the open document's own vocabulary. This is what keeps
 * it useful as the element library grows — a new element added to the
 * pipeline shows up in the editor with no editor change at all, because it
 * appears in the documents themselves.
 */

function blocksOf(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return collectBlocks(doc, detectStructure(doc));
}

describe("semantic defaults", () => {
  it("are class-free and language-neutral", () => {
    for (const t of SEMANTIC_TEMPLATES) {
      expect(t.html, `${t.key} carries a class`).not.toMatch(/\sclass=/);
      // No Devanagari — the old templates hardcoded Hindi placeholder copy,
      // which is wrong in any document not written in Hindi.
      expect(t.html, `${t.key} carries Hindi placeholder text`).not.toMatch(/[ऀ-ॿ]/);
    }
  });

  it("each parse to exactly one element", () => {
    for (const t of SEMANTIC_TEMPLATES) {
      const parsed = new DOMParser().parseFromString(t.html, "text/html");
      expect(parsed.body.children.length, `${t.key}`).toBe(1);
    }
  });
});

describe("discoverTemplates", () => {
  const CHAPTER = `<!doctype html><html><body><div class="book">
    <div class="page"><div class="page__cols">
      <p class="text-body">One</p>
      <p class="text-body">Two</p>
      <aside class="tip-box"><div class="tip-box__frame">Short tip</div></aside>
      <aside class="tip-box"><div class="tip-box__frame">A considerably longer tip that goes on</div></aside>
      <div class="only-once">Unique</div>
    </div></div>
  </div></body></html>`;

  it("offers components the document repeats", () => {
    const found = discoverTemplates(blocksOf(CHAPTER));
    const labels = found.map((t) => t.label);
    expect(labels).toContain("Tip Box");
    expect(labels).toContain("Text Body");
  });

  it("ignores one-off elements", () => {
    const found = discoverTemplates(blocksOf(CHAPTER));
    expect(found.map((t) => t.label)).not.toContain("Only Once");
  });

  it("never offers page scaffolding as a component", () => {
    const found = discoverTemplates(blocksOf(CHAPTER));
    for (const bad of ["Page", "Page  Cols", "Book"]) {
      expect(found.map((t) => t.label)).not.toContain(bad);
    }
  });

  it("picks the smallest example, so inserting is cheap", () => {
    const tip = discoverTemplates(blocksOf(CHAPTER)).find((t) => t.label === "Tip Box")!;
    expect(tip.html).toContain("Short tip");
    expect(tip.html).not.toContain("considerably longer");
  });

  it("strips editor ids from the captured example", () => {
    const doc = new DOMParser().parseFromString(CHAPTER, "text/html");
    const blocks = collectBlocks(doc, detectStructure(doc));
    blocks.forEach((b, i) => (b.dataset.blockId = `b-${i}`));
    for (const t of discoverTemplates(blocks)) {
      expect(t.html).not.toContain("data-block-id");
    }
  });

  it("treats a BEM variant as the same component as its base", () => {
    const html = `<!doctype html><html><body><main>
      <div class="callout callout--warning">a</div>
      <div class="callout callout--info">b</div>
    </main></body></html>`;
    const found = discoverTemplates(blocksOf(html));
    expect(found).toHaveLength(1);
    expect(found[0].label).toBe("Callout");
  });

  it("returns nothing for a document with no repeated components", () => {
    const html = `<!doctype html><html><body><main><h1>T</h1><p>Just prose.</p></main></body></html>`;
    expect(discoverTemplates(blocksOf(html))).toHaveLength(0);
  });

  it("marks discovered templates so the palette can group them", () => {
    for (const t of discoverTemplates(blocksOf(CHAPTER))) {
      expect(t.fromDocument).toBe(true);
    }
  });
});
