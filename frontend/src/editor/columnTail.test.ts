import { describe, expect, it } from "vitest";
import { attachDragReorder } from "./dragDrop";
import { detectStructure } from "./structure";
import { stampBlockIds } from "./selection";
import { CHROME_STYLE_ID, ED, injectChromeStyles } from "./chrome";

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
  for (const [k, v] of Object.entries(extra)) {
    try { (ev as any)[k] = v; } catch { Object.defineProperty(ev, k, { value: v }); }
  }
  el.dispatchEvent(ev);
  return ev;
}

/**
 * THE EMPTY FOOT OF A COLUMN IS A REAL PLACE.
 *
 * `.page` was made to grow so content could not vanish, but the columns
 * inside it stayed content-sized: below the last block there was no element
 * at all, so there was nothing to hover, nothing to drop onto and nowhere
 * for a caret to go. Several hundred pixels of visible emptiness that the
 * editor did not believe existed.
 */
describe("the chrome that gives a column its full height", () => {
  it("does not touch the page's layout mode or the columns' height", () => {
    // Both attempts at doing so were reverted. A pixel min-height made any
    // page with a running head grow past its sheet, so the editor's
    // pagination stopped matching the built HTML's; turning .page into a flex
    // container re-sized every child and collapsed the paper to a strip.
    // Neither was needed — see the note in chrome.ts and columnUnder() in
    // dragDrop.ts, which resolves the column by cursor position instead.
    const doc = new DOMParser().parseFromString("<body></body>", "text/html");
    injectChromeStyles(doc);
    const css = doc.getElementById(CHROME_STYLE_ID)!.textContent!;
    expect(css).not.toMatch(/\.page\s*\{[^}]*display:\s*flex/);
    expect(css).not.toMatch(/\.acol[^}]*min-height:\s*[1-9]\d*px/);
    expect(css).not.toMatch(/\.flowwrap[^}]*min-height:\s*[1-9]\d*px/);
  });

  it("never overrides the page box, so an opened chapter looks like the book", () => {
    // THE OPPOSITE OF WHAT THIS ONCE ASSERTED, and deliberately.
    //
    // The sheet used to be unclipped — `height: auto !important; overflow:
    // visible !important` — so that an edit pushing past 1527px stayed
    // visible rather than being cut. The intent was right; doing it in CSS
    // was not. It changed the geometry of every page the moment a file was
    // OPENED: the pipeline packs each sheet-body to exactly 1413px and
    // verifies it, and unclipping let all 26 pages render their true content
    // height instead — text below the footer, below the page number, past
    // the bottom of the paper, on a file just reported as having zero
    // overflow. A chapter opened for a one-word fix did not look like the
    // chapter.
    //
    // Content that does not fit is moved instead, not hidden: `scrollHeight`
    // sees clipped content perfectly well (verified in a real browser —
    // 1527/1527 before, 1575/1527 after adding ten paragraphs), so overflow
    // is still detected and the reflow pass pushes the tail onto the next
    // page. A page that still cannot fit keeps the red outline.
    const doc = new DOMParser().parseFromString("<body></body>", "text/html");
    injectChromeStyles(doc);
    const css = doc.getElementById(CHROME_STYLE_ID)!.textContent!;
    expect(css).not.toContain("height: auto !important");
    expect(css).not.toContain("overflow: visible !important");
    // …and nothing else may resize the sheet either.
    expect(css).not.toMatch(/\.page\s*\{[^}]*\b(height|min-height|max-height)\s*:/);
  });

  /**
   * A REGRESSION GUARD, NOT A STYLE ASSERTION.
   *
   * CHROME_CSS is a template literal, and a backtick written inside one of
   * its comments terminates the string early — every rule after that point
   * silently disappears. That has now broken this file three times, and it
   * fails as a type error a long way from the cause. Asserting that a rule
   * from the END of the sheet survives catches it directly.
   */
  it("is not truncated by a stray backtick in a comment", () => {
    const doc = new DOMParser().parseFromString("<body></body>", "text/html");
    injectChromeStyles(doc);
    const css = doc.getElementById(CHROME_STYLE_ID)!.textContent!;
    expect(css).not.toContain("`");
    expect(css).toContain(ED.tailZone);
    expect(css).toContain(ED.freshBlock);
  });
});

