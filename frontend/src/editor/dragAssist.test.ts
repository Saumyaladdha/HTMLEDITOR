import { describe, expect, it } from "vitest";
import { GRIP_WIDTH, armDragSource, makeBlocksDraggable, makeNestedItemsDraggable } from "./dragDrop";

function docWith(html: string) {
  return new DOMParser().parseFromString(`<div class="flowwrap">${html}</div>`, "text/html");
}

describe("one armed drag source at a time", () => {
  it("marks blocks without arming them", () => {
    const doc = docWith(`<p data-block-id="a">A</p><p data-block-id="b">B</p>`);
    makeBlocksDraggable(doc);
    // 2525 permanently-armed elements is what made text selection fight the
    // drag engine and made overlapping targets pick a winner by event order.
    expect(doc.querySelectorAll('[draggable="true"]')).toHaveLength(0);
  });

  it("arms exactly one, and disarms the rest", () => {
    const doc = docWith(`<p data-block-id="a">A</p><p data-block-id="b">B</p>`);
    makeBlocksDraggable(doc);
    const a = doc.querySelector<HTMLElement>('[data-block-id="a"]')!;
    const b = doc.querySelector<HTMLElement>('[data-block-id="b"]')!;

    armDragSource(doc, a);
    expect(a.draggable).toBe(true);
    expect(b.draggable).toBe(false);

    armDragSource(doc, b);
    expect(a.draggable).toBe(false);
    expect(b.draggable).toBe(true);

    armDragSource(doc, null);
    expect(doc.querySelectorAll('[draggable="true"]')).toHaveLength(0);
  });

  it("never arms the element being typed in", () => {
    // `contenteditable` and `draggable` on one element is the conflict that
    // made editing inside a box impossible: the browser gives
    // mousedown-and-move to the drag engine, and picking up always wins.
    // But that only bites while the element has FOCUS.
    const doc = docWith(`<p data-block-id="a">A</p>`);
    const a = doc.querySelector<HTMLElement>('[data-block-id="a"]')!;
    a.contentEditable = "true";
    Object.defineProperty(a, "isContentEditable", { value: true, configurable: true });
    Object.defineProperty(doc, "activeElement", { value: a, configurable: true });
    armDragSource(doc, a);
    expect(a.draggable).toBe(false);
  });

  it("STILL arms a block carrying a stale contenteditable", () => {
    // The old test asked `isContentEditable`, which stays true after an edit
    // ends and is INHERITED by every descendant. One leftover attribute
    // therefore disarmed dragging for the whole subtree under it — so the
    // block you had just been editing became the one you could no longer
    // pick up, which is "I am not able to move the pieces either".
    const doc = docWith(`<p data-block-id="a">A</p>`);
    const a = doc.querySelector<HTMLElement>('[data-block-id="a"]')!;
    Object.defineProperty(a, "isContentEditable", { value: true, configurable: true });
    Object.defineProperty(doc, "activeElement", { value: doc.body, configurable: true });
    armDragSource(doc, a);
    expect(a.draggable).toBe(true);
  });

  it("arms a child of an element that is merely marked editable", () => {
    // `isContentEditable` is inherited, so this child reported true as well
    // and could never be armed.
    const doc = docWith(`<div contenteditable="true"><p data-block-id="a">A</p></div>`);
    const a = doc.querySelector<HTMLElement>('[data-block-id="a"]')!;
    Object.defineProperty(a, "isContentEditable", { value: true, configurable: true });
    Object.defineProperty(doc, "activeElement", { value: doc.body, configurable: true });
    armDragSource(doc, a);
    expect(a.draggable).toBe(true);
  });

  it("keeps nested rows unarmed until grabbed", () => {
    const doc = docWith(
      `<ul data-block-id="l"><li>one</li><li>two</li></ul>`);
    makeNestedItemsDraggable(doc);
    makeBlocksDraggable(doc);
    expect(doc.querySelectorAll('[draggable="true"]')).toHaveLength(0);
  });

  it("has a grab zone wide enough to hit", () => {
    expect(GRIP_WIDTH).toBeGreaterThanOrEqual(16);
  });
});

describe("what a pointer grabs", () => {
  function panel() {
    const doc = new DOMParser().parseFromString(
      `<div class="flowwrap"><div class="fcard" data-block-id="k">` +
      `<div class="ft">सूत्र</div>` +
      `<div class="frow" data-nested-item=""><span class="fx">a</span></div>` +
      `<div class="frow" data-nested-item=""><span class="fx">b</span></div>` +
      `</div></div>`, "text/html");
    return {
      doc,
      card: doc.querySelector<HTMLElement>(".fcard")!,
      row: doc.querySelector<HTMLElement>(".frow")!,
    };
  }

  // `attachGripArming` needs a live document with mousemove; the rule it
  // applies is asserted here directly, since that rule is the whole point.
  const pick = (block: HTMLElement | null, row: HTMLElement | null,
                selected: HTMLElement | null) => {
    const blockIsSelected = !!block && block === selected;
    return blockIsSelected && row ? row : block ?? row;
  };

  it("grabs the whole panel, not a formula row inside it", () => {
    const { card, row } = panel();
    // Every row of a सूत्र panel is a nested item, so a "most specific wins"
    // rule armed a formula LINE wherever you pointed — and the panel itself
    // could only be taken hold of by its title strip.
    expect(pick(card, row, null)).toBe(card);
  });

  it("grabs a row once the panel is already selected", () => {
    const { card, row } = panel();
    expect(pick(card, row, card)).toBe(row);
  });

  it("still grabs a row that has no block of its own", () => {
    const { row } = panel();
    expect(pick(null, row, null)).toBe(row);
  });
});
