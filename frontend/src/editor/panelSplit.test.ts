import { describe, expect, it } from "vitest";
import { pairUnit } from "./dragDrop";
import {
  canClip, canClipAfter, clipPanel, clippedPartner, clippedTailOf, extractRow, panelKind,
  panelRows, rowContaining, rowLabels, unclipPanel, WIDE_ROWS,
} from "./panelSplit";

/** A सूत्र panel exactly as the pipeline emits it — see
 * HTML_Automation/book/components/math.py fcard(). */
function fcard(rows: number, wide = false): HTMLElement {
  const cls = `fcard${wide ? " fcard-wide" : ""}`;
  const body = Array.from({ length: rows }, (_, i) =>
    `<div class="frow"><span class="fx">F${i + 1} = m${i + 1}a</span>` +
    `<span class="fd">caption ${i + 1}</span></div>`).join("");
  const doc = new DOMParser().parseFromString(
    `<body><div class="acol"><div class="u">` +
    `<div class="${cls}" data-block-id="p1"><div class="ft">सूत्र</div>${body}</div>` +
    `</div></div></body>`, "text/html");
  return doc.querySelector<HTMLElement>(".fcard")!;
}

describe("what can be clipped", () => {
  it("recognises the three list-shaped blocks and nothing else", () => {
    const doc = new DOMParser().parseFromString(
      `<body><div class="fcard"></div><ul class="bl"></ul>` +
      `<div class="opts"></div><p>prose</p></body>`, "text/html");
    expect(panelKind(doc.querySelector<HTMLElement>(".fcard"))).toBe("fcard");
    expect(panelKind(doc.querySelector<HTMLElement>("ul.bl"))).toBe("bullets");
    expect(panelKind(doc.querySelector<HTMLElement>(".opts"))).toBe("options");
    expect(panelKind(doc.querySelector<HTMLElement>("p"))).toBeNull();
  });

  it("counts .frow rows and ignores the heading", () => {
    expect(panelRows(fcard(4))).toHaveLength(4);
  });

  it("refuses a cut that would leave a half empty", () => {
    const one = fcard(1);
    expect(canClip(one)).toBe(false);
    expect(canClipAfter(one, 0)).toBe(false);
    const four = fcard(4);
    expect(canClipAfter(four, 2)).toBe(true);
    // after the last row is not a cut, it is a no-op
    expect(canClipAfter(four, 3)).toBe(false);
    expect(canClipAfter(four, -1)).toBe(false);
  });

  it("labels rows by their boxed formula, not the caption", () => {
    expect(rowLabels(fcard(2))[0]).toBe("F1 = m1a");
  });
});

describe("clipping a सूत्र panel", () => {
  it("splits the rows and leaves the tail next to the head", () => {
    const card = fcard(4);
    const pair = clipPanel(card, 1);
    expect(pair).not.toBeNull();
    const [head, tail] = pair!;
    expect(head).toBe(card);
    expect(panelRows(head)).toHaveLength(2);
    expect(panelRows(tail)).toHaveLength(2);
    // Adjacent as LINES. In this fixture each block has its own `.u` guard,
    // so the tail is the first child of the wrapper after the head's — see
    // insertAfterUnit for why it must not be the head's own next sibling.
    expect(clippedTailOf(head)).toBe(tail);
  });

  it("gives the continuation NO heading — two headings cost what the split saves", () => {
    const [head, tail] = clipPanel(fcard(4), 1)!;
    expect(head.querySelector(".ft")).not.toBeNull();
    expect(tail.querySelector(".ft")).toBeNull();
    expect(tail.classList.contains("fcard-cont")).toBe(true);
  });

  it("recomputes fcard-wide per half from its own row count", () => {
    // WIDE_ROWS rows one side of the cut, one the other.
    const card = fcard(WIDE_ROWS + 1, true);
    const [head, tail] = clipPanel(card, WIDE_ROWS - 1)!;
    expect(panelRows(head)).toHaveLength(WIDE_ROWS);
    expect(head.classList.contains("fcard-wide")).toBe(true);
    // The tail is one row; keeping the wide class would lay it out in two
    // columns for a single formula.
    expect(panelRows(tail)).toHaveLength(1);
    expect(tail.classList.contains("fcard-wide")).toBe(false);
  });

  it("does not copy the head's block id onto the tail", () => {
    const [, tail] = clipPanel(fcard(4), 1)!;
    expect(tail.dataset.blockId).toBeUndefined();
  });

  it("does not carry editor state onto the tail", () => {
    const card = fcard(4);
    card.classList.add("__ed-block", "__ed-multiselect");
    const [, tail] = clipPanel(card, 1)!;
    expect(tail.className).not.toContain("__ed-");
  });

  it("loses no rows, whichever way it is cut", () => {
    for (let cut = 0; cut < 4; cut++) {
      const card = fcard(5);
      const before = rowLabels(card);
      const pair = clipPanel(card, cut);
      const after = [...rowLabels(pair![0]), ...rowLabels(pair![1])];
      expect(after).toEqual(before);
    }
  });
});

