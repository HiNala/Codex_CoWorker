import { describe, expect, it } from "vitest";
import type { PlanStep } from "@forge/contracts";
import { MemoryStepStore } from "./step-store";

const RUN = "01900000-0000-7000-8000-000000000013";
const MILESTONE = "01900000-0000-7000-8000-000000000014";

function step(overrides: Partial<PlanStep> = {}): PlanStep {
  return {
    id: "01900000-0000-7000-8000-000000000015",
    runId: RUN,
    milestoneId: MILESTONE,
    parentStepId: null,
    ordinal: 0,
    title: "A",
    description: "",
    status: "ready",
    dependsOn: [],
    capabilityRefs: [],
    artifactIds: [],
    blockedReason: null,
    attempt: 0,
    maxAttempts: 3,
    startedAt: null,
    endedAt: null,
    costMicrocredits: 0,
    changedAfterApproval: false,
    ...overrides,
  };
}

describe("MemoryStepStore", () => {
  it("claims ready steps into running and increments attempt", async () => {
    const steps = [step({ attempt: 0, status: "ready" })];
    const store = new MemoryStepStore(steps);
    const claimed = await store.claimNextReady(RUN);
    expect(claimed?.status).toBe("running");
    expect(claimed?.attempt).toBe(1);
    expect(claimed?.startedAt).toBeTruthy();
  });

  it("claims retrying steps so failures are reclaimable", async () => {
    const steps = [
      step({
        status: "retrying",
        attempt: 1,
        startedAt: "2026-01-01T00:00:00.000Z",
        endedAt: "2026-01-01T00:00:01.000Z",
        blockedReason: "prior",
      }),
    ];
    const store = new MemoryStepStore(steps);
    const claimed = await store.claimNextReady(RUN);
    expect(claimed?.status).toBe("running");
    expect(claimed?.attempt).toBe(2);
    expect(claimed?.endedAt).toBeNull();
    expect(claimed?.blockedReason).toBeNull();
  });

  it("returns null when only non-claimable statuses remain", async () => {
    const steps = [
      step({ status: "completed" }),
      step({
        id: "01900000-0000-7000-8000-000000000016",
        status: "awaiting_approval",
        ordinal: 1,
      }),
      step({
        id: "01900000-0000-7000-8000-000000000017",
        status: "needs_capability",
        ordinal: 2,
      }),
    ];
    const store = new MemoryStepStore(steps);
    expect(await store.claimNextReady(RUN)).toBeNull();
  });

  it("lists steps for a run ordered by ordinal", async () => {
    const steps = [
      step({
        id: "01900000-0000-7000-8000-000000000016",
        ordinal: 2,
        title: "C",
      }),
      step({
        id: "01900000-0000-7000-8000-000000000015",
        ordinal: 0,
        title: "A",
      }),
      step({
        id: "01900000-0000-7000-8000-000000000017",
        ordinal: 1,
        title: "B",
      }),
    ];
    const store = new MemoryStepStore(steps);
    const listed = await store.list(RUN);
    expect(listed.map((s) => s.title)).toEqual(["A", "B", "C"]);
  });
});
