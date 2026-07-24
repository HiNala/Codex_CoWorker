/**
 * Standalone critical-path test for the demo beat.
 * Does not depend on JSON file loading — pins the exact Case 003 contract
 * so a regression cannot silently re-pass a naive searcher.
 */
import { describe, expect, it } from "vitest";
import type { ApiChangeImpactInput, ApiChangeImpactOutput } from "../src/types";
import { deepEqual } from "../src/deep-equal";
import { naiveAnalyze } from "./naive-impl";
import { referenceAnalyze } from "./reference-impl";

const case003Input: ApiChangeImpactInput = {
  apiChange: {
    kind: "field_rename",
    path: "payment_intent.metadata.customer_ref",
    newPath: "payment_intent.metadata.customer_id",
    version: "2026-07-01",
  },
  consumers: [
    {
      id: "c-114",
      name: "Northwind Retail",
      usageSamples: [
        {
          file: "src/webhooks.ts",
          line: 42,
          snippet: "const meta = event.data.object.metadata;\nreturn meta.customer_ref;",
        },
      ],
    },
  ],
};

const case003Expected: ApiChangeImpactOutput = {
  affected: [
    {
      consumerId: "c-114",
      consumerName: "Northwind Retail",
      matches: [
        {
          file: "src/webhooks.ts",
          line: 43,
          snippet: "return meta.customer_ref;",
          matchKind: "nested",
          confidence: 0.9,
        },
      ],
      breakingLikelihood: "certain",
      suggestedFix: "Update access of customer_ref to customer_id (via metadata alias)",
    },
  ],
  unaffected: [],
  summary: {
    consumersScanned: 1,
    consumersAffected: 1,
    totalMatches: 1,
  },
};

describe("CRITICAL 003 nested rename (demo fail→repair beat)", () => {
  it("snippet does NOT contain the full dotted path (traps literal search)", () => {
    const snippet = case003Input.consumers[0]!.usageSamples[0]!.snippet;
    expect(snippet.includes("payment_intent.metadata.customer_ref")).toBe(false);
    expect(snippet.includes("customer_ref")).toBe(true);
    expect(snippet.includes("const meta")).toBe(true);
  });

  it("naive returns WRONG answer: unaffected, not a throw", () => {
    const actual = naiveAnalyze(case003Input);
    expect(deepEqual(actual, case003Expected)).toBe(false);
    expect(actual.affected).toEqual([]);
    expect(actual.unaffected).toEqual(["c-114"]);
    expect(actual.summary).toEqual({
      consumersScanned: 1,
      consumersAffected: 0,
      totalMatches: 0,
    });
  });

  it("reference returns the trusted expected output", () => {
    const actual = referenceAnalyze(case003Input);
    expect(deepEqual(actual, case003Expected)).toBe(true);
  });
});
