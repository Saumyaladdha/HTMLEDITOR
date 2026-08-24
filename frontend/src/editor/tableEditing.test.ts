import { describe, expect, it } from "vitest";
import {
  allRows,
  deleteColumn,
  deleteRow,
  insertColumn,
  insertRow,
  positionOf,
  shapeOf,
  toggleHeaderRow,
} from "./tableEditing";

/**
 * Tables had no editing at all — no way to add or remove a row or a column —
 * despite this repo's element library containing eight distinct table types.
 */
const doc = document;

function setup(html: string): HTMLTableElement {
  doc.body.innerHTML = html;
  return doc.querySelector("table")!;
}

const SIMPLE = `
<table>
  <thead><tr><th>A</th><th>B</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>2</td></tr>
    <tr><td>3</td><td>4</td></tr>
  </tbody>
</table>`;

function at(table: HTMLTableElement, row: number, col: number) {
  return positionOf(allRows(table)[row].cells[col] as HTMLTableCellElement)!;
}

describe("shapeOf", () => {
  it("reports rows, columns and header state", () => {
    expect(shapeOf(setup(SIMPLE))).toEqual({ rows: 3, cols: 2, hasHeader: true });
  });
});

describe("rows", () => {
  it("inserts below", () => {
    const table = setup(SIMPLE);
    insertRow(doc, at(table, 1, 0), "below");
    expect(shapeOf(table).rows).toBe(4);
    expect(allRows(table)[2].cells).toHaveLength(2);
  });

  it("inserts above", () => {
    const table = setup(SIMPLE);
    insertRow(doc, at(table, 2, 0), "above");
    expect(allRows(table)[2].textContent?.trim()).toBe("");
  });

  it("never makes a body row out of header cells", () => {
    const table = setup(SIMPLE);
    insertRow(doc, at(table, 0, 0), "below");
    expect(Array.from(allRows(table)[1].cells).every((c) => c.tagName === "TD")).toBe(true);
  });

  it("deletes a row", () => {
    const table = setup(SIMPLE);
    expect(deleteRow(at(table, 2, 0))).toBe(true);
    expect(shapeOf(table).rows).toBe(2);
  });

  it("refuses to delete the last remaining row", () => {
    const table = setup("<table><tr><td>only</td></tr></table>");
    expect(deleteRow(at(table, 0, 0))).toBe(false);
    expect(shapeOf(table).rows).toBe(1);
  });
});

describe("columns", () => {
  it("inserts to the right across every row", () => {
    const table = setup(SIMPLE);
    insertColumn(doc, at(table, 1, 0), "right");
    expect(shapeOf(table).cols).toBe(3);
    for (const row of allRows(table)) expect(row.cells).toHaveLength(3);
  });

  it("inserts to the left", () => {
    const table = setup(SIMPLE);
    insertColumn(doc, at(table, 1, 1), "left");
    expect(allRows(table)[1].cells[1].textContent?.trim()).toBe("");
  });

  it("keeps each row's own cell type when inserting", () => {
    const table = setup(SIMPLE);
    insertColumn(doc, at(table, 0, 0), "right");
    expect(allRows(table)[0].cells[1].tagName).toBe("TH");
    expect(allRows(table)[1].cells[1].tagName).toBe("TD");
  });

  it("preserves per-column attributes on the new cell", () => {
    const table = setup('<table><tr><td class="num" style="width:40px">1</td></tr></table>');
    insertColumn(doc, at(table, 0, 0), "right");
    expect(allRows(table)[0].cells[1].className).toBe("num");
    expect(allRows(table)[0].cells[1].getAttribute("style")).toBe("width:40px");
  });

  it("deletes a column from every row", () => {
    const table = setup(SIMPLE);
    expect(deleteColumn(at(table, 1, 1))).toBe(true);
    expect(shapeOf(table).cols).toBe(1);
    for (const row of allRows(table)) expect(row.cells).toHaveLength(1);
  });

  it("refuses to delete the last remaining column", () => {
    const table = setup("<table><tr><td>only</td></tr></table>");
    expect(deleteColumn(at(table, 0, 0))).toBe(false);
  });
});

describe("header row", () => {
  it("removes the header when there is one", () => {
    const table = setup(SIMPLE);
    toggleHeaderRow(doc, table);
    expect(shapeOf(table).hasHeader).toBe(false);
    expect(table.querySelector("thead")).toBeNull();
  });

  it("adds one when there isn't, wrapping it in <thead>", () => {
    const table = setup("<table><tbody><tr><td>A</td><td>B</td></tr><tr><td>1</td><td>2</td></tr></tbody></table>");
    toggleHeaderRow(doc, table);
    expect(shapeOf(table).hasHeader).toBe(true);
    expect(table.querySelector("thead > tr > th")).not.toBeNull();
  });

  it("keeps the cells' content across the change", () => {
    const table = setup(SIMPLE);
    toggleHeaderRow(doc, table);
    expect(allRows(table)[0].textContent?.replace(/\s+/g, "")).toBe("AB");
  });

  it("round-trips", () => {
    const table = setup(SIMPLE);
    toggleHeaderRow(doc, table);
    toggleHeaderRow(doc, table);
    expect(shapeOf(table)).toEqual({ rows: 3, cols: 2, hasHeader: true });
  });
});
