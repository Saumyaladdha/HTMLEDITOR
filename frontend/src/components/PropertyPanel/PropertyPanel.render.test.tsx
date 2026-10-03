// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import PropertyPanel from "./PropertyPanel";
import { detectCapabilities } from "../../editor/capabilities";

// react-dom needs telling that act() is legitimate here, or every
// render logs a warning that buries the real output.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

/**
 * THE SIDE PANEL MUST RENDER, WHATEVER IS SELECTED.
 *
 * It is the only place several controls live, and it is rendered from the
 * live DOM of the selected block — so a block shape that a new section does
 * not expect throws during render, React unmounts the subtree, and the panel
 * simply stops appearing on click. There is no error in the page; it just
 * goes away. This mounts it for real against each block shape the pipeline
 * emits, which is the only way that failure shows up before a user finds it.
 */
function docWith(inner: string): Document {
  return new DOMParser().parseFromString(
    `<body><div class="page"><div class="acols"><div class="acol">` +
    `<div class="u">${inner}</div></div></div></div></body>`, "text/html");
}

const RECT = { left: 10, top: 10, width: 400, height: 200 } as never;

/** Overridden per test by the placement suite below. */
let canvasRightForTest: number | null = null;

function mount(doc: Document, block: HTMLElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      React.createElement(PropertyPanel, {
        doc,
        block,
        canvasRight: canvasRightForTest,
        subPart: null,
        capabilities: detectCapabilities(doc),
        onRemoveBlock: () => {},
        onChanged: () => {},
        onImageReplaced: () => {},
        anchorRect: RECT,
        onNote: () => {},
      }),
    );
  });
  return { host, root };
}

beforeEach(() => { document.body.innerHTML = ""; });

describe("the side panel renders for every block shape", () => {
  const shapes: [string, string, string][] = [
    ["a सूत्र panel", ".fcard",
     `<div class="fcard"><div class="ft">सूत्र</div>` +
     `<div class="frow"><span class="fx">F = ma</span></div>` +
     `<div class="frow"><span class="fx">p = mv</span></div></div>`],
    ["a one-row सूत्र panel", ".fcard",
     `<div class="fcard"><div class="ft">सूत्र</div>` +
     `<div class="frow"><span class="fx">F = ma</span></div></div>`],
    ["a bullet list", "ul.bl",
     `<ul class="bl"><li><span>one</span></li><li><span>two</span></li></ul>`],
    ["an option list", ".opts",
     `<div class="opts one"><div>i) a</div><div>ii) b</div></div>`],
    ["an empty option list", ".opts", `<div class="opts"></div>`],
    ["a plain paragraph", "p.q", `<p class="q">ordinary prose</p>`],
    ["a display equation", ".dm",
     `<div class="dm"><span class="m">V <span class="fr">` +
     `<span>W</span><span class="dn">q</span></span></span></div>`],
    ["a figure", "figure",
     `<figure class="figcard figbox"><div class="fh">चित्र 1</div>` +
     `<div class="figspace" style="height:108px;"></div></figure>`],
    ["a callout", ".po", `<div class="po po-tip"><span>tip</span></div>`],
    ["a question head", ".qhead",
     `<div class="qhead"><span class="qnum"><b>प्र. 1</b></span></div>`],
    ["a table", ".tbl", `<table class="tbl"><tr><td>a</td></tr></table>`],
  ];

  for (const [name, sel, html] of shapes) {
    it(`renders for ${name}`, () => {
      const doc = docWith(html);
      const block = doc.querySelector<HTMLElement>(sel)!;
      expect(block, `${sel} not found in fixture`).toBeTruthy();
      const { host } = mount(doc, block);
      // Something was drawn. A thrown render leaves the host empty.
      expect(host.innerHTML.length).toBeGreaterThan(0);
    });
  }
});

describe("the clip control", () => {
  it("offers a cut on a two-row सूत्र panel", () => {
    const doc = docWith(
      `<div class="fcard"><div class="ft">सूत्र</div>` +
      `<div class="frow"><span class="fx">F = ma</span></div>` +
      `<div class="frow"><span class="fx">p = mv</span></div></div>`);
    const { host } = mount(doc, doc.querySelector<HTMLElement>(".fcard")!);
    expect(host.textContent).toContain("CUT HERE");
  });

  it("offers nothing on a one-row panel — there is no legal cut", () => {
    const doc = docWith(
      `<div class="fcard"><div class="ft">सूत्र</div>` +
      `<div class="frow"><span class="fx">F = ma</span></div></div>`);
    const { host } = mount(doc, doc.querySelector<HTMLElement>(".fcard")!);
    expect(host.textContent).not.toContain("CUT HERE");
  });

  it("offers nothing on prose", () => {
    const doc = docWith(`<p class="q">ordinary prose</p>`);
    const { host } = mount(doc, doc.querySelector<HTMLElement>("p.q")!);
    expect(host.textContent).not.toContain("CUT HERE");
  });
});


