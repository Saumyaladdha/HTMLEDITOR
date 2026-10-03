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
  const ev = doc.createEvent("Event") as any;
  ev.initEvent(type, true, true);
  // `target` is read-only and set by dispatchEvent — never assign it.
  for (const [k, v] of Object.entries(extra)) {
    try { (ev as any)[k] = v; } catch { Object.defineProperty(ev, k, { value: v }); }
  }
  el.dispatchEvent(ev);
  return ev;
}

describe("a full drag on a two-column page", () => {
  it("moves a single block from one slot to another", () => {
    const doc = new DOMParser().parseFromString(
      `<body><div class="page"><div class="acols">
         <div class="acol">
           <div class="u"><p id="a">AAA</p></div>
           <div class="u"><p id="b">BBB</p></div>
           <div class="u"><p id="c">CCC</p></div>
         </div><div class="acol"></div>
       </div></div></body>`, "text/html");
    const structure = detectStructure(doc);
    stampBlockIds(doc, structure);
    let moved = 0;
    attachDragReorder(doc, structure, () => { moved++; });

    const col = doc.querySelector<HTMLElement>(".acol")!;
    const A = doc.getElementById("a") as HTMLElement;
    const C = doc.getElementById("c") as HTMLElement;
    rect(doc.querySelector<HTMLElement>(".page")!, 0, 1432);
    rect(col, 0, 400);
    rect(A, 0, 100);
    rect(doc.getElementById("b") as HTMLElement, 110, 100);
    rect(C, 220, 100);

    const transfer = dt();
    fire(A, "dragstart", { dataTransfer: transfer });
    fire(C, "dragover", { dataTransfer: transfer, clientX: 200, clientY: 300 });
    fire(C, "drop", { dataTransfer: transfer, clientX: 200, clientY: 300 });

    const order = Array.from(col.querySelectorAll("[data-block-id]")).map((n) => n.id);
    expect(order).toEqual(["b", "c", "a"]);
  });
});

/**
 * Dropping into the visible empty band at the FOOT of a page.
 *
 * `.acols` is `display:flex` with no height, so it is only as tall as its
 * content: the blank 800px between where the columns stop and the foot of the
 * sheet belongs to `.page`, and `closest(".acol")` returns null there. Two
 * separate things then went wrong:
 *
 *   - the column-foot branch required a container, so it never ran, and the
 *     drop fell through to FREE placement — the block landed "at the corner"
 *     as an absolutely-positioned box instead of in the flow;
 *   - the drop handler itself returned early without a container, so even a
 *     drawn drop bar was thrown away and the block sprang back.
 */
describe("a drop in the blank band under the columns", () => {
  const page = () => {
    const doc = new DOMParser().parseFromString(
      `<body><div class="page"><div class="acols">
         <div class="acol">
           <div class="u"><p id="q1">Q1</p></div>
           <div class="u"><p id="q2">Q2</p></div>
         </div>
         <div class="acol"><div class="u"><p id="q3">Q3</p></div></div>
       </div></div></body>`, "text/html");
    const structure = detectStructure(doc);
    stampBlockIds(doc, structure);
    const pg = doc.querySelector<HTMLElement>(".page")!;
    const cols = Array.from(doc.querySelectorAll<HTMLElement>(".acol"));
    rect(pg, 0, 1432, 0, 944);
    // Columns are only as tall as their content — 300px of a 1432px sheet.
    rect(cols[0], 0, 300, 0, 460);
    rect(cols[1], 0, 200, 484, 460);
    rect(doc.getElementById("q1") as HTMLElement, 0, 140, 0, 460);
    rect(doc.getElementById("q2") as HTMLElement, 150, 140, 0, 460);
    rect(doc.getElementById("q3") as HTMLElement, 0, 190, 484, 460);
    return { doc, structure, cols };
  };

  it("finds the column that owns the band, by position", async () => {
    const { doc, cols } = page();
    const { columnUnder } = await import("./dragDrop");
    const pg = doc.querySelector<HTMLElement>(".page")!;
    expect(columnUnder(pg, 200)).toBe(cols[0]);     // left column's band
    expect(columnUnder(pg, 700)).toBe(cols[1]);     // right column's band
  });

  it("moves the block into the flow, not to a corner", () => {
    const { doc, structure, cols } = page();
    let moved = 0;
    attachDragReorder(doc, structure, () => { moved++; });
    const q3 = doc.getElementById("q3") as HTMLElement;
    const pg = doc.querySelector<HTMLElement>(".page")!;

    const transfer = dt();
    fire(q3, "dragstart", { dataTransfer: transfer });
    // Deep in the empty band under the LEFT column — on .page, no container.
    fire(pg, "dragover", { dataTransfer: transfer, clientX: 200, clientY: 900 });
    fire(pg, "drop", { dataTransfer: transfer, clientX: 200, clientY: 900 });

    expect(moved).toBe(1);
    expect(Array.from(cols[0].querySelectorAll("[data-block-id]")).map((n) => n.id))
      .toEqual(["q1", "q2", "q3"]);
    expect(q3.style.position).toBe("");             // never lifted
    expect(q3.closest(".acol")).toBe(cols[0]);
    // One block per wrapper still.
    cols[0].querySelectorAll(".u").forEach((u) =>
      expect(u.querySelectorAll("[data-block-id]").length).toBe(1));
  });
});

