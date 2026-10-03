import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * A React component must call the same hooks in the same order on every
 * render. `BookEditor` returns early while the book is still loading, so any
 * hook placed BELOW that return does not run on the first pass and does run on
 * the second — a different count, which React throws on, unmounting the tree.
 *
 * The symptom is a completely blank editor page that says nothing about the
 * cause. It has happened twice: once with the picture-selection ring, once
 * with the page-fullness and insert-destination hooks. Both times it looked
 * like a server or data problem and was neither.
 *
 * This is a static check because the failure needs a real React render to
 * reproduce, and by then it is a blank screen rather than a test failure.
 */
const SOURCE = resolve(__dirname, "../pages/BookEditor.tsx");
const HOOK = /\buse(Effect|State|Memo|Callback|Ref|LayoutEffect)\s*\(/g;

describe("BookEditor hook order", () => {
  it("declares every hook above the early return", () => {
    const src = readFileSync(SOURCE, "utf-8");
    const guard = src.indexOf("  if (!book) {");
    expect(guard).toBeGreaterThan(0);        // the early return still exists

    const after = src.slice(guard);
    const offenders = Array.from(after.matchAll(HOOK)).map((m) => {
      const line = src.slice(0, guard + (m.index ?? 0)).split("\n").length;
      return `line ${line}: use${m[1]}(`;
    });
    expect(offenders).toEqual([]);
  });
});
