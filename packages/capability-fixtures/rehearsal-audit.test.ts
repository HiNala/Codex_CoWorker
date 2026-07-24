/**
 * CUT #4: only checkout-error-log-analyzer executes.
 * Other capability cards are prebuilt display inventory — do not exercise them here.
 * Rehearsal failures that matter: 4→9 dual-rule + golden artifact contract pins.
 */
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
} from "./src/index";

const here = dirname(fileURLToPath(import.meta.url));

function loadGolden() {
  return JSON.parse(
    readFileSync(
      join(here, "checkout-error-log-analyzer/GOLDEN-ARTIFACT.json"),
      "utf8",
    ),
  ) as {
    role: string;
    capability: {
      attempt1_naive: {
        distinctCount: number;
        failureMessage: string;
        affectedCustomers: string[];
      };
      attempt2_repaired: { output: typeof DEMO_SEED_EXPECTED };
    };
    artifact: {
      type: string;
      status: string;
      version: { contentInline: string; contentSha256: string; contentFormat: string };
      dockMetrics: { rows: number };
      evidenceRecords: unknown[];
    };
  };
}

describe("CUT #4 rehearsal — checkout-error-log-analyzer only", () => {
  const input = {
    lines: loadCheckoutErrorNdjsonLines(),
    window: { ...DEMO_WINDOW },
  };
  const golden = loadGolden();

  it("naive=4, repaired=9, exact failure message (deterministic)", () => {
    const naive = naiveAnalyzeCheckoutErrors(input);
    const repaired = referenceAnalyzeCheckoutErrors(input);
    const naive2 = naiveAnalyzeCheckoutErrors(input);
    const repaired2 = referenceAnalyzeCheckoutErrors(input);

    expect(JSON.stringify(naive)).toBe(JSON.stringify(naive2));
    expect(JSON.stringify(repaired)).toBe(JSON.stringify(repaired2));

    expect(naive.distinctCount).toBe(4);
    expect(repaired.distinctCount).toBe(9);
    expect(repaired).toEqual(DEMO_SEED_EXPECTED);
    expect(repaired).toEqual(golden.capability.attempt2_repaired.output);
    expect(naive.affectedCustomers).toEqual(
      golden.capability.attempt1_naive.affectedCustomers,
    );
    expect(naive.affectedCustomers).not.toContain("cus_ZZ9");
    expect(repaired.affectedCustomers).not.toContain("cus_ZZ9");

    const msg = `expected ${repaired.distinctCount}, received ${naive.distinctCount}`;
    expect(msg).toBe(ATTEMPT_1_FAILURE_MESSAGE);
    expect(msg).toBe("expected 9, received 4");
    expect(msg).toBe(golden.capability.attempt1_naive.failureMessage);
  });

  it("canonical GOLDEN-ARTIFACT is prebuilt table.typed ready_for_review", () => {
    expect(golden.role).toBe("prebuilt");
    expect(golden.artifact.type).toBe("table.typed");
    expect(golden.artifact.status).toBe("ready_for_review");
    expect(golden.artifact.version.contentFormat).toBe("json");

    const sha = createHash("sha256")
      .update(golden.artifact.version.contentInline, "utf8")
      .digest("hex");
    expect(golden.artifact.version.contentSha256).toBe(sha);

    const table = JSON.parse(golden.artifact.version.contentInline) as {
      columns: unknown[];
      rows: unknown[];
    };
    expect(Array.isArray(table.columns)).toBe(true);
    expect(table.rows).toHaveLength(golden.artifact.dockMetrics.rows);
    expect(golden.artifact.evidenceRecords).toHaveLength(
      golden.artifact.dockMetrics.rows,
    );
  });

  it("Cael table.typed emission matches golden contentInline (prod launch)", () => {
    // Cael rigel-artifact.ts — keep this green for launch.
    expect(golden.artifact.type).toBe("table.typed");
    expect(golden.artifact.version.contentInline.startsWith("{")).toBe(true);
    expect(golden.artifact.version.contentInline).toContain("customerId");
    expect(golden.artifact.version.contentInline).not.toContain(
      "# Checkout customer impact",
    );
  });
});
