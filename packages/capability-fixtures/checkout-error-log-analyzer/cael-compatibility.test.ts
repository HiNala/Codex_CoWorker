/**
 * Compatibility gate: Cael's capability pins MUST match golden.
 * Artifact shape Cael currently emits (markdown) is asserted as MISMATCH
 * so regressions are visible until Cael adopts table.typed contentInline.
 *
 * Read-only reference of Cael emission (agent-runtime golden-path):
 *   type: document.markdown
 *   content: markdown bullets
 *   title: "Checkout customer impact"
 */
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

/** Snapshot of what Cael writes today (run-seeded-pg / run-seeded). */
const CAEL_EMITTED_ARTIFACT_SHAPE = {
  type: "document.markdown",
  contentFormat: "markdown",
  title: "Checkout customer impact",
  slug: "checkout-customer-impact",
  status: "ready_for_review",
  authorType: "agent",
  // body is markdown, not TypedTable JSON
  contentKind: "markdown_report",
} as const;

function loadGolden() {
  return JSON.parse(readFileSync(join(here, "GOLDEN-ARTIFACT.json"), "utf8")) as {
    artifact: {
      type: string;
      title: string;
      slug: string;
      status: string;
      version: { contentFormat: string; authorType: string; contentInline: string };
      dockMetrics: { rows: number };
      evidenceRecords: unknown[];
    };
    capability: {
      attempt1_naive: { distinctCount: number; failureMessage: string; affectedCustomers: string[] };
      attempt2_repaired: { output: typeof DEMO_SEED_EXPECTED };
    };
  };
}

describe("Cael compatibility vs GOLDEN-ARTIFACT", () => {
  const golden = loadGolden();
  const input = {
    lines: loadCheckoutErrorNdjsonLines(),
    window: { ...DEMO_WINDOW },
  };

  it("MATCH: capability 4→9 pins (Cael checkout-analyzer-fake aligned)", () => {
    const naive = naiveAnalyzeCheckoutErrors(input);
    const repaired = referenceAnalyzeCheckoutErrors(input);
    expect(naive.distinctCount).toBe(4);
    expect(repaired.distinctCount).toBe(9);
    expect(repaired).toEqual(golden.capability.attempt2_repaired.output);
    expect(repaired).toEqual(DEMO_SEED_EXPECTED);
    expect(ATTEMPT_1_FAILURE_MESSAGE).toBe(
      golden.capability.attempt1_naive.failureMessage,
    );
    expect(ATTEMPT_1_FAILURE_MESSAGE).toBe("expected 9, received 4");
  });

  it("MISMATCH: Cael still emits document.markdown instead of table.typed", () => {
    expect(CAEL_EMITTED_ARTIFACT_SHAPE.type).toBe("document.markdown");
    expect(golden.artifact.type).toBe("table.typed");
    expect(CAEL_EMITTED_ARTIFACT_SHAPE.type).not.toBe(golden.artifact.type);

    expect(CAEL_EMITTED_ARTIFACT_SHAPE.contentFormat).toBe("markdown");
    expect(golden.artifact.version.contentFormat).toBe("json");

    expect(CAEL_EMITTED_ARTIFACT_SHAPE.title).not.toBe(golden.artifact.title);
    expect(CAEL_EMITTED_ARTIFACT_SHAPE.slug).not.toBe(golden.artifact.slug);

    // Golden contentInline must parse as typed table with dockMetrics.rows rows
    const table = JSON.parse(golden.artifact.version.contentInline) as {
      rows: unknown[];
      columns: unknown[];
    };
    expect(Array.isArray(table.columns)).toBe(true);
    expect(table.rows).toHaveLength(golden.artifact.dockMetrics.rows);
    expect(golden.artifact.evidenceRecords).toHaveLength(golden.artifact.dockMetrics.rows);

    // Status alone is aligned
    expect(CAEL_EMITTED_ARTIFACT_SHAPE.status).toBe(golden.artifact.status);
    expect(golden.artifact.status).toBe("ready_for_review");
  });

  it("documents required Cael fix for Aria TypedTable path", () => {
    // If this fails, update CAEL-MISMATCH.md — the contract for Aria is table.typed JSON.
    expect(golden.artifact.version.contentInline.startsWith("{")).toBe(true);
    expect(golden.artifact.version.contentInline).toContain("customerId");
    expect(golden.artifact.version.contentInline).not.toContain(
      "# Checkout customer impact",
    );
  });
});
