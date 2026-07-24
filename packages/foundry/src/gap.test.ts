import { describe, expect, it } from "vitest";
import { defaultGapProposal, preferComposition } from "./gap";

describe("gap detection", () => {
  it("prefers composition when an installed capability already covers the purpose", () => {
    const decision = preferComposition(
      {
        slug: "new-echo",
        purpose: "Echo structured JSON",
        inputShape: "object",
        outputShape: "object",
      },
      [
        {
          slug: "echo-tool",
          purpose: "Echo structured JSON",
          inputShape: "object",
          outputShape: "object",
        },
      ],
    );

    expect(decision.build).toBe(false);
    if (!decision.build) {
      expect(decision.useSlug).toBe("echo-tool");
      expect(decision.reason).toMatch(/echo-tool/);
    }
  });

  it("allows a build when nothing covers the descriptor", () => {
    const decision = preferComposition(
      {
        slug: "api-change-impact-analyzer",
        purpose: "Detect nested field renames in API payloads",
        inputShape: "object",
        outputShape: "object",
      },
      [
        {
          slug: "echo-tool",
          purpose: "Echo structured JSON",
          inputShape: "object",
          outputShape: "object",
        },
      ],
    );

    expect(decision.build).toBe(true);
  });

  it("defaultGapProposal includes at least three trusted fixtures", () => {
    const proposal = defaultGapProposal({
      slug: "widget-normalizer",
      purpose: "Normalize widget payloads",
      inputShape: "object",
      outputShape: "object",
    });
    expect(proposal.trustedTestCases.length).toBeGreaterThanOrEqual(3);
    expect(proposal.simplerAlternative).toBeNull();
    expect(proposal.permissions.network).toBe(false);
  });
});
