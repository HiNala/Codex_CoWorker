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

function buildContext(steps: PlanStep[], store: MemoryEventStore): RunContext {
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
    // gapless
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
  });
});
