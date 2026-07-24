import { describe, expect, it } from "vitest";
import {
  exportCsv,
  exportJson,
  limitTableForDisplay,
  MAX_ROWS,
  sanitizeCsvCell,
  tableMetrics,
  type TypedTableContent,
} from "./typed-table";

function sampleTable(rows = 2): TypedTableContent {
  return {
    columns: [
      { id: "name", name: "Name", type: "string" },
      { id: "score", name: "Score", type: "number" },
    ],
    rows: Array.from({ length: rows }, (_, i) => ({
      rowId: `r${i}`,
      cells: { name: `row-${i}`, score: i },
      evidenceRefs: i % 2 === 0 ? [`ev-${i}`] : [],
    })),
  };
}

describe("sanitizeCsvCell", () => {
  it("prefixes cells starting with = (CSV injection)", () => {
    expect(sanitizeCsvCell("=CMD")).toBe("'=CMD");
    expect(sanitizeCsvCell("+1+1")).toMatch(/^'\+/);
    expect(sanitizeCsvCell("-1+1")).toMatch(/^'-/);
    expect(sanitizeCsvCell("@SUM(A1)")).toMatch(/^'@/);
    expect(sanitizeCsvCell("\t=HI")).toMatch(/^'/);
    // CR triggers both injection prefix and RFC4180 quoting → "'\r..."
    expect(sanitizeCsvCell("\r=HI")).toMatch(/^("?'|')/);
  });

  it("does not prefix normal values", () => {
    expect(sanitizeCsvCell("hello")).toBe("hello");
    expect(sanitizeCsvCell("42")).toBe("42");
  });

  it("quotes cells containing commas", () => {
    expect(sanitizeCsvCell("a,b")).toBe('"a,b"');
  });
});

describe("exportCsv", () => {
  it("emits header and rows with injection-safe cells", () => {
    const table: TypedTableContent = {
      columns: [{ id: "f", name: "Formula", type: "string" }],
      rows: [{ rowId: "1", cells: { f: "=CMD|'/C calc'!A0" } }],
    };
    const csv = exportCsv(table);
    expect(csv.startsWith("Formula\n")).toBe(true);
    expect(csv).toContain("'=CMD");
  });
});

describe("exportJson", () => {
  it("serializes columns and rows", () => {
    const json = JSON.parse(exportJson(sampleTable(1))) as {
      columns: unknown[];
      rows: unknown[];
    };
    expect(json.columns).toHaveLength(2);
    expect(json.rows).toHaveLength(1);
  });
});

describe("tableMetrics", () => {
  it("reports row and warning counts", () => {
    const table = sampleTable(5);
    table.warnings = [
      { rowId: "r0", message: "duplicate" },
      { message: "type mismatch" },
    ];
    expect(tableMetrics(table)).toEqual({ rows: 5, warnings: 2 });
  });

  it("defaults warnings to 0 when absent", () => {
    expect(tableMetrics(sampleTable(3))).toEqual({ rows: 3, warnings: 0 });
  });
});

describe("row limits", () => {
  it("limitTableForDisplay truncates above MAX_ROWS with a notice", () => {
    const huge = sampleTable(MAX_ROWS + 10);
    const { table, notice } = limitTableForDisplay(huge);
    expect(table.rows).toHaveLength(MAX_ROWS);
    expect(notice).toMatch(/omitted/i);
  });

  it("exportCsv includes truncation notice past MAX_ROWS", () => {
    const cell = { a: "x" };
    const table: TypedTableContent = {
      columns: [{ id: "a", name: "A", type: "string" }],
      rows: Array.from({ length: MAX_ROWS + 1 }, (_, i) => ({
        rowId: String(i),
        cells: cell,
      })),
    };
    const csv = exportCsv(table);
    expect(csv).toMatch(/truncated/i);
    // header + MAX_ROWS data rows + notice line
    expect(csv.split("\n")).toHaveLength(MAX_ROWS + 2);
  });
});
