import { describe, expect, it } from "vitest";
import {
  MIN_FREE_WIDTH, bestFreeSpot, freeBlocksOn, freeRegions, isFree, liftToPage,
  freeSize, moveFree, overlappingFlow, resizeFree, returnToFlow, snapFree,
} from "./freeLayer";
import { serializeForSave } from "./sanitize";

function pageWith(inner: string) {
  const doc = new DOMParser().parseFromString(
    `<div class="page" style="position:relative"><div class="flowwrap">${inner}</div></div>`,
    "text/html");
  const page = doc.querySelector(".page") as HTMLElement;
  Object.defineProperty(page, "offsetWidth", { value: 1080, configurable: true });
  Object.defineProperty(page, "offsetHeight", { value: 1527, configurable: true });
  return { doc, page, wrap: doc.querySelector(".flowwrap") as HTMLElement };
}

describe("lifting a block onto the page", () => {
  it("moves it out of the flow and marks it", () => {
    const { doc, page, wrap } = pageWith(`<p id="a">A</p><p id="b">B</p>`);
    const a = doc.getElementById("a")!;
    expect(liftToPage(doc, a)).toBe(true);

    expect(isFree(a)).toBe(true);
    expect(a.style.position).toBe("absolute");
    expect(a.parentElement).toBe(page);          // a child of the page, not the flow
    expect(wrap.contains(a)).toBe(false);
    // Its own margins would offset it from the coordinates just measured.
    expect(a.style.margin).toBe("0px");
  });

  it("leaves a marker so it can go back between the same neighbours", () => {
    const { doc, wrap } = pageWith(`<p id="a">A</p><p id="b">B</p><p id="c">C</p>`);
    const b = doc.getElementById("b")!;
    liftToPage(doc, b);
    expect(wrap.querySelector(".bookfree-home")).toBeTruthy();

    expect(returnToFlow(b)).toBe(true);
    // Back in the middle, not appended at the end.
    expect(Array.from(wrap.children).map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(isFree(b)).toBe(false);
    expect(b.style.position).toBe("");
  });

  it("refuses when there is no page to lift onto", () => {
    const doc = new DOMParser().parseFromString(`<article><p id="a">A</p></article>`, "text/html");
    expect(liftToPage(doc, doc.getElementById("a")!)).toBe(false);
  });

  it("refuses to lift the same block twice", () => {
    const { doc } = pageWith(`<p id="a">A</p>`);
    const a = doc.getElementById("a")!;
    liftToPage(doc, a);
    expect(liftToPage(doc, a)).toBe(false);
  });

  it("will not be resized below a readable width", () => {
    const { doc } = pageWith(`<p id="a">A</p>`);
    const a = doc.getElementById("a")!;
    liftToPage(doc, a);
    resizeFree(a, 10);
    expect(parseFloat(a.style.width)).toBe(MIN_FREE_WIDTH);
  });

  it("survives the save sanitizer", () => {
    // A lifted block is real layout, not editor chrome — it must reach the file.
    const { doc } = pageWith(`<p id="a">A</p>`);
    liftToPage(doc, doc.getElementById("a")!);
    const saved = serializeForSave(doc);
    expect(saved).toContain("bookfree");
    expect(saved).toContain("position: absolute");
  });

  it("lists what is on a page", () => {
    const { doc, page } = pageWith(`<p id="a">A</p><p id="b">B</p>`);
    liftToPage(doc, doc.getElementById("a")!);
    expect(freeBlocksOn(page)).toHaveLength(1);
  });

  it("reports overlap rather than preventing it", () => {
    // jsdom lays nothing out, so every rect is 0x0 and nothing can overlap —
    // this checks the contract (a list, not a veto) rather than the geometry.
    const { doc } = pageWith(`<p id="a">A</p><p id="b">B</p>`);
    const a = doc.getElementById("a")!;
    liftToPage(doc, a);
    expect(Array.isArray(overlappingFlow(a))).toBe(true);
  });
});

describe("finding the space a page really has", () => {
  it("ignores the box and measures the ink", () => {
    // jsdom lays nothing out, so this checks the CONTRACT — a list of
    // rectangles, never a crash — rather than the geometry, which needs a
    // real browser. The geometry was verified against the built chapter:
    // pages that a box-based measure called full have 320x192 and 320x416
    // gaps on their right-hand side.
    const doc = new DOMParser().parseFromString(
      `<div class="page" style="position:relative"><div class="flowwrap">` +
      `<p>short line</p></div></div>`, "text/html");
    const page = doc.querySelector(".page") as HTMLElement;
    Object.defineProperty(page, "offsetWidth", { value: 1080, configurable: true });
    Object.defineProperty(page, "offsetHeight", { value: 1527, configurable: true });
    const regions = freeRegions(page, 10, 10, 3);
    expect(Array.isArray(regions)).toBe(true);
    regions.forEach((r) => {
      expect(r.width).toBeGreaterThan(0);
      expect(r.height).toBeGreaterThan(0);
    });
  });

  it("asks for a spot big enough, or returns nothing", () => {
    const doc = new DOMParser().parseFromString(
      `<div class="page" style="position:relative"></div>`, "text/html");
    const page = doc.querySelector(".page") as HTMLElement;
    Object.defineProperty(page, "offsetWidth", { value: 200, configurable: true });
    Object.defineProperty(page, "offsetHeight", { value: 200, configurable: true });
    // Nothing on a 200px page can hold a 900px block.
    expect(bestFreeSpot(page, 900, 900)).toBeNull();
  });
});

/** Give an element a fixed on-screen rect, the way a real layout would. */
function rect(el: HTMLElement, left: number, top: number, w: number, h: number) {
  el.getBoundingClientRect = () =>
    ({ left, top, right: left + w, bottom: top + h, width: w, height: h,
       x: left, y: top, toJSON: () => ({}) }) as DOMRect;
}

/**
 * The canvas is a SCALED iframe, so screen pixels and page pixels differ.
 *
 * `moveFree` clamped a screen-pixel width against a page-pixel page width —
 * the height was divided by the scale, the width was not. On a zoomed-out
 * canvas that made the right-hand limit far too generous, and since `.page`
 * is `overflow:hidden`, a block dragged rightwards was cut in half at the
 * edge instead of stopping.
 */
describe("moving a lifted block on a scaled canvas", () => {
  const scaled = () => {
    const { doc, page } = pageWith(`<p id="a">A</p>`);
    const a = doc.getElementById("a")!;
    liftToPage(doc, a);
    rect(page, 0, 0, 540, 763.5);            // rendered at half size
    rect(a, 0, 0, 100, 50);                  // 100 screen px === 200 page px
    return { a, page };
  };

  it("stops the block at the page edge in PAGE pixels", () => {
    const { a } = scaled();
    a.style.left = "0px";
    moveFree(a, 5000, 0);                     // shove it hard right
    // 1080 page-wide minus the block's 200 page-wide, not its 100 screen-wide.
    expect(parseFloat(a.style.left)).toBe(880);
  });

  it("reports size in page pixels, not screen pixels", () => {
    const { a, page } = scaled();
    const { w, h, scale } = freeSize(a, page);
    expect(scale).toBe(0.5);
    expect(w).toBe(200);
    expect(h).toBe(100);
  });

  it("still refuses to move a block that is not lifted", () => {
    const { doc } = pageWith(`<p id="a">A</p>`);
    expect(moveFree(doc.getElementById("a")!, 10, 10)).toBe(false);
  });
});

/**
 * "I want to place it beside the सूत्र box" is an alignment task, and by hand
 * on a scaled canvas it is a pixel hunt. Neighbouring edges are magnets.
 */
describe("snapping a lifted block to its neighbours", () => {
  const withNeighbour = () => {
    const { doc, page } = pageWith(`<p id="a">A</p><p id="n" data-block-id="n">N</p>`);
    const a = doc.getElementById("a")!;
    liftToPage(doc, a);
    rect(page, 0, 0, 1080, 1527);            // 1:1, no zoom
    rect(a, 0, 0, 200, 100);
    rect(doc.getElementById("n")!, 400, 300, 300, 120);   // left 400, right 700
    return { a, page };
  };

  it("pulls a near-miss onto the neighbour's left edge", () => {
    const { a, page } = withNeighbour();
    const s = snapFree(a, page, 404, 303);
    expect(s.left).toBe(400);
    expect(s.top).toBe(300);
    expect(s.guideX).toBe(400);
    expect(s.guideY).toBe(300);
  });

  it("snaps the block's RIGHT edge too, so it can sit against one", () => {
    const { a, page } = withNeighbour();
    // Block is 200 wide; its right edge lands near the neighbour's left (400).
    const s = snapFree(a, page, 197, 0);
    expect(s.left).toBe(200);                 // 200 + 200 === 400
    expect(s.guideX).toBe(400);
  });

  it("leaves a position that is nowhere near an edge alone", () => {
    const { a, page } = withNeighbour();
    const s = snapFree(a, page, 120, 800);
    expect(s.left).toBe(120);
    expect(s.top).toBe(800);
    expect(s.guideX).toBeNull();
    expect(s.guideY).toBeNull();
  });

  it("never snaps a block off the page", () => {
    const { a, page } = withNeighbour();
    const s = snapFree(a, page, 5000, 5000);
    expect(s.left).toBeLessThanOrEqual(880);   // 1080 - 200
    expect(s.top).toBeLessThanOrEqual(1427);   // 1527 - 100
  });

  it("does not treat itself as something to snap to", () => {
    const { doc, page } = pageWith(`<p id="a" data-block-id="a">A</p>`);
    const a = doc.getElementById("a")!;
    liftToPage(doc, a);
    rect(page, 0, 0, 1080, 1527);
    rect(a, 0, 0, 200, 100);
    expect(snapFree(a, page, 300, 300).guideX).toBeNull();
  });
});