describe("clipping the other list shapes", () => {
  it("splits a bullet list, keeping its accent", () => {
    const doc = new DOMParser().parseFromString(
      `<body><ul class="bl" style="--acc:#2fa356;">` +
      `<li><span>a</span></li><li><span>b</span></li><li><span>c</span></li>` +
      `</ul></body>`, "text/html");
    const ul = doc.querySelector<HTMLElement>("ul.bl")!;
    const [head, tail] = clipPanel(ul, 0)!;
    expect(panelRows(head)).toHaveLength(1);
    expect(panelRows(tail)).toHaveLength(2);
    expect(tail.getAttribute("style")).toContain("--acc:#2fa356");
  });

  it("forces a split option list to one per line", () => {
    const doc = new DOMParser().parseFromString(
      `<body><div class="opts"><div>i) a</div><div>ii) b</div></div></body>`,
      "text/html");
    const opts = doc.querySelector<HTMLElement>(".opts")!;
    const [head, tail] = clipPanel(opts, 0)!;
    // A two-column grid broken across a boundary leaves an option beside a
    // gap, which reads as a missing choice.
    expect(head.classList.contains("one")).toBe(true);
    expect(tail.classList.contains("one")).toBe(true);
  });
});

describe("putting a clipped panel back together", () => {
  it("finds the continuation and absorbs it", () => {
    const card = fcard(4);
    const [head, tail] = clipPanel(card, 1)!;
    expect(clippedTailOf(head)).toBe(tail);
    expect(unclipPanel(head, tail)).toBe(true);
    expect(panelRows(head)).toHaveLength(4);
    expect(head.closest(".acol, .u")!.querySelectorAll(".fcard")).toHaveLength(1);
  });

  it("does not treat a panel the author wrote as a continuation", () => {
    const doc = new DOMParser().parseFromString(
      `<body><div class="acol">` +
      `<div class="fcard"><div class="ft">सूत्र</div><div class="frow">a</div></div>` +
      `<div class="fcard"><div class="ft">सूत्र</div><div class="frow">b</div></div>` +
      `</div></body>`, "text/html");
    const first = doc.querySelector<HTMLElement>(".fcard")!;
    // Both carry their own heading, so they are two panels, not a clipped
    // pair — joining them would silently delete a heading.
    expect(clippedTailOf(first)).toBeNull();
  });

  it("sees through the .u margin guard", () => {
    const doc = new DOMParser().parseFromString(
      `<body><div class="acol">` +
      `<div class="fcard"><div class="ft">सूत्र</div><div class="frow">a</div></div>` +
      `<div class="u"><div class="fcard fcard-cont"><div class="frow">b</div></div></div>` +
      `</div></body>`, "text/html");
    const first = doc.querySelector<HTMLElement>(".fcard")!;
    expect(clippedTailOf(first)).not.toBeNull();
  });

  it("round-trips: clip then join restores the original markup", () => {
    const card = fcard(4);
    const before = card.outerHTML;
    const [head, tail] = clipPanel(card, 2)!;
    unclipPanel(head, tail);
    expect(head.outerHTML).toBe(before);
  });
});


