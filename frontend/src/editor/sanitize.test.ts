import { describe, expect, it } from "vitest";
import { serializeForSave } from "./sanitize";
import { ED, injectChromeStyles } from "./chrome";
import { sanitizePastedHtml } from "./textEditing";

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
