import { describe, expect, it } from "vitest";
import {
  appendLine, insertLineAfter, lineOf, lineParentOf, removeLine, unitOf,
} from "./lineUnits";
import { pairUnit } from "./dragDrop";

/**
 * `.u` IS WHAT OCCUPIES A LINE.
 *
 * The pipeline wraps every block in one as a margin-collapse guard, so the
 * height the packer measured is the height the block takes. Reaching for
 * `block.parentElement` gets that wrapper when the column was meant, which
 * has produced the same bug four times: reordering into the wrong slot,
 * clipping both halves into one unit, cutting leaving a blank line behind,
 * and pasting two blocks into one unit.
 */
function column(): { col: HTMLElement; blocks: HTMLElement[] } {
  const doc = new DOMParser().parseFromString(
    `<body><div class="acol">` +
    `<div class="u" data-it="1"><p class="q" id="a">A</p></div>` +
    `<div class="u" data-it="2"><p class="q" id="b">B</p></div>` +
    `</div></body>`, "text/html");
  return {
    col: doc.querySelector<HTMLElement>(".acol")!,
    blocks: Array.from(doc.querySelectorAll<HTMLElement>("p")),
  };
}

function bare(): { col: HTMLElement; blocks: HTMLElement[] } {
  const doc = new DOMParser().parseFromString(
    `<body><div class="acol">` +
    `<p class="q" id="a">A</p><p class="q" id="b">B</p>` +
    `</div></body>`, "text/html");
  return {
    col: doc.querySelector<HTMLElement>(".acol")!,
    blocks: Array.from(doc.querySelectorAll<HTMLElement>("p")),
  };
}

const ids = (col: HTMLElement) =>
  Array.from(col.querySelectorAll("p")).map((p) => p.id);

describe("finding the line", () => {
  it("sees the wrapper where there is one", () => {
    const { blocks } = column();
    expect(unitOf(blocks[0])!.classList.contains("u")).toBe(true);
    expect(lineOf(blocks[0])).toBe(unitOf(blocks[0]));
  });

  it("falls back to the block itself where there is none", () => {
    const { blocks } = bare();
    expect(unitOf(blocks[0])).toBeNull();
    expect(lineOf(blocks[0])).toBe(blocks[0]);
  });

  it("gives the COLUMN as the line parent, not the wrapper", () => {
    // This is the distinction that keeps being got wrong: parentElement is
    // the wrapper, which is not somewhere another block may live.
    const { col, blocks } = column();
    expect(blocks[0].parentElement).not.toBe(col);
    expect(lineParentOf(blocks[0])).toBe(col);
  });
});

describe("adding a line", () => {
  it("gives the new block a wrapper of its own", () => {
    const { col, blocks } = column();
    const fresh = col.ownerDocument.createElement("p");
    fresh.id = "c";
    insertLineAfter(blocks[0], fresh);
    expect(fresh.parentElement).not.toBe(unitOf(blocks[0]));
    expect(fresh.parentElement!.classList.contains("u")).toBe(true);
    expect(ids(col)).toEqual(["a", "c", "b"]);
  });

  it("leaves the two as separate drag units", () => {
    const { col, blocks } = column();
    const fresh = col.ownerDocument.createElement("p");
    insertLineAfter(blocks[0], fresh);
    expect(pairUnit(fresh)).not.toBe(pairUnit(blocks[0]));
  });

  it("does not copy the neighbour's item id", () => {
    const { col, blocks } = column();
    const fresh = col.ownerDocument.createElement("p");
    insertLineAfter(blocks[0], fresh);
    expect(fresh.parentElement!.hasAttribute("data-it")).toBe(false);
  });

  it("appends as a wrapped line at the end of a column", () => {
    const { col } = column();
    const fresh = col.ownerDocument.createElement("p");
    fresh.id = "z";
    appendLine(col, fresh);
    expect(fresh.parentElement!.classList.contains("u")).toBe(true);
    expect(ids(col)).toEqual(["a", "b", "z"]);
  });

  it("works unwrapped in a document that has no guards", () => {
    const { col, blocks } = bare();
    const fresh = col.ownerDocument.createElement("p");
    fresh.id = "c";
    insertLineAfter(blocks[0], fresh);
    expect(fresh.parentElement).toBe(col);
    expect(ids(col)).toEqual(["a", "c", "b"]);
  });
});

describe("removing a line", () => {
  it("takes the emptied wrapper with it", () => {
    const { col, blocks } = column();
    removeLine(blocks[0]);
    // A `.u` left behind still occupies a line and still carries its margin
    // guard, so a blank gap remained where the block had been.
    expect(col.children).toHaveLength(1);
    expect(ids(col)).toEqual(["b"]);
  });

  it("keeps a wrapper that still holds something", () => {
    const { col, blocks } = column();
    const extra = col.ownerDocument.createElement("span");
    unitOf(blocks[0])!.appendChild(extra);
    removeLine(blocks[0]);
    expect(col.children).toHaveLength(2);
    expect(unitOf(extra)).not.toBeNull();
  });

  it("is safe on an unwrapped block", () => {
    const { col, blocks } = bare();
    removeLine(blocks[0]);
    expect(ids(col)).toEqual(["b"]);
  });
});
