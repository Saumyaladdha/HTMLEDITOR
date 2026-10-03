/**
 * Adding, duplicating and removing the repeated items inside a box.
 *
 * The reading-order card has five numbered steps; a teacher who wants a sixth
 * had no way to get one. Nor could they add a line to a sticky note, a row to
 * a सूत्र panel, a bullet to a list, or another exam stamp to a heading. The
 * only tools were "edit this text" and "delete the whole block", so growing a
 * box meant hand-editing HTML — exactly what this editor exists to avoid.
 *
 * A NEW ITEM IS CLONED FROM AN EXISTING ONE, never built from a template
 * here. The pipeline's markup carries structure the editor should not have to
 * know: a step is `.cvstep > .cvn + span`, a formula row is
 * `.frow > .fx + .fd + .fc`, a callout line is `.ci > .b + span`. Cloning the
 * neighbour reproduces all of it, keeps the classes the stylesheet needs, and
 * stays correct for elements added to the library long after this was written.
 *
 * Only the TEXT is cleared, and only in leaves — so an auto-numbered badge,
 * an icon or a coloured bullet survives into the new item while the words a
 * teacher must replace do not.
 */

/** Marks items the drag layer discovered — see dragDrop.makeNestedItemsDraggable. */
const ITEM_ATTR = "data-nested-item";

/** Text short enough to be a marker rather than content: a step number, a
 * bullet glyph, a tick. Cleared text is what the user types over, and blanking
 * a `1` or a `✓` would throw away the card's own numbering. */
const MARKER_MAX = 3;

export interface ItemGroup {
  /** The element the items sit in. */
  container: HTMLElement;
  /** Every sibling of the same shape, in document order. */
  items: HTMLElement[];
  /** Human label for the button — "step", "line", "row". */
  noun: string;
}

/** Nouns worth saying out loud, by the container's class. Anything unlisted
 * falls back to "item", which is honest rather than wrong. */
const NOUNS: Record<string, string> = {
  cvsteps: "step",
  cvtiles: "tile",
  callout: "line",
  fcard: "formula",
  bl: "bullet",
  nl: "step",
  opts: "option",
  sechead: "exam tag",
  // The seal beside a topic name, and the exam-paper tags under a question
  // head. Both are containers of ONE thing as often as of several, which is
  // why they are named: "add another item" said nothing useful about either.
  "topic-heading": "seal",
  "paper-refs": "paper tag",
  "question-meta": "paper tag",
  figrow: "figure",
  cvgrid: "card",
  cvcol: "card",
};

function nounFor(container: Element): string {
  for (const cls of Array.from(container.classList)) {
    if (NOUNS[cls]) return NOUNS[cls];
  }
  return "item";
}

function signature(el: Element): string {
  return el.tagName + "|" + Array.from(el.classList).sort().join(".");
}

/**
 * The repeated group `el` belongs to, or the one it contains.
 *
 * Called with either a nested item (the user clicked one line) or the block
 * around them (they clicked the card), because both should offer "add
 * another" — a user does not distinguish "I selected the card" from "I
 * selected a line in the card" when what they want is a sixth line.
 */
export function itemGroupFor(el: HTMLElement): ItemGroup | null {
  const own = el.closest<HTMLElement>(`[${ITEM_ATTR}]`);
  if (own && own.parentElement) {
    const sig = signature(own);
    const items = (Array.from(own.parentElement.children) as HTMLElement[])
      .filter((c) => signature(c) === sig);
    if (items.length >= 1) {
      return { container: own.parentElement, items, noun: nounFor(own.parentElement) };
    }
  }

  // Nothing selected IS an item, so look for the largest group inside. A card
  // with five steps and two stray children should offer to add a step.
  let best: ItemGroup | null = null;
  const consider = (parent: HTMLElement) => {
    const kids = Array.from(parent.children) as HTMLElement[];
    const bySig = new Map<string, HTMLElement[]>();
    for (const k of kids) {
      if (!k.hasAttribute(ITEM_ATTR)) continue;
      const arr = bySig.get(signature(k)) ?? [];
      arr.push(k);
      bySig.set(signature(k), arr);
    }
    for (const items of bySig.values()) {
      if (items.length >= 2 && (!best || items.length > best.items.length)) {
        best = { container: parent, items, noun: nounFor(parent) };
      }
    }
  };
  consider(el);
  (Array.from(el.children) as HTMLElement[]).forEach(consider);
  return best;
}

/** Empties the words out of a cloned item, keeping its markers.
 *
 * Walks to the LEAVES so nested structure survives: a step keeps its numbered
 * badge and loses its sentence, a formula row keeps its three boxes and loses
 * their contents. */
