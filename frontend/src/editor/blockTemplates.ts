/**
 * What the insert palette offers.
 *
 * Two sources, combined:
 *
 *  1. SEMANTIC defaults — plain HTML with no classes and no Hindi placeholder
 *     copy. These work in any document, including one this editor didn't
 *     generate. The palette previously contained ONLY pipeline-specific BEM
 *     snippets with Hindi text baked in ("नया अनुच्छेद यहाँ लिखें…"), so in
 *     any other document every insert produced an unstyled element carrying
 *     text in a language the document wasn't written in.
 *
 *  2. Templates LEARNED FROM THE OPEN DOCUMENT — the document is its own
 *     component library. A chapter containing twelve `.tip-box` elements
 *     offers "Tip box"; a foreign document with thirty `.callout` offers
 *     "Callout". This is what keeps the palette useful as the element
 *     library grows: a new element added to HTML_Automation shows up in the
 *     editor with no editor change at all, because it appears in the
 *     documents themselves.
 */
export interface BlockTemplate {
  key: string;
  label: string;
  html: string;
  /** True for templates discovered in the open document, so the palette can
   * group them separately from the always-available defaults. */
  fromDocument?: boolean;
}

/** Language-neutral, class-free, valid in any document. */
export const SEMANTIC_TEMPLATES: BlockTemplate[] = [
  { key: "h2", label: "Heading", html: "<h2>Heading</h2>" },
  { key: "p", label: "Paragraph", html: "<p>New paragraph…</p>" },
  { key: "ul", label: "Bullet list", html: "<ul><li>First item</li></ul>" },
  { key: "ol", label: "Numbered list", html: "<ol><li>First step</li></ol>" },
  {
    key: "figure",
    label: "Image",
    html:
      '<figure><div style="background:#e8e0c9;height:120px;display:flex;align-items:center;justify-content:center;color:#6b5a48;font-size:12px">Click to add an image</div>' +
      "<figcaption>Caption…</figcaption></figure>",
  },
  {
    key: "table",
    label: "Table",
    html:
      "<table><thead><tr><th>Column A</th><th>Column B</th></tr></thead>" +
      "<tbody><tr><td>—</td><td>—</td></tr></tbody></table>",
  },
  { key: "blockquote", label: "Quote", html: "<blockquote>Quoted text…</blockquote>" },
  { key: "pre", label: "Code block", html: "<pre><code>code…</code></pre>" },
  { key: "hr", label: "Divider", html: "<hr>" },
];

/** Elements never worth offering as an insertable component — structural
 * wrappers and the page scaffolding itself. */
const NOT_A_COMPONENT = new Set([
  "page", "page__cols", "page__full", "book", "wrapper", "container", "content", "row", "col",
]);

/** How many times a class must appear before it's considered a component of
 * this document rather than a one-off. */
const MIN_OCCURRENCES = 2;
const MAX_DISCOVERED = 12;

function labelFor(className: string): string {
  return className
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Scans a document for repeated component-looking elements and turns the
 * cleanest example of each into an insertable template.
 *
 * Text is deliberately left as-is rather than blanked: a real example
 * carrying real wording is a far better starting point than an empty shell,
 * and it shows the user what they're inserting.
 */
export function discoverTemplates(blocks: HTMLElement[]): BlockTemplate[] {
  const byClass = new Map<string, HTMLElement[]>();

  for (const el of blocks) {
    // The base BEM block name — `tip-box--green` and `tip-box` are the same
    // component, and `tip-box__body` is a part of one, not a component.
    const base = Array.from(el.classList)
      .map((c) => c.split("--")[0])
      .find((c) => c && !c.includes("__"));
    if (!base || NOT_A_COMPONENT.has(base)) continue;
    const list = byClass.get(base) ?? [];
    list.push(el);
    byClass.set(base, list);
  }

  const discovered: BlockTemplate[] = [];
  for (const [base, els] of byClass) {
    if (els.length < MIN_OCCURRENCES) continue;
    // Prefer the SMALLEST example: it's the one least likely to carry a huge
    // embedded image or an unusually long body, and it inserts fastest.
    const example = els.reduce((a, b) => (a.outerHTML.length <= b.outerHTML.length ? a : b));
    const html = example.cloneNode(true) as HTMLElement;
    html.removeAttribute("data-block-id");
    html.querySelectorAll("[data-block-id]").forEach((n) => n.removeAttribute("data-block-id"));
    discovered.push({
      key: `doc:${base}`,
      label: labelFor(base),
      html: html.outerHTML,
      fromDocument: true,
    });
  }

  return discovered
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(0, MAX_DISCOVERED);
}

/** Kept for the pipeline's own most-used elements so they stay one click
 * away even in a brand-new empty chapter, where nothing can be discovered
 * from the document yet. */
export const BLOCK_TEMPLATES = SEMANTIC_TEMPLATES;