/**
 * Multi-select could already delete, duplicate and move-to-page in bulk, but
 * it had no presence in `dragDrop.ts` at all — so selecting six blocks and
 * dragging one moved that one and left the other five behind.
 */
describe("dragging a multi-selection", () => {
  const page = () => {
    const doc = new DOMParser().parseFromString(
      `<body><div class="page"><div class="acols"><div class="acol">
         <div class="u"><p data-block-id="a">A</p></div>
         <div class="u"><p data-block-id="b">B</p></div>
         <div class="u"><p data-block-id="c">C</p></div>
         <div class="u"><p data-block-id="d">D</p></div>
       </div><div class="acol"></div></div></div></body>`, "text/html");
    const structure = detectStructure(doc);
    stampBlockIds(doc, structure);
    const col = doc.querySelector<HTMLElement>(".acol")!;
    rect(doc.querySelector<HTMLElement>(".page")!, 0, 1432, 0, 944);
    rect(col, 0, 400, 0, 460);
    (["a", "b", "c", "d"] as const).forEach((id, i) =>
      rect(doc.querySelector<HTMLElement>(`[data-block-id="${id}"]`)!, i * 100, 90, 0, 460));
    return { doc, structure, col };
  };
  const order = (col: HTMLElement) =>
    Array.from(col.querySelectorAll("[data-block-id]"))
      .map((n) => n.getAttribute("data-block-id"));

  it("moves every selected block, keeping page order", () => {
    const { doc, structure, col } = page();
    let moved = 0;
    // A and B selected; B is the one grabbed.
    attachDragReorder(doc, structure, () => { moved++; }, () => ["b", "a"]);
    const B = doc.querySelector<HTMLElement>('[data-block-id="b"]')!;
    const D = doc.querySelector<HTMLElement>('[data-block-id="d"]')!;

    const t = dt();
    fire(B, "dragstart", { dataTransfer: t });
    fire(D, "dragover", { dataTransfer: t, clientX: 200, clientY: 380 });
    fire(D, "drop", { dataTransfer: t, clientX: 200, clientY: 380 });

    expect(moved).toBe(1);
    // A before B, even though B was clicked first — page order, not click
    // order, or the content shuffles.
    expect(order(col)).toEqual(["c", "d", "a", "b"]);
    col.querySelectorAll(".u").forEach((u) =>
      expect(u.querySelectorAll("[data-block-id]").length).toBe(1));
  });

  it("moves only the grabbed block when it is not in the selection", () => {
    const { doc, structure, col } = page();
    attachDragReorder(doc, structure, () => {}, () => ["c", "d"]);
    const A = doc.querySelector<HTMLElement>('[data-block-id="a"]')!;
    const D = doc.querySelector<HTMLElement>('[data-block-id="d"]')!;
    const t = dt();
    fire(A, "dragstart", { dataTransfer: t });
    fire(D, "dragover", { dataTransfer: t, clientX: 200, clientY: 380 });
    fire(D, "drop", { dataTransfer: t, clientX: 200, clientY: 380 });
    expect(order(col)).toEqual(["b", "c", "d", "a"]);
  });

  it("ignores a selection of one", () => {
    const { doc, structure, col } = page();
    attachDragReorder(doc, structure, () => {}, () => ["a"]);
    const A = doc.querySelector<HTMLElement>('[data-block-id="a"]')!;
    const C = doc.querySelector<HTMLElement>('[data-block-id="c"]')!;
    const t = dt();
    fire(A, "dragstart", { dataTransfer: t });
    fire(C, "dragover", { dataTransfer: t, clientX: 200, clientY: 280 });
    fire(C, "drop", { dataTransfer: t, clientX: 200, clientY: 280 });
    expect(order(col)).toEqual(["b", "c", "a", "d"]);
  });
});
