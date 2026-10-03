import { describe, expect, it } from "vitest";
import { serializeForSave } from "./sanitize";
import { ED, injectChromeStyles } from "./chrome";
import { attachPasteSanitizer, sanitizePastedHtml } from "./textEditing";

/**
 * Everything the editor adds to make a document editable has to come back out
 * before that document is stored or exported. This used to be skipped
 * entirely — saving serialized the live DOM verbatim, so `draggable="true"`,
 * `data-block-id`, `cursor:grab` and a red overflow outline were written into
 * every saved version and every exported chapter.
 */

function editingDocument(): Document {
  const doc = new DOMParser().parseFromString(
    `<!doctype html><html><head></head><body><div class="book">
      <div class="page"><div class="page__cols">
        <p class="text-body">Real content</p>
      </div></div>
    </div></body></html>`,
    "text/html",
  );
  injectChromeStyles(doc);
  const block = doc.querySelector<HTMLElement>(".text-body")!;
  block.dataset.blockId = "b-1";
  block.draggable = true;
  block.classList.add(ED.block, ED.multiSelected);
  block.setAttribute("contenteditable", "true");
  doc.querySelector<HTMLElement>(".page")!.classList.add(ED.overflow);
  doc.querySelector<HTMLElement>(".page")!.dataset.pageId = "page-1";
  const indicator = doc.createElement("div");
  indicator.id = "__drop_indicator__";
  doc.body.appendChild(indicator);
  return doc;
}

describe("serializeForSave", () => {
  it("removes every trace of editor scaffolding", () => {
    const out = serializeForSave(editingDocument());
    for (const leftover of [
      "data-block-id",
      "data-page-id",
      "draggable",
      "contenteditable",
      "__drop_indicator__",
      "__editor_chrome__",
      ED.block,
      ED.multiSelected,
      ED.overflow,
    ]) {
      expect(out, `"${leftover}" leaked into saved output`).not.toContain(leftover);
    }
  });

  it("preserves the document's own content and classes", () => {
    const out = serializeForSave(editingDocument());
    expect(out).toContain("Real content");
    expect(out).toContain('class="text-body"');
    expect(out).toContain('class="page"');
    expect(out).toContain('class="book"');
  });

  it("leaves the LIVE document untouched — the user is still editing it", () => {
    const doc = editingDocument();
    serializeForSave(doc);
    const block = doc.querySelector<HTMLElement>(".text-body")!;
    expect(block.dataset.blockId).toBe("b-1");
    expect(block.classList.contains(ED.block)).toBe(true);
    expect(doc.getElementById("__drop_indicator__")).not.toBeNull();
  });

  it("does not leave an empty class attribute behind", () => {
    const doc = editingDocument();
    const bare = doc.createElement("div");
    bare.className = ED.block; // only an editor class
    doc.body.appendChild(bare);
    expect(serializeForSave(doc)).not.toContain('class=""');
  });

  it("is idempotent", () => {
    const doc = editingDocument();
    const once = serializeForSave(doc);
    const twice = serializeForSave(
      new DOMParser().parseFromString(once, "text/html"),
    );
    expect(twice).toBe(once);
  });

  it("starts with a doctype", () => {
    expect(serializeForSave(editingDocument()).startsWith("<!doctype html>")).toBe(true);
  });
});

