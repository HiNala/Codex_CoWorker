import type { CapabilityDescriptor, PlanStep, RunEvent } from "@forge/contracts";
import { MemoryEventStore, RunEventBus, foldEvents } from "@forge/events";
import { InMemoryBudget } from "../budget";
import { MemoryStepStore } from "../memory/step-store";
import { executeRun } from "../run-loop";
import type { RunContext, StepWorkResult } from "../types";
import { repairedAnalyzeSeed } from "./checkout-analyzer-fake";
import { FakeCheckoutFoundryPort } from "./fake-foundry-port";
import {
  ATTEMPT_1_FAILURE_MESSAGE,
  CHECKOUT_ANALYZER_SLUG,
  GOLDEN,
  REPAIRED_DISTINCT,
} from "./ids";
import { MemoryArtifactPort } from "./memory-artifacts";

export interface GoldenPathResult {
  orgId: string;
  assignmentId: string;
  runId: string;
  events: RunEvent[];
  eventTypes: string[];
  lastSeq: number;
  stepStatus: PlanStep["status"];
  artifacts: MemoryArtifactPort["items"];
  distinctCount: number;
  attempt1FailureMessage: string;
  runFinished: "completed" | "failed" | "cancelled" | "paused" | "unknown";
}

const GAP: CapabilityDescriptor = {
  slug: CHECKOUT_ANALYZER_SLUG,
  purpose: "Count distinct customers in checkout_failed error logs (top-level + nested ids)",
  inputShape: "{ lines: string[]; window: { from: string; to: string } }",
  outputShape: "{ affectedCustomers: string[]; distinctCount: number; taxonomy; firstSeen; lastSeen }",
};

/**
 * Deterministic fake golden path (Gate 1 RED wire):
 *   job dispatch surface → executeRun → same-tx state+event → streamable events → artifact
 *
 * Integrates checkout-error-log-analyzer 4→9 repair beat via FakeCheckoutFoundryPort.
 * Does not touch apps/web (Aria/Wisp SSE handoff: events[] + lastSeq are the port).
 */
