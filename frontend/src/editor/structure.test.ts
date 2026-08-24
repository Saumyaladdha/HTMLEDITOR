import { describe, expect, it } from "vitest";
import { collectBlocks, collectPages, detectStructure, findContentRoot } from "./structure";

/**
 * The generalisation core: can the editor work out how to edit a document it
 * has never seen? Before this existed, pages were `.page`, blocks were
 * "direct children of `.page__cols`", and anything else was uneditable —
 * nothing was selectable, so the editor was simply inert.
 */

function docFrom(html: string): Document {
  const doc = new DOMParser().parseFromString(html, "text/html");
  // jsdom computes display from its default stylesheet, which is enough for
  // the block-level checks; give the page divs a real height so the
  // repeated-fixed-height heuristic has something to measure.
  return doc;
}

const CHAPTER = `<!doctype html><html><body><div class="book">
  <div class="page"><div class="page__cols">
    <p class="text-body">One</p>
    <aside class="tip-box"><div class="tip-box__frame"><p class="text-body">Tip</p></div></aside>
  </div></div>
  <div class="page"><div class="page__cols"><p class="text-body">Two</p></div></div>
</div></body></html>`;

const ARTICLE = `<!doctype html><html><body>
  <div class="wrapper"><div class="inner">
    <article>
      <h1>Title</h1>
      <p>First paragraph.</p>
      <p>Second paragraph.</p>
      <ul><li>a</li><li>b</li></ul>
      <figure><img src="x.png"><figcaption>Cap</figcaption></figure>
      <table><tr><td>cell</td></tr></table>
    </article>
  </div></div>
</body></html>`;

const WORD_EXPORT = `<!doctype html><html><body>
  <div class=WordSection1>
    <p class=MsoNormal><span style='font-family:Calibri'>Para one</span></p>
    <p class=MsoNormal><span style='font-family:Calibri'>Para two</span></p>
  </div>
</body></html>`;

describe("paginated documents", () => {
  it("detects pagination and the pipeline's own block containers", () => {
    const s = detectStructure(docFrom(CHAPTER));
    expect(s.mode).toBe("paginated");
    expect(s.pageSelector).toBe(".page");
    expect(s.blockContainerSelectors).toContain(".page__cols");
  });

  it("finds two pages", () => {
    const doc = docFrom(CHAPTER);
    expect(collectPages(doc, detectStructure(doc))).toHaveLength(2);
  });

  it("keeps authored block granularity — .tip-box stays ONE block, not its inner paragraphs", () => {
    // This is what the profile layer buys: a chapter author deliberately made
    // tip-box a single unit. Generic inference would descend into it.
    const doc = docFrom(CHAPTER);
    const blocks = collectBlocks(doc, detectStructure(doc));
    expect(blocks).toHaveLength(3); // p, aside.tip-box, p
    expect(blocks.some((b) => b.classList.contains("tip-box"))).toBe(true);
    expect(blocks.every((b) => !b.closest(".tip-box__frame"))).toBe(true);
  });
});

describe("ordinary flowing documents", () => {
  it("reports flow mode with no pages", () => {
    const s = detectStructure(docFrom(ARTICLE));
    expect(s.mode).toBe("flow");
    expect(s.pageSelector).toBeNull();
    expect(s.pageHeightPx).toBeNull();
  });

  it("finds <article> as the content root, past wrapper divs", () => {
    expect(findContentRoot(docFrom(ARTICLE)).tagName).toBe("ARTICLE");
  });

  it("infers the blocks a person would point at", () => {
    const doc = docFrom(ARTICLE);
    const blocks = collectBlocks(doc, detectStructure(doc));
    const tags = blocks.map((b) => b.tagName);
    expect(tags).toEqual(["H1", "P", "P", "UL", "FIGURE", "TABLE"]);
  });

  it("treats lists, figures and tables as atomic rather than splitting them", () => {
    const doc = docFrom(ARTICLE);
    const blocks = collectBlocks(doc, detectStructure(doc));
    // No <li>, <img>, <figcaption> or <td> promoted to a top-level block.
    expect(blocks.some((b) => ["LI", "TD", "FIGCAPTION"].includes(b.tagName))).toBe(false);
  });

  it("handles a Word export's wrapper-div soup", () => {
    const doc = docFrom(WORD_EXPORT);
    const s = detectStructure(doc);
    const blocks = collectBlocks(doc, s);
    expect(s.mode).toBe("flow");
    expect(blocks).toHaveLength(2);
    expect(blocks.every((b) => b.tagName === "P")).toBe(true);
  });
});

describe("robustness", () => {
  it("never throws on an empty document", () => {
    const doc = docFrom("<!doctype html><html><body></body></html>");
    expect(() => collectBlocks(doc, detectStructure(doc))).not.toThrow();
  });

  it("ignores script and style elements when collecting blocks", () => {
    const doc = docFrom(
      "<!doctype html><html><body><main><script>var x=1</script><style>p{}</style><p>real</p></main></body></html>",
    );
    const blocks = collectBlocks(doc, detectStructure(doc));
    expect(blocks.map((b) => b.tagName)).toEqual(["P"]);
  });

  it("falls back to inference when declared containers exist but are empty", () => {
    // A document can declare `.page__cols` and leave it empty; an editor with
    // nothing selectable would be useless, so inference takes over.
    const doc = docFrom(
      '<!doctype html><html><body><div class="book"><div class="page"><div class="page__cols"></div></div></div></body></html>',
    );
    expect(() => collectBlocks(doc, detectStructure(doc))).not.toThrow();
  });
});
