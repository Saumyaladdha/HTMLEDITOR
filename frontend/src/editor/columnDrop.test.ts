import { describe, expect, it } from "vitest";
import { pairUnit } from "./dragDrop";

/** jsdom does no layout, so rects are stated outright. */
function rect(el: HTMLElement, top: number, h: number, left = 0, w = 450) {
  el.getBoundingClientRect = () =>
    ({ left, top, right: left + w, bottom: top + h, width: w, height: h,
       x: left, y: top, toJSON: () => ({}) }) as DOMRect;
}

/**
 * The shape a Part-2 page really has: `.acol > .u > block`.
 *
 * Reordering did `target.parentElement.insertBefore(dragged, …)`, and the
 * target's parent is its OWN `.u` — so the dragged block was nested INSIDE
 * the target's wrapper instead of placed as a sibling. It landed in roughly
 * the right area but the wrong slot, and the wrapper's margin guard then
 * covered two blocks at once, so the page moved in a way that matched nothing
 * the drop bar had shown. Reported as "it goes to random places instead of
 * the place I selected".
 */
function columnPage() {
  const doc = new DOMParser().parseFromString(
    `<body><div class="page"><div class="acols">
       <div class="acol">
         <div class="u"><p data-block-id="q1">Q1</p></div>
         <div class="u"><p data-block-id="q2">Q2</p></div>
         <div class="u"><p data-block-id="q3">Q3</p></div>
       </div>
       <div class="acol"></div>
     </div></div></body>`, "text/html");
  const col = doc.querySelector<HTMLElement>(".acol")!;
  const q = (id: string) => doc.querySelector<HTMLElement>(`[data-block-id="${id}"]`)!;
  return { doc, col, q };
}

/** What the drop handler now does: move the WRAPPERS. */
function moveWrapper(target: HTMLElement, dragged: HTMLElement, before: boolean) {
  const t = pairUnit(target);
  const m = pairUnit(dragged);
  if (t === m || m.contains(t)) return;
  t.parentElement?.insertBefore(m, before ? t : t.nextSibling);
}

const order = (col: HTMLElement) =>
  Array.from(col.querySelectorAll("[data-block-id]")).map((b) => b.getAttribute("data-block-id"));

describe("reordering inside a two-column page", () => {
  it("resolves a block to its .u wrapper, not to itself", () => {
    const { col, q } = columnPage();
    const unit = pairUnit(q("q2"));
    expect(unit.className).toBe("u");
    expect(unit.parentElement).toBe(col);
  });

  it("moves a question to the end without nesting it", () => {
    const { col, q } = columnPage();
    moveWrapper(q("q3"), q("q1"), false);
    expect(order(col)).toEqual(["q2", "q3", "q1"]);
    // One block per wrapper, still — the bug produced a .u holding two.
    col.querySelectorAll(".u").forEach((u) =>
      expect(u.querySelectorAll("[data-block-id]").length).toBe(1));
    expect(col.querySelectorAll(".u").length).toBe(3);
  });

  it("moves one upwards just as exactly", () => {
    const { col, q } = columnPage();
    moveWrapper(q("q1"), q("q3"), true);
    expect(order(col)).toEqual(["q3", "q1", "q2"]);
  });

  it("refuses to move a block into itself", () => {
    const { col, q } = columnPage();
    moveWrapper(q("q2"), q("q2"), false);
    expect(order(col)).toEqual(["q1", "q2", "q3"]);
  });
});

/**
 * The empty foot of a column. Dropping there used to fall through to free
 * placement, which LIFTS the block out of the flow — so "move question 2 down
 * into the space" quietly turned it into a floating box that no longer
 * reflowed.
 */
describe("the empty space under a column's last block", () => {
  it("is recognised as below the last block", () => {
    const { col, q } = columnPage();
    rect(q("q1"), 0, 100);
    rect(q("q2"), 110, 100);
    rect(q("q3"), 220, 100);
    const last = Array.from(col.querySelectorAll<HTMLElement>("[data-block-id]"))
      .filter((b) => b.dataset.blockId !== "q2")
      .pop()!;
    expect(last.dataset.blockId).toBe("q3");
    expect(700 > last.getBoundingClientRect().bottom).toBe(true);   // a drop at y=700
  });

  it("appends to the column in the FLOW, leaving nothing absolute", () => {
    const { col, q } = columnPage();
    moveWrapper(q("q3"), q("q2"), false);      // what the drop plan resolves to
    expect(order(col)).toEqual(["q1", "q3", "q2"]);
    expect(q("q2").style.position).toBe("");   // never lifted
    expect(col.querySelectorAll(".u").length).toBe(3);
  });
});
