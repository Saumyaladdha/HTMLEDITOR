import { beforeEach, describe, expect, it } from "vitest";
import {
  caretPosition,
  convertBlockType,
  currentListItem,
  exitListFromEmptyItem,
  indentListItem,
  isAtomicBlock,
  mergeWithNext,
  mergeWithPrevious,
  outdentListItem,
  splitBlockAtCaret,
} from "./blockEditing";

/**
 * The semantics that turn "a page you can restyle" into "a document you can
 * write in": Enter splits a block, Backspace at the start merges into the
 * one above, Tab indents a list item. None of this existed — pressing Enter
 * inserted a <div> inside the paragraph and Backspace at position 0 did
 * nothing, so a paragraph could not be created or removed by typing.
 */

// The REAL document, not one from DOMParser: a parsed document is detached
// and has no browsing context, so `getSelection()` on it returns null and no
// caret can exist. That's also precisely why the editor operates on the
// canvas iframe's document rather than a parsed copy.
const doc: Document = document;

function setup(html: string): HTMLElement {
  doc.body.innerHTML = html;
  doc.getSelection()?.removeAllRanges();
  return doc.body;
}

/** Places a collapsed caret inside `el` at `offset` characters into its first
 * text node — or at the very end when offset is -1. */
function caretIn(el: Element, offset: number) {
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const text = walker.nextNode() as Text | null;
  const sel = doc.getSelection()!;
  const range = doc.createRange();
  if (!text) {
    range.selectNodeContents(el);
    range.collapse(true);
  } else {
    range.setStart(text, offset < 0 ? text.length : offset);
    range.collapse(true);
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

describe("caretPosition", () => {
  beforeEach(() => setup("<p>Hello world</p>"));

  it("recognises the start of a block", () => {
    const p = doc.querySelector("p")!;
    caretIn(p, 0);
    expect(caretPosition(doc, p)).toMatchObject({ atStart: true, atEnd: false });
  });

  it("recognises the end of a block", () => {
    const p = doc.querySelector("p")!;
    caretIn(p, -1);
    expect(caretPosition(doc, p)).toMatchObject({ atStart: false, atEnd: true });
  });

  it("recognises the middle", () => {
    const p = doc.querySelector("p")!;
    caretIn(p, 5);
    expect(caretPosition(doc, p)).toMatchObject({ atStart: false, atEnd: false });
  });
});

describe("splitBlockAtCaret", () => {
  it("splits a paragraph into two, preserving both halves", () => {
    setup("<p>Hello world</p>");
    const p = doc.querySelector("p")!;
    caretIn(p, 5);
    const created = splitBlockAtCaret(doc, p)!;
    expect(p.textContent).toBe("Hello");
    expect(created.textContent).toBe(" world");
    expect(created.tagName).toBe("P");
    expect(p.nextElementSibling).toBe(created);
  });

  it("keeps the original's tag and attributes", () => {
    setup('<p class="text-body" style="color:red">Hello world</p>');
    const p = doc.querySelector("p")!;
    caretIn(p, 5);
    const created = splitBlockAtCaret(doc, p)!;
    expect(created.className).toBe("text-body");
    expect(created.getAttribute("style")).toBe("color:red");
  });

  it("preserves inline formatting in the tail", () => {
    setup("<p>Hello <strong>bold</strong> tail</p>");
    const p = doc.querySelector("p")!;
    caretIn(p, 3);
    const created = splitBlockAtCaret(doc, p)!;
    expect(created.querySelector("strong")?.textContent).toBe("bold");
  });

  it("starts a PARAGRAPH after a heading, not another heading", () => {
    setup("<h2>Title</h2>");
    const h = doc.querySelector("h2")!;
    caretIn(h, -1);
    const created = splitBlockAtCaret(doc, h)!;
    expect(created.tagName).toBe("P");
  });

  it("splits a heading in the middle into two headings", () => {
    setup("<h2>Two words</h2>");
    const h = doc.querySelector("h2")!;
    caretIn(h, 3);
    const created = splitBlockAtCaret(doc, h)!;
    expect(created.tagName).toBe("H2");
  });

  it("leaves an empty new block clickable rather than collapsed", () => {
    setup("<p>Hello</p>");
    const p = doc.querySelector("p")!;
    caretIn(p, -1);
    const created = splitBlockAtCaret(doc, p)!;
    expect(created.querySelector("br")).not.toBeNull();
  });

  it("does not remove a data-block-id from the ORIGINAL but clears it on the copy", () => {
    setup('<p data-block-id="b-1">Hello world</p>');
    const p = doc.querySelector("p")!;
    caretIn(p, 5);
    const created = splitBlockAtCaret(doc, p)!;
    expect(p.dataset.blockId).toBe("b-1");
    expect(created.hasAttribute("data-block-id")).toBe(false);
  });
});

describe("mergeWithPrevious", () => {
  it("joins two paragraphs into one", () => {
    setup("<p>First</p><p>Second</p>");
    const second = doc.querySelectorAll("p")[1] as HTMLElement;
    caretIn(second, 0);
    const result = mergeWithPrevious(doc, second)!;
    expect(doc.querySelectorAll("p")).toHaveLength(1);
    expect(result.focusBlock.textContent).toBe("FirstSecond");
  });

  it("returns null with nothing before it", () => {
    setup("<p>Only</p>");
    const p = doc.querySelector("p")!;
    caretIn(p, 0);
    expect(mergeWithPrevious(doc, p)).toBeNull();
  });

  it("refuses to merge text into a table or figure", () => {
    setup("<table><tr><td>x</td></tr></table><p>Text</p>");
    const p = doc.querySelector("p")!;
    caretIn(p, 0);
    expect(mergeWithPrevious(doc, p)).toBeNull();
    expect(doc.querySelector("table")).not.toBeNull();
  });

  it("still deletes an EMPTY block sitting after a table", () => {
    setup("<table><tr><td>x</td></tr></table><p><br></p>");
    const p = doc.querySelector("p")!;
    caretIn(p, 0);
    expect(mergeWithPrevious(doc, p)).not.toBeNull();
    expect(doc.querySelector("p")).toBeNull();
    expect(doc.querySelector("table")).not.toBeNull();
  });

  it("drops the previous block's placeholder <br> so text doesn't start on a blank line", () => {
    setup("<p>First<br></p><p>Second</p>");
    const second = doc.querySelectorAll("p")[1] as HTMLElement;
    caretIn(second, 0);
    mergeWithPrevious(doc, second);
    expect(doc.querySelector("p")!.innerHTML).toBe("FirstSecond");
  });
});

describe("mergeWithNext", () => {
  it("pulls the following block up", () => {
    setup("<p>First</p><p>Second</p>");
    const first = doc.querySelector("p")!;
    caretIn(first, -1);
    mergeWithNext(doc, first);
    expect(doc.querySelectorAll("p")).toHaveLength(1);
    expect(doc.querySelector("p")!.textContent).toBe("FirstSecond");
  });

  it("refuses when the next block is atomic", () => {
    setup("<p>First</p><figure><img src='x.png'></figure>");
    const first = doc.querySelector("p")!;
    caretIn(first, -1);
    expect(mergeWithNext(doc, first)).toBeNull();
  });
});

describe("lists", () => {
  it("finds the list item the caret is in", () => {
    const body = setup("<ul><li>one</li><li>two</li></ul>");
    const ul = body.querySelector("ul") as HTMLElement;
    caretIn(ul.children[1], 0);
    expect(currentListItem(doc, ul)?.textContent).toBe("two");
  });

  it("indents an item under the one above", () => {
    setup("<ul><li>one</li><li>two</li></ul>");
    const second = doc.querySelectorAll("li")[1] as HTMLLIElement;
    expect(indentListItem(doc, second)).toBe(true);
    expect(doc.querySelector("li > ul > li")?.textContent).toBe("two");
  });

  it("will not indent the first item, which has nothing to nest under", () => {
    setup("<ul><li>one</li></ul>");
    expect(indentListItem(doc, doc.querySelector("li")!)).toBe(false);
  });

  it("outdents back out again", () => {
    setup("<ul><li>one<ul><li>two</li></ul></li></ul>");
    const nested = doc.querySelector("li > ul > li") as HTMLLIElement;
    expect(outdentListItem(doc, nested)).toBe(true);
    expect(doc.querySelectorAll("ul")).toHaveLength(1);
    expect(doc.querySelectorAll("ul > li")).toHaveLength(2);
  });

  it("leaves the list from an empty item", () => {
    const body = setup("<ul><li>one</li><li></li></ul>");
    const ul = body.querySelector("ul") as HTMLElement;
    const empty = doc.querySelectorAll("li")[1] as HTMLLIElement;
    exitListFromEmptyItem(doc, ul, empty);
    expect(doc.querySelectorAll("li")).toHaveLength(1);
    expect(doc.querySelector("p")).not.toBeNull();
  });
});

describe("convertBlockType", () => {
  it("changes the tag and keeps the content", () => {
    setup("<p>Some text</p>");
    const replacement = convertBlockType(doc, doc.querySelector("p")!, "h2");
    expect(replacement.tagName).toBe("H2");
    expect(replacement.textContent).toBe("Some text");
    expect(doc.querySelector("p")).toBeNull();
  });

  it("keeps inline formatting", () => {
    setup("<p>a <em>b</em></p>");
    const replacement = convertBlockType(doc, doc.querySelector("p")!, "h3");
    expect(replacement.querySelector("em")).not.toBeNull();
  });

  it("drops the old type's class, which would otherwise keep the old look", () => {
    setup('<p class="text-body">Some text</p>');
    const replacement = convertBlockType(doc, doc.querySelector("p")!, "h2");
    expect(replacement.className).toBe("");
  });

  it("keeps the user's own inline style override", () => {
    setup('<p style="color:red">Some text</p>');
    const replacement = convertBlockType(doc, doc.querySelector("p")!, "h2");
    expect(replacement.getAttribute("style")).toBe("color:red");
  });
});

describe("isAtomicBlock", () => {
  it("treats structural media as whole units", () => {
    setup("<figure></figure><table></table><p></p>");
    expect(isAtomicBlock(doc.querySelector("figure")!)).toBe(true);
    expect(isAtomicBlock(doc.querySelector("table")!)).toBe(true);
    expect(isAtomicBlock(doc.querySelector("p")!)).toBe(false);
  });
});
