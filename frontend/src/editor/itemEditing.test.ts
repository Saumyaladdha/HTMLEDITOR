import { describe, expect, it } from "vitest";
import {
  addItem,
  firstTextSlot,
  duplicateItem,
  itemGroupFor,
  moveItem,
  refreshGroup,
  removeItem,
  renumberItems,
} from "./itemEditing";

/** The reading-order card, as the pipeline emits it: a numbered badge and a
 * sentence per step. */
function stepsCard(): HTMLElement {
  const doc = new DOMParser().parseFromString(
    `<div class="cvcard cvc-green"><div class="cvh">किस क्रम में पढ़ना है</div>` +
      `<div class="cvsteps">` +
      `<div class="cvstep" data-nested-item=""><span class="cvn">1</span><span>पहला काम</span></div>` +
      `<div class="cvstep" data-nested-item=""><span class="cvn">2</span><span>दूसरा काम</span></div>` +
      `</div></div>`,
    "text/html",
  );
  return doc.querySelector(".cvcard") as HTMLElement;
}

describe("finding the repeated group", () => {
  it("finds it from an item the user clicked", () => {
    const card = stepsCard();
    const step = card.querySelector(".cvstep") as HTMLElement;
    const group = itemGroupFor(step)!;
    expect(group.items).toHaveLength(2);
    expect(group.noun).toBe("step");
  });

  it("finds it from the card around the items", () => {
    // A user does not distinguish "I selected the card" from "I selected a
    // line in it" when what they want is one more line.
    const card = stepsCard();
    const group = itemGroupFor(card)!;
    expect(group.items).toHaveLength(2);
    expect(group.container.classList.contains("cvsteps")).toBe(true);
  });

  it("returns nothing when there is no repeated group", () => {
    const doc = new DOMParser().parseFromString(
      `<p class="para">just a paragraph</p>`, "text/html");
    expect(itemGroupFor(doc.querySelector("p") as HTMLElement)).toBeNull();
  });
});

describe("adding an item", () => {
  it("clones the structure and clears only the words", () => {
    const card = stepsCard();
    const group = itemGroupFor(card)!;
    const added = addItem(group);

    expect(card.querySelectorAll(".cvstep")).toHaveLength(3);
    // The numbered badge is structure the stylesheet needs — it survives,
    // and `addItem` renumbers the group, so a third step reads "3" rather
    // than repeating the "2" it was cloned from.
    expect(added.querySelector(".cvn")).toBeTruthy();
    expect(added.querySelector(".cvn")!.textContent).toBe("3");
    // The sentence is what the teacher replaces — it goes.
    const words = Array.from(added.querySelectorAll("span"))
      .filter((s) => !s.classList.contains("cvn"))
      .map((s) => s.textContent);
    expect(words).toEqual([""]);
  });

  it("puts the new item straight after the one it came from", () => {
    const card = stepsCard();
    const group = itemGroupFor(card)!;
    const first = group.items[0];
    const added = addItem(group, first);
    expect(first.nextElementSibling).toBe(added);
  });

  it("never clones editor bookkeeping", () => {
    const card = stepsCard();
    const group = itemGroupFor(card)!;
    group.items[1].setAttribute("data-block-id", "b7");
    const added = addItem(group);
    // Two elements answering to one id would make selection ambiguous.
    expect(added.hasAttribute("data-block-id")).toBe(false);
  });

  it("keeps the words when duplicating rather than adding", () => {
    const card = stepsCard();
    const step = card.querySelector(".cvstep") as HTMLElement;
    const copy = duplicateItem(step);
    // The WORDS are copied — that is the difference from "add". The badge is
    // not, because the group renumbers itself: a copy of step 1 sitting in
    // second place is step 2.
    const words = (el: Element) =>
      Array.from(el.querySelectorAll("span")).filter((x) => !x.classList.contains("cvn"))
        .map((x) => x.textContent);
    expect(words(copy)).toEqual(words(step));
    expect(copy.querySelector(".cvn")!.textContent).toBe("2");
  });
});

describe("removing and reordering", () => {
  it("removes an item", () => {
    const card = stepsCard();
    const group = itemGroupFor(card)!;
    expect(removeItem(group, group.items[0])).toBe(true);
    expect(card.querySelectorAll(".cvstep")).toHaveLength(1);
  });

  it("refuses to remove the last one", () => {
    const card = stepsCard();
    const group = itemGroupFor(card)!;
    removeItem(group, group.items[0]);
    const left = itemGroupFor(card.querySelector(".cvstep") as HTMLElement)!;
    // An empty box looks broken; deleting the block is the way to remove it.
    expect(removeItem(left, left.items[0])).toBe(false);
  });

  it("moves an item up and down", () => {
    const card = stepsCard();
    const steps = Array.from(card.querySelectorAll<HTMLElement>(".cvstep"));
    expect(moveItem(steps[1], -1)).toBe(true);
    expect(card.querySelector(".cvstep")).toBe(steps[1]);
    expect(moveItem(steps[1], -1)).toBe(false);   // already first
  });
});

