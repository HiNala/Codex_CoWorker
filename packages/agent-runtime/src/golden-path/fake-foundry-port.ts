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

const CAP_NAME = "Checkout error log analyzer";

/**
 * Fake FoundryPort — CUT #4 only: checkout-error-log-analyzer.
 * Cockpit tiles require refs.capabilityId on every capability.* event.
 */
export class FakeCheckoutFoundryPort implements FoundryPort {
  readonly installs: InstallRecord[] = [];
  readonly #installed = new Map<string, CapabilityRef>();

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

    const capRefs = {
      stepId: step.id,
      capabilityId: GOLDEN.capabilityId,
    };

    const listed = await ctx.steps.list(ctx.runId);
    const latest = listed.find((s) => s.id === step.id);
    if (!latest) throw new Error(`Step ${step.id} missing from store`);
    if (latest.status !== "needs_capability" && latest.status !== "building_capability") {
      throw new Error(`Expected needs_capability, got ${latest.status}`);
    }

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
      refs: capRefs,
      detail: { name: CAP_NAME, slug: gap.slug, attempt: 1, maxAttempts: 2, version: "1.0.0" },
    });

    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "capability.build_output",
      summary: "Attempt 1: naive top-level customer_id extractor written.",
      refs: capRefs,
    });

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
      refs: capRefs,
      detail: { name: "trusted_tests", gate: "trusted_tests", attempt: 1 },
    });
    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "capability.gate_failed",
      summary: `Gate trusted_tests failed: ${failMsg}`,
      level: "warn",
      refs: capRefs,
      detail: {
        name: "trusted_tests",
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
      refs: capRefs,
      detail: { attempt: 1, message: failMsg, name: CAP_NAME, slug: gap.slug },
    });

    const repaired = repairedAnalyzeSeed();
    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "capability.build_output",
      summary: "Attempt 2: dual-shape customer id resolver applied (top-level + nested).",
      refs: capRefs,
    });

    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "capability.gate_started",
      summary: "Gate trusted_tests started (post-repair).",
      refs: capRefs,
      detail: { name: "trusted_tests", gate: "trusted_tests", attempt: 2 },
    });
    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "capability.gate_passed",
      summary: `Gate trusted_tests passed: distinctCount=${repaired.distinctCount}.`,
      refs: capRefs,
      detail: {
        name: "trusted_tests",
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
      refs: capRefs,
      detail: { name: CAP_NAME, slug: gap.slug },
    });

    current = await ctx.steps.transition(current, "awaiting_approval");
    const approvalId = GOLDEN.approvalId;
    const installSummary =
      "Given checkout error logs and plan metadata, finds annual-plan checkout failures and lists distinct affected customers (top-level + nested ids).";
    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "capability.approval_requested",
      summary: "Install checkout error log analyzer — awaiting approval.",
      refs: { ...capRefs, approvalId },
      detail: {
        name: CAP_NAME,
        slug: gap.slug,
        version: "1.0.0",
        title: "Install checkout error log analyzer",
        summary: installSummary,
      },
    });
    // Cockpit install card keys off approval.requested + risk capability_install
    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "approval.requested",
      summary: "Approve install of checkout error log analyzer",
      refs: { stepId: step.id, capabilityId: GOLDEN.capabilityId, approvalId },
      detail: {
        title: "Install checkout error log analyzer",
        summary: installSummary,
        risk: "capability_install",
        payloadPreview:
          "permissions: no network · no filesystem · no credentials\nfiles: src/index.ts +180, tests/unit.test.ts +90\nverification: trusted_tests fail expected 9, received 4 then pass on repair · 1 repair",
      },
    });

    const ref: CapabilityRef = {
      capabilityId: GOLDEN.capabilityId,
      versionId: GOLDEN.versionId,
      slug: CHECKOUT_ANALYZER_SLUG,
      version: "1.0.0",
    };
    this.#installed.set(CHECKOUT_ANALYZER_SLUG, ref);
    this.installs.push({ ref, mode: "repaired" });

    // Smoke / fake path auto-grants so prove-it-runs completes; live UI may also POST decide (idempotent).
    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "approval.granted",
      summary: "Approval granted: Install checkout error log analyzer",
      refs: { approvalId, capabilityId: GOLDEN.capabilityId, stepId: step.id },
      detail: { decision: "approved", title: "Install checkout error log analyzer" },
    });

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
        approvalId,
      },
      detail: { name: CAP_NAME, slug: ref.slug, version: ref.version },
    });

    current = await ctx.steps.transition(current, "blocked", { blockedReason: null });
    await ctx.steps.transition(current, "ready", { blockedReason: null });
    await this.onInstalled(ref, step.id);
  }

  async onInstalled(_capabilityRef: CapabilityRef, _stepId: string): Promise<void> {
    // Resume via claimNextReady on next loop iteration.
  }
}
