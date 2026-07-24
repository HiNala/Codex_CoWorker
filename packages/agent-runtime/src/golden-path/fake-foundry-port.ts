import type { CapabilityDescriptor, CapabilityRef, PlanStep } from "@forge/contracts";
import { emit } from "@forge/events";
import type { FoundryPort, RunContext } from "../types";
import {
  ATTEMPT_1_FAILURE_MESSAGE,
  CHECKOUT_ANALYZER_SLUG,
  GOLDEN,
  NAIVE_DISTINCT,
  REPAIRED_DISTINCT,
} from "./ids";
import { attempt1FailureMessage, naiveAnalyzeSeed, repairedAnalyzeSeed } from "./checkout-analyzer-fake";

export interface InstallRecord {
  ref: CapabilityRef;
  mode: "naive" | "repaired";
}

/**
 * Fake FoundryPort for Gate-1 golden path.
 * Emits the full capability.* beat against ctx.tx (same unit as step transitions):
 *   gap → build → gate fail (expected 9, received 4) → repair → gate pass → install
 * Then returns the step to `ready` so the run loop reclaims it with a pin.
 */
export class FakeCheckoutFoundryPort implements FoundryPort {
  readonly installs: InstallRecord[] = [];
  #installed = new Map<string, CapabilityRef>();

  getInstalled(slug: string): CapabilityRef | null {
    return this.#installed.get(slug) ?? null;
  }

  async requestBuild(
    ctx: RunContext,
    step: PlanStep,
    gap: CapabilityDescriptor,
  ): Promise<void> {
    if (gap.slug !== CHECKOUT_ANALYZER_SLUG) {
      throw new Error(`Fake foundry only builds ${CHECKOUT_ANALYZER_SLUG}, got ${gap.slug}`);
    }

    // Reload after run-loop's needs_capability transition (stale `step` is still "running").
    const listed = await ctx.steps.list(ctx.runId);
    const latest = listed.find((s) => s.id === step.id);
    if (!latest) throw new Error(`Step ${step.id} missing from store`);
    if (latest.status !== "needs_capability" && latest.status !== "building_capability") {
      throw new Error(`Expected needs_capability, got ${latest.status}`);
    }

    // needs_capability → building_capability (paired with build_started)
    let current =
      latest.status === "building_capability"
        ? latest
        : await ctx.steps.transition(latest, "building_capability");
    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "capability.build_started",
      summary: `Building ${gap.slug} in an isolated sandbox (fake Codex).`,
      refs: { stepId: step.id },
    });

    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "capability.build_output",
      summary: "Attempt 1: naive top-level customer_id extractor written.",
      refs: { stepId: step.id },
    });

    // Trusted gate fails: distinctCount 4 ≠ 9
    const naive = naiveAnalyzeSeed();
    const failMsg = attempt1FailureMessage(naive.distinctCount, REPAIRED_DISTINCT);
    if (failMsg !== ATTEMPT_1_FAILURE_MESSAGE) {
      throw new Error(`Contract drift: failure message is "${failMsg}"`);
    }

    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "capability.gate_started",
      summary: "Gate trusted_tests started.",
      refs: { stepId: step.id },
      detail: { gate: "trusted_tests", attempt: 1 },
    });
    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "capability.gate_failed",
      summary: `Gate trusted_tests failed: ${failMsg}`,
      level: "warn",
      refs: { stepId: step.id },
      detail: {
        gate: "trusted_tests",
        attempt: 1,
        message: failMsg,
        received: NAIVE_DISTINCT,
        expected: REPAIRED_DISTINCT,
        naiveCustomers: naive.affectedCustomers,
      },
    });

    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "capability.repair_started",
      summary: `Repair attempt 1: fix nested context.customer.id — ${failMsg}`,
      refs: { stepId: step.id },
      detail: { message: failMsg },
    });

    const repaired = repairedAnalyzeSeed();
    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "capability.build_output",
      summary: "Attempt 2: dual-shape customer id resolver applied (top-level + nested).",
      refs: { stepId: step.id },
    });

    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "capability.gate_started",
      summary: "Gate trusted_tests started (post-repair).",
      refs: { stepId: step.id },
      detail: { gate: "trusted_tests", attempt: 2 },
    });
    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "capability.gate_passed",
      summary: `Gate trusted_tests passed: distinctCount=${repaired.distinctCount}.`,
      refs: { stepId: step.id },
      detail: {
        gate: "trusted_tests",
        attempt: 2,
        distinctCount: repaired.distinctCount,
        affectedCustomers: repaired.affectedCustomers,
      },
    });

    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "capability.repair_succeeded",
      summary: "Repair restored a clean verification report for checkout-error-log-analyzer.",
      refs: { stepId: step.id },
    });

    // Auto-approve install (demo fake path)
    current = await ctx.steps.transition(current, "awaiting_approval");
    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "capability.approval_requested",
      summary: "Capability checkout-error-log-analyzer ready for approval (auto-approved in fake path).",
      refs: { stepId: step.id },
    });

    const ref: CapabilityRef = {
      capabilityId: GOLDEN.capabilityId,
      versionId: GOLDEN.versionId,
      slug: CHECKOUT_ANALYZER_SLUG,
      version: "1.0.0",
    };
    this.#installed.set(CHECKOUT_ANALYZER_SLUG, ref);
    this.installs.push({ ref, mode: "repaired" });

    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "capability.installed",
      summary: `Installed ${ref.slug}@${ref.version} (pinned versionId).`,
      refs: {
        stepId: step.id,
        capabilityId: ref.capabilityId,
        capabilityVersionId: ref.versionId,
      },
    });

    // awaiting_approval → running is legal, but reclaim path needs ready:
    // awaiting_approval → blocked → ready
    current = await ctx.steps.transition(current, "blocked", {
      blockedReason: null,
    });
    await ctx.steps.transition(current, "ready", {
      blockedReason: null,
    });

    await this.onInstalled(ref, step.id);
  }

  async onInstalled(_capabilityRef: CapabilityRef, _stepId: string): Promise<void> {
    // Resume is claimNextReady on the next loop iteration (step is ready).
  }
}
