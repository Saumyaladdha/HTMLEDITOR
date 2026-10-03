import { describe, expect, it } from "vitest";
import { BLOCK_FRAME, attachGripArming } from "./dragDrop";
import { CHROME_STYLE_ID, ED, injectChromeStyles } from "./chrome";

function rect(el: HTMLElement, top: number, h: number, left = 0, w = 450) {
  el.getBoundingClientRect = () =>
    ({ left, top, right: left + w, bottom: top + h, width: w, height: h,
       x: left, y: top, toJSON: () => ({}) }) as DOMRect;
}

function move(el: Element, clientX: number, clientY: number) {
  const doc = el.ownerDocument!;
  const ev = doc.createEvent("Event") as never as Event;
  (ev as never as { initEvent: (t: string, b: boolean, c: boolean) => void })
    .initEvent("mousemove", true, true);
  Object.defineProperty(ev, "clientX", { value: clientX });
  Object.defineProperty(ev, "clientY", { value: clientY });
  el.dispatchEvent(ev);
}

/**
 * WHAT THE POINTER TAKES HOLD OF.
 *
 * Normally the block. Once the block is SELECTED, a row inside it wins, so a
 * single formula line can be picked out of a panel as a deliberate second
 * step. That rule left blocks made entirely of rows with nothing to grab: a
 * सूत्र panel's heading bar is not a row, so the head half of a clipped panel
 * could always be taken by its title, but the continuation carries no heading
 * and every pixel of it is a row.
 */
function panel(cont: boolean) {
  const doc = new DOMParser().parseFromString(
    `<body><div class="acol"><div class="u">` +
    `<div class="fcard${cont ? " fcard-cont" : ""}" data-block-id="p1">` +
    (cont ? "" : `<div class="ft">सूत्र</div>`) +
    `<div class="frow" data-nested-item><span class="fx">F = ma</span></div>` +
    `<div class="frow" data-nested-item><span class="fx">p = mv</span></div>` +
    `</div></div></div></body>`, "text/html");
  const card = doc.querySelector<HTMLElement>(".fcard")!;
  rect(card, 0, 200, 0, 450);
  const rows = Array.from(doc.querySelectorAll<HTMLElement>(".frow"));
  rows.forEach((r, i) => rect(r, 20 + i * 80, 70, 14, 422));
  return { doc, card, rows };
}

function armed(doc: Document): HTMLElement | null {
  return doc.querySelector<HTMLElement>(`.${ED.gripReady}`);
}

describe("grabbing a block that is made entirely of rows", () => {
  it("takes the ROW when the pointer is inside a selected block's contents", () => {
    const { doc, card, rows } = panel(true);
    attachGripArming(doc, () => card);
    move(rows[1], 220, 110);
    // Deliberate second step: pick one formula out of the panel.
    expect(armed(doc)).toBe(rows[1]);
  });

  it("takes the BLOCK on its own frame, even when selected", () => {
    const { doc, card, rows } = panel(true);
    attachGripArming(doc, () => card);
    // Within BLOCK_FRAME of the panel's left edge — its own padding, which
    // belongs to no row.
    move(rows[0], 2, 60);
    expect(armed(doc)).toBe(card);
  });

  it("reserves all four edges for the block", () => {
    const { doc, card, rows } = panel(true);
    attachGripArming(doc, () => card);
    const probes: [number, number][] = [
      [2, 100],            // left
      [448, 100],          // right
      [220, 2],            // top
      [220, 198],          // bottom
    ];
    for (const [x, y] of probes) {
      move(rows[0], x, y);
      expect(armed(doc), `frame at ${x},${y}`).toBe(card);
    }
  });

  it("still takes the block anywhere when it is NOT selected", () => {
    const { doc, rows } = panel(true);
    attachGripArming(doc, () => null);
    move(rows[1], 220, 110);
    expect(armed(doc)!.classList.contains("fcard")).toBe(true);
  });

  it("leaves the head half's heading working as it always did", () => {
    const { doc, card } = panel(false);
    attachGripArming(doc, () => card);
    const heading = doc.querySelector<HTMLElement>(".ft")!;
    rect(heading, 0, 18, 14, 422);
    move(heading, 220, 9);
    // The heading is not a row, so it grabs the box — this is why the upper
    // box was always easy and the lower one was not.
    expect(armed(doc)).toBe(card);
  });

  it("the frame is as wide as the panel's own padding", () => {
    // 10px top/bottom and 14px sides in `.acol .fcard`, so the reserved frame
    // costs no row any part of itself.
    expect(BLOCK_FRAME).toBeLessThanOrEqual(10);
  });
});

describe("the continuation's visible handle", () => {
  it("is drawn on fcard-cont", () => {
    const doc = new DOMParser().parseFromString("<body></body>", "text/html");
    injectChromeStyles(doc);
    const css = doc.getElementById(CHROME_STYLE_ID)!.textContent!;
    expect(css).toMatch(/\.fcard-cont::before\s*\{/);
    expect(css).toMatch(/\.fcard-cont\s*\{\s*position:\s*relative/);
  });

  it("costs no layout, so pagination still matches the built HTML", () => {
    // Padding would have shifted every page. The handle is absolutely
    // positioned for exactly that reason.
    const doc = new DOMParser().parseFromString("<body></body>", "text/html");
    injectChromeStyles(doc);
    const css = doc.getElementById(CHROME_STYLE_ID)!.textContent!;
    const rule = css.slice(css.indexOf(".fcard-cont::before"));
    expect(rule.slice(0, rule.indexOf("}"))).toContain("position: absolute");
    expect(css).not.toMatch(/\.fcard-cont\s*\{[^}]*padding/);
  });
});
