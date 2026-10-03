/**
 * Maps a top-level block's element class (from HTML_Automation's 98-element
 * BEM library) to what the editor lets a teacher touch on it. Only the
 * highest-frequency types are covered in v1 — text-body, def-item,
 * bullet-list, figure, section-head, tip-box, plus the two inline span
 * types (text-color/highlight). Anything else still gets the universal
 * controls (text edit if it has text, spacing, remove) via the fallback
 * entry, just no type-specific color/size sliders yet.
 *
 * Applying a change always writes `element.style.setProperty(cssVar, value)`
 * directly on the selected node — the same inline-override pattern the
 * pipeline itself already uses for --fs-base on .page, so it round-trips
 * through save with zero special-casing.
 */

import { findFigureImageSlot } from "./selection";
import {
  manifestElementFor,
  manifestImagePart,
  manifestImageParts,
  type ManifestControl,
  type ManifestElement,
} from "./manifest";

export type ControlKind = "text-color-picker" | "color-picker" | "size-slider" | "step-slider";

/**
 * Sets a figure's width so it actually takes effect regardless of which
 * variant the figure is. `--fig-w` alone isn't enough: figure.css has
 * `.figure { width: var(--fig-w); }` AND, separately,
 * `.figure--full { width: var(--fig-full-w); }` — same specificity (one
 * class each), so on any `class="figure figure--full"` element the LATER
 * rule in the stylesheet wins the cascade, and `--fig-w` has zero visual
 * effect there no matter what it's set to (this is why width editing
 * silently did nothing on the standalone chapter-opening figure, while a
 * plain `.figure` inside a `.figure-grid` — no `--full` modifier — worked
 * fine). Setting `width` directly as an inline style always wins over any
 * class-based rule regardless of which CSS-var chain that particular
 * variant happens to read, so it's set alongside both variables rather
 * than trying to special-case every current or future modifier class.
 */
export function applyFigureWidth(target: HTMLElement, widthPx: number) {
  target.style.setProperty("--fig-w", `${widthPx}px`);
  target.style.setProperty("--fig-full-w", `${widthPx}px`);
  target.style.width = `${widthPx}px`;
}

export interface CssVarControl {
  cssVar: string;
  label: string;
  control: ControlKind;
  unit?: string;
  min?: number;
  max?: number;
  /** For text-color-picker: the named palette this element's CSS already defines. */
  palette?: { name: string; hex: string }[];
}

/** A mutually-exclusive set of class names to switch between (never more
 * than one active at once) — for layout variants the pipeline's CSS
 * already fully implements (e.g. `.figure--float`/`.figure--float-left`
 * make text wrap around an image via plain CSS float, so content after it
 * naturally flows into the freed-up side space and resumes full width once
 * past the image — no custom reflow logic needed, just a class toggle the
 * editor never previously exposed a control for). */
export interface LayoutToggleControl {
  label: string;
  options: { label: string; addClass: string | null }[]; // null = the "none of these" / default option
  /** Only relevant while nested inside this exact parent class — e.g. a
   * float only means anything for a STANDALONE figure; one inside a
   * `.figure-grid` is a flex item, and flex items ignore float entirely
   * per spec, so the control should hide itself there rather than offer
   * something that would silently do nothing. */
  hiddenInsideParentClass?: string;
}

/** A control that writes a plain CSS property straight onto the element.
 *
 * The BEM library exposed everything through CSS custom properties, so
 * `cssVars` was enough. The current elements do not: `.callout` gets its
 * colour from an inline `border-color` the pipeline writes per note, `.po`
 * from a `.po-*` variant class, `.fcard` from a hardcoded rule. An inline
 * property beats all three, so that is what these write. */
export interface StyleControl {
  kind: "color" | "size";
  label: string;
  property: string;
  /** Apply to this descendant rather than the block (picture height belongs
   * on `.figspace`, not on the `.figcard` wrapping it). */
  target?: string;
  /** Every shape that descendant can take, first match wins — see
   * ManifestControl.targets. */
  targets?: string[];
  min?: number;
  max?: number;
  unit?: string;
}

/** A set of designed looks to switch between — `.po-trap` carries a matched
 * border, background and label colour. Offered as one choice so a user picks
 * "Trap" and gets the whole triple, rather than three colour wells they have
 * to coordinate by hand. */