describe("sanitizePastedHtml", () => {
  const doc = new DOMParser().parseFromString("<html><body></body></html>", "text/html");

  const render = (html: string) => {
    const host = doc.createElement("div");
    host.appendChild(sanitizePastedHtml(doc, html));
    return host.innerHTML;
  };

  it("strips Word's font/colour soup while keeping the text", () => {
    const word = `<p class=MsoNormal><span style='font-family:Calibri;color:#1F497D;font-size:11.0pt'>Hello</span></p>`;
    const out = render(word);
    expect(out).toContain("Hello");
    expect(out).not.toContain("Calibri");
    expect(out).not.toContain("MsoNormal");
    expect(out).not.toContain("style");
  });

  it("keeps structural meaning — emphasis and lists", () => {
    const out = render("<p>a <strong>bold</strong> and <em>italic</em></p><ul><li>one</li></ul>");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<em>italic</em>");
    expect(out).toContain("<li>one</li>");
  });

  it("drops pasted scripts entirely", () => {
    const out = render("<p>safe</p><script>alert(1)</script>");
    expect(out).toContain("safe");
    expect(out).not.toContain("alert");
    expect(out).not.toContain("script");
  });

  it("refuses javascript: links but keeps ordinary ones", () => {
    expect(render('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript:");
    expect(render('<a href="https://example.com">x</a>')).toContain('href="https://example.com"');
  });

  it("unwraps unknown elements rather than discarding their content", () => {
    const out = render("<div><custom-tag>kept</custom-tag></div>");
    expect(out).toContain("kept");
    expect(out).not.toContain("custom-tag");
  });
});

describe("attachPasteSanitizer — pasted LaTeX", () => {
  // The REAL document, not one from DOMParser — see blockEditing.test.ts:
  // a parsed document has no browsing context, so getSelection() is null.
  const liveDoc: Document = document;

  function editableDoc(): { doc: Document; block: HTMLElement } {
    liveDoc.body.innerHTML = "<p contenteditable=\"true\">x</p>";
    const block = liveDoc.querySelector<HTMLElement>("p")!;
    // jsdom does not compute isContentEditable from the attribute — see
    // dragAssist.test.ts for the same workaround.
    Object.defineProperty(block, "isContentEditable", { value: true, configurable: true });
    return { doc: liveDoc, block };
  }

  function paste(doc: Document, block: HTMLElement, text: string) {
    const sel = doc.getSelection()!;
    const range = doc.createRange();
    range.selectNodeContents(block);
    sel.removeAllRanges();
    sel.addRange(range);

    const event = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(event, "clipboardData", {
      value: { items: [], getData: (type: string) => (type === "text/plain" ? text : "") },
    });
    block.dispatchEvent(event);
  }

  it("converts a pasted \\frac into a stacked fraction, not literal text", () => {
    const { doc, block } = editableDoc();
    const detach = attachPasteSanitizer(doc);
    paste(doc, block, "\\frac{\\mu_0}{4\\pi}");
    detach();
    expect(block.innerHTML).toContain('class="fr"');
    expect(block.innerHTML).not.toContain("\\frac");
  });

  it("leaves ordinary pasted text alone", () => {
    const { doc, block } = editableDoc();
    const detach = attachPasteSanitizer(doc);
    paste(doc, block, "just some prose");
    detach();
    expect(block.textContent).toContain("just some prose");
    expect(block.innerHTML).not.toContain('class="fr"');
  });
});

describe("drop overlays never reach the file", () => {
  it("strips the bar and its label", () => {
    // These live on <body>, not in the flow, so nothing removes them
    // structurally — they have to be named explicitly.
    const doc = new DOMParser().parseFromString(
      `<body><div class="page"><p>text</p></div>` +
      `<div id="__drop_indicator__"></div>` +
      `<div id="__drop_label__">Move above this</div>` +
      `<div id="__side_drop_indicator__"></div></body>`, "text/html");
    const saved = serializeForSave(doc);
    expect(saved).not.toContain("__drop_indicator__");
    expect(saved).not.toContain("__drop_label__");
    expect(saved).not.toContain("__side_drop_indicator__");
    expect(saved).not.toContain("Move above this");
    expect(saved).toContain("text");
  });
});

/**
 * The editor lets a page GROW so an edit can never hide content below a
 * 1527px cut (see chrome.ts). That override must never reach the saved file:
 * the book's own `overflow:hidden` is what makes a sheet a sheet in print.
 */
describe("the editor's own stylesheet", () => {
  it("is not written into a save", () => {
    const doc = new DOMParser().parseFromString(
      `<html><head></head><body><div class="page"><p>x</p></div></body></html>`,
      "text/html");
    injectChromeStyles(doc);
    // It really is injected — asserted on a rule that has no bearing on
    // layout. This used to check `min-height: 1527px`, which was part of the
    // page-box override that has since been removed outright: the editor no
    // longer resizes the sheet at all, so an opened chapter is page-for-page
    // the chapter that was built. See columnTail.test.ts.
    expect(doc.documentElement.outerHTML).toContain("__ed-");
    // And it really is gone again on the way out.
    const saved = serializeForSave(doc);
    expect(saved).not.toContain("__ed-");
    expect(saved).not.toContain("counter-increment: ed-page");
  });
})