function blankText(el: HTMLElement) {
  const leaves = el.querySelectorAll<HTMLElement>("*");
  if (leaves.length === 0) {
    el.textContent = "";
    return;
  }
  let clearedSomething = false;
  leaves.forEach((leaf) => {
    if (leaf.children.length > 0) return;              // structural, not text
    const text = (leaf.textContent ?? "").trim();
    if (!text || text.length <= MARKER_MAX) return;    // a number, a tick, a bullet
    leaf.textContent = "";
    clearedSomething = true;
  });
  // An item whose text sits directly on it rather than in a child — clearing
  // nothing at all would give the user a duplicate to hunt through instead of
  // an empty row to type into.
  if (!clearedSomething) {
    Array.from(el.childNodes).forEach((n) => {
      if (n.nodeType === 3 && (n.textContent ?? "").trim().length > MARKER_MAX) {
        n.textContent = "";
      }
    });
  }
}

/**
 * Adds another item to a group, cloned from `after` (or the last one).
 *
 * Returns the new element so the caller can select and focus it — landing the
 * caret in the new row is the difference between "it added something
 * somewhere" and "I can type now".
 */
export function addItem(group: ItemGroup, after?: HTMLElement | null): HTMLElement {
  const model = after && group.items.includes(after)
    ? after
    : group.items[group.items.length - 1];
  const clone = model.cloneNode(true) as HTMLElement;
  // Editor bookkeeping must never be cloned: a duplicated id makes two
  // elements answer to the same selection.
  clone.removeAttribute("data-block-id");
  blankText(clone);
  model.after(clone);
  // Renumbering is done HERE rather than left to the caller. Every call site
  // held an ItemGroup captured before the mutation, and a stale `items` array
  // made the renumber silently no-op — the visible symptom was a card whose
  // steps ran 1,2,3,4,5,5,6,5.
  renumberAround(clone);
  return clone;
}

/**
 * Splits a box in two at `row`: that row and every one after it move into a
 * fresh copy of the box, returned for the caller to place.
 *
 * WHY A BOX HAS TO BE SPLITTABLE AT ALL. A nested row can be reordered among
 * its own siblings and nowhere else — `attachNestedItemReorder` refuses a
 * drop whose target has a different parent, deliberately, because an MCQ
 * option dropped into a सूत्र panel is never what anyone meant. The cost is
 * that four options are one indivisible object: when a column has room for
 * two of them and not four, the whole block goes to the next column and the
 * room is wasted. "They are still stuck together."
 *
 * Splitting gives the four options the only thing they were missing — a
 * seam. Two blocks of two can be paged independently, and each is still an
 * ordinary `.opts` box, so everything that works on one works on both.
 *
 * The container is cloned SHALLOW and refilled, so whatever classes, inline
 * styles and attributes the pipeline put on it come along; only the rows
 * move, and they move as they are, text and all.
 */
export function splitItemGroup(group: ItemGroup, row: HTMLElement): HTMLElement | null {
  const at = group.items.indexOf(row);
  if (at <= 0) return null;               // nothing above it to split from
  const clone = group.container.cloneNode(false) as HTMLElement;
  clone.removeAttribute("data-block-id");
  clone.removeAttribute(ITEM_ATTR);
  // From `row` to the end of the container, not just the matching items: a
  // divider or a trailing note between two rows belongs with the rows that
  // follow it, and leaving it behind would strand it under an empty half.
  let node: Element | null = row;
  while (node) {
    const next: Element | null = node.nextElementSibling;
    clone.appendChild(node);
    node = next;
  }
  renumberAround(clone.firstElementChild as HTMLElement ?? clone);
  return clone;
}

/** Copies an item, text and all — for a line that is nearly the same as one
 * already there, which is more often what is wanted than a blank. */
export function duplicateItem(item: HTMLElement): HTMLElement {
  const clone = item.cloneNode(true) as HTMLElement;
  clone.removeAttribute("data-block-id");
  item.after(clone);
  renumberAround(clone);
  return clone;
}

/** Removes an item. Refuses to remove the last one: a box with no rows at all
 * usually looks broken, and the block-level delete is the way to remove the
 * whole thing. */
export function removeItem(group: ItemGroup, item: HTMLElement): boolean {
  // Counted from the DOM, not from the captured snapshot, which may predate
  // several adds.
  const live = refreshGroup(group);
  if (live.items.length <= 1) return false;
  const container = item.parentElement;
  item.remove();
  if (container) renumberAround(container.firstElementChild as HTMLElement | null);
  return true;
}

/** Moves an item one place up or down among its siblings. */
export function moveItem(item: HTMLElement, dir: -1 | 1): boolean {
  const sibling = dir === -1 ? item.previousElementSibling : item.nextElementSibling;
  if (!sibling) return false;
  if (dir === -1) sibling.before(item);
  else sibling.after(item);
  renumberAround(item);
  return true;
}

