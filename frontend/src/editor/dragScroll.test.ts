import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { attachDragAssist } from "./dragDrop";

function fire(el: EventTarget, type: string, extra: Record<string, unknown> = {}) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  for (const [k, v] of Object.entries(extra)) {
    Object.defineProperty(ev, k, { value: v });
  }
  el.dispatchEvent(ev);
}

/**
 * DRAGGING DOWNWARDS HAS TO BE ABLE TO SCROLL.
 *
 * The canvas is sized to the whole document, so its own window has no
 * overflow and its innerHeight is the height of the entire book. Pointing
 * the edge test and the scroller at it meant the downward trigger could
 * never fire and the element it scrolled could never move: everything below
 * the fold was unreachable. Reported as "block i able to move upwards but
 * downward why i am not able to".
 */
describe("auto-scroll while dragging", () => {
  let frames: FrameRequestCallback[] = [];

  beforeEach(() => {
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });
  afterEach(() => vi.unstubAllGlobals());

  function harness(band: { top: number; bottom: number } | null, scale = 1) {
    const doc = new DOMParser().parseFromString("<body></body>", "text/html");
    const scroller = document.createElement("div");
    scroller.scrollTop = 500;
    attachDragAssist(doc, () => scroller, () => {}, () => band, () => scale);
    return { doc, scroller };
  }

  /** Runs the one queued frame, if any. */
  function tick(frames: FrameRequestCallback[]) {
    const queued = frames.splice(0, frames.length);
    queued.forEach((cb) => cb(0));
  }

  it("scrolls DOWN near the bottom of the visible band", () => {
    // The band is what is on screen — not the canvas, which is the whole book.
    const { doc, scroller } = harness({ top: 1000, bottom: 1800 });
    fire(doc, "dragover", { clientY: 1790 });
    tick(frames);
    expect(scroller.scrollTop).toBeGreaterThan(500);
  });

  it("scrolls UP near the top of the visible band", () => {
    const { doc, scroller } = harness({ top: 1000, bottom: 1800 });
    fire(doc, "dragover", { clientY: 1010 });
    tick(frames);
    expect(scroller.scrollTop).toBeLessThan(500);
  });

  it("does nothing in the middle of the band", () => {
    const { doc, scroller } = harness({ top: 1000, bottom: 1800 });
    fire(doc, "dragover", { clientY: 1400 });
    tick(frames);
    expect(scroller.scrollTop).toBe(500);
  });

  it("scrolls the OUTER element, not the canvas document", () => {
    const { doc, scroller } = harness({ top: 0, bottom: 800 });
    const before = doc.documentElement.scrollTop;
    fire(doc, "dragover", { clientY: 795 });
    tick(frames);
    expect(scroller.scrollTop).toBeGreaterThan(500);
    // The canvas has no overflow — scrolling it was always a no-op.
    expect(doc.documentElement.scrollTop).toBe(before);
  });

  it("converts a canvas-px step into outer px when the canvas is zoomed", () => {
    const half = harness({ top: 0, bottom: 800 }, 0.5);
    fire(half.doc, "dragover", { clientY: 799 });
    tick(frames);
    const halfMoved = half.scroller.scrollTop - 500;

    frames = [];
    const full = harness({ top: 0, bottom: 800 }, 1);
    fire(full.doc, "dragover", { clientY: 799 });
    tick(frames);
    const fullMoved = full.scroller.scrollTop - 500;

    // At 50% zoom the same canvas distance is half the distance on screen.
    expect(halfMoved).toBeCloseTo(fullMoved / 2, 5);
  });

  it("stops on drop", () => {
    const { doc, scroller } = harness({ top: 0, bottom: 800 });
    fire(doc, "dragover", { clientY: 795 });
    fire(doc, "drop", {});
    tick(frames);
    expect(scroller.scrollTop).toBe(500);
  });
});
