import { describe, expect, it } from "vitest";
import type { PlanStep } from "@forge/contracts";
import { MemoryEventStore } from "@forge/events";
import { InMemoryBudget, percentUsedInteger } from "./budget";
import type { RunContext } from "./types";

const ORG = "01900000-0000-7000-8000-000000000011";
const ASSIGNMENT = "01900000-0000-7000-8000-000000000012";
const RUN = "01900000-0000-7000-8000-000000000013";

function stubStep(costMicrocredits = 0): PlanStep {
  return {
    id: "01900000-0000-7000-8000-000000000015",
    runId: RUN,
    milestoneId: "01900000-0000-7000-8000-000000000014",
    parentStepId: null,
    ordinal: 0,
    title: "Spendy step",
    description: "",
    status: "running",
    dependsOn: [],
    capabilityRefs: [],
    artifactIds: [],
    blockedReason: null,
    attempt: 1,
    maxAttempts: 3,
    startedAt: null,
    endedAt: null,
    costMicrocredits,
    changedAfterApproval: false,
  };
}

function ctx(store: MemoryEventStore): RunContext {
  return {
    runId: RUN,
    assignmentId: ASSIGNMENT,
    orgId: ORG,
    tx: store.begin(),
    steps: {
      async list() {
        return [];
      },
      async claimNextReady() {
        return null;
      },
      async transition(step) {
        return step;
      },
    },
    capabilities: {
      async resolve() {
        return { resolved: [], missing: [] };
      },
    },
    foundry: {
      async requestBuild() {},
      async onInstalled() {},
    },
    artifacts: {
      async declare() {
        return { id: "01900000-0000-7000-8000-000000000099" };
      },
      async write() {
        return { versionId: "01900000-0000-7000-8000-000000000098" };
      },
    },
    budget: new InMemoryBudget({
      ceilingMicrocredits: 1000,
      reservedMicrocredits: 1000,
      spentMicrocredits: 0,
      warned: false,
      stopped: false,
    }),
    control: {
      async shouldStop() {
        return false;
      },
      async markFinished() {},
    },
    async runStepWork() {
      return { kind: "ok" };
    },
  };
}

describe("InMemoryBudget", () => {
  it("warns at 80% using integer math only", async () => {
    const store = new MemoryEventStore();
    const budget = new InMemoryBudget({
      ceilingMicrocredits: 1000,
      reservedMicrocredits: 1000,
      spentMicrocredits: 800,
      warned: false,
      stopped: false,
    });
    const result = await budget.check(ctx(store), stubStep());
    expect(result.ok).toBe(true);
    expect(store.list(RUN).some((e) => e.type === "cost.ceiling_warning")).toBe(true);
    expect(budget.snapshot().warned).toBe(true);
  });

  it("stops before work when remaining is zero", async () => {
    const store = new MemoryEventStore();
    const budget = new InMemoryBudget({
      ceilingMicrocredits: 500,
      reservedMicrocredits: 500,
      spentMicrocredits: 500,
      warned: true,
      stopped: false,
    });
    const result = await budget.check(ctx(store), stubStep());
    expect(result.ok).toBe(false);
    expect(store.list(RUN).some((e) => e.type === "cost.ceiling_stop")).toBe(true);
    expect(budget.snapshot().stopped).toBe(true);
  });

  it("stops when step estimate exceeds remaining", async () => {
    const store = new MemoryEventStore();
    const budget = new InMemoryBudget({
      ceilingMicrocredits: 1000,
      reservedMicrocredits: 1000,
      spentMicrocredits: 900,
      warned: true,
      stopped: false,
    });
    const result = await budget.check(ctx(store), stubStep(200));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/exceeds remaining/i);
    }
    expect(store.list(RUN).some((e) => e.type === "cost.ceiling_stop")).toBe(true);
  });

  it("consume requires non-negative integer microcredits", async () => {
    const store = new MemoryEventStore();
    const budget = new InMemoryBudget({
      ceilingMicrocredits: 1000,
      reservedMicrocredits: 1000,
      spentMicrocredits: 0,
      warned: false,
      stopped: false,
    });
    const runCtx = ctx(store);
    await expect(budget.consume(runCtx, 1.5, "bad")).rejects.toThrow(/integer/i);
    await expect(budget.consume(runCtx, -1, "bad")).rejects.toThrow(/integer/i);
    await budget.consume(runCtx, 42, "Model tokens for step");
    expect(budget.snapshot().spentMicrocredits).toBe(42);
    expect(store.list(RUN).some((e) => e.type === "cost.consumed")).toBe(true);
  });
});

describe("percentUsedInteger", () => {
  it("uses integer floor arithmetic", () => {
    expect(percentUsedInteger(0, 1000)).toBe(0);
    expect(percentUsedInteger(800, 1000)).toBe(80);
    expect(percentUsedInteger(1, 3)).toBe(33);
    expect(percentUsedInteger(100, 0)).toBe(100);
    expect(percentUsedInteger(2000, 1000)).toBe(100);
  });
});
