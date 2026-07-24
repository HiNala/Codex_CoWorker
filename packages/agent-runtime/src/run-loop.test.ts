import { describe, expect, it } from "vitest";
import type { PlanStep } from "@forge/contracts";
import { MemoryEventStore } from "@forge/events";
import { InMemoryBudget } from "./budget";
import { MemoryStepStore } from "./memory/step-store";
import { executeRun } from "./run-loop";
import type { RunContext } from "./types";

const ORG = "01900000-0000-7000-8000-000000000011";
const ASSIGNMENT = "01900000-0000-7000-8000-000000000012";
const RUN = "01900000-0000-7000-8000-000000000013";
const MILESTONE = "01900000-0000-7000-8000-000000000014";
const STEP = "01900000-0000-7000-8000-000000000015";
const STEP_B = "01900000-0000-7000-8000-000000000016";

function baseStep(overrides: Partial<PlanStep> = {}): PlanStep {
  return {
    id: STEP,
    runId: RUN,
    milestoneId: MILESTONE,
    parentStepId: null,
    ordinal: 0,
    title: "Cluster checkout tickets",
    description: "Group tickets by root cause",
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

function buildContext(
  steps: PlanStep[],
  store: MemoryEventStore,
  overrides: Partial<RunContext> = {},
): RunContext {
  const stepStore = new MemoryStepStore(steps);
  const budget = new InMemoryBudget({
    ceilingMicrocredits: 1_000_000,
    reservedMicrocredits: 1_000_000,
    spentMicrocredits: 0,
    warned: false,
    stopped: false,
  });

  return {
    runId: RUN,
    assignmentId: ASSIGNMENT,
    orgId: ORG,
    tx: store.begin(),
    steps: stepStore,
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
    budget,
    control: {
      async shouldStop() {
        return false;
      },
      async markFinished() {},
    },
    async runStepWork(step) {
      return {
        kind: "ok",
        summary: `Clustered tickets for ${step.title}`,
        artifacts: [{ title: "Clusters", content: "# clusters\n" }],
      };
    },
    ...overrides,
  };
}

describe("executeRun", () => {
  it("completes a ready step and emits started/completed inside one store", async () => {
    const store = new MemoryEventStore();
    const steps = [baseStep()];
    const ctx = buildContext(steps, store);
    await executeRun(ctx);

    const events = store.list(RUN);
    const types = events.map((e) => e.type);
    expect(types).toContain("run.started");
    expect(types).toContain("step.started");
    expect(types).toContain("step.completed");
    expect(types).toContain("run.completed");
    expect(steps[0]?.status).toBe("completed");
    // gapless per-run seq
    expect(events.map((e) => e.seq)).toEqual(events.map((_, i) => i + 1));
  });

  it("routes capability gaps to the foundry without completing the step", async () => {
    const store = new MemoryEventStore();
    const steps = [baseStep()];
    let buildRequested = false;
    const ctx = buildContext(steps, store);
    ctx.capabilities = {
      async resolve() {
        return {
          resolved: [],
          missing: [
            {
              slug: "api-change-impact-analyzer",
              purpose: "Detect nested API field renames",
              inputShape: "openapi+traffic",
              outputShape: "impact-report",
            },
          ],
        };
      },
    };
    ctx.foundry = {
      async requestBuild(_c, _s, gap) {
        buildRequested = gap.slug === "api-change-impact-analyzer";
      },
      async onInstalled() {},
    };

    await executeRun(ctx);
    expect(buildRequested).toBe(true);
    expect(steps[0]?.status).toBe("needs_capability");
    expect(store.list(RUN).some((e) => e.type === "capability.gap_detected")).toBe(true);
    expect(store.list(RUN).some((e) => e.type === "run.paused")).toBe(true);
  });

  it("stops on budget ceiling before work and emits cost.ceiling_stop", async () => {
    const store = new MemoryEventStore();
    const steps = [baseStep()];
    const ctx = buildContext(steps, store);
    ctx.budget = new InMemoryBudget({
      ceilingMicrocredits: 100,
      reservedMicrocredits: 100,
      spentMicrocredits: 100,
      warned: true,
      stopped: false,
    });
    let worked = false;
    ctx.runStepWork = async () => {
      worked = true;
      return { kind: "ok" };
    };

    await executeRun(ctx);
    expect(worked).toBe(false);
    expect(steps[0]?.status).toBe("blocked");
    expect(store.list(RUN).some((e) => e.type === "cost.ceiling_stop")).toBe(true);
    expect(store.list(RUN).some((e) => e.type === "step.blocked")).toBe(true);
  });

  it("retries failures until success, reclaiming retrying steps in-loop", async () => {
    const store = new MemoryEventStore();
    const steps = [baseStep({ maxAttempts: 3 })];
    let calls = 0;
    const ctx = buildContext(steps, store);
    ctx.runStepWork = async () => {
      calls += 1;
      if (calls < 3) {
        return { kind: "failed", error: `transient-${calls}` };
      }
      return { kind: "ok", summary: "Recovered after retries" };
    };

    // claimNextReady reclaims `retrying` immediately, so one executeRun drains attempts.
    await executeRun(ctx);
    expect(steps[0]?.status).toBe("completed");
    expect(steps[0]?.attempt).toBe(3);
    expect(calls).toBe(3);
    expect(store.list(RUN).filter((e) => e.type === "step.retrying")).toHaveLength(2);
    expect(store.list(RUN).some((e) => e.type === "step.completed")).toBe(true);
    expect(store.list(RUN).some((e) => e.type === "run.completed")).toBe(true);
  });

  it("fails permanently after maxAttempts and blocks dependents", async () => {
    const store = new MemoryEventStore();
    const steps = [
      baseStep({ id: STEP, maxAttempts: 2, ordinal: 0 }),
      baseStep({
        id: STEP_B,
        title: "Map clusters to customers",
        ordinal: 1,
        status: "ready",
        dependsOn: [STEP],
      }),
    ];
    const ctx = buildContext(steps, store);
    ctx.runStepWork = async (step) => {
      // Only the primary step fails; dependents should never be claimed once blocked.
      if (step.id === STEP) return { kind: "failed", error: "hard failure" };
      return { kind: "ok", summary: "should not run" };
    };

    await executeRun(ctx);

    expect(steps[0]?.status).toBe("failed");
    expect(steps[0]?.attempt).toBe(2);
    expect(steps[1]?.status).toBe("blocked");
    expect(steps[1]?.blockedReason).toMatch(/failed dependency/i);
    expect(store.list(RUN).some((e) => e.type === "step.failed")).toBe(true);
    expect(store.list(RUN).filter((e) => e.type === "step.blocked").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(store.list(RUN).some((e) => e.type === "run.failed")).toBe(true);
  });

  it("leaves a step in retrying when the loop stops mid-retry (reclaimable later)", async () => {
    const store = new MemoryEventStore();
    const steps = [baseStep({ maxAttempts: 3 })];
    let calls = 0;
    let allowWork = true;
    const ctx = buildContext(steps, store);
    ctx.control = {
      async shouldStop() {
        // Stop after the first failure has parked the step in retrying.
        return !allowWork && steps[0]?.status === "retrying";
      },
      async markFinished() {},
    };
    ctx.runStepWork = async () => {
      calls += 1;
      allowWork = false;
      return { kind: "failed", error: "boom" };
    };

    await executeRun(ctx);
    expect(calls).toBe(1);
    expect(steps[0]?.status).toBe("retrying");
    expect(steps[0]?.attempt).toBe(1);

    // Fresh run reclaims the retrying step.
    allowWork = true;
    ctx.control = {
      async shouldStop() {
        return false;
      },
      async markFinished() {},
    };
    ctx.runStepWork = async () => ({ kind: "ok", summary: "recovered on reclaim" });
    await executeRun(ctx);
    expect(steps[0]?.status).toBe("completed");
    expect(steps[0]?.attempt).toBe(2);
  });

  it("moves to awaiting_approval and does not complete without approval", async () => {
    const store = new MemoryEventStore();
    const steps = [baseStep()];
    const ctx = buildContext(steps, store);
    ctx.runStepWork = async () => ({
      kind: "needs_approval",
      proposal: { action: "post-to-zendesk", ticketCount: 47 },
    });

    await executeRun(ctx);
    expect(steps[0]?.status).toBe("awaiting_approval");
    expect(store.list(RUN).some((e) => e.type === "approval.requested")).toBe(true);
    expect(store.list(RUN).some((e) => e.type === "step.completed")).toBe(false);
    expect(store.list(RUN).some((e) => e.type === "run.paused")).toBe(true);
  });

  it("pairs status mutation with emit: step.completed event exists when status is completed", async () => {
    const store = new MemoryEventStore();
    const steps = [baseStep()];
    const seen: Array<{ status: string; eventTypes: string[] }> = [];
    const ctx = buildContext(steps, store);
    ctx.onEvent = (event) => {
      seen.push({
        status: steps[0]!.status,
        eventTypes: [event.type],
      });
    };

    await executeRun(ctx);

    // When step.completed is emitted, status must already be completed (same unit: mutate then emit).
    const completedEmit = seen.find((s) => s.eventTypes.includes("step.completed"));
    expect(completedEmit?.status).toBe("completed");
  });

  it("respects cooperative shouldStop before claiming more work", async () => {
    const store = new MemoryEventStore();
    const steps = [baseStep()];
    let stopChecks = 0;
    const ctx = buildContext(steps, store);
    ctx.control = {
      async shouldStop() {
        stopChecks += 1;
        return true;
      },
      async markFinished() {},
    };
    let worked = false;
    ctx.runStepWork = async () => {
      worked = true;
      return { kind: "ok" };
    };

    await executeRun(ctx);
    expect(worked).toBe(false);
    expect(steps[0]?.status).toBe("ready");
    expect(store.list(RUN).some((e) => e.type === "run.paused")).toBe(true);
    expect(stopChecks).toBeGreaterThanOrEqual(1);
  });
});
