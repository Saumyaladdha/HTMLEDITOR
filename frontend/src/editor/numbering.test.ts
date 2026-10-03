import { describe, expect, it } from "vitest";
import { addItem, itemGroupFor, moveItem, removeItem } from "./itemEditing";

function card(n: number): HTMLElement {
  const steps = Array.from({ length: n }, (_, i) =>
    `<div class="cvstep" data-nested-item=""><span class="cvn">${i + 1}</span><span>step ${i + 1}</span></div>`).join("");
  const doc = new DOMParser().parseFromString(
    `<div class="cvcard"><div class="cvsteps">${steps}</div></div>`, "text/html");
  return doc.querySelector(".cvcard") as HTMLElement;
}
const badges = (c: HTMLElement) => Array.from(c.querySelectorAll(".cvn")).map((n) => n.textContent);

describe("numbering survives repeated edits", () => {
  it("stays sequential across several adds from a STALE group", () => {
    const c = card(5);
    // Deliberately reuse the group captured before any mutation — this is
    // what every call site does, and what silently broke renumbering: the
    // card came out 1,2,3,4,5,5,6,5.
    const stale = itemGroupFor(c)!;
    addItem(stale, stale.items[4]);
    addItem(stale, stale.items[4]);
    addItem(stale, stale.items[4]);
    expect(badges(c)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
  });

  it("renumbers after a remove, counted from the DOM not the snapshot", () => {
    const c = card(3);
    const stale = itemGroupFor(c)!;
    addItem(stale, stale.items[2]);
    expect(removeItem(stale, stale.items[0])).toBe(true);
    expect(badges(c)).toEqual(["1", "2", "3"]);
  });

  it("renumbers after a move", () => {
    const c = card(3);
    const g = itemGroupFor(c)!;
    moveItem(g.items[2], -1);
    expect(badges(c)).toEqual(["1", "2", "3"]);
  });

  it("still refuses to renumber years", () => {
    const doc = new DOMParser().parseFromString(
      `<div class="sechead"><span class="examchip" data-nested-item="">2024</span>` +
      `<span class="examchip" data-nested-item="">2026</span></div>`, "text/html");
    const head = doc.querySelector(".sechead") as HTMLElement;
    addItem(itemGroupFor(head)!);
    expect(Array.from(head.querySelectorAll(".examchip")).map((n) => n.textContent))
      .toEqual(["2024", "2026", ""]);
  });
});
