import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { detectStructure, collectBlocks, collectPages } from "./structure";
import { stampBlockIds, findBlockAncestor, findSubPart, findFigureImageSlot } from "./selection";
import { registryEntryFor, isImageSubPart } from "./propertyRegistry";
import { manifestElementFor, documentUsesManifest } from "./manifest";
import { discoverTemplates } from "./blockTemplates";
import { pairUnit, pairRefusal } from "./dragDrop";

const html = readFileSync(
  "/Users/saumyaladdha/bookGeneration_AutomatedFlow/HTML_Automation/build/chapter-02-build.html",
  "utf-8",
);

const doc = new DOMParser().parseFromString(html, "text/html");
const structure = detectStructure(doc);
stampBlockIds(doc, structure);
const blocks = collectBlocks(doc, structure);

const problems: string[] = [];
const note = (s: string) => problems.push(s);

/**
 * A STANDING AUDIT of the editor against whatever the pipeline emits today.
 *
 * Every individual check here was once a real report — "I can't edit the
 * cover", "I don't know where inserted blocks go", "nothing happens when I
 * click this". Each turned out to be an element the editor could select but
 * not name, which is invisible from the code and obvious from this list.
 *
 * It prints rather than asserting a fixed number, because the right count is
 * whatever today's design has. Read the REPORT output after changing either
 * side: a class appearing here means the editor will fall back to editing
 * the whole block, which is the failure the element manifest exists to end.
 */
describe("AUDIT: the editor against the current pipeline output", () => {
  it("every block is selectable", () => {
    const orphan = blocks.filter((b) => !findBlockAncestor(b));
    if (orphan.length) note(`${orphan.length} block(s) cannot be selected`);
    expect(true).toBe(true);
  });

  it("every block class is known to the manifest", () => {
    const unknown = new Map<string, number>();
    for (const b of blocks) {
      if (!manifestElementFor(b)) {
        const cls = Array.from(b.classList)[0] ?? "(no class)";
        unknown.set(cls, (unknown.get(cls) ?? 0) + 1);
      }
    }
    for (const [cls, n] of [...unknown].sort((a, b) => b[1] - a[1])) {
      note(`manifest has no entry for .${cls} (${n} blocks) -> falls back to whole-block editing`);
    }
    expect(true).toBe(true);
  });

  it("every block offers at least one editable region or control", () => {
    const bare = new Map<string, number>();
    for (const b of blocks) {
      const { entry } = registryEntryFor(b);
      const hasParts = Object.keys(entry.subParts ?? {}).length > 0;
      const hasControls = (entry.styleControls ?? []).length > 0;
      if (!hasParts && !hasControls) {
        const cls = Array.from(b.classList)[0] ?? "(no class)";
        bare.set(cls, (bare.get(cls) ?? 0) + 1);
      }
    }
    for (const [cls, n] of [...bare].sort((a, b) => b[1] - a[1])) {
      note(`.${cls} (${n}) has no editable region AND no control — nothing to do once selected`);
    }
    expect(true).toBe(true);
  });

  it("figures resolve a picture slot", () => {
    const figs = Array.from(doc.querySelectorAll<HTMLElement>(".figcard"));
    const bad = figs.filter((f) => !findFigureImageSlot(f));
    if (bad.length) note(`${bad.length}/${figs.length} figures resolve no picture slot`);
    const notImage = figs.filter((f) => {
      const slot = findFigureImageSlot(f);
      return slot && !isImageSubPart(f, slot, registryEntryFor(f).entry);
    });
    if (notImage.length) note(`${notImage.length} figures: slot found but image controls will not show`);
    expect(true).toBe(true);
  });

  it("blocks can be paired side by side", () => {
    let refused = 0;
    for (const b of blocks.slice(0, 200)) {
      const unit = pairUnit(b);
      const prev = unit.previousElementSibling as HTMLElement | null;
      if (prev && pairRefusal(prev, b)) refused += 1;
    }
    if (refused > 0) note(`${refused}/200 sampled blocks refuse side-by-side pairing`);
    expect(true).toBe(true);
  });

  it("the insert palette offers the document's own elements", () => {
    const templates = discoverTemplates(blocks);
    const offered = new Set(templates.map((t) => t.label));
    note(`palette offers ${offered.size} element(s) from this document`);
    expect(templates.length).toBeGreaterThan(0);
  });

  it("REPORT", () => {
    console.log("\n================ AUDIT =================");
    console.log(`document: ${collectPages(doc, structure).length} pages, ${blocks.length} blocks`);
    console.log(`recognised as a pipeline chapter: ${documentUsesManifest(doc)}`);
    console.log("----------------------------------------");
    if (problems.length === 0) console.log("no problems found");
    problems.forEach((p, i) => console.log(`${String(i + 1).padStart(2)}. ${p}`));
    console.log("========================================\n");
    expect(true).toBe(true);
  });
});
