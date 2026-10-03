/**
 * The pipeline's own element vocabulary, read rather than guessed.
 *
 * `propertyRegistry.ts` was written against an older BEM library
 * (`text-body`, `figure__img`, `def-item__qual`). The chapters the pipeline
 * emits today contain 145 distinct classes and NOT ONE of them is BEM, so
 * every registry lookup missed and every block fell through to
 * `directText: true`. Clicking the सूत्र panel made all ten formula rows one
 * contenteditable blob; the image uploader aimed at the caption instead of
 * the picture box; no box could be recoloured or resized.
 *
 * Hardcoding those 145 names here would fix today and rot tomorrow — the
 * element library grows. Instead `HTML_Automation/tools/export_editor_manifest.py`
 * reads `book/elements/<id>/{spec.json,template.html,style.css}` and writes
 * `elementManifest.json` next to this file. Add an element to the library,
 * re-run the exporter, and it shows up here with its parts, its colour
 * controls and its variants, with no change to the editor at all.
 *
 * This is additive. A document that ISN'T from this pipeline matches nothing
 * in the manifest and keeps the previous BEM//generic behaviour untouched.
 *
 * THE SNAPSHOT IS COMMITTED, AND GUARDED. `elementManifest.json` lives in
 * this repo, so nothing outside it is read to build or run — but that leaves
 * one silent failure: regenerate it from an element library older than the
 * editor and every claim the editor makes about a chapter quietly becomes
 * false, with no import error and no type error to show for it. See
 * `scripts/check-book-editor-manifest.mjs`, which asserts the vocabulary
 * this module's callers depend on and runs as `prebuild` — so `npm run
 * build`, the command both the Dockerfile and Jenkins run, fails on drift
 * rather than shipping an editor that has forgotten half of what it can
 * edit.
 */
import manifestJson from "./elementManifest.json";

export type PartEditable = "text" | "richtext" | "image" | "icon";

export interface ManifestPart {
  selector: string;
  label: string;
  editable: PartEditable;
}

export interface ManifestControl {
  type: "color" | "size";
  label: string;
  property: string;
  /** Apply to this descendant instead of the block itself (picture height
   * lives on `.figspace`, not on the `.figcard` around it). */
  target?: string;
  /** Every shape that descendant can take, in order of preference. A figure
   * reserves a dashed `.figspace` before it has art and holds a
   * `.figure-image` once it does; only one is ever present, so naming just
   * one left the control aimed at nothing on half the chapters. */
  targets?: string[];
  min?: number;
  max?: number;
  unit?: string;
}

export interface ManifestVariant {
  class: string;
  label: string;
}

export interface ManifestElement {
  /** Selectors of this element's parts that draw a box of their own. */
  paintedParts?: string[];
  id: string;
  label: string;
  classes: string[];
  selector: string;
  kind: string;
  /** content = a real editable block; shell = page/column scaffolding;
   * inline = a span inside a line, never a block. */
  role: "content" | "shell" | "inline";
  description: string;
  notes: string;
  parts: ManifestPart[];
  controls: ManifestControl[];
  variants: ManifestVariant[];
  /** Prefix the variant family shares, declared by the element's own
   * `classes` placeholder (`hdu hd-{accent}` -> `hd-`), never guessed. */
  variantPrefix?: string;
  /** True when the element draws a box of its own — a chip, a card, a note.
   * False for a text run like inline maths. Computed from the element's own
   * stylesheet at export time, because `getComputedStyle` depends on the
   * browser having expanded `background:` shorthands and not every
   * environment does. */
  paints?: boolean;
  /** A flex wrapper this element's own CSS defines for placing something
   * beside it, when it has one. Derived from the stylesheet, not named. */
  sideBySide?: { wrapper: string; label: string } | null;
  /** Variants that let surrounding text wrap around this element, read from
   * its stylesheet. Distinct from `sideBySide`: a flex row places exactly two
   * things beside each other, a float lets a long paragraph run down the side
   * and then continue full width underneath. */
  floats?: { class: string; side: "left" | "right"; label: string }[];
}

interface Manifest {
  version: number;
  source: string;
  elements: ManifestElement[];
}

const MANIFEST = manifestJson as unknown as Manifest;

export const MANIFEST_ELEMENTS: ManifestElement[] = MANIFEST.elements ?? [];

/** Class -> element, for O(1) lookup from a clicked node. An element can
 * declare several classes (`figcard figbox`); each maps back to it. */
const BY_CLASS = new Map<string, ManifestElement>();
for (const el of MANIFEST_ELEMENTS) {
  for (const cls of el.classes) {
    if (!BY_CLASS.has(cls)) BY_CLASS.set(cls, el);
  }
}

/** Classes that are pure scaffolding — `.page`, `.flowwrap`, `.acol`, `.u`.
 * Selecting one of these is never what a click meant, and offering one in
 * the insert palette would let a user nest a page inside a page. */
export const SHELL_CLASSES: ReadonlySet<string> = new Set(
  MANIFEST_ELEMENTS.filter((e) => e.role === "shell").flatMap((e) => e.classes),
);

