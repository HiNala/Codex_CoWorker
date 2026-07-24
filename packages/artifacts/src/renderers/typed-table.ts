/** Hard row cap for typed tables (Track E security checklist). */
export const MAX_ROWS = 50_000;

/** Max serialized size for table exports (10 MB). */
export const MAX_TABLE_BYTES = 10 * 1024 * 1024;

export type TypedTableColumnType =
  "string" | "number" | "boolean" | "date" | "url" | "json" | (string & {});

export type TypedTableColumn = {
  id: string;
  name: string;
  type: TypedTableColumnType;
};

export type TypedTableRow = {
  rowId: string;
  cells: Record<string, unknown>;
  evidenceRefs?: string[];
};

export type TypedTableContent = {
  columns: TypedTableColumn[];
  rows: TypedTableRow[];
  /** Optional precomputed warning flags (duplicates, type mismatches, etc.). */
  warnings?: Array<{ rowId?: string; message: string }>;
};

export type TableMetrics = {
  rows: number;
  warnings: number;
};

export type TableExportResult = {
  body: string;
  truncated: boolean;
  truncatedRows: number;
};

const CSV_INJECTION_PREFIX = new Set(["=", "+", "-", "@", "\t", "\r"]);

/**
 * Prefix cells that start with formula/injection triggers so spreadsheet apps
 * treat them as literal text. Leading whitespace is checked after the first
 * significant character following optional spaces.
 */
export function sanitizeCsvCell(value: string): string {
  if (value.length === 0) return value;

  // Strip outer quotes if we will re-quote later; injection check uses raw value.
  let needsPrefix = false;
  const first = value[0] ?? "";
  if (CSV_INJECTION_PREFIX.has(first)) {
    needsPrefix = true;
  } else {
    // Also guard values that start with whitespace then a trigger (Excel strips leading spaces).
    const trimmedStart = value.replace(/^[ \t]+/, "");
    const t0 = trimmedStart[0] ?? "";
    if (CSV_INJECTION_PREFIX.has(t0)) needsPrefix = true;
  }

  const literal = needsPrefix ? `'${value}` : value;

  // RFC 4180-style quoting when required
  if (/[",\n\r]/.test(literal)) {
    return `"${literal.replace(/"/g, '""')}"`;
  }
  return literal;
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function clampRows(table: TypedTableContent): {
  rows: TypedTableRow[];
  truncated: boolean;
  truncatedRows: number;
} {
  if (table.rows.length <= MAX_ROWS) {
    return { rows: table.rows, truncated: false, truncatedRows: 0 };
  }
  return {
    rows: table.rows.slice(0, MAX_ROWS),
    truncated: true,
    truncatedRows: table.rows.length - MAX_ROWS,
  };
}

export function exportCsv(table: TypedTableContent): string {
  return exportCsvDetailed(table).body;
}

export function exportCsvDetailed(table: TypedTableContent): TableExportResult {
  const { rows, truncated, truncatedRows } = clampRows(table);
  const header = table.columns.map((c) => sanitizeCsvCell(c.name)).join(",");
  const lines = [header];

  for (const row of rows) {
    const cells = table.columns.map((col) => sanitizeCsvCell(cellToString(row.cells[col.id])));
    lines.push(cells.join(","));
  }

  if (truncated) {
    lines.push(
      sanitizeCsvCell(
        `… truncated: ${truncatedRows} additional row(s) omitted (limit ${MAX_ROWS})`,
      ),
    );
  }

  let body = lines.join("\n");
  const encoder = new TextEncoder();
  if (encoder.encode(body).byteLength > MAX_TABLE_BYTES) {
    // Hard byte cap — keep header and as many rows as fit
    const parts = [header];
    let size = encoder.encode(header + "\n").byteLength;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const next = encoder.encode(line + "\n").byteLength;
      if (size + next > MAX_TABLE_BYTES) break;
      parts.push(line);
      size += next;
    }
    parts.push(sanitizeCsvCell("… truncated: export exceeded 10 MB limit"));
    body = parts.join("\n");
    return {
      body,
      truncated: true,
      truncatedRows: Math.max(truncatedRows, table.rows.length - (parts.length - 2)),
    };
  }

  return { body, truncated, truncatedRows };
}

export function exportJson(table: TypedTableContent): string {
  return exportJsonDetailed(table).body;
}

export function exportJsonDetailed(table: TypedTableContent): TableExportResult {
  const { rows, truncated, truncatedRows } = clampRows(table);
  const payload = {
    columns: table.columns,
    rows,
    ...(truncated
      ? {
          truncation: {
            notice: `truncated to ${MAX_ROWS} rows`,
            omittedRows: truncatedRows,
          },
        }
      : {}),
  };
  let body = JSON.stringify(payload);
  const encoder = new TextEncoder();
  if (encoder.encode(body).byteLength > MAX_TABLE_BYTES) {
    // Progressively shrink row set
    let keep = Math.min(rows.length, MAX_ROWS);
    do {
      keep = Math.floor(keep * 0.8);
      const smaller = {
        columns: table.columns,
        rows: rows.slice(0, Math.max(1, keep)),
        truncation: {
          notice: "truncated: export exceeded 10 MB limit",
          omittedRows: table.rows.length - Math.max(1, keep),
        },
      };
      body = JSON.stringify(smaller);
    } while (encoder.encode(body).byteLength > MAX_TABLE_BYTES && keep > 1);
    return {
      body,
      truncated: true,
      truncatedRows: table.rows.length - Math.max(1, keep),
    };
  }
  return { body, truncated, truncatedRows };
}

export function tableMetrics(table: TypedTableContent): TableMetrics {
  // Prefer explicit warnings array; if absent, count is 0 (do not invent warnings).
  return {
    rows: table.rows.length,
    warnings: table.warnings?.length ?? 0,
  };
}

/** Apply row limit for display, returning a notice string when truncated. */
export function limitTableForDisplay(table: TypedTableContent): {
  table: TypedTableContent;
  notice: string | null;
} {
  if (table.rows.length <= MAX_ROWS) {
    return { table, notice: null };
  }
  const omitted = table.rows.length - MAX_ROWS;
  const limited: TypedTableContent = {
    columns: table.columns,
    rows: table.rows.slice(0, MAX_ROWS),
  };
  if (table.warnings) limited.warnings = table.warnings;
  return {
    table: limited,
    notice: `Showing first ${MAX_ROWS.toLocaleString()} of ${table.rows.length.toLocaleString()} rows (${omitted.toLocaleString()} omitted).`,
  };
}
