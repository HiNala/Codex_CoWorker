import type { PlanStep, PlanStepStatus } from "@forge/contracts";
import { assertTransition } from "../plan/transitions";
import type { StepStore } from "../types";

export class MemoryStepStore implements StepStore {
  constructor(private readonly steps: PlanStep[]) {}

  async list(runId: string): Promise<PlanStep[]> {
    return this.steps.filter((step) => step.runId === runId).sort((a, b) => a.ordinal - b.ordinal);
  }

  async claimNextReady(runId: string): Promise<PlanStep | null> {
    // "retrying" is reclaimable after a failed attempt (attempt already bumped).
    const candidates = (await this.list(runId)).filter(
      (step) => step.status === "ready" || step.status === "retrying",
    );
    const step = candidates[0];
    if (!step) return null;
    const fromRetry = step.status === "retrying";
    return this.transition(step, "running", {
      startedAt: new Date().toISOString(),
      attempt: fromRetry ? step.attempt : step.attempt + 1,
    });
  }

  async transition(
    step: PlanStep,
    to: PlanStepStatus,
    patch: Partial<Pick<PlanStep, "blockedReason" | "attempt" | "startedAt" | "endedAt">> = {},
  ): Promise<PlanStep> {
    assertTransition(step.status, to);
    const index = this.steps.findIndex((candidate) => candidate.id === step.id);
    if (index < 0) throw new Error(`Unknown step ${step.id}`);
    const next: PlanStep = { ...this.steps[index]!, ...patch, status: to };
    this.steps[index] = next;
    return next;
  }
}