describe("other boxes the pipeline emits", () => {
  it("adds a line to a sticky note, keeping its bullet glyph", () => {
    const doc = new DOMParser().parseFromString(
      `<div class="callout sticky"><div class="ch">Costly Mistakes</div>` +
        `<div class="ci" data-nested-item=""><span class="b">✗</span><span>पहली भूल</span></div>` +
        `<div class="ci" data-nested-item=""><span class="b">✗</span><span>दूसरी भूल</span></div>` +
        `</div>`, "text/html");
    const note = doc.querySelector(".callout") as HTMLElement;
    const group = itemGroupFor(note)!;
    expect(group.noun).toBe("line");
    const added = addItem(group);
    expect(added.querySelector(".b")!.textContent).toBe("✗");
    expect(added.querySelectorAll("span")[1].textContent).toBe("");
  });

  it("adds a row to a सूत्र panel with all three of its parts", () => {
    const doc = new DOMParser().parseFromString(
      `<div class="fcard"><div class="ft">सूत्र</div>` +
        `<div class="frow" data-nested-item=""><span class="fx">V = IR</span>` +
        `<span class="fd">ओम का नियम</span><span class="fc">शर्त</span></div>` +
        `<div class="frow" data-nested-item=""><span class="fx">j = σE</span>` +
        `<span class="fd">सदिश रूप</span><span class="fc">शर्त</span></div>` +
        `</div>`, "text/html");
    const card = doc.querySelector(".fcard") as HTMLElement;
    const added = addItem(itemGroupFor(card)!);
    // A row is `.fx + .fd + .fc`; the editor should not have to know that.
    expect(added.querySelector(".fx")).toBeTruthy();
    expect(added.querySelector(".fd")).toBeTruthy();
    expect(added.querySelector(".fc")).toBeTruthy();
    expect(added.textContent?.trim()).toBe("");
  });
});

describe("where the caret lands in a new row", () => {
  it("goes to the emptied slot, never the number badge", () => {
    const card = stepsCard();
    const added = addItem(itemGroupFor(card)!);
    const slot = firstTextSlot(added);
    // Landing before the badge would type into the card's own numbering.
    expect(slot.classList.contains("cvn")).toBe(false);
    expect(slot.textContent).toBe("");
  });

  it("falls back safely when a row carries its text directly", () => {
    const doc = new DOMParser().parseFromString(
      `<ul class="bl"><li data-nested-item="">one</li>` +
      `<li data-nested-item="">two</li></ul>`, "text/html");
    const list = doc.querySelector(".bl") as HTMLElement;
    const added = addItem(itemGroupFor(list)!);
    expect(firstTextSlot(added)).toBe(added);
  });
});

describe("renumbering", () => {
  it("numbers a new step instead of repeating the last one", () => {
    const card = stepsCard();
    const group = itemGroupFor(card)!;
    addItem(group);
    renumberItems(refreshGroup(group));
    const badges = Array.from(card.querySelectorAll(".cvn")).map((n) => n.textContent);
    // A clone carried the number it came from, so a third step read "2".
    expect(badges).toEqual(["1", "2", "3"]);
  });

  it("renumbers after a move and after a delete", () => {
    const card = stepsCard();
    let group = itemGroupFor(card)!;
    addItem(group);
    renumberItems(refreshGroup(group));

    group = refreshGroup(group);
    moveItem(group.items[2], -1);
    renumberItems(refreshGroup(group));
    expect(Array.from(card.querySelectorAll(".cvn")).map((n) => n.textContent))
      .toEqual(["1", "2", "3"]);

    group = refreshGroup(group);
    removeItem(group, group.items[0]);
    renumberItems(refreshGroup(group));
    expect(Array.from(card.querySelectorAll(".cvn")).map((n) => n.textContent))
      .toEqual(["1", "2"]);
  });

  it("keeps the circled style a Derivation Steps note uses", () => {
    const doc = new DOMParser().parseFromString(
      `<div class="night"><div class="ci" data-nested-item=""><span class="b">①</span><span>a</span></div>` +
      `<div class="ci" data-nested-item=""><span class="b">②</span><span>b</span></div></div>`, "text/html");
    const note = doc.querySelector(".night") as HTMLElement;
    const group = itemGroupFor(note)!;
    addItem(group);
    renumberItems(refreshGroup(group));
    expect(Array.from(note.querySelectorAll(".b")).map((n) => n.textContent))
      .toEqual(["①", "②", "③"]);
  });

  it("never rewrites markers that are not a 1,2,3 sequence", () => {
    // Years, marks and question numbers are content, not ordinals —
    // renumbering them would destroy real data.
    const doc = new DOMParser().parseFromString(
      `<div class="sechead"><span class="examchip" data-nested-item="">2024</span>` +
      `<span class="examchip" data-nested-item="">2026</span></div>`, "text/html");
    const head = doc.querySelector(".sechead") as HTMLElement;
    const group = itemGroupFor(head)!;
    expect(renumberItems(group)).toBe(false);
    expect(Array.from(head.querySelectorAll(".examchip")).map((n) => n.textContent))
      .toEqual(["2024", "2026"]);
  });
});