/**
 * EACH HALF MUST OCCUPY ITS OWN LINE.
 *
 * Every block sits inside a `.u` margin guard, and `.u` — not the block — is
 * what the packer and the drag machinery treat as one line. Inserting the
 * tail with `el.parentElement.insertBefore(...)` put it INSIDE the head's
 * wrapper, so one unit held two panels; dragging either half then picked up
 * both, and cutting a list in order to move two lines up moved the whole
 * list. Reported as "I cut it but whole content moves".
 */
describe("a clipped half is its own line", () => {
  function wrapped(rows: number) {
    const body = Array.from({ length: rows }, (_, i) =>
      `<li><span>point ${i + 1}</span></li>`).join("");
    const doc = new DOMParser().parseFromString(
      `<body><div class="acol">` +
      `<div class="u" data-it="7"><ul class="bl">${body}</ul></div>` +
      `<div class="u" data-it="8"><p class="q">after</p></div>` +
      `</div></body>`, "text/html");
    return doc.querySelector<HTMLElement>("ul.bl")!;
  }

  it("gives the tail a wrapper of its own", () => {
    const ul = wrapped(5);
    const headUnit = ul.parentElement!;
    const [, tail] = clipPanel(ul, 2)!;
    expect(tail.parentElement).not.toBe(headUnit);
    expect(tail.parentElement!.classList.contains("u")).toBe(true);
  });

  it("puts that wrapper immediately after the head's", () => {
    const ul = wrapped(5);
    const headUnit = ul.parentElement!;
    const [, tail] = clipPanel(ul, 2)!;
    expect(headUnit.nextElementSibling).toBe(tail.parentElement);
  });

  it("leaves the two halves as SEPARATE drag units", () => {
    // This is the property that was broken: pairUnit resolves a block to the
    // wrapper that occupies a line, and both halves resolved to the same one.
    const ul = wrapped(5);
    const [head, tail] = clipPanel(ul, 2)!;
    expect(pairUnit(head)).not.toBe(pairUnit(tail));
  });

  it("does not copy the head's item id onto the new wrapper", () => {
    // data-it belongs to the packer's item for the head; two units sharing
    // one would misdirect any height correction that reads it back.
    const ul = wrapped(5);
    const [, tail] = clipPanel(ul, 2)!;
    expect(tail.parentElement!.hasAttribute("data-it")).toBe(false);
  });

  it("keeps the column's other lines untouched", () => {
    const ul = wrapped(5);
    const col = ul.closest(".acol")!;
    clipPanel(ul, 2);
    // head, tail, and the paragraph that was already there.
    expect(col.children).toHaveLength(3);
    expect(col.lastElementChild!.textContent).toBe("after");
  });

  it("removes the tail's empty wrapper when the halves are joined again", () => {
    const ul = wrapped(5);
    const col = ul.closest(".acol")!;
    const [head, tail] = clipPanel(ul, 2)!;
    expect(unclipPanel(head, tail)).toBe(true);
    // An empty `.u` left behind still occupies a line and still carries its
    // margin guard, so a blank gap would remain where the seam had been.
    expect(col.children).toHaveLength(2);
    expect(panelRows(head)).toHaveLength(5);
  });

  it("still works for a block with no wrapper at all", () => {
    const doc = new DOMParser().parseFromString(
      `<body><div class="acol"><ul class="bl">` +
      `<li>a</li><li>b</li><li>c</li></ul></div></body>`, "text/html");
    const ul = doc.querySelector<HTMLElement>("ul.bl")!;
    const [head, tail] = clipPanel(ul, 0)!;
    expect(head.nextElementSibling).toBe(tail);
    expect(panelRows(tail)).toHaveLength(2);
  });
});


