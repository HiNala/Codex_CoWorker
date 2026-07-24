import { describe, expect, it } from "vitest";
import { DEMO_SEED_IDS } from "@forge/demo";
import { resolveStreamRunId } from "./resolve-stream-run-id";

describe("resolveStreamRunId", () => {
  it("maps demo active assignment to active run for SSE", () => {
    expect(resolveStreamRunId(DEMO_SEED_IDS.activeAssignment)).toBe(DEMO_SEED_IDS.activeRun);
  });

  it("prefers explicit runId", () => {
    expect(resolveStreamRunId(DEMO_SEED_IDS.activeAssignment, "custom-run")).toBe("custom-run");
  });

  it("passes through unknown ids", () => {
    expect(resolveStreamRunId("0198206f-5f53-7000-8000-000000000099")).toBe(
      "0198206f-5f53-7000-8000-000000000099",
    );
  });
});
