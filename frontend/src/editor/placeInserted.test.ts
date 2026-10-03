import { describe, expect, it } from "vitest";
import {
  FREE_CLASS, MIN_PLACED_WIDTH, isFree, placeFreshlyInserted, returnToFlow,
} from "./freeLayer";
import { CHROME_STYLE_ID, ED, injectChromeStyles } from "./chrome";

/** jsdom does no layout, so the geometry every measurement needs is stated. */
function page(): { doc: Document; page: HTMLElement; block: HTMLElement } {
  const doc = new DOMParser().parseFromString(
    `<body><div class="page"><div class="acols">` +
    `<div class="acol">` +
    `<div class="u"><p class="q" id="text">existing</p></div>` +
    `<div class="u"><ul class="bl" id="fresh"><li><span>new</span></li></ul></div>` +
    `</div><div class="acol"></div>` +
    `</div></div></body>`, "text/html");
  const pg = doc.querySelector<HTMLElement>(".page")!;
  Object.defineProperty(pg, "offsetWidth", { value: 1080, configurable: true });
  Object.defineProperty(pg, "offsetHeight", { value: 1527, configurable: true });
  pg.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 1080, bottom: 1527, width: 1080, height: 1527,
       x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  const block = doc.getElementById("fresh") as HTMLElement;
  block.getBoundingClientRect = () =>
    ({ left: 30, top: 400, right: 130, bottom: 440, width: 100, height: 40,
       x: 30, y: 400, toJSON: () => ({}) }) as DOMRect;
  Object.defineProperty(block, "offsetHeight", { value: 40, configurable: true });
  return { doc, page: pg, block };
}

/**
 * A NEWLY INSERTED BLOCK BEHAVES LIKE A PLACED PICTURE.
 *
 * Inserting into the flow is right for the document and wrong for the moment
 * of insertion: everything below the insertion point shifts down and the new
 * block ends up off the bottom of what you were reading. A picture appears ON
 * the page you are looking at, over the content, and you move it before it
 * settles.
 */
describe("placing a freshly inserted block", () => {
  it("lifts it out of the flow so the page does not move", () => {
    const { doc, block } = page();
    expect(placeFreshlyInserted(doc, block)).toBe(true);
    expect(isFree(block)).toBe(true);
    expect(block.classList.contains(FREE_CLASS)).toBe(true);
    expect(block.style.position).toBe("absolute");
  });

  it("puts it on the page, not in the column", () => {
    const { doc, page: pg, block } = page();
    placeFreshlyInserted(doc, block);
    expect(block.parentElement).toBe(pg);
  });

  it("leaves the other blocks exactly where they were", () => {
    const { doc, block } = page();
    placeFreshlyInserted(doc, block);
    const text = doc.getElementById("text")!;
    expect(text.closest(".acol")).not.toBeNull();
    expect(text.previousElementSibling).toBeNull();
  });

  it("makes it wide enough to see and to aim at", () => {
    // A fresh block is usually empty — ghost text and nothing else — so its
    // natural width collapses to a few characters, invisible on a 1080px
    // sheet.
    const { doc, block } = page();
    placeFreshlyInserted(doc, block);
    expect(parseFloat(block.style.width)).toBeGreaterThanOrEqual(MIN_PLACED_WIDTH);
  });

  it("keeps it on the page even with nowhere empty to put it", () => {
    const { doc, page: pg, block } = page();
    placeFreshlyInserted(doc, block);
    const left = parseFloat(block.style.left);
    const top = parseFloat(block.style.top);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(left + parseFloat(block.style.width)).toBeLessThanOrEqual(pg.offsetWidth);
  });

  it("can be settled back into the text", () => {
    // Or a chapter accumulates boxes pinned to coordinates that do not
    // reflow with the text around them.
    const { doc, block } = page();
    placeFreshlyInserted(doc, block);
    expect(returnToFlow(block)).toBe(true);
    expect(isFree(block)).toBe(false);
    expect(block.closest(".acol")).not.toBeNull();
  });

  it("returns to where it came from, not to the end", () => {
    const { doc, block } = page();
    placeFreshlyInserted(doc, block);
    returnToFlow(block);
    expect(doc.getElementById("text")!.closest(".u")!.nextElementSibling)
      .toBe(block.closest(".u"));
  });

  it("does nothing for a block that is not on a page", () => {
    const doc = new DOMParser().parseFromString(
      `<body><ul class="bl" id="x"><li>a</li></ul></body>`, "text/html");
    const loose = doc.getElementById("x") as HTMLElement;
    expect(placeFreshlyInserted(doc, loose)).toBe(false);
  });
});

describe("the colour it is marked in", () => {
  it("is amber, which nothing else in the editor uses", () => {
    // Blue is selection, green is a drop target, red is overflow. A fresh
    // block otherwise looks exactly like the hundred around it.
    const doc = new DOMParser().parseFromString("<body></body>", "text/html");
    injectChromeStyles(doc);
    const css = doc.getElementById(CHROME_STYLE_ID)!.textContent!;
    const rule = css.slice(css.indexOf(`.${ED.placedFree} {`));
    expect(rule.slice(0, rule.indexOf("}"))).toContain("#d98324");
  });

  it("says what to do with it", () => {
    const doc = new DOMParser().parseFromString("<body></body>", "text/html");
    injectChromeStyles(doc);
    const css = doc.getElementById(CHROME_STYLE_ID)!.textContent!;
    expect(css).toContain("press Enter to fit into the text");
  });
});