export interface VariantGroup {
  label: string;
  /** Prefix every option shares, cleared before the picked one is applied. */
  prefix: string;
  options: { className: string; label: string }[];
}

export interface RegistryEntry {
  label: string;
  /** True if this block's own text should be directly contenteditable
   * (simple blocks like text-body/bullet-list items). Richer blocks with
   * named sub-parts (def-item, figure) list them in subParts instead. */
  directText?: boolean;
  subParts?: Record<string, { editable: "text" | "richtext" | "image" }>;
  cssVars?: CssVarControl[];
  layoutToggle?: LayoutToggleControl;
  /** Populated from the element manifest; empty for BEM/foreign documents. */
  styleControls?: StyleControl[];
  variantGroup?: VariantGroup;
  /** Manifest description, shown in the panel so a user knows what the block
   * IS without having to recognise `.po-trap` on sight. */
  hint?: string;
  /** Flex wrapper for putting content beside this block, when its own CSS
   * defines one (see the manifest exporter's side-by-side detection). */
  sideBySide?: { wrapper: string; label: string } | null;
  /** Float variants that let text wrap around this block. */
  floats?: { class: string; side: "left" | "right"; label: string }[];
}

/** All class names any layoutToggle option might add, across every
 * registry entry — used to clear whichever one is currently active before
 * applying a newly-picked one, without needing to know which entry a given
 * block belongs to at the call site. */
export const ALL_LAYOUT_TOGGLE_CLASSES = ["figure--float", "figure--float-left"];

export const TEXT_COLOR_PALETTE = [
  { name: "red", hex: "#d64545" },
  { name: "orange", hex: "#e08a3c" },
  { name: "brown", hex: "#8a6a45" },
  { name: "pink", hex: "#d66aa0" },
  { name: "purple", hex: "#9b6fd6" },
  { name: "indigo", hex: "#6c7bd6" },
  { name: "blue", hex: "#3068c8" },
  { name: "navy", hex: "#2a3a66" },
  { name: "teal", hex: "#1f9e8e" },
  { name: "green", hex: "#4a9e4a" },
  { name: "gray", hex: "#7a7a7a" },
];

export const HIGHLIGHT_PALETTE = [
  { name: "yellow", hex: "#ffe27a" },
  { name: "green", hex: "#b8e6a0" },
  { name: "blue", hex: "#a8d4f0" },
  { name: "pink", hex: "#f0b8d4" },
  { name: "orange", hex: "#f5c98a" },
];

export const PROPERTY_REGISTRY: Record<string, RegistryEntry> = {
  "text-body": {
    label: "Paragraph",
    directText: true,
  },
  "def-item": {
    label: "Definition item",
    subParts: {
      "def-item__qual": { editable: "text" },
      "def-item__type": { editable: "text" },
    },
    directText: true, // body text edited directly on the block itself
  },
  "bullet-list": {
    label: "Bullet list",
    directText: true,
  },
  figure: {
    label: "Figure",
    subParts: {
      figure__img: { editable: "image" },
      "fig-cap__label": { editable: "text" },
      "fig-cap__text": { editable: "richtext" },
    },
    cssVars: [
      { cssVar: "--fig-w", label: "Width", control: "size-slider", unit: "px", min: 200, max: 900 },
      { cssVar: "--fig-gap", label: "Image–caption gap", control: "size-slider", unit: "px", min: 0, max: 40 },
    ],
    layoutToggle: {
      label: "Wrap text around image",
      hiddenInsideParentClass: "figure-grid",
      options: [
        { label: "Off — full width", addClass: null },
        { label: "Float left (text wraps right)", addClass: "figure--float-left" },
        { label: "Float right (text wraps left)", addClass: "figure--float" },
      ],
    },
  },
  "section-head": {
    label: "Section heading",
    directText: true,
    cssVars: [
      { cssVar: "--sh-pad-y", label: "Vertical padding", control: "size-slider", unit: "px", min: 0, max: 60 },
    ],
  },
  "tip-box": {
    label: "Tip box",
    directText: true,
  },
  "yaad-rakhein": {
    label: "“Don't forget” box",
    directText: true,
  },
  // A row of 2+ independent <figure>s side by side (see NIYAM.md "kai
  // chitra ek saath") — no subParts/directText of its own on purpose. It
  // has no BEM `figure-grid__part` children at all, so without an explicit
  // entry it would fall to FALLBACK_ENTRY's directText:true and clicking
  // anywhere on it (not just an image slot) would make the WHOLE grid —
  // both figures and both captions — one giant contentEditable blob.
  // BookEditor.tsx's click handler special-cases this block: it detects
  // whichever inner <figure> a click actually landed in and treats THAT
  // element (not this wrapper) as the thing being edited for width/image/
  // caption purposes, while this row stays the single draggable/deletable
  // unit for the toolbar.
  "figure-grid": {
    label: "Figure grid",
    directText: false,
  },
};

