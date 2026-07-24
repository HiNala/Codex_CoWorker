import type { PlanStep, PlanStepStatus } from "@forge/contracts";
import { assertTransition } from "../plan/transitions";
import type { StepStore } from "../types";

/**
 * In-memory plan step store for unit tests and deterministic fakes.
 *
 * claimNextReady reclaims both `ready` and `retrying` steps (FOR UPDATE
 * SKIP LOCKED analogue: first matching candidate wins). Every claim enters
 * `running` and increments `attempt` so failures are bounded by maxAttempts.
 */
export class MemoryStepStore implements StepStore {
  constructor(private readonly steps: PlanStep[]) {}

  async list(runId: string): Promise<PlanStep[]> {
    return this.steps.filter((step) => step.runId === runId).sort((a, b) => a.ordinal - b.ordinal);
  }

  async claimNextReady(runId: string): Promise<PlanStep | null> {
    const candidates = (await this.list(runId)).filter(
      (step) => step.status === "ready" || step.status === "retrying",
    );
    const step = candidates[0];
    if (!step) return null;

    // Always bump attempt on claim so retrying steps progress toward maxAttempts.
    return this.transition(step, "running", {
      startedAt: step.startedAt ?? new Date().toISOString(),
      attempt: step.attempt + 1,
      // Clear prior terminal markers when reclaiming a retry.
      endedAt: null,
      blockedReason: null,
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
