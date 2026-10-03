import { describe, expect, it } from "vitest";
import { attachDragReorder } from "./dragDrop";
import { detectStructure } from "./structure";
import { stampBlockIds } from "./selection";
import { serializeForSave } from "./sanitize";

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
  const ev = doc.createEvent("Event") as never as Event;
  (ev as never as { initEvent: (t: string, b: boolean, c: boolean) => void })
    .initEvent(type, true, true);
  for (const [k, v] of Object.entries(extra)) {
    try { (ev as unknown as Record<string, unknown>)[k] = v; }
    catch { Object.defineProperty(ev, k, { value: v }); }
  }
  el.dispatchEvent(ev);
}

/**
 * THE LANDING PREVIEW.
 *
 * It is a clone of the dragged block, shown where the block will land. Parked
 * on doc.body it matched none of the `.acol`-scoped rules that size text in
 * this book, so it re-flowed at the wrong font size inside a borrowed width
 * and appeared as a narrow ribbon of text overlapping the real paragraph.
 */
function page() {
  const doc = new DOMParser().parseFromString(
    `<body><div class="page"><div class="acols">
       <div class="acol">
         <div class="u"><p class="q" id="a">AAA</p></div>
         <div class="u"><p class="q" id="b">BBB</p></div>
       </div>
       <div class="acol"><div class="u"><p class="q" id="c">CCC</p></div></div>
     </div></div></body>`, "text/html");
  const structure = detectStructure(doc);
  stampBlockIds(doc, structure);
  const cols = Array.from(doc.querySelectorAll<HTMLElement>(".acol"));
  rect(doc.querySelector<HTMLElement>(".page")!, 0, 1432);
  rect(cols[0], 0, 1432, 0, 450);
  rect(cols[1], 0, 1432, 460, 450);
  rect(doc.getElementById("a") as HTMLElement, 0, 100);
  rect(doc.getElementById("b") as HTMLElement, 110, 100);
  rect(doc.getElementById("c") as HTMLElement, 0, 100, 460);
  return { doc, structure, cols };
}

function hover(doc: Document, moveId: string, targetId: string) {
  attachDragReorder(doc, detectStructure(doc), () => {});
  const m = doc.getElementById(moveId) as HTMLElement;
  const t = doc.getElementById(targetId) as HTMLElement;
  const r = t.getBoundingClientRect();
  const transfer = dt();
  fire(m, "dragstart", { dataTransfer: transfer });
  fire(t, "dragover", {
    dataTransfer: transfer,
    clientX: r.left + 10,
    clientY: r.top + r.height * 0.8,
  });
  return doc.getElementById("__drag_ghost__");
}

describe("where the landing preview lives", () => {
  it("sits inside the target's own column, so the column's CSS applies", () => {
    const { doc, cols } = page();
    const ghost = hover(doc, "c", "b");
    expect(ghost).not.toBeNull();
    // Not doc.body — that is what broke the preview's text sizing.
    expect(ghost!.closest(".acol")).toBe(cols[0]);
    expect(ghost!.parentElement).not.toBe(doc.body);
  });

  it("follows the drag into the other column", () => {
    const { doc, cols } = page();
    const ghost = hover(doc, "a", "c");
    expect(ghost!.closest(".acol")).toBe(cols[1]);
  });

  it("is a copy, and carries no block id of its own", () => {
    const { doc } = page();
    const ghost = hover(doc, "c", "b");
    expect(ghost!.textContent).toBe("CCC");
    // Two elements with the same data-block-id would make every lookup
    // ambiguous — selection, drag and reorder all key off it.
    expect(ghost!.hasAttribute("data-block-id")).toBe(false);
    expect(doc.querySelectorAll('[data-block-id]')).toHaveLength(3);
  });

  it("takes the width of the block it will land beside", () => {
    const { doc } = page();
    const ghost = hover(doc, "c", "b");
    expect(ghost!.style.width).toBe("450px");
  });

  it("NEVER reaches a save", () => {
    // It now lives in a column rather than on doc.body, so an autosave
    // landing mid-drag would write a duplicate of the dragged block into the
    // chapter as content.
    const { doc } = page();
    const ghost = hover(doc, "c", "b");
    expect(ghost).not.toBeNull();
    const saved = serializeForSave(doc);
    expect(saved).not.toContain("__drag_ghost__");
    // ...and the duplicate goes with it: three paragraphs, not four.
    expect(saved.match(/class="q"/g) ?? []).toHaveLength(3);
  });
});