export const FALLBACK_ENTRY: RegistryEntry = {
  label: "Block",
  directText: true,
};

/** Any BEM `base__part` descendant is a candidate sub-part regardless of
 * whether `base` has a hand-written registry entry — this is what lets an
 * unrecognized component (a different chapter's element the registry has
 * never seen) still expose its named regions individually, not just one
 * big directText blob. Classified purely from markup shape: an <img>, or
 * anything with an inline background-image, is "image"; anything else with
 * no element children (a leaf holding text) is "richtext"; a `__part` that
 * itself contains further element children is skipped — that's a
 * structural wrapper, not a leaf worth exposing on its own. */
function discoverGenericSubParts(el: Element, baseClass: string): Record<string, { editable: "text" | "richtext" | "image" }> {
  const prefix = `${baseClass}__`;
  const subParts: Record<string, { editable: "text" | "richtext" | "image" }> = {};
  el.querySelectorAll("*").forEach((node) => {
    for (const cls of Array.from(node.classList)) {
      if (!cls.startsWith(prefix) || cls.includes("--")) continue;
      if (node.tagName === "IMG" || (node as HTMLElement).style?.backgroundImage) {
        subParts[cls] = { editable: "image" };
      } else if (node.children.length === 0) {
        subParts[cls] = { editable: "richtext" };
      }
      break;
    }
  });
  return subParts;
}

/** First class on the element that has a registry entry, else a
 * generically-discovered entry built from the element's own BEM structure
 * (never the flat "just directText" fallback unless truly nothing BEM-ish
 * is found) — see discoverGenericSubParts. */
function controlToStyle(c: ManifestControl): StyleControl {
  return {
    kind: c.type,
    label: c.label,
    property: c.property,
    target: c.target,
    targets: c.targets,
    min: c.min,
    max: c.max,
    unit: c.unit,
  };
}

/** Turn a manifest element into the shape the panel already knows how to
 * render. Parts become sub-parts, controls become style controls, and the
 * `.po-*` family becomes one variant picker. */
export function entryFromManifest(m: ManifestElement): RegistryEntry {
  const subParts: RegistryEntry["subParts"] = {};
  for (const part of m.parts) {
    // `icon` is a decoration — a pin, an emoji. It is text to edit, but it
    // must not be offered as a rich-text region with its own toolbar.
    const editable = part.editable === "icon" ? "text" : part.editable;
    subParts[part.selector.replace(/^\./, "")] = { editable };
  }
  const hasParts = Object.keys(subParts).length > 0;
  return {
    label: m.label,
    hint: m.description || undefined,
    // A block with named regions must NOT also be one big editable blob:
    // that is exactly what turned the सूत्र panel's ten rows into a single
    // contenteditable. Blocks with no named regions still edit directly.
    directText: !hasParts,
    subParts: hasParts ? subParts : undefined,
    styleControls: m.controls.map(controlToStyle),
    sideBySide: m.sideBySide ?? null,
    floats: m.floats ?? [],
    variantGroup:
      m.variants.length > 0
        ? {
            label: "Style",
            prefix: m.variantPrefix || m.classes[0] + "-",
            options: m.variants.map((v) => ({ className: v.class, label: v.label })),
          }
        : undefined,
  };
}

/** Art the editor placed. Not a pipeline element, so nothing in the manifest
 * describes it — and without an entry it fell to FALLBACK_ENTRY's
 * `directText: true`, which made an <img> contenteditable and offered a
 * teacher a text box for a picture. */
export const DECORATOR_ENTRY: RegistryEntry = {
  label: "Picture",
  hint: "Sits on top of the page — moving or resizing it never shifts your text.",
  directText: false,
};

