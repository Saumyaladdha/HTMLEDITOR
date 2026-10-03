import { describe, expect, it } from "vitest";
import {
  MIN_PAIR_WIDTH,
  isPaired,
  pairUnit,
  pairRefusal,
  pairSplit,
  placeSideBySide,
  setPairSplit,
  tidyPairs,
  unpairSideBySide,
} from "./dragDrop";
import { serializeForSave } from "./sanitize";

function page(html: string) {
  const doc = new DOMParser().parseFromString(
    `<div class="flowwrap">${html}</div>`, "text/html");
  return { doc, wrap: doc.querySelector(".flowwrap") as HTMLElement };
}

describe("putting two blocks on one line", () => {
  it("wraps the pair, keeping document order", () => {
    const { doc, wrap } = page(`<p class="para" id="a">A</p><p class="para" id="b">B</p>`);
    const a = doc.getElementById("a")!, b = doc.getElementById("b")!;
    expect(placeSideBySide(doc, a, b)).toBe(true);

    const row = wrap.querySelector(".sxs")!;
    expect(Array.from(row.children).map((c) => c.id)).toEqual(["a", "b"]);
    // The pair sits where the first block was — pairing is a layout change,
    // not a reorder.
    expect(wrap.firstElementChild).toBe(row);
  });

  it("refuses a third block: three across a 944px column is unreadable", () => {
    const { doc } = page(`<p id="a">A</p><p id="b">B</p><p id="c">C</p>`);
    const a = doc.getElementById("a")!, b = doc.getElementById("b")!, c = doc.getElementById("c")!;
    placeSideBySide(doc, a, b);
    expect(placeSideBySide(doc, a, c)).toBe(false);
  });

  it("takes a pair apart again", () => {
    const { doc, wrap } = page(`<p id="a">A</p><p id="b">B</p>`);
    const a = doc.getElementById("a")!, b = doc.getElementById("b")!;
    placeSideBySide(doc, a, b);
    expect(unpairSideBySide(a)).toBe(true);
    expect(wrap.querySelector(".sxs")).toBeNull();
    expect(Array.from(wrap.children).map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("does nothing when the block is not in a pair", () => {
    const { doc } = page(`<p id="a">A</p>`);
    expect(unpairSideBySide(doc.getElementById("a")!)).toBe(false);
  });

  it("survives the save sanitizer", () => {
    // `.sxs` is real layout, not editor chrome — it must reach the file.
    const { doc } = page(`<p id="a">A</p><p id="b">B</p>`);
    placeSideBySide(doc, doc.getElementById("a")!, doc.getElementById("b")!);
    expect(serializeForSave(doc)).toContain('class="sxs"');
  });
});

describe("stretching a pair", () => {
  it("starts even and can be pushed either way", () => {
    const { doc } = page(`<p id="a">A</p><p id="b">B</p>`);
    const a = doc.getElementById("a")!, b = doc.getElementById("b")!;
    placeSideBySide(doc, a, b);
    expect(pairSplit(a)).toBe(50);

    setPairSplit(a, 70);
    expect(pairSplit(a)).toBe(70);
    // The pair still fills the line exactly — stretching one half shrinks the
    // other rather than overflowing the column.
    expect(a.style.flexGrow).toBe("70");
    expect(b.style.flexGrow).toBe("30");
  });

  it("clamps to a readable range", () => {
    const { doc } = page(`<p id="a">A</p><p id="b">B</p>`);
    placeSideBySide(doc, doc.getElementById("a")!, doc.getElementById("b")!);
    setPairSplit(doc.getElementById("a")!, 5);
    expect(pairSplit(doc.getElementById("a")!)).toBe(20);
  });

  it("forgets the split when the pair is taken apart", () => {
    const { doc } = page(`<p id="a">A</p><p id="b">B</p>`);
    const a = doc.getElementById("a")!;
    placeSideBySide(doc, a, doc.getElementById("b")!);
    setPairSplit(a, 70);
    unpairSideBySide(a);
    // Otherwise the next pair silently inherits it.
    expect(a.style.flexGrow).toBe("");
    expect(pairSplit(a)).toBeNull();
  });
});


describe("refusing a pair that would be unreadable", () => {
  function wide(html: string, width = 944) {
    const doc = new DOMParser().parseFromString(
      `<div class="flowwrap">${html}</div>`, "text/html");
    const wrap = doc.querySelector(".flowwrap") as HTMLElement;
    Object.defineProperty(wrap, "clientWidth", { value: width, configurable: true });
    return { doc, wrap };
  }

  it("never nests one pair inside another", () => {
    // A pair inside a pair is 25% of the line and another level is 12% —
    // which is how a card came out as a vertical ribbon of one word per line.
    const { doc } = wide(`<p id="a">A</p><p id="b">B</p><p id="c">C</p>`);
    const a = doc.getElementById("a")!, b = doc.getElementById("b")!, c = doc.getElementById("c")!;
    placeSideBySide(doc, a, b);
    expect(pairRefusal(a, c)).toBe("already-paired");
    expect(placeSideBySide(doc, a, c)).toBe(false);
  });

  it("refuses a new pair created INSIDE a paired block", () => {
    // The shape that actually broke: a card is paired at 50%, and two blocks
    // inside it are then paired at 50% of that — 25% of the line, with a
    // further level at 12%. The old guard only counted a row's children, so
    // it never saw this.
    const { doc } = wide(
      `<div id="card"><p id="x">X</p><p id="y">Y</p></div><p id="other">O</p>`);
    const card = doc.getElementById("card")!;
    placeSideBySide(doc, card, doc.getElementById("other")!);

    const x = doc.getElementById("x")!, y = doc.getElementById("y")!;
    expect(pairRefusal(x, y)).toBe("would-nest");
    expect(placeSideBySide(doc, x, y)).toBe(false);
    expect(doc.querySelectorAll(".sxs")).toHaveLength(1);
  });

  it("refuses when a half would be too narrow to read", () => {
    const { doc } = wide(`<p id="a">A</p><p id="b">B</p>`, 200);
    expect(pairRefusal(doc.getElementById("a")!, doc.getElementById("b")!)).toBe("too-narrow");
  });

  it("allows a pair inside a Part-2 column", () => {
    // The narrowest place a pair can occur is a 450px column. A 220px floor
    // needed 454px, so pairing was silently refused on every two-column page
    // — about fifty of the chapter's seventy-three.
    const { doc } = wide(`<p id="a">A</p><p id="b">B</p>`, 450);
    expect(pairRefusal(doc.getElementById("a")!, doc.getElementById("b")!)).toBeNull();
  });

  it("allows a pair with room for both halves", () => {
    const { doc } = wide(`<p id="a">A</p><p id="b">B</p>`, 944);
    expect(pairRefusal(doc.getElementById("a")!, doc.getElementById("b")!)).toBeNull();
    // Wide enough to read, and small enough that two halves plus the gap fit
    // a 450px Part-2 column — that upper bound is the constraint that matters.
    expect(MIN_PAIR_WIDTH).toBeGreaterThanOrEqual(120);
    expect(MIN_PAIR_WIDTH * 2 + 14).toBeLessThanOrEqual(450);
  });
});

describe("a pair never outlives its second block", () => {
  it("unwraps when one block is dragged out", () => {
    const doc = new DOMParser().parseFromString(
      `<div class="flowwrap"><p id="a">A</p><p id="b">B</p><p id="c">C</p></div>`, "text/html");
    const wrap = doc.querySelector(".flowwrap") as HTMLElement;
    const a = doc.getElementById("a")!, b = doc.getElementById("b")!;
    placeSideBySide(doc, a, b);

    // Drag B back out to the end — what the drop handler does.
    wrap.appendChild(b);
    expect(wrap.querySelector(".sxs")!.children.length).toBe(1);   // the leftover

    expect(tidyPairs(doc)).toBe(1);
    // The pair is gone and A is back in the flow at full width, so it can be
    // paired again instead of reporting "that pair is full".
    expect(wrap.querySelector(".sxs")).toBeNull();
    expect(Array.from(wrap.children).map((c) => c.id)).toEqual(["a", "c", "b"]);
    expect(a.style.flexGrow).toBe("");
  });

  it("leaves a healthy pair alone", () => {
    const doc = new DOMParser().parseFromString(
      `<div class="flowwrap"><p id="a">A</p><p id="b">B</p></div>`, "text/html");
    placeSideBySide(doc, doc.getElementById("a")!, doc.getElementById("b")!);
    expect(tidyPairs(doc)).toBe(0);
    expect(doc.querySelector(".sxs")).toBeTruthy();
  });
});

/**
 * The shape a real chapter actually has.
 *
 * The pipeline wraps EVERY block in its own `.u`, so the page is
 * `.flowwrap > .u > .poflat`, not `.flowwrap > .poflat`. A block's own
 * `nextElementSibling` is therefore null — its wrapper holds exactly one
 * child — and a pair built around the block would sit inside that wrapper,
 * sharing a line with nothing.
 *
 * That is why "मत भूलो" could not be put beside the figure under it: the
 * panel reported "there is no block after this one" on a page where the next
 * block was plainly visible. These lock the wrapper level as the pairing
 * level.
 */
describe("pairing through the .u wrapper a chapter really emits", () => {
  const chapterPage = () => {
    const doc = new DOMParser().parseFromString(
      `<body><div class="page"><div class="flowwrap">
         <div class="u" data-it="7"><p class="poflat pf-warn" data-block-id="warn">मत भूलो</p></div>
         <div class="u" data-it="8"><figure class="fig" data-block-id="fig">…</figure></div>
       </div></div></body>`, "text/html");
    return {
      doc,
      warn: doc.querySelector<HTMLElement>('[data-block-id="warn"]')!,
      fig: doc.querySelector<HTMLElement>('[data-block-id="fig"]')!,
    };
  };

  it("finds the next block through the wrapper", () => {
    const { warn, fig } = chapterPage();
    expect(warn.nextElementSibling).toBeNull();          // the bug's symptom
    expect(pairUnit(warn).nextElementSibling).toBe(fig.parentElement);
  });

  it("does not refuse the pair", () => {
    const { warn, fig } = chapterPage();
    expect(pairRefusal(warn, fig)).toBeNull();
  });

  it("pairs the wrappers as siblings in the flow, not inside one of them", () => {
    const { doc, warn, fig } = chapterPage();
    expect(placeSideBySide(doc, warn, fig)).not.toBe(false);

    const row = doc.querySelector<HTMLElement>(".sxs")!;
    expect(row.parentElement?.className).toBe("flowwrap");   // a sibling in the flow
    expect(row.children.length).toBe(2);
    // Both wrappers moved in, and the blocks came with them.
    expect(row.contains(warn)).toBe(true);
    expect(row.contains(fig)).toBe(true);
    expect(doc.querySelector(".u .sxs")).toBeNull();     // never nested in a .u
  });

  it("reports the paired block as paired", () => {
    const { doc, warn, fig } = chapterPage();
    placeSideBySide(doc, warn, fig);
    expect(isPaired(warn)).toBe(true);                   // block.parentElement is .u
    expect(isPaired(fig)).toBe(true);
  });

  it("takes the pair apart again", () => {
    const { doc, warn, fig } = chapterPage();
    placeSideBySide(doc, warn, fig);
    expect(unpairSideBySide(warn)).toBe(true);
    expect(doc.querySelector(".sxs")).toBeNull();
    expect(isPaired(warn)).toBe(false);
    expect(doc.querySelectorAll(".flowwrap > .u").length).toBe(2);
  });
});