describe("dropping into the empty foot of a column", () => {
  function page() {
    const doc = new DOMParser().parseFromString(
      `<body><div class="page"><div class="acols">
         <div class="acol">
           <div class="u"><p id="a">AAA</p></div>
           <div class="u"><p id="b">BBB</p></div>
         </div>
         <div class="acol"><div class="u"><p id="c">CCC</p></div></div>
       </div></div></body>`, "text/html");
    const structure = detectStructure(doc);
    stampBlockIds(doc, structure);
    const cols = Array.from(doc.querySelectorAll<HTMLElement>(".acol"));
    rect(doc.querySelector<HTMLElement>(".page")!, 0, 1432);
    // Both columns now reach the page foot, which is the point.
    rect(cols[0], 0, 1432, 0, 450);
    rect(cols[1], 0, 1432, 460, 450);
    rect(doc.getElementById("a") as HTMLElement, 0, 100);
    rect(doc.getElementById("b") as HTMLElement, 110, 100);
    rect(doc.getElementById("c") as HTMLElement, 0, 100, 460);
    return { doc, structure, cols };
  }

  it("plans a move to the end of the column, not a floating placement", () => {
    const { doc, structure, cols } = page();
    let moved = 0;
    attachDragReorder(doc, structure, () => { moved++; });
    const C = doc.getElementById("c") as HTMLElement;
    const transfer = dt();

    fire(C, "dragstart", { dataTransfer: transfer });
    // 900px down the FIRST column: far below its last block (which ends at
    // 210), but well inside the column box.
    fire(cols[0], "dragover", { dataTransfer: transfer, clientX: 200, clientY: 900 });
    fire(cols[0], "drop", { dataTransfer: transfer, clientX: 200, clientY: 900 });

    expect(moved).toBe(1);
    // It reflows at the end of that column — it is NOT lifted out of the
    // text into an absolutely-placed box, which is what used to happen.
    const ids = Array.from(cols[0].querySelectorAll("p")).map((p) => p.id);
    expect(ids).toEqual(["a", "b", "c"]);
    expect(C.style.position).not.toBe("absolute");
  });

  it("lights the whole tail while it is a target, and clears it after", () => {
    const { doc, structure, cols } = page();
    attachDragReorder(doc, structure, () => {});
    const C = doc.getElementById("c") as HTMLElement;
    const transfer = dt();

    fire(C, "dragstart", { dataTransfer: transfer });
    fire(cols[0], "dragover", { dataTransfer: transfer, clientX: 200, clientY: 900 });
    // The old feedback was a thin bar against the last block, hundreds of
    // pixels above the cursor, so the space still read as refusing the drop.
    expect(cols[0].classList.contains(ED.tailZone)).toBe(true);

    fire(cols[0], "drop", { dataTransfer: transfer, clientX: 200, clientY: 900 });
    expect(cols[0].classList.contains(ED.tailZone)).toBe(false);
  });

  it("moves the tail highlight between columns", () => {
    const { doc, structure, cols } = page();
    attachDragReorder(doc, structure, () => {});
    const A = doc.getElementById("a") as HTMLElement;
    const transfer = dt();

    fire(A, "dragstart", { dataTransfer: transfer });
    fire(cols[1], "dragover", { dataTransfer: transfer, clientX: 660, clientY: 900 });
    expect(cols[1].classList.contains(ED.tailZone)).toBe(true);
    expect(cols[0].classList.contains(ED.tailZone)).toBe(false);
  });

  it("clears the highlight when the cursor returns to a block", () => {
    const { doc, structure, cols } = page();
    attachDragReorder(doc, structure, () => {});
    const C = doc.getElementById("c") as HTMLElement;
    const B = doc.getElementById("b") as HTMLElement;
    const transfer = dt();

    fire(C, "dragstart", { dataTransfer: transfer });
    fire(cols[0], "dragover", { dataTransfer: transfer, clientX: 200, clientY: 900 });
    expect(cols[0].classList.contains(ED.tailZone)).toBe(true);
    fire(B, "dragover", { dataTransfer: transfer, clientX: 200, clientY: 150 });
    expect(cols[0].classList.contains(ED.tailZone)).toBe(false);
  });
});