/**
 * Adds any DECLARED component nested inside a block to its sub-parts.
 *
 * A section heading is `.secno` + `.hdu` + one or more `.examchip`, and the
 * chips are a separate element in the library rather than a named part of the
 * heading — so clicking the red `UP 2026 · 1 अंक` badge selected the whole
 * heading and there was no way to touch the badge itself.
 *
 * Only nested elements that PAINT something are added. A paragraph contains
 * 1197 `.m` maths spans across the chapter and they are text runs, not
 * objects: making every one of them independently selectable would put a
 * selection box round half the words on the page.
 */
function withNestedParts(el: Element, entry: RegistryEntry): RegistryEntry {
  const own = manifestElementFor(el);
  const extra: NonNullable<RegistryEntry["subParts"]> = {};
  el.querySelectorAll("*").forEach((node) => {
    const nested = manifestElementFor(node);
    if (!nested || nested === own) return;
    // `paints` comes from the manifest, computed from the element's own
    // stylesheet — see its doc comment for why this is not read off
    // getComputedStyle here.
    if (!nested.paints) return;
    const cls = nested.classes[0];
    if (!cls || entry.subParts?.[cls] || extra[cls]) return;
    extra[cls] = { editable: "richtext" };
  });
  if (Object.keys(extra).length === 0) return entry;
  return { ...entry, subParts: { ...(entry.subParts ?? {}), ...extra } };
}

export function registryEntryFor(el: Element): { key: string; entry: RegistryEntry } {
  if (el.classList.contains("bookdecor")) {
    return { key: "bookdecor", entry: DECORATOR_ENTRY };
  }
  // The pipeline's own vocabulary first — it is the most specific thing we
  // know about the element, and it is regenerated from the element library
  // rather than maintained by hand here.
  const m = manifestElementFor(el);
  // Inline elements are not blocks and never get size or background controls,
  // but one with a designed palette is still worth selecting: a section
  // heading is coloured entirely through the `.hd-*` accent on the `.hdu`
  // underline inside it, so refusing inline entries left headings with no
  // colour control at all.
  if (m && (m.role === "content" || m.variants.length > 0)) {
    return { key: m.id, entry: withNestedParts(el, entryFromManifest(m)) };
  }

  for (const cls of Array.from(el.classList)) {
    if (PROPERTY_REGISTRY[cls]) return { key: cls, entry: PROPERTY_REGISTRY[cls] };
  }
  const base = el.classList[0] ?? "block";
  const subParts = discoverGenericSubParts(el, base);
  if (Object.keys(subParts).length > 0) {
    return { key: base, entry: { label: base, subParts, directText: false } };
  }
  return { key: base, entry: FALLBACK_ENTRY };
}

/** True if `subPart` is (or structurally stands in for) an image sub-part
 * of `block`. Class-matching first (registry- or generically-discovered
 * `editable: "image"` entries); if that misses but the block declares an
 * image sub-part at all, falls back to `findFigureImageSlot`'s structural
 * check — covers real pipeline output like a classless placeholder
 * `<div>` that never gets `.figure__img` at all. */
export function isImageSubPart(block: Element, subPart: Element | null, entry: RegistryEntry): boolean {
  if (!subPart) return false;
  // `.figspace` is the reserved plate a picture goes into. Without this the
  // structural fallback below picked `.fh` — the caption — because it is the
  // figure's first child, so "add an image" replaced the caption text.
  // EVERY declared picture region, not just the first. A figure declares
  // both shapes — the reserved `.figspace` plate and the `.figure-image`
  // box holding a real photo — and only one exists in a given block.
  // Matching just the first meant a chapter of real photographs answered
  // "no" for its own picture, so the image controls never appeared.
  const imageParts = manifestImageParts(manifestElementFor(block));
  if (imageParts.length) {
    return imageParts.some((p) => subPart.matches(p.selector))
      || findFigureImageSlot(block) === subPart;
  }
  const classMatch = Object.entries(entry.subParts ?? {}).some(
    ([cls, def]) => def.editable === "image" && subPart.classList.contains(cls),
  );
  if (classMatch) return true;
  if (Object.values(entry.subParts ?? {}).some((d) => d.editable === "image")) {
    return findFigureImageSlot(block) === subPart;
  }
  return false;
}
