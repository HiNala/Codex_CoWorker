import type { CapabilityState } from "@forge/ui";
import type { PlanStepStatus } from "@forge/contracts";

export type TraceDensity = "narrative" | "detailed" | "everything";

export interface TraceLine {
  id: string;
  verb: "Observed" | "Decided" | "Considered";
  text: string;
  ts: string;
}

export type TimelineItem =
  | { kind: "user_message"; id: string; seq: number; text: string; ts: string }
  | { kind: "coworker_message"; id: string; seq: number; text: string; ts: string }
  | {
      kind: "trace_group";
      id: string;
      seq: number;
      stepId: string;
      status: "live" | "settled";
      summary: string | null;
      traces: TraceLine[];
      durationMs: number | null;
      costMicrocredits: number;
    }
  | {
      kind: "evidence";
      id: string;
      seq: number;
      domain: string;
      title: string;
      retrievedAt: string;
      trust: "official" | "secondary" | "untrusted";
    }
  | {
      kind: "approval";
      id: string;
      seq: number;
      approvalId: string;
      title: string;
      summary: string;
      risk: "low" | "customer_facing" | "irreversible" | "capability_install";
      payloadPreview: string;
    }
  | { kind: "gap_marker"; id: string; seq: number; slug: string; reason: string }
  | {
      kind: "notice";
      id: string;
      seq: number;
      level: "info" | "warn" | "error";
      text: string;
    };

export interface MilestoneVM {
  id: string;
  ordinal: number;
  title: string;
  status: "pending" | "active" | "completed" | "failed" | "skipped";
}

export interface PlanStepVM {
  id: string;
  milestoneId: string;
  title: string;
  description?: string | undefined;
  status: PlanStepStatus;
  dependsOn: string[];
  capabilityRefs: string[];
  artifactIds: string[];
  blockedReason?: string | null | undefined;
  durationMs?: number | undefined;
  costMicrocredits?: number | undefined;
  changedAfterApproval?: boolean | undefined;
  startedAt?: string | null | undefined;
}

export interface CapabilityTileVM {
  id: string;
  name: string;
  kind: "connection" | "skill" | "workflow";
  state: CapabilityState;
  progress?: { passed: number; total: number } | undefined;
  version?: string | undefined;
  failingGate?: string | undefined;
  slug?: string | undefined;
}

export interface GateRowVM {
  id: string;
  name: string;
  status: "pending" | "running" | "passed" | "failed" | "skipped";
  durationMs?: number | undefined;
  message?: string | undefined;
  passed?: number | undefined;
  total?: number | undefined;
}

export interface BuildConsoleVM {
  capabilityId: string;
  slug: string;
  attempt: number;
  maxAttempts: number;
  gates: GateRowVM[];
  output: string[];
  status: "building" | "verifying" | "repairing" | "awaiting_approval" | "failed";
}

export interface ArtifactCardVM {
  id: string;
  title: string;
  type: string;
  status: "declared" | "drafting" | "ready" | "published" | "failed";
  metrics?: string | undefined;
}

export interface ApprovalVM {
  id: string;
  title: string;
  summary: string;
  risk: "low" | "customer_facing" | "irreversible" | "capability_install";
  payloadPreview: string;
  status: "pending" | "granted" | "denied" | "expired";
}

export interface RunState {
  connected: boolean;
  lastSeq: number;
  timeline: TimelineItem[];
  milestones: MilestoneVM[];
  steps: Record<string, PlanStepVM>;
  activeStepId: string | null;
  capabilities: Record<string, CapabilityTileVM>;
  build: BuildConsoleVM | null;
  artifacts: Record<string, ArtifactCardVM>;
  approvals: ApprovalVM[];
  budget: { spent: number; ceiling: number; reserved: number };
  status: "idle" | "running" | "paused" | "completed" | "failed" | "awaiting_approval";
  title: string;
  announcement: string | null;
  disconnectedAt: string | null;
}

export const initialRunState: RunState = {
  connected: false,
  lastSeq: 0,
  timeline: [],
  milestones: [],
  steps: {},
  activeStepId: null,
  capabilities: {},
  build: null,
  artifacts: {},
  approvals: [],
  budget: { spent: 0, ceiling: 8_000_000, reserved: 0 },
  status: "idle",
  title: "Assignment",
  announcement: null,
  disconnectedAt: null,
};

/** Microcredits → display dollars string */
export function formatCredits(microcredits: number): string {
  return (microcredits / 1_000_000).toFixed(2);
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}:${String(rem).padStart(2, "0")}`;
}
