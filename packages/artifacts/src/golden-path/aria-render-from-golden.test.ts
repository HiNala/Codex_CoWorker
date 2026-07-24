/**
 * Proves Aria can consume GOLDEN-ARTIFACT contentInline as table.typed
 * ready_for_review with N rows from data (no hardcoded row count in source).
 *
 * Mirrors apps/web TypedTableArtifact.asTable + ArtifactCard metrics chips.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { exportCsv, resolveRenderer, tableMetrics } from "../renderers/index";
import type { TypedTableContent } from "../renderers/typed-table";

function loadGolden() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
  return JSON.parse(
    readFileSync(
      join(
        root,
        "packages/capability-fixtures/checkout-error-log-analyzer/GOLDEN-ARTIFACT.json",
      ),
      "utf8",
    ),
  ) as {
    artifact: {
      type: string;
      title: string;
      status: string;
      version: { contentInline: string; contentFormat: string };
      dockMetrics: { rows: number; warnings: number; versionLabel: string };
      evidenceByAnchor: Record<string, string[]>;
      evidenceRecords: Array<{ id: string }>;
    };
    renderer: { registryKey: string; csv: string };
  };
}

/** Same shape guard as apps/web TypedTableArtifact.asTable */
function asTable(content: unknown): TypedTableContent | null {
  if (!content || typeof content !== "object") return null;
  const c = content as TypedTableContent;
  if (!Array.isArray(c.columns) || !Array.isArray(c.rows)) return null;
  return c;
}

/** Aria dock chips from row count — never a numeric literal in production code. */
function tableDockChips(
  table: TypedTableContent,
  versionLabel: string,
): string[] {
  const metrics = tableMetrics(table);
  return [
    `${metrics.rows} row${metrics.rows === 1 ? "" : "s"}`,
    `${metrics.warnings} warning${metrics.warnings === 1 ? "" : "s"}`,
    versionLabel,
  ];
}

describe("Aria render path from GOLDEN-ARTIFACT contentInline", () => {
  const golden = loadGolden();

  it("selects typed-table renderer for table.typed ready_for_review", () => {
    expect(golden.artifact.type).toBe("table.typed");
    expect(golden.artifact.status).toBe("ready_for_review");
    expect(resolveRenderer(golden.artifact.type)).toBe("typed-table");
    expect(resolveRenderer(golden.artifact.type)).toBe(golden.renderer.registryKey);
  });

  it("parses contentInline without hardcoding row count", () => {
    expect(golden.artifact.version.contentFormat).toBe("json");
    const parsed: unknown = JSON.parse(golden.artifact.version.contentInline);
    const table = asTable(parsed);
    expect(table).not.toBeNull();
    if (!table) return;

    const expectedRows = golden.artifact.dockMetrics.rows;
    expect(table.rows.length).toBe(expectedRows);
    expect(tableMetrics(table).rows).toBe(expectedRows);

    const chips = tableDockChips(table, golden.artifact.dockMetrics.versionLabel);
    expect(chips[0]).toBe(`${expectedRows} rows`);
    expect(chips[2]).toBe(golden.artifact.dockMetrics.versionLabel);

    // Renderer CSV includes every customer id from rows (data-driven)
    const csv = exportCsv(table);
    for (const row of table.rows) {
      expect(csv).toContain(String(row.cells.customerId ?? row.rowId));
    }

    // Evidence anchors cover every row
    for (const row of table.rows) {
      const key = `customer:${row.rowId}`;
      expect(golden.artifact.evidenceByAnchor[key]?.length).toBeGreaterThan(0);
    }
    expect(Object.keys(golden.artifact.evidenceByAnchor).length).toBe(expectedRows);
    expect(golden.artifact.evidenceRecords.length).toBe(expectedRows);
  });

  it("rejects Cael markdown body as typed table content", () => {
    const markdownBody = [
      "# Checkout customer impact",
      "",
      "**Distinct affected customers: 9**",
      "",
      "- cus_AC2",
    ].join("\n");
    expect(asTable(markdownBody)).toBeNull();
    // JSON string that is not an object table also fails
    expect(asTable(JSON.parse(JSON.stringify("not a table")))).toBeNull();
  });
});