/** Where the caret should land inside a freshly-added row.
 *
 * A row usually opens with a marker its author never types into — a numbered
 * badge, a `✗`, a circled digit. The first EMPTY leaf is the slot `addItem`
 * cleared for new text; falling back to the last leaf, then the row itself,
 * keeps this safe for shapes that carry their text directly.
 */
export function firstTextSlot(row: HTMLElement): HTMLElement {
  const leaves = Array.from(row.querySelectorAll<HTMLElement>("*"))
    .filter((el) => el.children.length === 0);
  return leaves.find((el) => !(el.textContent ?? "").trim()) ?? leaves[leaves.length - 1] ?? row;
}


// Circled digits ①..⑳, which the Derivation Steps notes use. Kept as a range
// rather than a list so the arithmetic below is just an offset.
const CIRCLED_FIRST = 0x2460;
const CIRCLED_LAST = 0x2473;

/** Reads a marker as a number, whatever glyphs it is written in. */
function markerValue(text: string): number | null {
  const t = text.trim();
  if (/^\d{1,3}$/.test(t)) return parseInt(t, 10);
  if (t.length === 1) {
    const code = t.codePointAt(0)!;
    if (code >= CIRCLED_FIRST && code <= CIRCLED_LAST) return code - CIRCLED_FIRST + 1;
  }
  return null;
}

/** Writes a number back in the SAME style the item already used. */
function markerText(n: number, sample: string): string {
  const t = sample.trim();
  if (t.length === 1) {
    const code = t.codePointAt(0)!;
    if (code >= CIRCLED_FIRST && code <= CIRCLED_LAST) {
      const target = CIRCLED_FIRST + n - 1;
      // Past ⑳ there is no circled glyph, so fall back to a plain number
      // rather than emitting something from an unrelated Unicode block.
      if (target <= CIRCLED_LAST) return String.fromCodePoint(target);
      return String(n);
    }
  }
  return String(n);
}

/** The leaf inside an item that holds its number, if it has one. */
function markerLeaf(item: HTMLElement): HTMLElement | null {
  const leaves = Array.from(item.querySelectorAll<HTMLElement>("*"))
    .filter((el) => el.children.length === 0);
  for (const leaf of leaves) {
    if (markerValue(leaf.textContent ?? "") !== null) return leaf;
  }
  return null;
}

/**
 * Renumbers a group after it changes, but ONLY if it was already a clean
 * 1,2,3… run.
 *
 * A new step used to be cloned from the last one and keep its number, so
 * adding a sixth step to the reading-order card gave a second "5". Numbering
 * lives in the markdown here rather than in a CSS counter, so nothing else
 * would ever correct it.
 *
 * The guard matters: a group whose markers are years, marks or question
 * numbers is not a sequence to rewrite, and renumbering it would destroy
 * real content. Only an exact 1..n run is treated as ordinal.
 */
/** Renumbers whatever group `el` belongs to, reading the group fresh from the
 * DOM. This is what the mutating operations call, so numbering is an
 * invariant they maintain rather than something a caller has to remember. */
export function renumberAround(el: HTMLElement | null): boolean {
  if (!el) return false;
  const group = itemGroupFor(el);
  return group ? renumberItems(group) : false;
}

export function renumberItems(group: ItemGroup): boolean {
  const leaves = group.items.map(markerLeaf);
  if (leaves.some((l) => l === null)) return false;

  const values = leaves.map((l) => markerValue(l!.textContent ?? "")!);
  // Ordinal if every marker is a small number in the range this group could
  // legitimately occupy. That admits all three ways a group gets disturbed —
  // a clone duplicates a number, a move permutes them (1,3,2), a delete
  // leaves a gap — while still refusing anything that is really content:
  // `2024` and `2026` on a heading's exam stamps are years, and renumbering
  // them to 1 and 2 would destroy real data.
  const n = values.length;
  if (!values.every((v) => v >= 1 && v <= n + 1)) return false;

  leaves.forEach((leaf, i) => {
    leaf!.textContent = markerText(i + 1, leaf!.textContent ?? "");
  });
  return true;
}

/** The group as it stands now — `ItemGroup.items` is a snapshot, and add,
 * remove and move all invalidate it. */
export function refreshGroup(group: ItemGroup): ItemGroup {
  const first = group.container.firstElementChild as HTMLElement | null;
  const anchor = group.items[0] ?? first;
  if (!anchor) return group;
  const sig = signature(anchor);
  return {
    ...group,
    items: (Array.from(group.container.children) as HTMLElement[])
      .filter((c) => signature(c) === sig),
  };
}
