/**
 * Plain-text search across the whole canvas, operating on live Text nodes.
 * Highlighting uses the browser's native Selection/Range (no DOM mutation
 * at all) rather than wrapping matches in a temporary element — wrapping
 * would split text nodes, and if the user made an unrelated edit before
 * the wrapper got cleaned up, commitToModel could capture that wrapper as
 * if it were real content. Selection-based highlighting has no such risk.
 */
export interface Match {
  node: Text;
  start: number;
  end: number;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findMatches(doc: Document, query: string): Match[] {
  if (!query) return [];
  const re = new RegExp(escapeRegExp(query), "gi");
  const matches: Match[] = [];
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (!parent || parent.closest("script, style")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent ?? "";
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      matches.push({ node: node as Text, start: m.index, end: m.index + m[0].length });
    }
  }
  return matches;
}

export function highlightMatch(doc: Document, match: Match) {
  const sel = doc.getSelection();
  if (!sel) return;
  const range = doc.createRange();
  range.setStart(match.node, match.start);
  range.setEnd(match.node, match.end);
  sel.removeAllRanges();
  sel.addRange(range);
  match.node.parentElement?.scrollIntoView({ block: "center", behavior: "smooth" });
}

/** Replaces one match in place — a plain Text.data string splice, so it
 * never changes DOM structure (no new elements), just the text content. */
export function replaceMatch(match: Match, replacement: string) {
  const text = match.node.data;
  match.node.data = text.slice(0, match.start) + replacement + text.slice(match.end);
}

/** Replaces every match, grouped by node and applied back-to-front within
 * each node so earlier offsets in that same node stay valid as later ones
 * are replaced. Returns how many replacements were made. */
export function replaceAll(doc: Document, query: string, replacement: string): number {
  const matches = findMatches(doc, query);
  const byNode = new Map<Text, Match[]>();
  matches.forEach((m) => {
    const arr = byNode.get(m.node) ?? [];
    arr.push(m);
    byNode.set(m.node, arr);
  });
  let count = 0;
  byNode.forEach((nodeMatches, node) => {
    let text = node.data;
    [...nodeMatches]
      .sort((a, b) => b.start - a.start)
      .forEach((m) => {
        text = text.slice(0, m.start) + replacement + text.slice(m.end);
        count++;
      });
    node.data = text;
  });
  return count;
}
