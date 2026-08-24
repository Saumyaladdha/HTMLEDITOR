/**
 * Builds an outline straight off the live canvas DOM — not the document
 * model — so it always reflects exactly what's currently rendered, including
 * any reordering or edits made this session. Computed on demand (when the
 * Outline panel opens), not maintained live.
 *
 * Headings are found by SEMANTICS FIRST (`h1`–`h6`), which every HTML
 * document in existence has, and then by this pipeline's own heading classes
 * for chapters that use styled divs instead of heading tags. Previously only
 * the four pipeline classes were recognised, so the outline of any other
 * document was permanently empty — the one panel that could have made an
 * unfamiliar document navigable showed "No headings found".
 */
import { collectPages, type DocumentStructure } from "./structure";

export interface TocEntry {
  /** Page containing this heading, or null in a flow document. */
  pageIndex: number | null;
  /** 1 (chapter title) … 4 (subheading) — drives indentation. */
  level: number;
  text: string;
  /** The heading element itself, so jumping works without page numbers. */
  el: HTMLElement;
}

/** Pipeline-specific heading classes, mapped to their outline depth. Purely
 * additive: a document using plain <h2> gets the same treatment without
 * needing an entry here. */
const CLASS_LEVELS: [selector: string, level: number][] = [
  [".title-1", 1],
  [".part-head", 2],
  [".section-head", 3],
  [".subheading", 4],
];

const HEADING_SELECTOR = ["h1", "h2", "h3", "h4", "h5", "h6", ...CLASS_LEVELS.map(([s]) => s)].join(", ");

function levelOf(el: HTMLElement): number {
  for (const [selector, level] of CLASS_LEVELS) {
    if (el.matches(selector)) return level;
  }
  const tagMatch = /^H([1-6])$/.exec(el.tagName);
  if (tagMatch) return Math.min(4, Number(tagMatch[1]));
  return 4;
}

/** Prefers the pipeline's named sub-parts (which separate a chapter number
 * from its title) and falls back to the element's own text — which is all
 * any ordinary heading has. */
function extractText(el: HTMLElement): string {
  const partPairs = [
    [".title-1__chapter", ".title-1__text"],
    [".part-head__num", ".part-head__text"],
  ];
  for (const [a, b] of partPairs) {
    const first = el.querySelector(a)?.textContent?.trim();
    const second = el.querySelector(b)?.textContent?.trim();
    if (first || second) return [first, second].filter(Boolean).join(" — ");
  }
  const sectionTitle = el.querySelector(".section-head__title")?.textContent?.trim();
  if (sectionTitle) return sectionTitle;
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function buildToc(doc: Document, structure: DocumentStructure): TocEntry[] {
  const pages = collectPages(doc, structure);
  const pageIndexOf = (el: HTMLElement): number | null => {
    if (pages.length === 0) return null;
    const page = el.closest<HTMLElement>(structure.pageSelector ?? "");
    const idx = page ? pages.indexOf(page) : -1;
    return idx >= 0 ? idx : null;
  };

  const seen = new Set<HTMLElement>();
  const entries: TocEntry[] = [];

  doc.querySelectorAll<HTMLElement>(HEADING_SELECTOR).forEach((el) => {
    // A `.section-head` wrapping an <h3> would otherwise be listed twice;
    // keep the outermost match and skip anything nested inside it.
    if (Array.from(seen).some((prev) => prev.contains(el))) return;
    const text = extractText(el);
    if (!text) return;
    seen.add(el);
    entries.push({ pageIndex: pageIndexOf(el), level: levelOf(el), text, el });
  });

  return entries;
}
