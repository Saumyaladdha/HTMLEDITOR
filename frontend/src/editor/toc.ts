/**
 * Builds an outline (chapter title / part / section / subheading) straight
 * off the live canvas DOM — not the document model — so it always reflects
 * exactly what's currently rendered, including any reordering or edits
 * made this session, without needing to keep a separate structure in sync.
 * Computed on demand (when the Outline panel opens), not maintained live.
 */
export interface TocEntry {
  pageIndex: number; // 0-indexed
  level: "title" | "part" | "section" | "subheading";
  text: string;
}

const HEADING_SELECTOR = ".title-1, .part-head, .section-head, .subheading";

function levelOf(el: Element): TocEntry["level"] {
  if (el.classList.contains("title-1")) return "title";
  if (el.classList.contains("part-head")) return "part";
  if (el.classList.contains("section-head")) return "section";
  return "subheading";
}

function extractText(el: HTMLElement, level: TocEntry["level"]): string {
  if (level === "title") {
    const chapter = el.querySelector(".title-1__chapter")?.textContent?.trim();
    const main = el.querySelector(".title-1__text")?.textContent?.trim();
    return [chapter, main].filter(Boolean).join(" — ");
  }
  if (level === "part") {
    const num = el.querySelector(".part-head__num")?.textContent?.trim();
    const text = el.querySelector(".part-head__text")?.textContent?.trim();
    return [num, text].filter(Boolean).join(" — ");
  }
  if (level === "section") {
    const title = el.querySelector(".section-head__title")?.textContent?.trim();
    if (title) return title;
  }
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function buildToc(doc: Document): TocEntry[] {
  const pages = Array.from(doc.querySelectorAll<HTMLElement>(".page"));
  const entries: TocEntry[] = [];
  pages.forEach((pageEl, pageIndex) => {
    pageEl.querySelectorAll<HTMLElement>(HEADING_SELECTOR).forEach((el) => {
      const level = levelOf(el);
      const text = extractText(el, level);
      if (text) entries.push({ pageIndex, level, text });
    });
  });
  return entries;
}
