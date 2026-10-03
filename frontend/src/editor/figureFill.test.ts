import { describe, expect, it } from "vitest";
import {
  applyImageToFigureSlot, flattenFigureFrame, isEmptyImageSlot, markSlotFilled,
} from "./selection";

/**
 * A FILLED PLATE MUST STOP LOOKING LIKE AN EMPTY ONE.
 *
 * `.figspace` takes its dashed blue border and white fill from a stylesheet
 * rule, not an inline style, so filling the plate in place drew the
 * placeholder box AROUND the picture: every figure with art in it still read
 * as a figure waiting for art.
 */
function plate(): HTMLElement {
  const doc = new DOMParser().parseFromString(
    `<body><div class="figcard"><div class="figbox">` +
    `<div class="fh">चित्र 4.5; वृत्तीय कुंडली</div>` +
    `<div class="figspace" style="height:108px;"></div>` +
    `</div></div></body>`, "text/html");
  return doc.querySelector<HTMLElement>(".figspace")!;
}

describe("placing art in a reserved plate", () => {
  it("drops the placeholder's box and background", () => {
    const slot = plate();
    markSlotFilled(slot);
    expect(slot.classList.contains("is-filled")).toBe(true);
    // The longhand, not the `border` shorthand: `border: none` round-trips
    // as `border: medium`, which no longer states the intent.
    expect(slot.style.borderStyle).toBe("none");
    expect(slot.style.borderWidth).toBe("0px");
    expect(slot.style.background).toBe("none");
  });

  it("leaves the reserved height for fitSlotToImage to shrink", () => {
    const slot = plate();
    markSlotFilled(slot);
    // Clearing it here destroys the number `fitSlotToImage` scales the
    // picture against — it runs later, on the image's load event — so the
    // plate would never be fitted and would keep its full reserved box.
    expect(slot.style.height).toBe("108px");
  });

  it("uses inline styles, so the change survives a save", () => {
    // These are content, not editor chrome: sanitize strips `__ed-*` classes
    // and editor attributes, and would take a chrome-class fix with it.
    const slot = plate();
    markSlotFilled(slot);
    expect(slot.getAttribute("style")).toContain("border-style: none");
    expect(slot.className).not.toContain("__ed-");
  });

  it("reports the plate as filled once it holds an image", () => {
    const slot = plate();
    expect(isEmptyImageSlot(slot)).toBe(true);
    const img = slot.ownerDocument.createElement("img");
    slot.appendChild(img);
    // Otherwise every click reopens the file picker and a figure can never
    // just be selected to resize it.
    expect(isEmptyImageSlot(slot)).toBe(false);
  });

  it("keeps the caption — that is the author's text, not chrome", () => {
    const slot = plate();
    markSlotFilled(slot);
    expect(slot.closest(".figbox")!.querySelector(".fh")!.textContent)
      .toContain("चित्र 4.5");
  });
});


describe("the figure frame once art is in it", () => {
  it("drops the tinted frame and its padding", () => {
    const slot = plate();
    flattenFigureFrame(slot);
    const box = slot.closest<HTMLElement>(".figbox")!;
    expect(box.style.background).toBe("none");
    expect(box.style.borderStyle).toBe("none");
    expect(box.style.padding).toBe("0px");
  });

  it("moves the caption BELOW the picture", () => {
    const slot = plate();
    const box = slot.closest<HTMLElement>(".figbox")!;
    // Shipped shape: caption above a reserved plate — a space waiting for art.
    expect(box.firstElementChild!.className).toBe("fh");
    flattenFigureFrame(slot);
    // A book puts the picture first and names it underneath.
    const kids = Array.from(box.children).map((c) => c.className);
    expect(kids.indexOf("fh")).toBeGreaterThan(
      kids.findIndex((c) => c.includes("figspace")));
  });

  it("moves the caption's gap from below it to above it", () => {
    const slot = plate();
    flattenFigureFrame(slot);
    const cap = slot.closest(".figbox")!.querySelector<HTMLElement>(".fh")!;
    expect(cap.style.marginBottom).toBe("0px");
    expect(cap.style.marginTop).toBe("8px");
  });

  it("is idempotent — a second image does not re-move the caption", () => {
    const slot = plate();
    flattenFigureFrame(slot);
    const first = Array.from(slot.closest(".figbox")!.children)
      .map((c) => c.className);
    flattenFigureFrame(slot);
    expect(Array.from(slot.closest(".figbox")!.children).map((c) => c.className))
      .toEqual(first);
  });

  it("does nothing to a figure with no frame", () => {
    const doc = new DOMParser().parseFromString(
      `<body><div class="figspace"></div></body>`, "text/html");
    const bare = doc.querySelector<HTMLElement>(".figspace")!;
    expect(() => flattenFigureFrame(bare)).not.toThrow();
  });
});