/**
 * A selector matching every declared element that draws its own box.
 *
 * Precomputed because the drag layer needs to find these ANYWHERE in a block,
 * not just in the two levels it can afford to walk. Scanning outward from
 * each block costs a `getComputedStyle` per candidate, which on a 3MB chapter
 * is seconds — so that walk is capped, and things a reader plainly sees as
 * objects fell outside it: a `.paper-ref` tag sits three levels down, inside
 * `.question-meta > .paper-refs`, and so was never movable. One
 * `querySelectorAll` with this reaches all of them at no measurable cost and
 * asks the browser for no styles at all.
 *
 * Shell classes are excluded: `.page` and `.acol` paint backgrounds too, and
 * they are scaffolding, not things to pick up.
 */
export const PAINTED_SELECTOR: string = [
  ...MANIFEST_ELEMENTS
    .filter((e) => e.paints && e.role !== "shell")
    .flatMap((e) => e.classes)
    .map((c) => "." + c),
  // Named PARTS that draw boxes of their own count too — a question head's
  // pink `.qnum` chip is as much a thing you pick up as the seal on a topic
  // heading, and it is a part rather than an element only because of where
  // the library happens to file it. See `_painted_parts` in the exporter.
  ...MANIFEST_ELEMENTS.flatMap((e) => e.paintedParts ?? []),
].join(",");

/** Classes that only ever appear as inline spans inside a line of text. */
export const INLINE_CLASSES: ReadonlySet<string> = new Set(
  MANIFEST_ELEMENTS.filter((e) => e.role === "inline").flatMap((e) => e.classes),
);

/** The manifest entry for an element, by its own classes. Returns null for
 * anything the pipeline doesn't declare — a foreign document, or a wrapper. */
export function manifestElementFor(el: Element): ManifestElement | null {
  for (const cls of Array.from(el.classList)) {
    const hit = BY_CLASS.get(cls);
    if (hit) return hit;
  }
  return null;
}

/**
 * The nearest element that MEANS something, walking outward.
 *
 * `manifestElementFor` answers about one element only. Pointing it at
 * whatever the cursor is over usually lands on a text node's parent or on
 * `.u` — the measurement wrapper the assembler puts round every block —
 * and reports "Unit", which is true and useless: every block in the
 * document is inside one.
 *
 * Scaffolding is skipped rather than returned. `.u`, `.page`, `.acol` and
 * their kin are marked `_shell` in the element library precisely because
 * they are structure, not content, and naming one tells a person nothing
 * about what they clicked.
 */
export function nearestMeaningfulElement(
  el: Element | null,
  stopAt?: Element | null,
): ManifestElement | null {
  let node: Element | null = el;
  while (node) {
    const hit = manifestElementFor(node);
    if (hit && hit.role !== "shell") return hit;
    if (stopAt && node === stopAt) break;
    node = node.parentElement;
  }
  // Nothing but scaffolding all the way up — say so with the shell entry
  // rather than null, so the caller can tell "structure" from "unknown".
  return el ? manifestElementFor(el) : null;
}

/** True if this document looks like it came from this pipeline at all.
 *
 * Checked before any manifest-driven behaviour is switched on, so opening an
 * unrelated HTML file behaves exactly as it did before the manifest existed
 * rather than having our vocabulary imposed on it.
 */
export function documentUsesManifest(doc: Document): boolean {
  // Two independent markers, so a document that merely happens to use one
  // common class name (`.page`) isn't mistaken for one of ours.
  let hits = 0;
  for (const el of MANIFEST_ELEMENTS) {
    if (el.role !== "content") continue;
    if (doc.querySelector(el.selector)) hits += 1;
    if (hits >= 2) return true;
  }
  return false;
}

/** The part definition matching a descendant, if it is a named region of
 * `block`. Used to turn a click inside a block into "you selected the
 * caption" rather than "you selected the whole figure". */
export function manifestPartFor(
  block: Element,
  node: Element,
  entry?: ManifestElement | null,
): ManifestPart | null {
  const el = entry ?? manifestElementFor(block);
  if (!el) return null;
  for (const part of el.parts) {
    const cls = part.selector.replace(/^\./, "");
    // `closest` rather than a classList test: a click usually lands on a
    // text node's parent deep inside the region, not on the region itself.
    const owner = node.closest(part.selector);
    if (owner && block.contains(owner) && owner.classList.contains(cls)) {
      return part;
    }
  }
  return null;
}

/** The element's image region, if it declares one. This is what makes
 * "upload a picture" aim at `.figspace` — the reserved empty plate — instead
 * of at `.fh`, the caption that happens to be the first child. */
export function manifestImagePart(entry: ManifestElement | null): ManifestPart | null {
  return entry?.parts.find((p) => p.editable === "image") ?? null;
}

/**
 * Every picture region an element declares, in declaration order.
 *
 * A figure has TWO legitimate shapes and only one of them is present in
 * any given block:
 *
 *   `.figcard.figbox`  > `.figspace`      — no art yet; a reserved plate
 *   `.figcard.has-img` > `.figure-image`  — a real photo
 *
 * `manifestImagePart` returns the first DECLARED region, which for a
 * figure is `.figspace`. In a chapter whose figures all carry real art
 * that region does not exist, so the caller fell through to a structural
 * guess — the exact failure the manifest exists to prevent. Callers that
 * need "the picture region of THIS block" must ask for all of them and
 * take the one that is actually there.
 */
export function manifestImageParts(entry: ManifestElement | null): ManifestPart[] {
  return entry?.parts.filter((p) => p.editable === "image") ?? [];
}
