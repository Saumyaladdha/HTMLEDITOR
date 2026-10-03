import { describe, expect, it } from "vitest";
import { FREE_DROP_GAP, dropFreeAt, isOpenSpace } from "./dragDrop";
import { isFree } from "./freeLayer";
import { serializeForSave } from "./sanitize";

/** jsdom does no layout, so every rect is stated outright. */
function rect(el: HTMLElement, left: number, top: number, w: number, h: number) {
  el.getBoundingClientRect = () =>
    ({ left, top, right: left + w, bottom: top + h, width: w, height: h,
       x: left, y: top, toJSON: () => ({}) }) as DOMRect;
}

/**
 * "There is so much space, but when I try to place something the whole
 * content shifts and readjusts."
 *
 * Dropping into blank space used to mean "reorder next to whichever block is
 * nearest", so a block dragged into an obviously empty half-page was inserted
 * into the flow and everything below it moved to make room. Far from every
 * block, the gesture means "put it HERE".
 */
function page() {
  const doc = new DOMParser().parseFromString(
    `<body><div class="page" style="position:relative"><div class="flowwrap">
       <div class="u"><p id="a" data-block-id="a">A</p></div>
       <div class="u"><p id="b" data-block-id="b">B</p></div>
     </div></div></body>`, "text/html");
  const pg = doc.querySelector<HTMLElement>(".page")!;
  Object.defineProperty(pg, "offsetWidth", { value: 1080, configurable: true });
  Object.defineProperty(pg, "offsetHeight", { value: 1527, configurable: true });
  rect(pg, 0, 0, 1080, 1527);
  rect(doc.getElementById("a") as HTMLElement, 0, 0, 944, 100);
  rect(doc.getElementById("b") as HTMLElement, 0, 110, 944, 100);
  return { doc, pg, a: doc.getElementById("a") as HTMLElement };
}

describe("telling open space from a gap between blocks", () => {
  it("calls the empty lower half open", () => {
    const { pg } = page();
    expect(isOpenSpace(pg, 500, 900, null)).toBe(true);
  });

  it("does not call the gap between two blocks open", () => {
    const { pg } = page();
    // 5px below block A's bottom edge — a reorder, not a placement.
    expect(isOpenSpace(pg, 500, 105, null)).toBe(false);
  });

  it("keeps reordering available right up to the threshold", () => {
    const { pg } = page();
    expect(isOpenSpace(pg, 500, 210 + FREE_DROP_GAP - 1, null)).toBe(false);
    expect(isOpenSpace(pg, 500, 210 + FREE_DROP_GAP + 1, null)).toBe(true);
  });

  it("ignores the block being dragged when judging the space", () => {
    const { pg } = page();
    // Sitting right on top of block B, which is the one being moved.
    expect(isOpenSpace(pg, 500, 150, "b")).toBe(true);
    expect(isOpenSpace(pg, 500, 150, null)).toBe(false);
  });

  it("calls an empty page nothing at all rather than open", () => {
    const doc = new DOMParser().parseFromString(
      `<div class="page"></div>`, "text/html");
    const pg = doc.querySelector<HTMLElement>(".page")!;
    expect(isOpenSpace(pg, 100, 100, null)).toBe(false);
  });
});

describe("placing a block where it was dropped", () => {
  it("lifts it out of the flow at the cursor", () => {
    const { doc, a } = page();
    expect(dropFreeAt(doc, a, 700, 900)).toBe(true);
    expect(isFree(a)).toBe(true);
    expect(a.style.position).toBe("absolute");
    // Centred on the cursor: 700 - 944/2 clamps to the page, 900 - 50.
    expect(parseFloat(a.style.top)).toBe(850);
  });

  it("leaves the other blocks exactly where they were", () => {
    const { doc, a } = page();
    const b = doc.getElementById("b")!;
    const before = b.parentElement;
    dropFreeAt(doc, a, 700, 900);
    expect(b.parentElement).toBe(before);          // nothing shifted
    expect(doc.querySelector(".flowwrap")!.contains(a)).toBe(false);
    // The emptied wrapper stays, holding the hidden marker that makes
    // "return to the flow" put the block back between the same neighbours.
    expect(doc.querySelectorAll(".bookfree-home").length).toBe(1);
  });

  it("keeps it on the page rather than off the edge", () => {
    const { doc, a } = page();
    dropFreeAt(doc, a, 5000, 5000);
    expect(parseFloat(a.style.left)).toBeLessThanOrEqual(1080);
    expect(parseFloat(a.style.top)).toBeLessThanOrEqual(1527);
  });

  it("refuses when there is no page to place it on", () => {
    const doc = new DOMParser().parseFromString(
      `<div class="flowwrap"><p id="a" data-block-id="a">A</p></div>`, "text/html");
    expect(dropFreeAt(doc, doc.getElementById("a") as HTMLElement, 10, 10)).toBe(false);
  });

  it("does not write the drop ghost into a save", () => {
    const { doc } = page();
    const ghost = doc.createElement("div");
    ghost.id = "__free_drop_indicator__";
    doc.body.appendChild(ghost);
    expect(serializeForSave(doc)).not.toContain("__free_drop_indicator__");
  });
});