describe("the panel stays compact", () => {
  /** A six-row सूत्र panel — the case in the report, where the panel became a
   * very long scroll jammed against the window edge. */
  function sixRowPanel() {
    return docWith(
      `<div class="fcard"><div class="ft">सूत्र</div>` +
      Array.from({ length: 6 }, (_, i) =>
        `<div class="frow"><span class="fx">F${i} = m${i}a</span>` +
        `<span class="fd">caption</span></div>`).join("") +
      `</div>`);
  }

  it("names the real number of rows, so it cannot be read as the item count", () => {
    // `itemGroupFor` groups rows by their internal SHAPE and reports the
    // largest group, so a panel whose rows differ shows a smaller number
    // beside a longer clip list. Stating the row count here removes the
    // contradiction without changing what the item group is for.
    const doc = sixRowPanel();
    const { host } = mount(doc, doc.querySelector<HTMLElement>(".fcard")!);
    expect(host.textContent).toContain("6 rows");
  });

  it("offers one cut between every adjacent pair of rows", () => {
    const doc = sixRowPanel();
    const { host } = mount(doc, doc.querySelector<HTMLElement>(".fcard")!);
    expect((host.textContent!.match(/CUT HERE/g) ?? []).length).toBe(5);
  });
});


describe("joining two halves back together", () => {
  /** A head and a one-row continuation on adjacent lines — the shape the
   * build pipeline leaves behind when it splits a panel. */
  function pair() {
    return docWith(
      `<div class="fcard"><div class="ft">सूत्र</div>` +
      `<div class="frow"><span class="fx">r = mv/qB</span></div>` +
      `<div class="frow"><span class="fx">T = 2πm/qB</span></div></div>`,
    );
  }

  function withTail(doc: Document) {
    const col = doc.querySelector(".acol")!;
    const unit = doc.createElement("div");
    unit.className = "u";
    unit.innerHTML =
      `<div class="fcard fcard-cont">` +
      `<div class="frow"><span class="fx">v = qB/2πm</span></div></div>`;
    col.appendChild(unit);
    return unit.firstElementChild as HTMLElement;
  }

  it("offers the join when the HEAD is selected", () => {
    const doc = pair();
    withTail(doc);
    const { host } = mount(doc, doc.querySelector<HTMLElement>(".fcard")!);
    expect(host.textContent).toContain("Join the half below");
  });

  it("offers it when the ONE-ROW continuation is selected", () => {
    // The section used to be gated on "two or more rows", which hid the join
    // control on any single-row half — and a one-row continuation is exactly
    // what a split leaves behind.
    const doc = pair();
    const tail = withTail(doc);
    const { host } = mount(doc, tail);
    expect(host.textContent).toContain("Join this back onto the half above");
  });

  it("says the panel is half of a pair rather than offering a cut", () => {
    const doc = pair();
    const tail = withTail(doc);
    const { host } = mount(doc, tail);
    expect(host.textContent).toContain("half of a pair");
    expect(host.textContent).not.toContain("CUT HERE");
  });

  it("offers no join on a panel that is not half of anything", () => {
    const doc = pair();
    const { host } = mount(doc, doc.querySelector<HTMLElement>(".fcard")!);
    expect(host.textContent).not.toContain("Join");
  });
});


/**
 * WHERE THE PANEL SITS.
 *
 * Two earlier answers were wrong in opposite directions: pinned to the WINDOW
 * it sat across a field of empty background from the page; pinned to the
 * SELECTED BLOCK it opened on top of the sheet, because a block in the left
 * column of a two-column page has its right edge mid-sheet. It belongs beside
 * the PAGE.
 */
describe("panel placement", () => {
  function panelLeft(canvasRight: number | null, viewport: number): number {
    canvasRightForTest = canvasRight;
    Object.defineProperty(window, "innerWidth",
                          { value: viewport, configurable: true });
    const doc = docWith(`<p class="q">prose</p>`);
    const { host } = mount(doc, doc.querySelector<HTMLElement>("p.q")!);
    const aside = host.querySelector("aside") as HTMLElement;
    canvasRightForTest = null;
    return parseFloat(aside.style.left);
  }

  it("hugs the page's right edge", () => {
    // 18px past the paper: close enough to read as attached to it, and it
    // can never overlap the sheet.
    expect(panelLeft(900, 1900)).toBe(918);
  });

  it("moves with the page rather than staying at the window edge", () => {
    // A wider window centres the canvas further right; the panel follows the
    // paper instead of leaving a gap behind.
    expect(panelLeft(1200, 2400)).toBe(1218);
    expect(panelLeft(700, 2400)).toBe(718);
  });

  it("stays on screen when the window is too narrow for the gap", () => {
    // 336px wide plus a 16px margin: on a 1000px window the furthest left it
    // may sit is 648, whatever the page's edge says.
    expect(panelLeft(900, 1000)).toBe(1000 - 336 - 16);
  });

  it("never goes off the left edge either", () => {
    expect(panelLeft(-500, 1900)).toBeGreaterThanOrEqual(16);
  });

  it("falls back to the window's right edge when the canvas is unknown", () => {
    expect(panelLeft(null, 1900)).toBe(1900 - 336 - 16);
  });
});
