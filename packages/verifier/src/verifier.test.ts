import { describe, expect, it } from "vitest";
import { REQUIRED_GATES, trustedFixtureWasModified } from "./index";

describe("verifier invariants", () => {
  it("defines all twelve independent gates", () => {
    expect(REQUIRED_GATES).toHaveLength(12);
  });

  it("detects any write into trusted fixtures", () => {
    expect(
      trustedFixtureWasModified(["src/index.ts", "packages/capability-fixtures/nested.json"]),
    ).toBe(true);
  });
});
