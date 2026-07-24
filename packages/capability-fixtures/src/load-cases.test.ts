import { describe, expect, it } from "vitest";
import { loadApiChangeImpactCases } from "./load-cases";

describe("loadApiChangeImpactCases", () => {
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
