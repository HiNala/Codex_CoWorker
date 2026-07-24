import { describe, expect, it } from "vitest";
import { loadApiChangeImpactCases, loadCheckoutErrorLogCases } from "./load-cases";

describe("loadApiChangeImpactCases (optional/prebuilt)", () => {
  it("loads all five trusted fixtures including nested rename", () => {
    const cases = loadApiChangeImpactCases();
    expect(cases).toHaveLength(5);
    const nested = cases.find((c) =>
      c.description.includes("Nested field rename"),
    );
    expect(nested).toBeDefined();
    expect(nested!.input).toMatchObject({
      apiChange: {
        kind: "field_rename",
        path: "payment_intent.metadata.customer_ref",
        newPath: "payment_intent.metadata.customer_id",
      },
    });
    expect(nested!.expectedOutput).toMatchObject({
      affected: [{ consumerId: "c-114", matches: [{ matchKind: "nested" }] }],
    });
  });
});

describe("loadCheckoutErrorLogCases (live-build primary)", () => {
  it("loads seeded demo case with lines injected and expected distinctCount 9", () => {
    const cases = loadCheckoutErrorLogCases();
    expect(cases.length).toBeGreaterThanOrEqual(4);
    const seed = cases.find((c) => c.description.includes("9 distinct"));
    expect(seed).toBeDefined();
    expect(seed!.input.lines.length).toBeGreaterThan(30);
    expect(seed!.expectedOutput.distinctCount).toBe(9);
  });
});