/**
 * LIFTING ONE ROW OUT.
 *
 * A row is a nested item: reorderable inside its own panel, but with nowhere
 * to go outside it, and a small target holding a formula, a caption and
 * sometimes a शर्त condition. Cutting the panel in two does not help when the
 * row you want sits in the middle.
 */
describe("taking a single row out", () => {
  function panel(rows: number) {
    const body = Array.from({ length: rows }, (_, i) =>
      `<div class="frow"><span class="fx">F${i + 1} = m${i + 1}a</span>` +
      `<span class="fd">caption ${i + 1}</span></div>`).join("");
    const doc = new DOMParser().parseFromString(
      `<body><div class="acol">` +
      `<div class="u" data-it="3"><div class="fcard" data-block-id="p1">` +
      `<div class="ft">सूत्र</div>${body}</div></div>` +
      `<div class="u" data-it="4"><p class="q">after</p></div>` +
      `</div></body>`, "text/html");
    return doc.querySelector<HTMLElement>(".fcard")!;
  }

  it("moves that row into a block of its own", () => {
    const card = panel(4);
    const row = panelRows(card)[2];
    const solo = extractRow(card, row)!;
    expect(solo).not.toBeNull();
    expect(panelRows(solo)).toEqual([row]);
    expect(panelRows(card)).toHaveLength(3);
  });

  it("puts it on the line straight after the panel", () => {
    const card = panel(4);
    const unit = card.parentElement!;
    const solo = extractRow(card, panelRows(card)[1])!;
    expect(unit.nextElementSibling).toBe(solo.parentElement);
    expect(solo.parentElement!.classList.contains("u")).toBe(true);
  });

  it("keeps the order of the rows left behind", () => {
    const card = panel(4);
    extractRow(card, panelRows(card)[1]);
    expect(rowLabels(card)).toEqual(["F1 = m1a", "F3 = m3a", "F4 = m4a"]);
  });

  it("carries the whole row — formula, caption and all", () => {
    const card = panel(3);
    const solo = extractRow(card, panelRows(card)[0])!;
    expect(solo.textContent).toContain("F1 = m1a");
    expect(solo.textContent).toContain("caption 1");
  });

  it("does not repeat the सूत्र heading on it", () => {
    const card = panel(3);
    const solo = extractRow(card, panelRows(card)[0])!;
    expect(solo.querySelector(".ft")).toBeNull();
    expect(solo.classList.contains("fcard-cont")).toBe(true);
    // One formula must not be laid out in two columns.
    expect(solo.classList.contains("fcard-wide")).toBe(false);
  });

  it("gives it no block id of its own to clash with", () => {
    const card = panel(3);
    const solo = extractRow(card, panelRows(card)[0])!;
    expect(solo.dataset.blockId).toBeUndefined();
    expect(solo.parentElement!.hasAttribute("data-it")).toBe(false);
  });

  it("refuses on a one-row panel — it is already on its own", () => {
    const card = panel(1);
    expect(extractRow(card, panelRows(card)[0])).toBeNull();
  });

  it("refuses a row that belongs to a different panel", () => {
    const a = panel(3);
    const b = panel(3);
    expect(extractRow(a, panelRows(b)[0])).toBeNull();
  });

  it("recomputes fcard-wide on what is left", () => {
    const card = panel(WIDE_ROWS);
    expect(panelRows(card)).toHaveLength(WIDE_ROWS);
    extractRow(card, panelRows(card)[0]);
    // One row short of wide, so it must not stay two-column.
    expect(card.classList.contains("fcard-wide")).toBe(false);
  });

  it("finds the row a click landed in, at any depth", () => {
    const card = panel(3);
    const rows = panelRows(card);
    const caption = rows[1].querySelector(".fd")!;
    expect(rowContaining(card, caption)).toBe(rows[1]);
    expect(rowContaining(card, rows[2])).toBe(rows[2]);
    expect(rowContaining(card, null)).toBeNull();
    expect(rowContaining(card, card.querySelector(".ft"))).toBeNull();
  });
});


