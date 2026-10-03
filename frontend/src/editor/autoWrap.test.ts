import { describe, expect, it } from "vitest";
import {
  MIN_WRAP_STRIP, WRAP_BELOW, canWrapBeside, currentFloat, fitBesideNeighbour, lineShare,
} from "./autoWrap";

const FLOATS = [
  { class: "fig-left", side: "left" as const, label: "Text wraps on the right" },
  { class: "fig-right", side: "right" as const, label: "Text wraps on the left" },
];

const TEXT = "क".repeat(60);

/** Give an element a fixed rect, since jsdom does no layout. */
function rect(el: HTMLElement, left: number, width: number) {
  el.getBoundingClientRect = () =>
    ({ left, top: 0, right: left + width, bottom: 100, width, height: 100,
       x: left, y: 0, toJSON: () => ({}) }) as DOMRect;
}

/** The real shape: `.flowwrap > .u > .figcard`, with a paragraph after it. */
function page(container = "flowwrap") {
  const doc = new DOMParser().parseFromString(
    `<div class="page"><div class="${container}">
       <div class="u"><div class="figcard" id="f">चित्र 3.1</div></div>
       <div class="u"><p id="p">${TEXT}</p></div>
     </div></div>`, "text/html");
  const wrap = doc.querySelector<HTMLElement>(`.${container}`)!;
  const fig = doc.getElementById("f") as HTMLElement;
  rect(wrap, 0, 944);
  rect(fig, 0, 944);
  return { doc, wrap, fig };
}

/**
 * "I made the image smaller but it left so much empty space at the side and
 * the content shifted downwards." A shrunken figure kept the whole line to
 * itself, so the freed width stayed blank for good.
 */
describe("fitting text beside a shrunken figure", () => {
  it("floats it once it is narrow enough to leave room", () => {
    const { fig } = page();
    rect(fig, 0, 320);                                   // resized down
    const change = fitBesideNeighbour(fig, FLOATS);
    expect(change).toEqual({ applied: FLOATS[0] });
    expect(fig.classList.contains("fig-left")).toBe(true);
  });

  it("leaves a full-width figure on its own line", () => {
    const { fig } = page();
    expect(fitBesideNeighbour(fig, FLOATS)).toBeNull();
    expect(fig.classList.contains("fig-left")).toBe(false);
  });

  it("gives the line back when it is widened again", () => {
    const { fig } = page();
    rect(fig, 0, 320);
    fitBesideNeighbour(fig, FLOATS);
    rect(fig, 0, 900);                                   // dragged back out
    expect(fitBesideNeighbour(fig, FLOATS)).toEqual({ removed: FLOATS[0] });
    expect(fig.classList.contains("fig-left")).toBe(false);
  });

  it("keeps the side it is already on, so nothing jumps across the page", () => {
    const { fig } = page();
    rect(fig, 600, 320);                                 // sitting past the middle
    expect(fitBesideNeighbour(fig, FLOATS)).toEqual({ applied: FLOATS[1] });
    expect(fig.classList.contains("fig-right")).toBe(true);
  });

  it("does not re-float something already floated", () => {
    const { fig } = page();
    rect(fig, 0, 320);
    fitBesideNeighbour(fig, FLOATS);
    expect(fitBesideNeighbour(fig, FLOATS)).toBeNull();
  });

  it("refuses when the freed strip would be too narrow to read", () => {
    const { fig, wrap } = page();
    rect(wrap, 0, 450);
    rect(fig, 0, 320);                                   // only 130px freed
    expect(450 - 320).toBeLessThan(MIN_WRAP_STRIP);
    expect(fitBesideNeighbour(fig, FLOATS)).toBeNull();
  });
});

describe("when wrapping would not actually work", () => {
  it("refuses inside a Part-2 column", () => {
    // `.acol .u` is display:flow-root, which CONTAINS a float by definition —
    // the text would not wrap and the figure would just jump.
    const { fig } = page("acol");
    rect(fig, 0, 320);
    expect(canWrapBeside(fig, FLOATS)).toBe(false);
    expect(fitBesideNeighbour(fig, FLOATS)).toBeNull();
  });

  it("refuses with nothing after it to flow in", () => {
    const doc = new DOMParser().parseFromString(
      `<div class="flowwrap"><div class="u"><div class="figcard" id="f">x</div></div></div>`,
      "text/html");
    const fig = doc.getElementById("f") as HTMLElement;
    expect(canWrapBeside(fig, FLOATS)).toBe(false);
  });

  it("refuses when the block is already sharing a line", () => {
    const { doc, fig } = page();
    const row = doc.createElement("div");
    row.className = "sxs";
    fig.parentElement!.before(row);
    row.appendChild(fig.parentElement!);
    expect(canWrapBeside(fig, FLOATS)).toBe(false);
  });

  it("refuses a block lifted onto the page", () => {
    const { fig } = page();
    fig.style.position = "absolute";
    expect(canWrapBeside(fig, FLOATS)).toBe(false);
  });

  it("refuses a block with no float classes declared", () => {
    const { fig } = page();
    expect(canWrapBeside(fig, [])).toBe(false);
  });
});

describe("helpers", () => {
  it("reports the share of the line taken", () => {
    const { fig } = page();
    rect(fig, 0, 472);
    expect(lineShare(fig)).toBeCloseTo(0.5);
    expect(lineShare(fig)).toBeLessThan(WRAP_BELOW);
  });

  it("reports the active float", () => {
    const { fig } = page();
    expect(currentFloat(fig, FLOATS)).toBeNull();
    fig.classList.add("fig-right");
    expect(currentFloat(fig, FLOATS)).toEqual(FLOATS[1]);
  });
});
