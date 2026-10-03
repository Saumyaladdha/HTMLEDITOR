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
import { MANIFEST_ELEMENTS, SHELL_CLASSES, documentUsesManifest } from "./manifest";

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
  // Whatever the element library marks `_shell` — `.page`, `.flowwrap`,
  // `.acol`, `.acols`, `.u`, `.stickycol`. Offering one would let a user
  // insert a page inside a page. Read from the manifest rather than listed
  // here so a new wrapper is excluded the moment the library declares one.
  ...SHELL_CLASSES,
]);

/** How many times a class must appear before it's considered a component of
 * this document rather than a one-off. */
const MIN_OCCURRENCES = 2;
const MAX_DISCOVERED = 12;

function labelFor(className: string, ours: boolean): string {
  // The element library's own name — "Formula panel (सूत्र)" rather than
  // "Fcard", "Sticky note" rather than "Callout". A discovered template is
  // only as useful as the name on the button.
  //
  // Only when the document is actually ours, though. A foreign document that
  // happens to use the class name `callout` means its own thing by it, and
  // labelling that "Sticky note" tells the user something untrue about their
  // own file.
  if (ours) {
    const known = MANIFEST_ELEMENTS.find((e) => e.classes.includes(className));
    if (known) return known.label;
  }
  return className
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Scans a document for repeated component-looking elements and turns the
 * cleanest example of each into an insertable template.
 *
 * Text is BLANKED, but not thrown away — see `blankToPlaceholders`.
 */
/**
 * Empty a cloned template's text, keeping the original wording as a ghost.
 *
 * A discovered template is a clone of a real block, and it used to arrive
 * carrying that block's real wording. On a page of similar-looking boxes the
 * one you just inserted was then indistinguishable from the four already
 * there — "I don't even know which box was placed" — and every insert began
 * with deleting someone else's sentence about resistors.
 *
 * Blanking it outright would have cost the other half of that: an empty
 * shell tells you nothing about which slot is the title and which the body.
 * So each text leaf is emptied AND its old text kept in `data-ph`, which
 * chrome.ts paints as faint ghost text. The box reads as a labelled, empty
 * form: obviously new, obviously yours to type into, still recognisable.
 *
 * Only leaves are touched. An element with element children keeps its
 * structure, and `:empty` — which is what the placeholder CSS hangs on —
 * would not match it anyway.
 */
export function blankToPlaceholders(root: HTMLElement) {
  const walk = (el: HTMLElement) => {
    const kids = Array.from(el.children) as HTMLElement[];
    if (kids.length) {
      kids.forEach(walk);
      // Text sitting directly beside child elements is body copy — the `.trio`
      // card is one long line of it — and has no leaf of its own to blank.
      Array.from(el.childNodes).forEach((n) => {
        if (n.nodeType === 3 && (n.textContent ?? "").trim()) n.textContent = " ";
      });
      return;
    }
    const text = (el.textContent ?? "").trim();
    if (!text) return;
    // Long sample copy makes a poor label; a word or two is exactly the hint
    // that tells you what the slot is for.
    el.setAttribute("data-ph", text.length > 42 ? text.slice(0, 42) + "…" : text);
    el.textContent = "";
  };
  walk(root);
  return root;
}

export function discoverTemplates(blocks: HTMLElement[]): BlockTemplate[] {
  // Whether this document is one of ours decides only how the buttons are
  // NAMED — discovery itself is identical either way.
  const ours = blocks.length > 0 && documentUsesManifest(blocks[0].ownerDocument);
  const byClass = new Map<string, HTMLElement[]>();

  for (const el of blocks) {
    // The base BEM block name — `tip-box--green` and `tip-box` are the same
    // component, and `tip-box__body` is a part of one, not a component.
    const base = Array.from(el.classList)
      .map((c) => c.split("--")[0])
      .find((c) => c && !c.includes("__"));
    if (!base || NOT_A_COMPONENT.has(base)) continue;
    // In OUR documents, offer only what the element library actually declares
    // as a component. Discovery on its own surfaced every repeated class in
    // the file, so the palette filled up with "Cvi", "Deflead" and "Cvcard" —
    // internal parts of other blocks, named after classes that mean nothing
    // to a teacher. A foreign document keeps the old behaviour, since there
    // is nothing else to go on there.
    if (ours) {
      const m = MANIFEST_ELEMENTS.find((e) => e.classes.includes(base));
      if (!m || m.role !== "content") continue;
    }
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
    const html = blankToPlaceholders(example.cloneNode(true) as HTMLElement);
    html.removeAttribute("data-block-id");
    html.querySelectorAll("[data-block-id]").forEach((n) => n.removeAttribute("data-block-id"));
    discovered.push({
      key: `doc:${base}`,
      label: labelFor(base, ours),
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
