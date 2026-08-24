import { describe, expect, it } from "vitest";
import { parseDocument, serializeDocument, renderSinglePageHtml } from "./model";

/**
 * The parse -> serialize round trip.
 *
 * Every one of this editor's worst bugs has been the same failure: content
 * that survives on screen but is silently dropped when the model is
 * serialized back to HTML. `.page__full` blocks (the chapter title) vanished
 * on the first undo. The page's own `style="--fs-base"` was reset to the CSS
 * default on every round trip. A ~3MB shared <style> block sitting between
 * two pages was discarded entirely, blanking the canvas.
 *
 * All three were invisible until a user hit undo and lost work. These tests
 * are the safety net that makes the parser safe to change.
 */

const CHAPTER = `<!doctype html>
<html lang="hi">
<head><meta charset="utf-8"><style>.page{width:1240px;height:1754px}</style></head>
<body>
<div class="book">
<div class="page" style="--fs-base: 20px">
  <div class="page__full">
    <div class="title-1"><span class="title-1__chapter">अध्याय 1</span><span class="title-1__text">विद्युत आवेश</span></div>
  </div>
  <div class="page__cols">
    <p class="text-body">पहला अनुच्छेद।</p>
    <figure class="figure"><img class="figure__img" src="a.png"><figcaption class="fig-cap"><span class="fig-cap__text">कैप्शन</span></figcaption></figure>
  </div>
</div>
<style id="shared-between-pages">.extra{color:red}</style>
<div class="page page--wide" style="--fs-base: 18px">
  <div class="page__cols"><p class="text-body">दूसरा पन्ना।</p></div>
</div>
</div>
</body>
</html>`;

/** Compares DOM shape rather than exact bytes: attribute order and whitespace
 * between tags are not meaningful, but presence of every element, its
 * attributes and its text absolutely are. */
function domSignature(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const parts: string[] = [];
  const walk = (el: Element) => {
    const attrs = Array.from(el.attributes)
      .filter((a) => a.name !== "data-page-id" && a.name !== "data-block-id")
      .map((a) => `${a.name}=${a.value}`)
      .sort()
      .join(",");
    parts.push(`${el.tagName}[${attrs}]`);
    Array.from(el.children).forEach(walk);
  };
  walk(doc.documentElement);
  parts.push("TEXT:" + (doc.body.textContent ?? "").replace(/\s+/g, " ").trim());
  return parts.join("|");
}

describe("parseDocument / serializeDocument round trip", () => {
  it("preserves every element, attribute and text node", () => {
    const model = parseDocument(CHAPTER);
    const out = serializeDocument(model);
    expect(domSignature(out)).toBe(domSignature(CHAPTER));
  });

  it("is stable across repeated round trips (undo/redo applies this many times)", () => {
    let html = CHAPTER;
    for (let i = 0; i < 5; i++) html = serializeDocument(parseDocument(html));
    expect(domSignature(html)).toBe(domSignature(CHAPTER));
  });

  it("keeps .page__full content — the chapter title used to vanish on first undo", () => {
    const out = serializeDocument(parseDocument(CHAPTER));
    expect(out).toContain("title-1__chapter");
    expect(out).toContain("अध्याय 1");
    expect(out).toContain("विद्युत आवेश");
  });

  it("keeps each page's own --fs-base instead of resetting it to the CSS default", () => {
    const out = serializeDocument(parseDocument(CHAPTER));
    expect(out).toContain("--fs-base: 20px");
    expect(out).toContain("--fs-base: 18px");
  });

  it("keeps a page's other classes, e.g. layout variants", () => {
    const out = serializeDocument(parseDocument(CHAPTER));
    expect(out).toMatch(/class="page page--wide"/);
  });

  it("keeps content that sits BETWEEN two pages — a shared stylesheet used to be dropped", () => {
    const out = serializeDocument(parseDocument(CHAPTER));
    expect(out).toContain('id="shared-between-pages"');
    expect(out).toContain(".extra{color:red}");
  });

  it("parses the expected structure", () => {
    const model = parseDocument(CHAPTER);
    expect(model.pages).toHaveLength(2);
    expect(model.pages[0].fullBlocks).toHaveLength(1);
    expect(model.pages[0].blocks).toHaveLength(2);
    expect(model.pages[1].blocks).toHaveLength(1);
  });

  it("shares one shell across snapshots rather than copying it per parse", () => {
    // The undo stack holds up to 50 snapshots and `prefix` contains the whole
    // inlined stylesheet — several MB in a real chapter. Structurally-equal
    // but distinct strings meant ~50 copies were retained at once.
    const a = parseDocument(CHAPTER);
    const b = parseDocument(CHAPTER);
    expect(a.prefix).toBe(b.prefix); // identity, not just equality
    expect(a.suffix).toBe(b.suffix);
  });
});

describe("documents that are not paginated chapters", () => {
  const ARTICLE = `<!doctype html>
<html><head><title>Post</title></head>
<body><article><h1>Hello</h1><p>Just an ordinary document.</p></article></body></html>`;

  it("round-trips ordinary HTML without pages", () => {
    const model = parseDocument(ARTICLE);
    expect(model.pages).toHaveLength(0);
    expect(domSignature(serializeDocument(model))).toBe(domSignature(ARTICLE));
  });

  it("does not lose content when there is no .page wrapper at all", () => {
    const out = serializeDocument(parseDocument(ARTICLE));
    expect(out).toContain("Just an ordinary document.");
    expect(out).toContain("<h1>Hello</h1>");
  });
});

describe("renderSinglePageHtml", () => {
  it("produces a standalone document containing only the requested page", () => {
    const model = parseDocument(CHAPTER);
    const page2 = renderSinglePageHtml(model, 1);
    expect(page2).toContain("दूसरा पन्ना।");
    expect(page2).not.toContain("पहला अनुच्छेद।");
    expect(page2).toContain(".page{width:1240px"); // shell/CSS preserved
  });

  it("returns empty string for an out-of-range index rather than throwing", () => {
    expect(renderSinglePageHtml(parseDocument(CHAPTER), 99)).toBe("");
  });
});

describe("adversarial input", () => {
  it("is not fooled by markup quoted inside a CSS comment", () => {
    // A real packaged chapter's inlined CSS contains build documentation that
    // literally quotes `<div class="page">` as example markup. A string-search
    // parser treated that as a real page boundary.
    const tricky = `<!doctype html><html><head><style>
      /* Example: <div class="page"><div class="page__cols"></div></div> */
    </style></head><body><div class="book">
      <div class="page"><div class="page__cols"><p class="text-body">real</p></div></div>
    </div></body></html>`;
    const model = parseDocument(tricky);
    expect(model.pages).toHaveLength(1);
    expect(serializeDocument(model)).toContain("real");
  });

  it("survives an empty body", () => {
    const empty = "<!doctype html><html><head></head><body></body></html>";
    expect(() => serializeDocument(parseDocument(empty))).not.toThrow();
  });
});
