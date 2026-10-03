import { describe, expect, it } from "vitest";
import {
  DECORATOR_CATEGORIES,
  DECORATOR_ITEMS,
  DECOR_CLASS,
  MAX_CHARACTERS_PER_PAGE,
  MAX_DOODLES_PER_PAGE,
  decoratorsOn,
  enableDecoratorDragging,
  placeDecorator,
  resizeDecorator,
  searchDecorators,
  advisePlacement,
  type DecoratorItem,
} from "./decorators";
import { serializeForSave } from "./sanitize";
import { findBlockAncestor, stampBlockIds } from "./selection";
import { detectStructure } from "./structure";

const doodle: DecoratorItem = {
  id: "science/beaker", name: "Beaker", category: "science",
  categoryLabel: "Science", url: "/decorators/science/beaker.webp",
  thumb: "/decorators/thumbs/science/beaker.webp",
  width: 220, height: 240, role: "doodle",
};
const character: DecoratorItem = { ...doodle, id: "students/boy-clapping",
  name: "Boy clapping", category: "students", categoryLabel: "Students",
  role: "character" };

function pageWith(html: string): { doc: Document; page: HTMLElement } {
  const doc = new DOMParser().parseFromString(
    `<div class="page" style="position:relative">${html}</div>`, "text/html");
  return { doc, page: doc.querySelector(".page") as HTMLElement };
}

describe("decorator library", () => {
  it("exports every decorator in the repo, grouped", () => {
    expect(DECORATOR_ITEMS.length).toBe(130);
    expect(DECORATOR_CATEGORIES.length).toBe(6);
    // The counts must add up, or the panel's category chips lie.
    const summed = DECORATOR_CATEGORIES.reduce((n, c) => n + c.count, 0);
    expect(summed).toBe(DECORATOR_ITEMS.length);
  });

  it("separates people from objects, which the policy treats differently", () => {
    const chars = DECORATOR_ITEMS.filter((i) => i.role === "character");
    // students + teacher-poses: a person needs far more room than a beaker.
    expect(chars.length).toBe(57);
    expect(chars.every((c) => ["students", "teacher-poses"].includes(c.category))).toBe(true);
  });

  it("searches by readable name, not just filename", () => {
    // A teacher hunting for exam badges would never type
    // `teacher-callouts/asked-in-exam`.
    expect(searchDecorators("exam", null).length).toBeGreaterThan(0);
    expect(searchDecorators("", "science").every((i) => i.category === "science")).toBe(true);
    expect(searchDecorators("zzzz", null)).toHaveLength(0);
  });
});

describe("placing a decorator", () => {
  it("goes on top of the page, never into the content flow", () => {
    const { doc, page } = pageWith(`<div class="u"><p class="para">One</p></div>` +
      `<div class="u"><p class="para">Two</p></div>`);
    const before = Array.from(page.children).map((c) => c.outerHTML);

    placeDecorator(doc, page, doodle, "data:image/webp;base64,AAA",
      { left: 40, top: 900, width: 200 });

    // THE safety property. `.page` is `height:1527px; overflow:hidden` and
    // pagination is not re-run, so anything that displaced a block would push
    // content off the sheet and it would be silently clipped.
    const after = Array.from(page.children).map((c) => c.outerHTML);
    expect(after.slice(0, before.length)).toEqual(before);

    const art = page.querySelector(`.${DECOR_CLASS}`) as HTMLElement;
    expect(art.style.position).toBe("absolute");
    expect(page.lastElementChild).toBe(art);
  });

  it("keeps the aspect ratio adjustable by width alone", () => {
    const { doc, page } = pageWith("");
    const art = placeDecorator(doc, page, doodle, "data:image/webp;base64,AAA",
      { left: 0, top: 0, width: 180 });
    expect(art.style.width).toBe("180px");
    expect(art.style.height).toBe("auto");
  });

  it("survives the save sanitizer", () => {
    // `__ed-`-prefixed classes are stripped on save. A decorator is real
    // content, so its class must NOT be in that namespace.
    expect(DECOR_CLASS.startsWith("__ed-")).toBe(false);
    const { doc, page } = pageWith("");
    placeDecorator(doc, page, doodle, "data:image/webp;base64,AAA",
      { left: 10, top: 10, width: 100 });
    const saved = serializeForSave(doc);
    expect(saved).toContain(DECOR_CLASS);
    expect(saved).toContain("data:image/webp;base64,AAA");
  });

  it("tracks what is already on the page", () => {
    const { doc, page } = pageWith("");
    placeDecorator(doc, page, doodle, "d", { left: 0, top: 0, width: 10 });
    placeDecorator(doc, page, character, "d", { left: 0, top: 0, width: 10 });
    expect(decoratorsOn(page)).toHaveLength(2);
  });
});

