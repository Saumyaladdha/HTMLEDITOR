import { describe, expect, it } from "vitest";
import { isTransparent, isUnset } from "../components/StyleInspector/StyleInspector";

describe("reading a computed style honestly", () => {
  it("knows a value the stylesheet never set", () => {
    // These are NOT zero. Treating them as zero is what showed line-height as
    // 0.8 (the slider's own minimum) on text the stylesheet had set, and
    // padding as 0px on a card that plainly has some.
    expect(isUnset("normal")).toBe(true);
    expect(isUnset("")).toBe(true);
    expect(isUnset("auto")).toBe(true);
    expect(isUnset("none")).toBe(true);
    expect(isUnset("18.5px")).toBe(false);
    expect(isUnset("1.6")).toBe(false);
  });

  it("knows transparent from black", () => {
    // `rgba(0,0,0,0)` is "paints nothing" and was being shown as a solid
    // black swatch on every unstyled block.
    expect(isTransparent("rgba(0, 0, 0, 0)")).toBe(true);
    expect(isTransparent("rgb(0, 0, 0)")).toBe(false);
    expect(isTransparent("rgba(200, 30, 30, 1)")).toBe(false);
    expect(isTransparent("#ffffff")).toBe(false);
  });
});
