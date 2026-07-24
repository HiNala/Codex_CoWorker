import type { PlanStep } from "@forge/contracts";
import { emit } from "@forge/events";
import type { BudgetPort, RunContext } from "./types";

export interface BudgetState {
  ceilingMicrocredits: number;
  reservedMicrocredits: number;
  spentMicrocredits: number;
  warned: boolean;
  stopped: boolean;
}

/**
 * Integer microcredits only. Warn at 80%, stop before a call that would
 * exceed remaining authorisation. No float multiply/divide on ledger values.
 */
export class InMemoryBudget implements BudgetPort {
  constructor(private readonly state: BudgetState) {}

  snapshot(): Readonly<BudgetState> {
    return { ...this.state };
  }

  remaining(): number {
    const left = this.state.ceilingMicrocredits - this.state.spentMicrocredits;
    return left > 0 ? left : 0;
  }

  async check(
    ctx: RunContext,
    step: PlanStep,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (this.state.stopped) {
      return { ok: false, reason: "Cost ceiling already enforced for this run." };
    }

    const remaining = this.remaining();
    // Integer 80% gate: spent * 5 >= ceiling * 4  ⇔  spent/ceiling >= 0.8
    const atOrAboveWarn =
      this.state.ceilingMicrocredits === 0 ||
      this.state.spentMicrocredits * 5 >= this.state.ceilingMicrocredits * 4;

    if (!this.state.warned && atOrAboveWarn && this.state.ceilingMicrocredits > 0) {
      this.state.warned = true;
      const percent = percentUsedInteger(
        this.state.spentMicrocredits,
        this.state.ceilingMicrocredits,
      );
      await emit(ctx.tx, {
        runId: ctx.runId,
        assignmentId: ctx.assignmentId,
        orgId: ctx.orgId,
        type: "cost.ceiling_warning",
        summary: `Budget warning: ${percent}% of the authorised ceiling is consumed.`,
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

    // Also refuse when the step's known worst-case cost exceeds remaining.
    if (step.costMicrocredits > 0 && step.costMicrocredits > remaining) {
      this.state.stopped = true;
      await emit(ctx.tx, {
        runId: ctx.runId,
        assignmentId: ctx.assignmentId,
        orgId: ctx.orgId,
        type: "cost.ceiling_stop",
        summary: `Stopping before "${step.title}": step estimate exceeds remaining microcredits.`,
        refs: { stepId: step.id },
        level: "warn",
      });
      return {
        ok: false,
        reason: `Step estimate ${step.costMicrocredits} exceeds remaining ${remaining} microcredits.`,
      };
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

/** Integer percent used, floored, clamped to [0, 100]. */
export function percentUsedInteger(spent: number, ceiling: number): number {
  if (ceiling <= 0) return 100;
  if (spent <= 0) return 0;
  const pct = Math.floor((spent * 100) / ceiling);
  return pct > 100 ? 100 : pct;
}
