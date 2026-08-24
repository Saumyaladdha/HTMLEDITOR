/**
 * Row and column operations for tables.
 *
 * Tables appear in almost every real document — this repo's own element
 * library has EIGHT distinct table elements (table-antar, table-tulna,
 * table-sutra, …) — and the editor had no way to add or remove a row or a
 * column. A table could be moved, deleted or hand-edited as raw HTML, and
 * nothing else, which makes the most data-dense part of a document the least
 * editable part.
 *
 * Everything works on the live DOM and preserves each cell's own tag
 * (`<th>` vs `<td>`) and attributes, so a styled table stays styled.
 */

export interface CellPosition {
  table: HTMLTableElement;
  row: HTMLTableRowElement;
  cell: HTMLTableCellElement;
  rowIndex: number;
  colIndex: number;
}

/** Locates the caret/selection within a table, if it's in one. */
export function currentCell(doc: Document, within?: HTMLElement): CellPosition | null {
  const sel = doc.getSelection();
  const node = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).startContainer : null;
  const start = node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : node?.parentElement;
  const cell = start?.closest("td, th") as HTMLTableCellElement | null;
  if (!cell) return null;
  if (within && !within.contains(cell)) return null;
  return positionOf(cell);
}

export function positionOf(cell: HTMLTableCellElement): CellPosition | null {
  const row = cell.closest("tr") as HTMLTableRowElement | null;
  const table = cell.closest("table") as HTMLTableElement | null;
  if (!row || !table) return null;
  return {
    table,
    row,
    cell,
    rowIndex: allRows(table).indexOf(row),
    colIndex: Array.from(row.cells).indexOf(cell),
  };
}

/** Every row of the table in document order, across thead/tbody/tfoot. */
export function allRows(table: HTMLTableElement): HTMLTableRowElement[] {
  return Array.from(table.querySelectorAll<HTMLTableRowElement>("tr"));
}

/** A blank cell shaped like `model` — same tag, same attributes (so
 * per-column classes and widths survive), no content. */
function blankLike(doc: Document, model: HTMLTableCellElement): HTMLTableCellElement {
  const cell = doc.createElement(model.tagName.toLowerCase()) as HTMLTableCellElement;
  for (const attr of Array.from(model.attributes)) {
    if (attr.name === "data-block-id") continue;
    cell.setAttribute(attr.name, attr.value);
  }
  // A completely empty cell collapses and can't be clicked into.
  cell.appendChild(doc.createElement("br"));
  return cell;
}

export function insertRow(doc: Document, pos: CellPosition, where: "above" | "below"): HTMLTableRowElement {
  const fresh = doc.createElement("tr");
  Array.from(pos.row.cells).forEach((c) => {
    const clone = blankLike(doc, c);
    // A new BODY row should never be made of header cells just because it
    // was added next to the header row.
    if (clone.tagName === "TH" && pos.row.closest("thead")) {
      const td = doc.createElement("td");
      td.appendChild(doc.createElement("br"));
      fresh.appendChild(td);
      return;
    }
    fresh.appendChild(clone);
  });

  if (where === "above") pos.row.before(fresh);
  else pos.row.after(fresh);
  return fresh;
}

export function deleteRow(pos: CellPosition): boolean {
  const rows = allRows(pos.table);
  // Refuse to empty the table entirely — deleting the last row leaves a
  // <table> with no content, which renders as nothing and can then never be
  // clicked back into to fix.
  if (rows.length <= 1) return false;
  pos.row.remove();
  return true;
}

export function insertColumn(doc: Document, pos: CellPosition, where: "left" | "right"): void {
  for (const row of allRows(pos.table)) {
    const reference = row.cells[Math.min(pos.colIndex, row.cells.length - 1)];
    if (!reference) continue;
    const fresh = blankLike(doc, reference);
    if (where === "left") reference.before(fresh);
    else reference.after(fresh);
  }
}

export function deleteColumn(pos: CellPosition): boolean {
  const rows = allRows(pos.table);
  const widest = Math.max(...rows.map((r) => r.cells.length));
  if (widest <= 1) return false;
  for (const row of rows) {
    row.cells[pos.colIndex]?.remove();
  }
  return true;
}

/** Turns the first row into a header row (or back), which is the other thing
 * people routinely need and can otherwise only do by hand-editing HTML. */
export function toggleHeaderRow(doc: Document, table: HTMLTableElement): void {
  const rows = allRows(table);
  const first = rows[0];
  if (!first) return;

  const isHeader = Array.from(first.cells).every((c) => c.tagName === "TH");
  Array.from(first.cells).forEach((cell) => {
    const replacement = doc.createElement(isHeader ? "td" : "th");
    for (const attr of Array.from(cell.attributes)) replacement.setAttribute(attr.name, attr.value);
    while (cell.firstChild) replacement.appendChild(cell.firstChild);
    cell.replaceWith(replacement);
  });

  // Keep thead/tbody consistent with what the cells now say, so the table
  // stays valid and CSS targeting `thead` keeps working.
  const thead = table.querySelector("thead");
  if (!isHeader && !thead) {
    const head = doc.createElement("thead");
    first.before(head);
    head.appendChild(first);
  } else if (isHeader && thead && thead.contains(first)) {
    const body = table.querySelector("tbody") ?? table;
    body.insertBefore(first, body.firstChild);
    if (thead.children.length === 0) thead.remove();
  }
}

export interface TableShape {
  rows: number;
  cols: number;
  hasHeader: boolean;
}

export function shapeOf(table: HTMLTableElement): TableShape {
  const rows = allRows(table);
  return {
    rows: rows.length,
    cols: Math.max(0, ...rows.map((r) => r.cells.length)),
    hasHeader: !!rows[0] && Array.from(rows[0].cells).every((c) => c.tagName === "TH"),
  };
}
