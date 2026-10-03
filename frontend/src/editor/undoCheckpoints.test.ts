import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * ONE GESTURE, ONE UNDO STEP.
 *
 * `commitToModel` pushes the PREVIOUS model onto the history and then adopts
 * the live DOM as the current one. So calling it twice in a row pushes the
 * post-change state as well, and the top of the history becomes the state
 * already on screen: Ctrl+Z restores what is already there and appears to do
 * nothing, and only a second press actually undoes anything.
 *
 * That is what `commitNow` did — it called `flushPendingCommit()` (which
 * itself commits, when a debounced commit is waiting) and then
 * `commitToModel()` unconditionally. Every drag left a dead step in the
 * history. Reported as "I am not able to Ctrl+Z easily".
 *
 * The sequencing lives inside the BookEditor component and cannot be reached
 * from a unit test, so it is guarded here at the source. A shape assertion is
 * a poor substitute for exercising the code, and it is much better than
 * leaving the invariant unguarded after it has already been broken once.
 */
/** The body with its comments removed.
 *
 * The comments in these functions name the very calls being counted — they
 * explain the bug that made the count matter — so counting them would make
 * the assertion depend on the prose around the code. */
function code(body: string): string {
  return body.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

function bodyOf(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found — was it renamed?`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

const SOURCE = readFileSync(
  resolve(__dirname, "../pages/BookEditor.tsx"), "utf8");

describe("commitNow", () => {
  it("exists — every structural move routes through it", () => {
    expect(() => bodyOf(SOURCE, "commitNow")).not.toThrow();
  });

  it("does not flush AND commit on the same path", () => {
    const body = code(bodyOf(SOURCE, "commitNow"));
    const flushes = (body.match(/flushPendingCommit\(\)/g) ?? []).length;
    const commits = (body.match(/commitToModel\(\)/g) ?? []).length;
    expect(flushes).toBe(1);
    expect(commits).toBe(1);
    // The flush must end the function: `flushPendingCommit` already performs
    // one commit, so anything after it is a second checkpoint.
    expect(body).toMatch(/flushPendingCommit\(\);\s*return;/);
    // ...and the commit must come after that early return, not before it.
    expect(body.indexOf("commitToModel()"))
      .toBeGreaterThan(body.indexOf("flushPendingCommit()"));
  });

  it("is what a drag uses, not the debounced markDirty", () => {
    // markDirty defers through a 400ms timer, which is right for typing and
    // wrong for a move: two drags inside the window collapsed into a single
    // checkpoint, so one Ctrl+Z undid both.
    expect(SOURCE).toMatch(/attachDragReorder\(doc, structure, \(\) => \{ commitNow\(\)/);
    expect(SOURCE).toMatch(/attachNestedItemReorder\(doc, \(\) => \{ commitNow\(\)/);
  });
});

describe("undo", () => {
  it("lands any debounced checkpoint before popping the history", () => {
    // Otherwise the most recent edits were never recorded and undo skips
    // straight past them.
    const body = code(bodyOf(SOURCE, "undo"));
    expect(body.indexOf("flushPendingCommit()"))
      .toBeLessThan(body.indexOf("historyRef.current.pop()"));
  });

  it("refuses a corrupted snapshot rather than rendering it", () => {
    expect(bodyOf(SOURCE, "undo")).toContain("isSnapshotSane");
  });
});