export async function runSeededGoldenPath(): Promise<GoldenPathResult> {
  const store = new MemoryEventStore();
  const bus = new RunEventBus();
  const live: RunEvent[] = [];
  const steps = [
    {
      id: GOLDEN.stepAnalyzeId,
      runId: GOLDEN.runId,
      milestoneId: GOLDEN.milestoneId,
      parentStepId: null,
      ordinal: 0,
      title: "Analyze checkout error logs for affected customers",
      description:
        "Build or invoke checkout-error-log-analyzer over the seeded demo window; report distinct customers.",
      status: "ready" as const,
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
    } satisfies PlanStep,
  ];

  const stepStore = new MemoryStepStore(steps);
  const foundry = new FakeCheckoutFoundryPort();
  const artifacts = new MemoryArtifactPort({
    artifactId: GOLDEN.artifactId,
    versionId: GOLDEN.artifactVersionId,
  });
  const budget = new InMemoryBudget({
    ceilingMicrocredits: 5_000_000,
    reservedMicrocredits: 5_000_000,
    spentMicrocredits: 0,
    warned: false,
    stopped: false,
  });

  let finished: GoldenPathResult["runFinished"] = "unknown";

  const ctx: RunContext = {
    runId: GOLDEN.runId,
    assignmentId: GOLDEN.assignmentId,
    orgId: GOLDEN.orgId,
    tx: store.begin(),
    steps: stepStore,
    capabilities: {
      async resolve(orgId, _descriptors) {
        void orgId;
        const pin = foundry.getInstalled(CHECKOUT_ANALYZER_SLUG);
        if (pin) return { resolved: [pin], missing: [] };
        return { resolved: [], missing: [] };
      },
    },
    foundry,
    artifacts,
    budget,
    control: {
      async shouldStop() {
        return false;
      },
      async markFinished(_runId, status) {
        finished = status;
      },
    },
    onEvent: (event) => {
      live.push(event);
      bus.publish(event);
    },
    async runStepWork(step, resolved): Promise<StepWorkResult> {
      const pin = resolved[0] ?? foundry.getInstalled(CHECKOUT_ANALYZER_SLUG);
      if (!pin) {
        return { kind: "needs_capability", missing: GAP };
      }

      const output = repairedAnalyzeSeed();
      if (output.distinctCount !== REPAIRED_DISTINCT) {
        return {
          kind: "failed",
          error: `Analyzer returned distinctCount=${output.distinctCount}, expected ${REPAIRED_DISTINCT}`,
        };
      }

      const body = [
        "# Checkout impact",
        "",
        `Capability: ${pin.slug}@${pin.version} (\`versionId=${pin.versionId}\`)`,
        "",
        `**Distinct affected customers: ${output.distinctCount}**`,
        "",
        output.affectedCustomers.map((id) => `- ${id}`).join("\n"),
        "",
        `First seen: ${output.firstSeen}`,
        `Last seen: ${output.lastSeen}`,
        "",
        "Taxonomy:",
        ...Object.entries(output.taxonomy).map(([k, v]) => `- ${k}: ${v}`),
      ].join("\n");

      return {
        kind: "ok",
        summary: `Identified ${output.distinctCount} affected customers in checkout_failed logs (dual-shape ids).`,
        artifacts: [
          {
            title: "Checkout customer impact",
            content: body,
          },
        ],
      };
    },
  };

  // Assignment intake surface (fake): plan.drafted then plan.approved then execute-run.
  await emitPlanLifecycle(ctx);

  await executeRun(ctx);

  const events = store.list(GOLDEN.runId);
  const folded = foldEvents(events, 0);
  const step = (await stepStore.list(GOLDEN.runId))[0]!;

  if (finished === "unknown") {
    finished = step.status === "completed" ? "completed" : "paused";
  }

  const artifactBody = artifacts.items[0]?.versions[0]?.body ?? "";
  const distinctMatch = /Distinct affected customers: (\d+)/.exec(artifactBody);
  const distinctCount = distinctMatch ? Number(distinctMatch[1]) : 0;

  return {
    orgId: GOLDEN.orgId,
    assignmentId: GOLDEN.assignmentId,
    runId: GOLDEN.runId,
    events,
    eventTypes: folded.types,
    lastSeq: folded.lastSeq,
    stepStatus: step.status,
    artifacts: artifacts.items,
    distinctCount,
    attempt1FailureMessage: ATTEMPT_1_FAILURE_MESSAGE,
    runFinished: finished,
  };
}

async function emitPlanLifecycle(ctx: RunContext): Promise<void> {
  const { emit } = await import("@forge/events");
  await emit(ctx.tx, {
    runId: ctx.runId,
    assignmentId: ctx.assignmentId,
    orgId: ctx.orgId,
    type: "plan.drafted",
    summary: "Drafted assignment contract for checkout log diagnosis (seeded golden path).",
  });
  await emit(ctx.tx, {
    runId: ctx.runId,
    assignmentId: ctx.assignmentId,
    orgId: ctx.orgId,
    type: "plan.approved",
    summary: "Contract approved; ceiling reserved; execute-run enqueued (fake).",
  });
}

/**
 * Worker/job dispatch entry: payload from JOB_KINDS.EXECUTE_RUN.
 * Always deterministic for the seeded ids — no wall-clock progress.
 */
export async function dispatchExecuteRunJob(payload: {
  runId?: string;
  assignmentId?: string;
  seededGolden?: boolean;
}): Promise<GoldenPathResult> {
  // Only the seeded golden path is implemented in-process for Gate 1.
  // Live Postgres tx adapters are a later flip of ADAPTER_*.
  void payload;
  return runSeededGoldenPath();
}
