/**
 * QUESTION RUN — treat a whole question as one thing to move.
 *
 * A question is not a block. The pipeline emits it as a RUN of sibling
 * wrappers on the page:
 *
 *     .u > .qsep        the rule that closes the previous question
 *     .u > .qhead       `प्र. 2` and its marks chip
 *     .u > .q           the question text
 *     .u > .ansrow      the उत्तर label
 *     .u > .given       `दिया है :`
 *     .u > .dm          each working line
 *     .u > .po          each callout
 *
 * That is deliberate: `pack_columns` splits a long question across a column
 * boundary, which it could not do if the question were one atomic box. But it
 * means the editor had no handle for "the question" — only for its pieces. So
 * "move question 2 down" meant eight separate drags, and getting one of them
 * wrong left a question with another question's answer inside it.
 *
 * This finds the run so it can be selected, dragged and moved as a unit,
 * without changing what the pipeline emits.
 */

/** Containers whose direct children are the page's stacked units. */
const LINE_CONTAINERS = ".flowwrap, .acol, .page__cols, .page__full";

/** A unit that opens a question. */
const HEAD = ".qhead";
/** A unit that closes one. */
const SEP = ".qsep";

/** The wrapper that actually occupies a line — `.acol > .u > block`. */
export function unitOf(el: HTMLElement): HTMLElement {
  let node: HTMLElement = el;
  for (let i = 0; i < 4 && node.parentElement; i++) {
    if (node.parentElement.matches(LINE_CONTAINERS)) return node;
    node = node.parentElement;
  }
  return el;
}

const holds = (unit: Element, sel: string) =>
  !!unit.querySelector(sel) || (unit as HTMLElement).matches?.(sel);

/** Does this unit begin a new question? */
export function isQuestionHead(unit: Element): boolean {
  return holds(unit, HEAD);
}

/**
 * Every unit belonging to the question that `el` is part of, in page order.
 *
 * The leading `.qsep` travels WITH the question. Leaving it behind would put
 * two rules where the question used to be and none where it landed.
 *
 * Returns an empty array when `el` is not inside a question at all — a
 * Part-1 paragraph, a section heading — so callers can fall back to moving
 * the single block.
 */
export function questionRun(el: HTMLElement): HTMLElement[] {
  const unit = unitOf(el);
  const parent = unit.parentElement;
  if (!parent || !parent.matches(LINE_CONTAINERS)) return [];

  const units = Array.from(parent.children) as HTMLElement[];
  const at = units.indexOf(unit);
  if (at < 0) return [];

  // Walk back to this question's head.
  let start = -1;
  for (let i = at; i >= 0; i--) {
    if (isQuestionHead(units[i])) { start = i; break; }
    // A separator above us that is not ours means we were never in a
    // question — we are in the gap between two of them.
    if (i !== at && holds(units[i], SEP)) return [];
  }
  if (start < 0) return [];

  // Forward to just before the next question.
  let end = units.length;
  for (let i = start + 1; i < units.length; i++) {
    if (isQuestionHead(units[i]) || holds(units[i], SEP)) { end = i; break; }
  }

  // Take the rule that closes the previous question along with it.
  if (start > 0 && holds(units[start - 1], SEP)) start -= 1;

  return units.slice(start, end);
}

/** A short name for what is about to move, for the drop label. */
export function describeRun(run: HTMLElement[]): string {
  const head = run.map((u) => u.querySelector(".qnum b")).find(Boolean);
  const name = head?.textContent?.trim();
  return name ? `${name} (whole question)` : `${run.length} blocks`;
}

/**
 * Move a whole run so it sits before or after `targetUnit`.
 *
 * Inserted in order and as WRAPPERS, so each block keeps its own margin
 * guard — the same reason single-block reordering moves `.u`s rather than
 * blocks.
 */
export function moveRun(run: HTMLElement[], targetUnit: HTMLElement, before: boolean): boolean {
  if (!run.length) return false;
  if (run.includes(targetUnit)) return false;         // into itself
  const parent = targetUnit.parentElement;
  if (!parent) return false;
  const anchor = before ? targetUnit : targetUnit.nextSibling;
  for (const unit of run) parent.insertBefore(unit, anchor);
  return true;
}