/**
 * FINDING THE OTHER HALF.
 *
 * The build pipeline splits a panel precisely IN ORDER to cross a column or
 * page boundary, so the head is normally the last line of one column and the
 * continuation the first line of the next. A partner search that only looked
 * at `nextElementSibling` found nothing for exactly those splits — the ones
 * most likely to need joining back up.
 */
function twoColumnPage(headRows: number, tailRows: number) {
  const rows = (n: number, from: number) =>
    Array.from({ length: n }, (_, i) =>
      `<div class="frow"><span class="fx">F${from + i} = ma</span></div>`).join("");
  const doc = new DOMParser().parseFromString(
    `<body><div class="page"><div class="acols">` +
    `<div class="acol">` +
    `<div class="u"><p class="q">before</p></div>` +
    `<div class="u"><div class="fcard"><div class="ft">सूत्र</div>` +
    rows(headRows, 1) + `</div></div>` +
    `</div>` +
    `<div class="acol">` +
    `<div class="u"><div class="fcard fcard-cont">` +
    rows(tailRows, headRows + 1) + `</div></div>` +
    `<div class="u"><p class="q">after</p></div>` +
    `</div></div></div></body>`, "text/html");
  const cards = Array.from(doc.querySelectorAll<HTMLElement>(".fcard"));
  return { doc, head: cards[0], tail: cards[1] };
}

describe("a pair split across a column boundary", () => {
  it("is found from the head", () => {
    const { head, tail } = twoColumnPage(2, 1);
    expect(clippedPartner(head)).toEqual({ head, tail });
  });

  it("is found from the CONTINUATION too", () => {
    // The more natural thing to click when you are looking at the piece you
    // want moved; it used to offer nothing, with no hint that selecting the
    // other half would.
    const { head, tail } = twoColumnPage(2, 1);
    expect(clippedPartner(tail)).toEqual({ head, tail });
  });

  it("joins across the boundary, one row or many", () => {
    const { head, tail } = twoColumnPage(2, 1);
    expect(unclipPanel(head, tail)).toBe(true);
    expect(panelRows(head)).toHaveLength(3);
    expect(tail.isConnected).toBe(false);
  });

  it("leaves no empty line behind in the second column", () => {
    const { doc, head, tail } = twoColumnPage(2, 1);
    const second = Array.from(doc.querySelectorAll(".acol"))[1];
    unclipPanel(head, tail);
    // The `.u` that held the continuation still occupies a line and still
    // carries its margin guard.
    expect(second.children).toHaveLength(1);
    expect(second.textContent).toBe("after");
  });

  it("does not pair two panels the author wrote", () => {
    const { doc, head } = twoColumnPage(2, 1);
    // Give the second half its own heading: now it is a panel, not a
    // continuation, and joining them would delete a heading.
    const tail = doc.querySelectorAll<HTMLElement>(".fcard")[1];
    tail.classList.remove("fcard-cont");
    expect(clippedPartner(head)).toBeNull();
    expect(clippedPartner(tail)).toBeNull();
  });

  it("does not pair across an unrelated block", () => {
    const { doc, head } = twoColumnPage(2, 1);
    // Something else lands between the halves: they are no longer a pair in
    // content order, and joining them would reorder the page.
    const between = doc.createElement("div");
    between.className = "u";
    between.innerHTML = '<p class="q">interloper</p>';
    doc.querySelectorAll(".acol")[1].prepend(between);
    expect(clippedPartner(head)).toBeNull();
  });

  it("clippedTailOf still answers only for the head", () => {
    const { head, tail } = twoColumnPage(2, 1);
    expect(clippedTailOf(head)).toBe(tail);
    expect(clippedTailOf(tail)).toBeNull();
  });
});
