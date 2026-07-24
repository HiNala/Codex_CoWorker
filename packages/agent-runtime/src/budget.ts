import type { BudgetPort, RunContext } from "./types";
import type { PlanStep } from "@forge/contracts";
import { emit } from "@forge/events";

export interface BudgetState {
  ceilingMicrocredits: number;
  reservedMicrocredits: number;
  spentMicrocredits: number;
  warned: boolean;
  stopped: boolean;
}

/**
 * Integer microcredits only. Warn at 80%, stop before a call that would
 * exceed remaining authorisation.
 */
export class InMemoryBudget implements BudgetPort {
  constructor(private readonly state: BudgetState) {}

  remaining(): number {
    return Math.max(0, this.state.ceilingMicrocredits - this.state.spentMicrocredits);
  }

  async check(
    ctx: RunContext,
    step: PlanStep,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (this.state.stopped) {
      return { ok: false, reason: "Cost ceiling already enforced for this run." };
    }

    const remaining = this.remaining();
    const usedRatio =
      this.state.ceilingMicrocredits === 0
        ? 1
        : this.state.spentMicrocredits / this.state.ceilingMicrocredits;

    if (!this.state.warned && usedRatio >= 0.8) {
      this.state.warned = true;
      await emit(ctx.tx, {
        runId: ctx.runId,
        assignmentId: ctx.assignmentId,
        orgId: ctx.orgId,
        type: "cost.ceiling_warning",
        summary: `Budget warning: ${Math.round(usedRatio * 100)}% of the authorised ceiling is consumed.`,
        refs: { stepId: step.id },
      });
    }

    // Conservative stop: refuse any step once remaining is zero.
    if (remaining <= 0) {
      this.state.stopped = true;
      await emit(ctx.tx, {
        runId: ctx.runId,
        assignmentId: ctx.assignmentId,
        orgId: ctx.orgId,
        type: "cost.ceiling_stop",
        summary: "Stopping before the next model call: authorised microcredits are exhausted.",
        refs: { stepId: step.id },
        level: "warn",
      });
      return { ok: false, reason: "Authorised microcredit ceiling reached." };
    }

    return { ok: true };
  }

  async consume(ctx: RunContext, microcredits: number, reason: string): Promise<void> {
    if (!Number.isInteger(microcredits) || microcredits < 0) {
      throw new Error("Budget consume requires a non-negative integer microcredit amount.");
    }
    this.state.spentMicrocredits += microcredits;
    await emit(ctx.tx, {
      runId: ctx.runId,
      assignmentId: ctx.assignmentId,
      orgId: ctx.orgId,
      type: "cost.consumed",
      summary: reason,
      cost: {
        microcredits,
        provider: "openai",
        units: { microcredits },
      },
    });
  }
}