describe("dragging placed art", () => {
  it("turns OFF the flow-reorder drag it would otherwise inherit", () => {
    const { doc, page } = pageWith("");
    const art = placeDecorator(doc, page, doodle, "d", { left: 0, top: 0, width: 10 });
    // makeBlocksDraggable() sets draggable=true on everything it stamps.
    art.setAttribute("draggable", "true");

    enableDecoratorDragging(doc, () => {});

    // HTML5 drag would try to REPARENT the art into a block, which is either
    // a no-op or pushes text off a fixed-height page. Free x/y drag replaces it.
    expect(art.getAttribute("draggable")).toBe("false");
    expect(art.style.cursor).toBe("move");
  });

  it("arms each decorator once, however often it is called", () => {
    const { doc, page } = pageWith("");
    placeDecorator(doc, page, doodle, "d", { left: 0, top: 0, width: 10 });
    enableDecoratorDragging(doc, () => {});
    const off = enableDecoratorDragging(doc, () => {});
    // restampAfterMutation runs on every mutation; re-adding a listener each
    // time would stack them and make one drag jump several times.
    off();
    expect(doc.querySelectorAll(`.${DECOR_CLASS}`)).toHaveLength(1);
  });
});

describe("resizing placed art", () => {
  it("scales by width and keeps the ratio", () => {
    const { doc, page } = pageWith("");
    const art = placeDecorator(doc, page, doodle, "d", { left: 0, top: 0, width: 200 });
    art.style.height = "300px";              // a previous free stretch
    resizeDecorator(art, 120);
    expect(art.style.width).toBe("120px");
    // Back to auto, so a corner drag never fights the image's aspect ratio.
    expect(art.style.height).toBe("auto");
  });

  it("refuses to shrink art to nothing", () => {
    const { doc, page } = pageWith("");
    const art = placeDecorator(doc, page, doodle, "d", { left: 0, top: 0, width: 200 });
    resizeDecorator(art, -50);
    expect(parseFloat(art.style.width)).toBeGreaterThan(0);
  });
});

describe("selecting placed art", () => {
  it("is stamped as a block so a click can select it", () => {
    const { doc, page } = pageWith("");
    const art = placeDecorator(doc, page, doodle, "d", { left: 0, top: 0, width: 10 });
    stampBlockIds(doc, detectStructure(doc));
    // Art sits directly on the `.page`, outside the block containers, so
    // collectBlocks never returned it — it could be placed and dragged but
    // never re-selected to resize or delete.
    expect(art.hasAttribute("data-block-id")).toBe(true);
    expect(findBlockAncestor(art)).toBe(art);
  });
});

describe("placement advice", () => {
  // jsdom performs no layout, so every rect is 0x0 — the slack figure itself
  // can only be checked in a real browser. The DENSITY half of the policy is
  // pure counting and is fully testable here.
  it("warns once a page has its fill of doodles", () => {
    const { doc, page } = pageWith("");
    for (let i = 0; i < MAX_DOODLES_PER_PAGE; i++) {
      placeDecorator(doc, page, doodle, "d", { left: 0, top: 0, width: 10 });
    }
    const advice = advisePlacement(page, doodle);
    expect(advice.ok).toBe(false);
    expect(advice.warnings.join(" ")).toMatch(/already has 2 doodles/);
  });

  it("warns once a page has its one character", () => {
    const { doc, page } = pageWith("");
    for (let i = 0; i < MAX_CHARACTERS_PER_PAGE; i++) {
      placeDecorator(doc, page, character, "d", { left: 0, top: 0, width: 10 });
    }
    const advice = advisePlacement(page, character);
    expect(advice.warnings.join(" ")).toMatch(/already has 1 character/);
  });

  it("does not count art already placed as content", () => {
    // Otherwise the first decorator would make the page look full and every
    // one after it would be reported as crowding content that isn't there.
    const { doc, page } = pageWith("");
    placeDecorator(doc, page, doodle, "d", { left: 0, top: 0, width: 10 });
    expect(advisePlacement(page, doodle).slackPx).toBe(
      advisePlacement(pageWith("").page, doodle).slackPx,
    );
  });
});
