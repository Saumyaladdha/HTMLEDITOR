import { describe, expect, it } from "vitest";
import { attachDragReorder } from "./dragDrop";
import { detectStructure } from "./structure";
import { stampBlockIds } from "./selection";

function rect(el: HTMLElement, top: number, h: number, left = 0, w = 450) {
  el.getBoundingClientRect = () =>
    ({ left, top, right: left + w, bottom: top + h, width: w, height: h,
       x: left, y: top, toJSON: () => ({}) }) as DOMRect;
}

function dt() {
  const store: Record<string, string> = {};
  return {
    effectAllowed: "", dropEffect: "",
    setData: (k: string, v: string) => { store[k] = v; },
    getData: (k: string) => store[k] ?? "",
    setDragImage: () => {},
  } as unknown as DataTransfer;
}

function fire(el: Element, type: string, extra: Record<string, unknown> = {}) {
  const doc = el.ownerDocument!;
  const ev = doc.createEvent("Event") as never as Event & Record<string, unknown>;
  (ev as never as { initEvent: (t: string, b: boolean, c: boolean) => void })
    .initEvent(type, true, true);
  for (const [k, v] of Object.entries(extra)) {
    try { (ev as Record<string, unknown>)[k] = v; }
    catch { Object.defineProperty(ev, k, { value: v }); }
  }
  el.dispatchEvent(ev);
  return ev;
}

/**
 * MOVING A BLOCK DOWN MUST WORK AS WELL AS MOVING IT UP.
 *
 * Reported as "block i able to move upwards but downward why i am not able
 * to". Up and down are not symmetric in the DOM: an upward move inserts
 * BEFORE the target, which is one call; a downward move inserts before the
 * target's next sibling, and the moving block is often itself that sibling —
 * so a naive implementation removes the node and then computes the insertion
 * point from a reference that has just shifted.
 */
function column(ids: string[], heights = 100) {
  const doc = new DOMParser().parseFromString(
    `<body><div class="page"><div class="acols">
       <div class="acol">${ids.map((id) =>
         `<div class="u"><p id="${id}">${id}</p></div>`).join("")}</div>
       <div class="acol"></div>
     </div></div></body>`, "text/html");
  const structure = detectStructure(doc);
  stampBlockIds(doc, structure);
  const col = doc.querySelector<HTMLElement>(".acol")!;
  rect(doc.querySelector<HTMLElement>(".page")!, 0, 1432);
  rect(col, 0, 1432);
  ids.forEach((id, i) => rect(doc.getElementById(id) as HTMLElement,
                             i * (heights + 10), heights));
  return { doc, structure, col, ids };
}

function order(col: HTMLElement): string[] {
  return Array.from(col.querySelectorAll("p")).map((p) => p.id);
}

/** Drops `moveId` onto `targetId`, aiming at the given half of it. */
function drag(doc: Document, moveId: string, targetId: string, half: "top" | "bottom") {
  let moved = 0;
  attachDragReorder(doc, detectStructure(doc), () => { moved++; });
  const m = doc.getElementById(moveId) as HTMLElement;
  const t = doc.getElementById(targetId) as HTMLElement;
  const r = t.getBoundingClientRect();
  const y = half === "top" ? r.top + r.height * 0.2 : r.top + r.height * 0.8;
  const transfer = dt();
  fire(m, "dragstart", { dataTransfer: transfer });
  fire(t, "dragover", { dataTransfer: transfer, clientX: 200, clientY: y });
  fire(t, "drop", { dataTransfer: transfer, clientX: 200, clientY: y });
  return moved;
}

describe("moving a block UP", () => {
  it("puts it above the target", () => {
    const { doc, col } = column(["a", "b", "c", "d"]);
    expect(drag(doc, "d", "b", "top")).toBe(1);
    expect(order(col)).toEqual(["a", "d", "b", "c"]);
  });

  it("puts it below the target when aimed at the lower half", () => {
    const { doc, col } = column(["a", "b", "c", "d"]);
    drag(doc, "d", "b", "bottom");
    expect(order(col)).toEqual(["a", "b", "d", "c"]);
  });
});

describe("moving a block DOWN", () => {
  it("puts it below a later block", () => {
    const { doc, col } = column(["a", "b", "c", "d"]);
    expect(drag(doc, "a", "c", "bottom")).toBe(1);
    expect(order(col)).toEqual(["b", "c", "a", "d"]);
  });

  it("puts it above a later block when aimed at the upper half", () => {
    const { doc, col } = column(["a", "b", "c", "d"]);
    drag(doc, "a", "c", "top");
    expect(order(col)).toEqual(["b", "a", "c", "d"]);
  });

  it("moves past its immediate neighbour", () => {
    // The awkward case: the moving block IS the target's previous sibling,
    // so `target.nextSibling` is computed while the moving node is still in
    // the tree between them.
    const { doc, col } = column(["a", "b", "c"]);
    drag(doc, "a", "b", "bottom");
    expect(order(col)).toEqual(["b", "a", "c"]);
  });

  it("reaches the very end of the column", () => {
    const { doc, col } = column(["a", "b", "c", "d"]);
    drag(doc, "a", "d", "bottom");
    expect(order(col)).toEqual(["b", "c", "d", "a"]);
  });

  it("is a no-op when dropped on itself", () => {
    const { doc, col } = column(["a", "b", "c"]);
    drag(doc, "b", "b", "bottom");
    expect(order(col)).toEqual(["a", "b", "c"]);
  });
});
