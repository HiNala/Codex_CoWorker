import { IllegalTransitionError, type PlanStepStatus } from "@forge/contracts";

export const LEGAL: Record<PlanStepStatus, readonly PlanStepStatus[]> = {
  pending: ["ready", "skipped", "cancelled"],
  ready: ["running", "needs_capability", "blocked", "skipped", "cancelled"],
  running: [
    "completed",
    "failed",
    "blocked",
    "needs_capability",
    "awaiting_approval",
    "retrying",
    "cancelled",
  ],
  needs_capability: ["building_capability", "blocked", "skipped", "cancelled"],
  building_capability: ["awaiting_approval", "failed", "blocked", "cancelled"],
  awaiting_approval: ["running", "blocked", "skipped", "cancelled", "failed"],
  blocked: ["ready", "running", "skipped", "cancelled", "failed"],
  retrying: ["running", "failed", "cancelled"],
  completed: [],
  skipped: [],
  failed: ["retrying", "cancelled"],
  cancelled: [],
};

export function assertTransition(from: PlanStepStatus, to: PlanStepStatus): void {
  if (!LEGAL[from].includes(to)) {
    throw new IllegalTransitionError(`${from} -> ${to} is not a legal plan step transition`);
  }
}
