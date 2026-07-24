import type { PlanStep, PlanStepStatus } from "@forge/contracts";
import { emit } from "@forge/events";
import type { RunContext, StepWorkResult } from "./types";

/**
 * Flat run loop. Keep this file under 300 lines.
 *
 * Invariant: every status mutation that has a corresponding RunEvent is
 * performed in the same transactional unit as that emit (ctx.tx) via
 * `transitionWithEvent` — never emit after a separate commit.
 */
export async function executeRun(ctx: RunContext): Promise<void> {
  await emitAndMaybePublish(ctx, {
    type: "run.started",
    summary: "Run started; claiming ready plan steps.",
  });

  while (true) {
    if (await ctx.control.shouldStop(ctx.runId)) {
      await emitAndMaybePublish(ctx, {
        type: "run.paused",
        summary: "Run stopped cooperatively (paused, cancelled, or ceiling reached).",
      });
      return;
    }

    const step = await ctx.steps.claimNextReady(ctx.runId);
    if (!step) {
      await finishRun(ctx);
      return;
    }

    await executeStep(ctx, step);
  }
}

/**
 * Flat switch-style step executor. Capability gap → foundry; budget check
 * before work; then approval / fail-retry / complete paths.
 */
export async function executeStep(ctx: RunContext, step: PlanStep): Promise<void> {
  // claimNextReady already moved ready|retrying -> running inside the step store.
  // Emit start on the same ctx.tx as subsequent status mutations.
  await emitAndMaybePublish(ctx, {
    type: "step.started",
    summary: `Started step: ${step.title}`,
    refs: { stepId: step.id, milestoneId: step.milestoneId },
  });

  await emitAndMaybePublish(ctx, {
    type: "trace.observed",
    summary: `Inspecting dependencies and capability pins for "${step.title}".`,
    refs: { stepId: step.id },
  });

  const descriptors = step.capabilityRefs.map((ref) => ({
    slug: ref.slug,
    purpose: ref.slug,
    inputShape: "unknown",
    outputShape: "unknown",
  }));

  const needed = await ctx.capabilities.resolve(ctx.orgId, descriptors);
  if (needed.missing.length > 0) {
    const gap = needed.missing[0]!;
    // Deterministic capability id so cockpit tiles track gap→build→install (CUT #4).
    const capabilityId =
      gap.slug === "checkout-error-log-analyzer"
        ? "019f0000-0000-7000-8000-00000000a006"
        : crypto.randomUUID();
    await transitionWithEvent(ctx, step, "needs_capability", {
      type: "capability.gap_detected",
      summary: `Capability gap detected: ${gap.slug} is required for "${step.title}".`,
      refs: { capabilityId },
      detail: {
        name: "Checkout error log analyzer",
        slug: gap.slug,
        kind: "skill",
        reason: gap.purpose,
        purpose: gap.purpose,
        inputShape: gap.inputShape,
        outputShape: gap.outputShape,
      },
    });
    await ctx.foundry.requestBuild(ctx, step, gap);
    return;
  }

  const budget = await ctx.budget.check(ctx, step);
  if (!budget.ok) {
    // cost.ceiling_stop is emitted by BudgetPort.check before this path;
    // step.blocked is the paired status mutation + plan event.
    await transitionWithEvent(ctx, step, "blocked", {
      type: "step.blocked",
      summary: `Step blocked: ${budget.reason}`,
      blockedReason: budget.reason,
    });
    return;
  }

  await emitAndMaybePublish(ctx, {
    type: "trace.decided",
    summary: `Executing "${step.title}" with ${needed.resolved.length} pinned capability version(s).`,
    refs: { stepId: step.id },
  });

  const result = await ctx.runStepWork(step, needed.resolved);
  await handleStepResult(ctx, step, result);
}

