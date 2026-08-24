import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { collectBlocks, detectStructure } from "./structure";
import { parseDocument, serializeDocument } from "./model";
import { discoverTemplates } from "./blockTemplates";

/**
 * End-to-end check on real JavaScript-rendered bundles.
 *
 * These files ship with no editable markup at all — their content is
 * unpacked and rendered by React on load, so as uploaded they contain one
 * line ("This page requires JavaScript to display") and nothing else. The
 * backend detects that and renders them once, server-side, into static HTML
 * (see html_flatten.py). This asserts that what comes out of that step is
 * something the editor can genuinely work with.
 */
const FILES = [
  ["Vidyut Quick Notes", "/tmp/flat_Vidyut.html"],
  ["adhyay-1 page 5", "/tmp/flat_adhyay.html"],
] as const;

for (const [label, path] of FILES) {
  const suite = existsSync(path) ? describe : describe.skip;
  suite(`flattened bundle: ${label}`, () => {
    const html = existsSync(path) ? readFileSync(path, "utf-8") : "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    const structure = detectStructure(doc);
    const blocks = collectBlocks(doc, structure);

    it("carries no scripts — they must not re-run and overwrite edits", () => {
      expect(doc.querySelectorAll("script")).toHaveLength(0);
    });

    it("gets a coherent editing mode", () => {
      // Either mode is legitimate here and is decided by the document, not
      // assumed: "adhyay-1-page-5-standalone" really does render a single
      // `.page` div, so reporting it as paginated (one page) is correct,
      // while the Quick Notes export has no pages and is flow. What matters
      // is that whichever mode is chosen, the structure is self-consistent.
      expect(["flow", "paginated"]).toContain(structure.mode);
      if (structure.mode === "paginated") {
        expect(structure.pageSelector).toBeTruthy();
      } else {
        expect(structure.pageSelector).toBeNull();
      }
    });

    it("yields a workable number of editable blocks", () => {
      expect(blocks.length).toBeGreaterThan(20);
    });

    it("blocks contain the document's real text", () => {
      const text = blocks.map((b) => b.textContent ?? "").join(" ");
      expect(text.replace(/\s+/g, " ").trim().length).toBeGreaterThan(1000);
    });

    it("no single block swallows the whole document", () => {
      // A block containing everything means inference failed and the user
      // would be editing one giant blob.
      const total = (doc.body.textContent ?? "").trim().length;
      const largest = Math.max(...blocks.map((b) => (b.textContent ?? "").trim().length));
      expect(largest).toBeLessThan(total * 0.9);
    });

    it("round-trips through the model without losing content", () => {
      const before = (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
      const out = serializeDocument(parseDocument(html));
      const after = (new DOMParser().parseFromString(out, "text/html").body.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim();
      expect(after).toBe(before);
    });

    it("offers components discovered from the document itself", () => {
      // Not asserting a count — a design-canvas export may legitimately have
      // no repeated component. Just that discovery runs cleanly on it.
      expect(() => discoverTemplates(blocks)).not.toThrow();
    });
  });
}
