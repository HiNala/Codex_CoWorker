import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ATTEMPT_1_FAILURE_MESSAGE,
  DEMO_SEED_EXPECTED,
  DEMO_WINDOW,
  loadCheckoutErrorNdjsonLines,
  naiveAnalyzeCheckoutErrors,
  referenceAnalyzeCheckoutErrors,
} from "../src/index";

const here = dirname(fileURLToPath(import.meta.url));

function loadGolden() {
  return JSON.parse(
    readFileSync(join(here, "GOLDEN-ARTIFACT.json"), "utf8"),
  ) as {
    role: string;
    capability: {
      attempt1_naive: {
        distinctCount: number;
        affectedCustomers: string[];
        failureMessage: string;
      };
      attempt2_repaired: {
        distinctCount: number;
        output: typeof DEMO_SEED_EXPECTED;
      };
    };
    artifact: {
      type: string;
      status: string;
      version: { contentInline: string; contentSha256: string; ordinal: number };
      typedTable: { rows: unknown[] };
      dockMetrics: { rows: number };
      evidenceRecords: unknown[];
      evidenceByAnchor: Record<string, string[]>;
    };
    provenance: { rootId: string; nodes: unknown[]; edges: unknown[] };
    renderer: { type: string; csv: string; expectsNineDataRows: boolean };
    consumption: { cael: { attempt1Message: string }; aria: unknown };
  };
}

describe("GOLDEN-ARTIFACT.json — canonical war-room fixture", () => {
  const golden = loadGolden();
  const input = {
    lines: loadCheckoutErrorNdjsonLines(),
    window: { ...DEMO_WINDOW },
  };

  it("is prebuilt (fifth capability cut to prebuilt)", () => {
    expect(golden.role).toBe("prebuilt");
  });

  it("naive=4 and repaired=9 match live analyzer + fixture pins", () => {
    const naive = naiveAnalyzeCheckoutErrors(input);
    const repaired = referenceAnalyzeCheckoutErrors(input);

    expect(naive.distinctCount).toBe(4);
    expect(naive.distinctCount).toBe(golden.capability.attempt1_naive.distinctCount);
    expect(naive.affectedCustomers).toEqual(
      golden.capability.attempt1_naive.affectedCustomers,
    );

    expect(repaired.distinctCount).toBe(9);
    expect(repaired).toEqual(DEMO_SEED_EXPECTED);
    expect(repaired).toEqual(golden.capability.attempt2_repaired.output);
    expect(golden.capability.attempt1_naive.failureMessage).toBe(
      ATTEMPT_1_FAILURE_MESSAGE,
    );
    expect(golden.consumption.cael.attempt1Message).toBe("expected 9, received 4");
  });

  it("artifact version content SHA matches contentInline; 9 rows + 9 evidence", () => {
    const { version, typedTable, dockMetrics, evidenceRecords, evidenceByAnchor } =
      golden.artifact;
    const sha = createHash("sha256").update(version.contentInline, "utf8").digest("hex");
    expect(version.contentSha256).toBe(sha);
    expect(version.ordinal).toBe(1);
    expect(golden.artifact.type).toBe("table.typed");
    expect(golden.artifact.status).toBe("ready_for_review");
    expect(typedTable.rows).toHaveLength(9);
    expect(dockMetrics.rows).toBe(9);
    expect(evidenceRecords).toHaveLength(9);
    expect(Object.keys(evidenceByAnchor)).toHaveLength(9);
  });

  it("provenance has root, run, capability, evidence edges", () => {
    expect(golden.provenance.rootId).toBe(golden.artifact.id);
    expect(golden.provenance.nodes.length).toBeGreaterThanOrEqual(12);
    expect(golden.provenance.edges.some((e: { relation: string }) => e.relation === "source_run")).toBe(
      true,
    );
    expect(
      golden.provenance.edges.some(
        (e: { relation: string }) => e.relation === "capability_version",
      ),
    ).toBe(true);
    expect(
      golden.provenance.edges.filter((e: { relation: string }) => e.relation === "evidence"),
    ).toHaveLength(9);
  });

  it("renderer CSV has header + 9 customer rows", () => {
    expect(golden.renderer.type).toBe("table.typed");
    expect(golden.renderer.expectsNineDataRows).toBe(true);
    const lines = golden.renderer.csv.trim().split("\n");
    expect(lines[0]).toBe("Customer,Impact");
    expect(lines).toHaveLength(10);
    for (const cus of golden.capability.attempt2_repaired.output.affectedCustomers) {
      expect(golden.renderer.csv).toContain(cus);
    }
  });
});