async function handleStepResult(
  ctx: RunContext,
  step: PlanStep,
  result: StepWorkResult,
): Promise<void> {
  switch (result.kind) {
    case "needs_capability": {
      if (!result.missing) {
        await handleFailure(ctx, step, "Capability gap reported without a descriptor.");
        return;
      }
      const gap = result.missing;
      const capabilityId =
        gap.slug === "checkout-error-log-analyzer"
          ? "019f0000-0000-7000-8000-00000000a006"
          : crypto.randomUUID();
      await transitionWithEvent(ctx, step, "needs_capability", {
        type: "capability.gap_detected",
        summary: `Capability gap detected mid-step: ${gap.slug}.`,
        refs: { capabilityId },
        detail: {
          name: "Checkout error log analyzer",
          slug: gap.slug,
          kind: "skill",
          reason: gap.purpose,
          purpose: gap.purpose,
          inputShape: gap.inputShape,
          outputShape: gap.outputShape,
        },
      });
      await ctx.foundry.requestBuild(ctx, step, gap);
      return;
    }
    case "needs_approval": {
      await transitionWithEvent(ctx, step, "awaiting_approval", {
        type: "approval.requested",
        summary: `Approval required before continuing "${step.title}".`,
        detail: result.proposal,
      });
      return;
    }
    case "failed": {
      await handleFailure(ctx, step, result.error ?? "Step failed without a message.");
      return;
    }
    case "ok": {
      await writeArtifacts(ctx, step, result.artifacts ?? []);
      await transitionWithEvent(ctx, step, "completed", {
        type: "step.completed",
        summary: result.summary ?? `Completed: ${step.title}`,
        endedAt: new Date().toISOString(),
      });
      return;
    }
    default: {
      const _exhaustive: never = result.kind;
      void _exhaustive;
      await handleFailure(ctx, step, "Unknown step result kind.");
    }
  }
}

async function writeArtifacts(
  ctx: RunContext,
  step: PlanStep,
  artifacts: Array<{ title: string; content: string; type?: string; description?: string }>,
): Promise<void> {
  for (const artifact of artifacts) {
    const declared = await ctx.artifacts.declare(ctx.runId, {
      type: artifact.type ?? "document.markdown",
      title: artifact.title,
      description: artifact.description ?? artifact.title,
    });
    await ctx.artifacts.write(
      { artifactId: declared.id, stepId: step.id },
      { title: artifact.title, body: artifact.content },
    );
    await emitAndMaybePublish(ctx, {
      type: "artifact.ready",
      summary: `Artifact ready: ${artifact.title}`,
      refs: { stepId: step.id, artifactId: declared.id },
      detail: { type: artifact.type ?? "document.markdown" },
    });
  }
}

/**
 * Failures go through `retrying` so claimNextReady can reclaim them.
 * Past maxAttempts → permanent `failed` and dependents become `blocked`.
 */
async function handleFailure(ctx: RunContext, step: PlanStep, error: string): Promise<void> {
  // attempt was incremented on claim; remaining tries while attempt < maxAttempts.
  if (step.attempt < step.maxAttempts) {
    await transitionWithEvent(ctx, step, "retrying", {
      type: "step.retrying",
      summary: `Retrying "${step.title}" after failure (attempt ${step.attempt}/${step.maxAttempts}): ${error}`,
      level: "warn",
    });
    return;
  }

  await transitionWithEvent(ctx, step, "failed", {
    type: "step.failed",
    summary: `Step failed permanently: ${step.title}. ${error}`,
    level: "error",
    blockedReason: error,
    endedAt: new Date().toISOString(),
  });

  await blockDependents(ctx, step, error);
}

/** Dependent pending/ready steps become blocked so the plan stays coherent. */
async function blockDependents(ctx: RunContext, failed: PlanStep, error: string): Promise<void> {
  const all = await ctx.steps.list(ctx.runId);
  const reason = `Blocked by failed dependency "${failed.title}": ${error}`;

  for (const candidate of all) {
    if (!candidate.dependsOn.includes(failed.id)) continue;
    if (candidate.status !== "pending" && candidate.status !== "ready") continue;

    await transitionWithEvent(ctx, candidate, "blocked", {
      type: "step.blocked",
      summary: `Step blocked: ${reason}`,
      blockedReason: reason,
    });
  }
}

