/** Icon + label metadata. Colour is never the only cue. */

export type CapabilityState =
  | "available"
  | "active"
  | "missing"
  | "specifying"
  | "building"
  | "testing"
  | "repairing"
  | "awaiting_approval"
  | "installed"
  | "failed"
  | "disabled";

export type PlanStepStatusUi =
  | "pending"
  | "ready"
  | "running"
  | "needs_capability"
  | "building_capability"
  | "awaiting_approval"
  | "blocked"
  | "retrying"
  | "completed"
  | "skipped"
  | "failed"
  | "cancelled";

export interface StatusPresentation {
  label: string;
  /** Lucide-style icon name for consumers that map icons */
  icon: string;
  /** Semantic token class fragment, e.g. status-building */
  token: string;
}

export const CAPABILITY_STATE_META: Record<CapabilityState, StatusPresentation> = {
  available: { label: "Available", icon: "circle", token: "status-idle" },
  active: { label: "Active", icon: "circle-dot", token: "status-active" },
  missing: { label: "Missing", icon: "plus", token: "status-idle" },
  specifying: { label: "Specifying", icon: "file-text", token: "status-building" },
  building: { label: "Building", icon: "hammer", token: "status-building" },
  testing: { label: "Testing", icon: "flask-conical", token: "status-testing" },
  repairing: { label: "Repairing", icon: "wrench", token: "status-repairing" },
  awaiting_approval: { label: "Awaiting approval", icon: "lock", token: "status-warning" },
  installed: { label: "Installed", icon: "check-circle", token: "status-success" },
  failed: { label: "Failed", icon: "x-circle", token: "status-danger" },
  disabled: { label: "Disabled", icon: "ban", token: "status-idle" },
};

export const PLAN_STEP_STATUS_META: Record<PlanStepStatusUi, StatusPresentation> = {
  pending: { label: "Pending", icon: "circle", token: "status-idle" },
  ready: { label: "Ready", icon: "circle-dot", token: "status-active" },
  running: { label: "Running", icon: "play", token: "status-active" },
  needs_capability: { label: "Needs capability", icon: "puzzle", token: "status-building" },
  building_capability: { label: "Building capability", icon: "hammer", token: "status-building" },
  awaiting_approval: { label: "Awaiting approval", icon: "lock", token: "status-warning" },
  blocked: { label: "Blocked", icon: "octagon", token: "status-warning" },
  retrying: { label: "Retrying", icon: "rotate-cw", token: "status-repairing" },
  completed: { label: "Completed", icon: "check", token: "status-success" },
  skipped: { label: "Skipped", icon: "skip-forward", token: "status-idle" },
  failed: { label: "Failed", icon: "x", token: "status-danger" },
  cancelled: { label: "Cancelled", icon: "ban", token: "status-idle" },
};

export function capabilityStateLabel(state: CapabilityState): string {
  return CAPABILITY_STATE_META[state].label;
}

export function planStepStatusLabel(status: PlanStepStatusUi): string {
  return PLAN_STEP_STATUS_META[status].label;
}
