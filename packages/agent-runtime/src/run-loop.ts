import type { PlanStep, PlanStepStatus } from "@forge/contracts";
import { emit } from "@forge/events";
import type { RunContext, StepWorkResult } from "./types";

/**
 * Flat run loop. Keep this file under 300 lines.
 *
 * Invariant: every status mutation that has a corresponding RunEvent is
 * performed in the same transactional unit as that emit (ctx.tx).
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

export async function executeStep(ctx: RunContext, step: PlanStep): Promise<void> {
  // claimNextReady already moved ready -> running; emit the start.
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

  // Prefer explicit descriptors when the step carries none yet (intake path).
  const needed = await ctx.capabilities.resolve(ctx.orgId, descriptors);
  if (needed.missing.length > 0) {
    const gap = needed.missing[0]!;
    await transitionWithEvent(ctx, step, "needs_capability", {
      type: "capability.gap_detected",
      summary: `Capability gap detected: ${gap.slug} is required for "${step.title}".`,
      detail: gap,
    });
    await ctx.foundry.requestBuild(ctx, step, gap);
    return;
  }

  const budget = await ctx.budget.check(ctx, step);
  if (!budget.ok) {
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
  if (result.kind === "needs_capability" && result.missing) {
    await transitionWithEvent(ctx, step, "needs_capability", {
      type: "capability.gap_detected",
      summary: `Capability gap detected mid-step: ${result.missing.slug}.`,
      detail: result.missing,
    });
    await ctx.foundry.requestBuild(ctx, step, result.missing);
    return;
  }

  if (result.kind === "needs_approval") {
    await transitionWithEvent(ctx, step, "awaiting_approval", {
      type: "approval.requested",
      summary: `Approval required before continuing "${step.title}".`,
      detail: result.proposal,
    });
    return;
  }

  if (result.kind === "failed") {
    await handleFailure(ctx, step, result.error ?? "Step failed without a message.");
    return;
  }

  for (const artifact of result.artifacts ?? []) {
    const declared = await ctx.artifacts.declare(ctx.runId, {
      type: "document.markdown",
      title: artifact.title,
      description: artifact.title,
    });
    await ctx.artifacts.write(
      { artifactId: declared.id, stepId: step.id },
      { title: artifact.title, body: artifact.content },
    );
    await emitAndMaybePublish(ctx, {
      type: "artifact.ready",
      summary: `Artifact ready: ${artifact.title}`,
      refs: { stepId: step.id, artifactId: declared.id },
    });
  }

  await transitionWithEvent(ctx, step, "completed", {
    type: "step.completed",
    summary: result.summary ?? `Completed: ${step.title}`,
    endedAt: new Date().toISOString(),
  });
}

async function handleFailure(ctx: RunContext, step: PlanStep, error: string): Promise<void> {
  if (step.attempt < step.maxAttempts) {
    // Leave the step in `retrying` so the next claimNextReady can reclaim it.
    await transitionWithEvent(ctx, step, "retrying", {
      type: "step.retrying",
      summary: `Retrying "${step.title}" after failure: ${error}`,
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
}

async function finishRun(ctx: RunContext): Promise<void> {
  const steps = await ctx.steps.list(ctx.runId);
  const failed = steps.some((step) => step.status === "failed");
  const blocked = steps.some(
    (step) =>
      step.status === "blocked" ||
      step.status === "awaiting_approval" ||
      step.status === "needs_capability" ||
      step.status === "building_capability",
  );

  if (blocked) {
    await emitAndMaybePublish(ctx, {
      type: "run.paused",
      summary: "Run paused: one or more steps are waiting on capability, approval, or budget.",
    });
    return;
  }

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
}

async function transitionWithEvent(
  ctx: RunContext,
  step: PlanStep,
  to: PlanStepStatus,
  event: TransitionEvent,
): Promise<PlanStep> {
  // Same transactional unit: state mutation then emit on ctx.tx.
  const next = await ctx.steps.transition(step, to, {
    blockedReason: event.blockedReason ?? step.blockedReason,
    endedAt: event.endedAt ?? step.endedAt,
  });
  await emitAndMaybePublish(ctx, {
    type: event.type,
    summary: event.summary,
    detail: event.detail,
    level: event.level,
    refs: { stepId: step.id, milestoneId: step.milestoneId },
  });
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