async function finishRun(ctx: RunContext): Promise<void> {
  const steps = await ctx.steps.list(ctx.runId);
  const failed = steps.some((step) => step.status === "failed");
  // External waits: human, foundry, or a retrying step not yet reclaimed.
  const waitingExternal = steps.some(
    (step) =>
      step.status === "awaiting_approval" ||
      step.status === "needs_capability" ||
      step.status === "building_capability" ||
      step.status === "retrying",
  );

  if (waitingExternal) {
    await emitAndMaybePublish(ctx, {
      type: "run.paused",
      summary: "Run paused: one or more steps are waiting on capability, approval, or retry.",
    });
    return;
  }

  // Budget / dependency blocks without a permanent step failure → cooperative pause.
  const blockedOnly = steps.some((step) => step.status === "blocked");
  if (blockedOnly && !failed) {
    await emitAndMaybePublish(ctx, {
      type: "run.paused",
      summary: "Run paused: one or more steps are blocked (budget or dependency).",
    });
    return;
  }

  // Permanent failures (dependents may be blocked) → honest partial completion.
  if (failed) {
    await emitAndMaybePublish(ctx, {
      type: "run.failed",
      summary: "Run finished with one or more failed steps (partial completion).",
      level: "error",
    });
    await ctx.control.markFinished(ctx.runId, "failed");
    return;
  }

  await emitAndMaybePublish(ctx, {
    type: "run.completed",
    summary: "Run completed; all ready steps finished successfully.",
  });
  await ctx.control.markFinished(ctx.runId, "completed");
}

interface TransitionEvent {
  type: Parameters<typeof emit>[1]["type"];
  summary: string;
  detail?: unknown;
  level?: "info" | "warn" | "error";
  blockedReason?: string | null;
  endedAt?: string | null;
  /** Merged into default step/milestone refs (e.g. capabilityId for cockpit tiles). */
  refs?: {
    stepId?: string;
    milestoneId?: string;
    capabilityId?: string;
    capabilityVersionId?: string;
    artifactId?: string;
    approvalId?: string;
  };
}

/**
 * Single place that mutates step status when a RunEvent must accompany it.
 * Status write then emit on ctx.tx — same transactional unit (no interleaving commit).
 */
async function transitionWithEvent(
  ctx: RunContext,
  step: PlanStep,
  to: PlanStepStatus,
  event: TransitionEvent,
): Promise<PlanStep> {
  const patch: Partial<Pick<PlanStep, "blockedReason" | "endedAt">> = {};
  if (event.blockedReason !== undefined) patch.blockedReason = event.blockedReason;
  if (event.endedAt !== undefined) patch.endedAt = event.endedAt;

  const next = await ctx.steps.transition(step, to, patch);

  const emitInput: Omit<Parameters<typeof emit>[1], "runId" | "assignmentId" | "orgId"> = {
    type: event.type,
    summary: event.summary,
    refs: {
      stepId: step.id,
      milestoneId: step.milestoneId,
      ...event.refs,
    },
  };
  if (event.detail !== undefined) emitInput.detail = event.detail;
  if (event.level !== undefined) emitInput.level = event.level;

  await emitAndMaybePublish(ctx, emitInput);
  return next;
}

async function emitAndMaybePublish(
  ctx: RunContext,
  input: Omit<Parameters<typeof emit>[1], "runId" | "assignmentId" | "orgId">,
): Promise<void> {
  const event = await emit(ctx.tx, {
    runId: ctx.runId,
    assignmentId: ctx.assignmentId,
    orgId: ctx.orgId,
    ...input,
  });
  ctx.onEvent?.(event);
}
