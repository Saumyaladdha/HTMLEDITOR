import { afterEach, describe, expect, it } from "vitest";
import { collectBlocks, detectStructure, findContentRoot } from "./structure";
import { stampBlockIds } from "./selection";

/**
 * The editor operates on a document inside an IFRAME, which is a different
 * JavaScript realm from the code doing the operating.
 *
 * That distinction silently broke everything once: the block walker filtered
 * children with `c instanceof HTMLElement`, and an element created by the
 * iframe's window is not an instance of the PARENT window's HTMLElement. The
 * check was therefore always false, every child was discarded, and the editor
 * stamped zero blocks — nothing could be clicked, selected or typed into.
 *
 * Every other test in this suite builds documents with DOMParser, which
 * produces elements in the same realm as the test itself, so `instanceof`
 * held and all of them passed while the real editor was completely inert.
 *
 * These tests use a real iframe specifically so that cross-realm assumptions
 * cannot hide. Any DOM helper that must work on the canvas belongs here.
 */

const frames: HTMLIFrameElement[] = [];

afterEach(() => {
  frames.splice(0).forEach((f) => f.remove());
});

/** A document in its OWN realm, written the same way BookEditor writes the
 * canvas (document.open/write/close on an iframe). */
function iframeDocument(html: string): Document {
  const frame = document.createElement("iframe");
  document.body.appendChild(frame);
  frames.push(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  return doc;
}

const ARTICLE = `<!doctype html><html><body>
  <div class="outer"><div class="inner">
    <h1>Title</h1>
    <p>First paragraph.</p>
    <p>Second paragraph.</p>
    <ul><li>a</li><li>b</li></ul>
  </div></div>
</body></html>`;

describe("cross-realm DOM handling", () => {
  it("elements really are from a different realm (guards the premise)", () => {
    const doc = iframeDocument(ARTICLE);
    const el = doc.body.firstElementChild!;
    // The exact condition that broke the editor. If this ever becomes true,
    // the test environment has stopped modelling a real iframe and these
    // tests no longer prove anything.
    expect(el instanceof HTMLElement).toBe(false);
    expect(el.nodeType).toBe(1);
  });

  it("finds a content root past wrapper divs", () => {
    const doc = iframeDocument(ARTICLE);
    expect(findContentRoot(doc).className).toBe("inner");
  });

  it("collects blocks in an iframe document", () => {
    const doc = iframeDocument(ARTICLE);
    const blocks = collectBlocks(doc, detectStructure(doc));
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.map((b) => b.tagName)).toEqual(["H1", "P", "P", "UL"]);
  });

  it("stamps every block with a data-block-id", () => {
    const doc = iframeDocument(ARTICLE);
    stampBlockIds(doc, detectStructure(doc));
    // This is the assertion that would have caught the bug: it was 0.
    expect(doc.querySelectorAll("[data-block-id]").length).toBe(4);
  });

  it("stamps a paginated document in an iframe too", () => {
    const doc = iframeDocument(`<!doctype html><html><body><div class="book">
      <div class="page"><div class="page__cols">
        <p class="text-body">One</p><p class="text-body">Two</p>
      </div></div>
    </div></body></html>`);
    const structure = detectStructure(doc);
    stampBlockIds(doc, structure);
    expect(structure.mode).toBe("paginated");
    expect(doc.querySelectorAll("[data-block-id]").length).toBe(2);
  });

  it("re-stamping is stable — ids are not duplicated or renumbered", () => {
    const doc = iframeDocument(ARTICLE);
    const structure = detectStructure(doc);
    stampBlockIds(doc, structure);
    const first = Array.from(doc.querySelectorAll("[data-block-id]")).map(
      (el) => (el as HTMLElement).dataset.blockId,
    );
    stampBlockIds(doc, structure);
    const second = Array.from(doc.querySelectorAll("[data-block-id]")).map(
      (el) => (el as HTMLElement).dataset.blockId,
    );
    expect(second).toEqual(first);
  });

  it("a block is reachable from a click target inside it", () => {
    const doc = iframeDocument(ARTICLE);
    stampBlockIds(doc, detectStructure(doc));
    // What the click handler does: closest('[data-block-id]') from the
    // deepest node under the pointer.
    const textNodeParent = doc.querySelectorAll("p")[1];
    expect(textNodeParent.closest("[data-block-id]")).toBe(textNodeParent);
  });
});
