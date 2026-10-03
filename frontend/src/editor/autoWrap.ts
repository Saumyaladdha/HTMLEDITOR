/**
 * AUTO-WRAP — a picture made smaller should let the text move in beside it.
 *
 * Everything in a chapter is flow content: a block takes the whole column and
 * the next one starts underneath. That is right for a full-width figure and
 * wrong the moment you shrink one. Resizing a figure from 944px to 320px used
 * to leave the OTHER 600px of that line permanently blank — the figure kept
 * the whole line to itself — and pushed every following block further down
 * the page. Reported as "I made the image smaller but it just left so much
 * empty space at the side and shifted the content down".
 *
 * The fix is not new layout machinery. The pipeline's own CSS already has
 * `.figcard.fig-left { float:left; width:40% }`, and `.flowwrap .u` is a
 * plain block rather than a flow-root, so a float there genuinely does let
 * the following blocks' lines run up beside it and close underneath. Nothing
 * ever applied it automatically, and a control buried in a collapsed panel
 * section is not something a user finds mid-resize.
 *
 * So the width slider decides. Shrink a figure past the threshold and the
 * text wraps beside it; widen it back and it takes the line again. Both are
 * ordinary class changes, undoable, and overridable from the panel.
 */

/** Below this share of the line, a block is leaving enough room beside it to
 * be worth filling. Two thirds: at 70% the remaining strip is too narrow for
 * readable text, which is the same reason the paired-block floor exists. */
export const WRAP_BELOW = 0.66;

/** And the freed strip has to be genuinely usable — the side-by-side floor. */
export const MIN_WRAP_STRIP = 150;

export interface FloatOption { class: string; side: "left" | "right"; label: string }

/** The float currently applied, if any. */
export function currentFloat(block: HTMLElement, floats: FloatOption[]): FloatOption | null {
  return floats.find((f) => block.classList.contains(f.class)) ?? null;
}

/**
 * Whether this block is even a candidate for wrapping.
 *
 * A block that is paired, lifted onto the page, or sitting in a Part-2
 * column is excluded. The column case is not a style preference: `.acol .u`
 * is `display:flow-root`, which CONTAINS a float by definition, so the text
 * would not wrap and the only visible effect would be the figure jumping.
 */
export function canWrapBeside(block: HTMLElement, floats: FloatOption[]): boolean {
  if (!floats.length) return false;
  if (block.closest(".acol")) return false;
  if (block.closest(".sxs")) return false;
  if (block.style.position === "absolute") return false;
  return !!nextTextBlock(block);
}

/** The block that would flow into the freed space. Without one there is
 * nothing to wrap, and floating would only move the figure. */
function nextTextBlock(block: HTMLElement): HTMLElement | null {
  let unit: HTMLElement = block;
  while (unit.parentElement && !unit.parentElement.matches(".flowwrap, .page__cols, .page__full")) {
    unit = unit.parentElement;
    if (unit === block.ownerDocument.body) return null;
  }
  let sib = unit.nextElementSibling as HTMLElement | null;
  while (sib) {
    if ((sib.textContent ?? "").trim().length > 40) return sib;
    sib = sib.nextElementSibling as HTMLElement | null;
  }
  return null;
}

/** What share of its line the block currently takes, 0–1. */
export function lineShare(block: HTMLElement): number {
  const container = block.closest<HTMLElement>(".flowwrap, .page__cols, .page__full");
  const full = container?.getBoundingClientRect().width ?? 0;
  if (full <= 0) return 1;
  return block.getBoundingClientRect().width / full;
}

export type WrapChange = { applied: FloatOption } | { removed: FloatOption } | null;

/**
 * Bring the text alongside a shrunken block, or send it back below a widened
 * one. Returns what changed so the caller can say so — a layout that changes
 * itself without a word is indistinguishable from a bug.
 *
 * The side is chosen by where the block already sits: one on the right of the
 * line keeps its side, so nothing jumps across the page under the cursor.
 */
export function fitBesideNeighbour(block: HTMLElement, floats: FloatOption[]): WrapChange {
  const active = currentFloat(block, floats);
  if (!canWrapBeside(block, floats)) {
    // A block that can no longer wrap must not keep a stale float — it would
    // be floating with nothing beside it.
    if (active && !block.closest(".sxs")) return null;
    return null;
  }

  const container = block.closest<HTMLElement>(".flowwrap, .page__cols, .page__full")!;
  const full = container.getBoundingClientRect().width;
  const rect = block.getBoundingClientRect();
  const share = full > 0 ? rect.width / full : 1;

  if (share > WRAP_BELOW || full - rect.width < MIN_WRAP_STRIP) {
    if (!active) return null;
    block.classList.remove(active.class);
    return { removed: active };
  }
  if (active) return null;

  // Sitting past the middle of the line: float right, so it stays where it is.
  const contRect = container.getBoundingClientRect();
  const pastMiddle = rect.left - contRect.left > full / 2;
  const want = floats.find((f) => f.side === (pastMiddle ? "right" : "left")) ?? floats[0];
  block.classList.add(want.class);
  return { applied: want };
}
