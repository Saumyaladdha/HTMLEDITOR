import { describe, expect, it } from "vitest";
import { applyImageToFigureSlot, fitSlotToImage } from "./selection";

/** A figure as the pipeline emits it: caption first, then a wide reserved
 * plate whose height is the artwork allowance. */
function figure(plateH = 150, plateW = 940) {
  const doc = new DOMParser().parseFromString(
    `<figure class="figcard figbox"><div class="fh"><span>📐</span><span>चित्र 3.1</span></div>` +
      `<div class="figspace" style="height:${plateH}px"></div></figure>`,
    "text/html",
  );
  const fig = doc.querySelector(".figcard") as HTMLElement;
  const slot = fig.querySelector(".figspace") as HTMLElement;
  // jsdom lays nothing out, so the plate's available width is stated here the
  // way the column would give it.
  Object.defineProperty(fig, "clientWidth", { value: plateW, configurable: true });
  return { doc, fig, slot };
}

function withNaturalSize(slot: HTMLElement, w: number, h: number) {
  const img = slot.querySelector("img") as HTMLImageElement;
  Object.defineProperty(img, "naturalWidth", { value: w, configurable: true });
  Object.defineProperty(img, "naturalHeight", { value: h, configurable: true });
  return img;
}

describe("fitting a picture into a figure plate", () => {
  it("shrinks a wide plate to hug a square picture", () => {
    const { slot } = figure(150, 940);
    applyImageToFigureSlot(slot, "data:image/webp;base64,AAA");
    withNaturalSize(slot, 1278, 1230);

    expect(fitSlotToImage(slot)).toBe(true);
    // A square picture in a 940×150 plate used to sit 150px wide in the
    // middle with ~790px of empty dashed box either side.
    expect(parseFloat(slot.style.width)).toBeLessThan(200);
    expect(parseFloat(slot.style.height)).toBeLessThanOrEqual(150);
  });

  it("never grows the plate past its reserved height", () => {
    const { slot } = figure(150, 940);
    applyImageToFigureSlot(slot, "data:image/webp;base64,AAA");
    withNaturalSize(slot, 4000, 3000);
    fitSlotToImage(slot);
    // The reserved height is what pagination was measured against, and
    // `.page` is overflow:hidden — a taller plate would clip real content.
    expect(parseFloat(slot.style.height)).toBeLessThanOrEqual(150);
  });

  it("keeps a wide picture full width", () => {
    const { slot } = figure(150, 940);
    applyImageToFigureSlot(slot, "data:image/webp;base64,AAA");
    withNaturalSize(slot, 1880, 300);
    fitSlotToImage(slot);
    expect(parseFloat(slot.style.width)).toBe(940);
    expect(parseFloat(slot.style.height)).toBe(150);
  });

  it("centres the plate in the space it gave back", () => {
    const { slot } = figure(150, 940);
    applyImageToFigureSlot(slot, "data:image/webp;base64,AAA");
    withNaturalSize(slot, 400, 400);
    fitSlotToImage(slot);
    expect(slot.style.marginLeft).toBe("auto");
    expect(slot.style.marginRight).toBe("auto");
  });

  it("does nothing until the picture has loaded", () => {
    const { slot } = figure();
    applyImageToFigureSlot(slot, "data:image/webp;base64,AAA");
    // No natural size yet — fitting to zero would collapse the plate.
    expect(fitSlotToImage(slot)).toBe(false);
  });
});
