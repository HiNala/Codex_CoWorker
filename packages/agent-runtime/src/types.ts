import type {
  CapabilityDescriptor,
  CapabilityRef,
  PlanStep,
  PlanStepStatus,
  RunEvent,
} from "@forge/contracts";
import type { EventStoreTx } from "@forge/events";

export interface RunIdentity {
  runId: string;
  assignmentId: string;
  orgId: string;
}

export interface StepWorkResult {
  kind: "ok" | "needs_approval" | "failed" | "needs_capability";
  summary?: string;
  artifacts?: Array<{ title: string; content: string }>;
  proposal?: unknown;
  error?: string;
  missing?: CapabilityDescriptor;
}

export interface CapabilityResolver {
  resolve(
    orgId: string,
    descriptors: readonly CapabilityDescriptor[],
  ): Promise<{ resolved: CapabilityRef[]; missing: CapabilityDescriptor[] }>;
}

export interface FoundryPort {
  requestBuild(ctx: RunContext, step: PlanStep, gap: CapabilityDescriptor): Promise<void>;
  onInstalled(capabilityRef: CapabilityRef, stepId: string): Promise<void>;
}

export interface ArtifactPort {
  declare(
    runId: string,
    spec: { type: string; title: string; description: string },
  ): Promise<{ id: string }>;
  write(
    ref: { artifactId: string; stepId: string },
    content: { title: string; body: string },
  ): Promise<{ versionId: string }>;
}

export interface BudgetPort {
  check(ctx: RunContext, step: PlanStep): Promise<{ ok: true } | { ok: false; reason: string }>;
  consume(ctx: RunContext, microcredits: number, reason: string): Promise<void>;
}

export interface StepStore {
  list(runId: string): Promise<PlanStep[]>;
  /**
   * Atomically claim the next `ready` or `retrying` step for this run
   * (production: FOR UPDATE SKIP LOCKED). Transitions to `running` and
   * increments `attempt`. Returns null when nothing is claimable.
   */
  claimNextReady(runId: string): Promise<PlanStep | null>;
  transition(
    step: PlanStep,
    to: PlanStepStatus,
    patch?: Partial<Pick<PlanStep, "blockedReason" | "attempt" | "startedAt" | "endedAt">>,
  ): Promise<PlanStep>;
}

export interface RunControl {
  shouldStop(runId: string): Promise<boolean>;
  markFinished(runId: string, status: "completed" | "failed" | "cancelled"): Promise<void>;
}

export interface RunContext extends RunIdentity {
  tx: EventStoreTx;
  steps: StepStore;
  capabilities: CapabilityResolver;
  foundry: FoundryPort;
  artifacts: ArtifactPort;
  budget: BudgetPort;
  control: RunControl;
  /** Optional hook for side effects after a successful emit (e.g. live bus). */
  onEvent?: (event: RunEvent) => void;
  /** Executes the concrete work for a step once capabilities and budget are ready. */
  runStepWork(step: PlanStep, resolved: CapabilityRef[]): Promise<StepWorkResult>;
}
