/**
 * Prod launch compatibility: Cael table.typed contentInline must stay
 * byte-compatible with GOLDEN-ARTIFACT.json (rigel-artifact.ts).
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

/** Cael emission after rigel-artifact.ts adoption (prod launch). */
const CAEL_EMITTED = {
  type: "table.typed",
  contentFormat: "json",
  title: "Affected customers — annual checkout",
  slug: "affected-customers-annual-checkout",
  status: "ready_for_review",
  authorType: "capability",
  authorRef: "checkout-error-log-analyzer@1.0.0",
  artifactId: "0198206f-5f53-7000-8000-000000000101",
  versionId: "0198206f-5f53-7000-8000-000000000102",
} as const;

function loadGolden() {
  return JSON.parse(readFileSync(join(here, "GOLDEN-ARTIFACT.json"), "utf8")) as {
    artifact: {
      id: string;
      type: string;
      title: string;
      slug: string;
      status: string;
      currentVersionId: string;
      version: {
        id: string;
        contentFormat: string;
        authorType: string;
        authorRef: string;
        contentInline: string;
      };
      dockMetrics: { rows: number };
      evidenceRecords: unknown[];
      typedTable: {
        rows: Array<{ rowId: string; evidenceRefs: string[] }>;
        columns: Array<{ id: string }>;
      };
    };
    capability: {
      attempt1_naive: { distinctCount: number; failureMessage: string };
      attempt2_repaired: { output: typeof DEMO_SEED_EXPECTED };
    };
  };
}

/** Mirrors Cael buildTypedTable from repaired output + golden evidence map. */
function buildCaelTableFromRepaired(customers: string[]) {
  const evidence: Record<string, string> = {
    cus_AC2: "c1a3539e-6dad-4e74-adff-d6c8bacb9b94",
    cus_BR3: "5fe779e6-3e9d-492e-a735-9876daef1de1",
    cus_KT4: "a3f21e45-2a0a-42b4-aafc-3687b5aada1d",
    cus_LM5: "08c29624-a300-4dca-a1cf-478f243e656c",
    cus_NW1: "93480525-bada-44a9-a5d8-0e135e938413",
    cus_OP6: "81977e94-2c08-4310-ac60-c0ce109eb9d5",
    cus_QR7: "b4105073-0f27-42c8-a275-9b6d14d68609",
    cus_ST8: "754395f7-cf2b-4686-a78f-278d7bb525f1",
    cus_UV9: "ef41bfeb-696f-4a5d-a8f6-04cba7bdeadb",
  };
  return {
    columns: [
      { id: "customerId", name: "Customer", type: "string" },
      { id: "impact", name: "Impact", type: "string" },
    ],
    rows: customers.map((customerId) => ({
      rowId: customerId,
      cells: { customerId, impact: "annual_checkout_failed" },
      evidenceRefs: evidence[customerId] ? [evidence[customerId]!] : [],
    })),
    warnings: [] as string[],
  };
}

describe("Cael compatibility vs GOLDEN-ARTIFACT (prod launch)", () => {
  const golden = loadGolden();
  const input = {
    lines: loadCheckoutErrorNdjsonLines(),
    window: { ...DEMO_WINDOW },
  };

  it("MATCH: capability 4→9", () => {
    const naive = naiveAnalyzeCheckoutErrors(input);
    const repaired = referenceAnalyzeCheckoutErrors(input);
    expect(naive.distinctCount).toBe(4);
    expect(repaired.distinctCount).toBe(9);
    expect(repaired).toEqual(golden.capability.attempt2_repaired.output);
    expect(repaired).toEqual(DEMO_SEED_EXPECTED);
    expect(ATTEMPT_1_FAILURE_MESSAGE).toBe("expected 9, received 4");
  });

  it("MATCH: table.typed metadata + contentInline byte-equal to golden", () => {
    expect(CAEL_EMITTED.type).toBe(golden.artifact.type);
    expect(CAEL_EMITTED.type).toBe("table.typed");
    expect(CAEL_EMITTED.contentFormat).toBe(golden.artifact.version.contentFormat);
    expect(CAEL_EMITTED.title).toBe(golden.artifact.title);
    expect(CAEL_EMITTED.slug).toBe(golden.artifact.slug);
    expect(CAEL_EMITTED.status).toBe(golden.artifact.status);
    expect(CAEL_EMITTED.authorType).toBe(golden.artifact.version.authorType);
    expect(CAEL_EMITTED.authorRef).toBe(golden.artifact.version.authorRef);
    expect(CAEL_EMITTED.artifactId).toBe(golden.artifact.id);
    expect(CAEL_EMITTED.versionId).toBe(golden.artifact.version.id);

    const repaired = referenceAnalyzeCheckoutErrors(input);
    const caelBody = JSON.stringify(buildCaelTableFromRepaired(repaired.affectedCustomers));
    expect(caelBody).toBe(golden.artifact.version.contentInline);

    const table = JSON.parse(caelBody) as { rows: unknown[]; columns: unknown[] };
    expect(table.rows).toHaveLength(golden.artifact.dockMetrics.rows);
  });

  it("Aria can parse contentInline as typed table", () => {
    const parsed = JSON.parse(golden.artifact.version.contentInline) as {
      columns?: unknown;
      rows?: unknown[];
    };
    expect(Array.isArray(parsed.columns)).toBe(true);
    expect(Array.isArray(parsed.rows)).toBe(true);
    expect(parsed.rows!.length).toBe(golden.artifact.dockMetrics.rows);
  });
});
