import {
  currentCell,
  deleteColumn,
  deleteRow,
  insertColumn,
  insertRow,
  shapeOf,
  toggleHeaderRow,
} from "../../editor/tableEditing";

interface Props {
  doc: Document;
  /** The selected block, when it is (or contains) a table. */
  table: HTMLTableElement;
  onChanged: () => void;
}

/**
 * Row/column controls for the selected table.
 *
 * Operations act on the cell the caret is in. With no caret in the table
 * (the table is merely selected) they fall back to the last row/column, so
 * "add a row" always does something sensible rather than silently failing —
 * which is what a person means when a table is selected and they press it.
 */
export default function TableControls({ doc, table, onChanged }: Props) {
  const shape = shapeOf(table);

  function withPosition(run: (pos: NonNullable<ReturnType<typeof currentCell>>) => void) {
    const rows = table.querySelectorAll<HTMLTableRowElement>("tr");
    const fallbackRow = rows[rows.length - 1];
    const fallbackCell = fallbackRow?.cells[fallbackRow.cells.length - 1];
    const pos =
      currentCell(doc, table) ??
      (fallbackCell
        ? {
            table,
            row: fallbackRow,
            cell: fallbackCell,
            rowIndex: rows.length - 1,
            colIndex: fallbackRow.cells.length - 1,
          }
        : null);
    if (!pos) return;
    run(pos);
    onChanged();
  }

  const btn = {
    background: "var(--shell-800)",
    border: "1px solid var(--shell-700)",
    color: "var(--ink-300)",
    padding: "6px 8px",
    borderRadius: 6,
    fontSize: 11.5,
    cursor: "pointer",
    flex: 1,
  } as const;

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--ink-500)",
          marginBottom: 9,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Table</span>
        <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 600 }}>
          {shape.rows} × {shape.cols}
        </span>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <button style={btn} onClick={() => withPosition((p) => insertRow(doc, p, "above"))}>
          ↑ Row above
        </button>
        <button style={btn} onClick={() => withPosition((p) => insertRow(doc, p, "below"))}>
          ↓ Row below
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <button style={btn} onClick={() => withPosition((p) => insertColumn(doc, p, "left"))}>
          ← Col left
        </button>
        <button style={btn} onClick={() => withPosition((p) => insertColumn(doc, p, "right"))}>
          → Col right
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <button
          style={{ ...btn, color: "var(--bad)" }}
          disabled={shape.rows <= 1}
          onClick={() => withPosition((p) => deleteRow(p))}
        >
          🗑 Row
        </button>
        <button
          style={{ ...btn, color: "var(--bad)" }}
          disabled={shape.cols <= 1}
          onClick={() => withPosition((p) => deleteColumn(p))}
        >
          🗑 Column
        </button>
      </div>

      <button
        style={{ ...btn, width: "100%", flex: "none" }}
        onClick={() => {
          toggleHeaderRow(doc, table);
          onChanged();
        }}
      >
        {shape.hasHeader ? "○ Remove header row" : "● Make first row a header"}
      </button>

      <p style={{ fontSize: 10.5, color: "var(--ink-500)", margin: "8px 0 0" }}>
        Acts on the cell your cursor is in, or the last cell if none.
      </p>
    </div>
  );
}
