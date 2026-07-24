import type { RunEvent } from "@forge/contracts";
import type {
  BuildConsoleVM,
  CapabilityTileVM,
  RunState,
  TimelineItem,
  TraceLine,
} from "./run-state";
import { initialRunState } from "./run-state";

export type RunAction =
  | { type: "hydrate"; state: RunState }
  | { type: "event"; event: RunEvent }
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "reset" };

function seen(state: RunState, seq: number): boolean {
  return seq <= state.lastSeq;
}

function upsertTrace(
  timeline: TimelineItem[],
  stepId: string,
  line: TraceLine,
  seq: number,
): TimelineItem[] {
  const idx = timeline.findIndex(
    (t) => t.kind === "trace_group" && t.stepId === stepId && t.status === "live",
  );
  if (idx === -1) {
    return [
      ...timeline,
      {
        kind: "trace_group",
        id: `tg-${stepId}`,
        seq,
        stepId,
        status: "live",
        summary: null,
        traces: [line],
        durationMs: null,
        costMicrocredits: 0,
      },
    ];
  }
  const group = timeline[idx];
  if (group.kind !== "trace_group") return timeline;
  const next = [...timeline];
  next[idx] = { ...group, traces: [...group.traces, line], seq };
  return next;
}

function settleTrace(
  timeline: TimelineItem[],
  stepId: string,
  summary: string,
  durationMs: number,
  costMicrocredits: number,
): TimelineItem[] {
  return timeline.map((item) => {
    if (item.kind === "trace_group" && item.stepId === stepId && item.status === "live") {
      return {
        ...item,
        status: "settled" as const,
        summary,
        durationMs,
        costMicrocredits,
      };
    }
    return item;
  });
}

function applyEvent(state: RunState, event: RunEvent): RunState {
  if (seen(state, event.seq)) return state;

  let next: RunState = {
    ...state,
    lastSeq: event.seq,
    announcement: event.summary,
  };

  const detail = (event.detail ?? {}) as Record<string, unknown>;

  switch (event.type) {
    case "run.started":
      next = { ...next, status: "running", connected: true };
      break;
    case "run.paused":
      next = { ...next, status: "paused" };
      break;
    case "run.resumed":
      next = { ...next, status: "running" };
      break;
    case "run.completed":
      next = { ...next, status: "completed", activeStepId: null };
      break;
    case "run.failed":
      next = { ...next, status: "failed" };
      break;
    case "run.cancelled":
      next = { ...next, status: "failed" };
      break;

    case "user.message":
      next = {
        ...next,
        timeline: [
          ...next.timeline,
          {
            kind: "user_message",
            id: event.id,
            seq: event.seq,
            text: String(detail.text ?? event.summary),
            ts: event.ts,
          },
        ],
      };
      break;

    case "coworker.message":
    case "coworker.question":
      next = {
        ...next,
        timeline: [
          ...next.timeline,
          {
            kind: "coworker_message",
            id: event.id,
            seq: event.seq,
            text: String(detail.text ?? event.summary),
            ts: event.ts,
          },
        ],
      };
      break;

    case "trace.observed":
    case "trace.decided":
    case "trace.considered": {
      const stepId = event.refs.stepId ?? "unknown";
      const verb =
        event.type === "trace.observed"
          ? "Observed"
          : event.type === "trace.decided"
            ? "Decided"
            : "Considered";
      next = {
        ...next,
        timeline: upsertTrace(next.timeline, stepId, {
          id: event.id,
          verb,
          text: String(detail.text ?? event.summary),
          ts: event.ts,
        }, event.seq),
      };
      break;
    }

    case "research.evidence":
      next = {
        ...next,
        timeline: [
          ...next.timeline,
          {
            kind: "evidence",
            id: event.id,
            seq: event.seq,
            domain: String(detail.domain ?? "source"),
            title: String(detail.title ?? event.summary),
            retrievedAt: event.ts,
            trust: (detail.trust as "official" | "secondary" | "untrusted") ?? "secondary",
          },
        ],
      };
      break;

    case "step.started": {
      const stepId = event.refs.stepId;
      if (!stepId) break;
      const steps = { ...next.steps };
      const existing = steps[stepId];
      steps[stepId] = {
        id: stepId,
        milestoneId: event.refs.milestoneId ?? existing?.milestoneId ?? "",
        title: existing?.title ?? event.summary,
        description: existing?.description,
        status: "running",
        dependsOn: existing?.dependsOn ?? [],
        capabilityRefs: existing?.capabilityRefs ?? [],
        artifactIds: existing?.artifactIds ?? [],
        blockedReason: null,
        startedAt: event.ts,
        costMicrocredits: existing?.costMicrocredits ?? 0,
        changedAfterApproval: existing?.changedAfterApproval,
      };
      next = { ...next, steps, activeStepId: stepId };
      break;
    }

    case "step.completed": {
      const stepId = event.refs.stepId;
      if (!stepId) break;
      const steps = { ...next.steps };
      const existing = steps[stepId];
      if (existing) {
        const started = existing.startedAt ? Date.parse(existing.startedAt) : NaN;
        const durationMs = Number.isFinite(started)
          ? Math.max(0, Date.parse(event.ts) - started)
          : (detail.durationMs as number | undefined);
        steps[stepId] = {
          ...existing,
          status: "completed",
          durationMs,
          costMicrocredits:
            event.cost?.microcredits ?? existing.costMicrocredits ?? 0,
        };
        next = {
          ...next,
          steps,
          activeStepId: next.activeStepId === stepId ? null : next.activeStepId,
          timeline: settleTrace(
            next.timeline,
            stepId,
            event.summary,
            durationMs ?? 0,
            event.cost?.microcredits ?? 0,
          ),
        };
      }
      break;
    }

    case "step.failed":
    case "step.blocked":
    case "step.retrying":
    case "step.skipped":
    case "step.ready": {
      const stepId = event.refs.stepId;
      if (!stepId) break;
      const statusMap = {
        "step.failed": "failed",
        "step.blocked": "blocked",
        "step.retrying": "retrying",
        "step.skipped": "skipped",
        "step.ready": "ready",
      } as const;
      const steps = { ...next.steps };
      const existing = steps[stepId] ?? {
        id: stepId,
        milestoneId: event.refs.milestoneId ?? "",
        title: event.summary,
        status: "pending" as const,
        dependsOn: [],
        capabilityRefs: [],
        artifactIds: [],
      };
      steps[stepId] = {
        ...existing,
        status: statusMap[event.type],
        blockedReason:
          event.type === "step.blocked" || event.type === "step.failed"
            ? String(detail.reason ?? event.summary)
            : existing.blockedReason,
      };
      next = { ...next, steps };
      break;
    }

    case "plan.drafted":
    case "plan.approved":
    case "plan.amended": {
      const milestones = (detail.milestones as RunState["milestones"]) ?? next.milestones;
      const stepList = (detail.steps as RunState["steps"][string][]) ?? [];
      const steps = { ...next.steps };
      for (const s of stepList) {
        steps[s.id] = s;
      }
      if (detail.title) next = { ...next, title: String(detail.title) };
      next = { ...next, milestones, steps };
      break;
    }

    case "capability.gap_detected": {
      const id = event.refs.capabilityId ?? `gap-${event.seq}`;
      const cap: CapabilityTileVM = {
        id,
        name: String(detail.name ?? event.summary),
        kind: (detail.kind as CapabilityTileVM["kind"]) ?? "skill",
        state: "missing",
        slug: String(detail.slug ?? "capability"),
      };
      next = {
        ...next,
        capabilities: { ...next.capabilities, [id]: cap },
        timeline: [
          ...next.timeline,
          {
            kind: "gap_marker",
            id: event.id,
            seq: event.seq,
            slug: cap.slug ?? "capability",
            reason: String(detail.reason ?? event.summary),
          },
        ],
      };
      break;
    }

    case "capability.spec_written":
    case "capability.build_started":
    case "capability.repair_started":
    case "capability.approval_requested":
    case "capability.installed":
    case "capability.rejected": {
      const id = event.refs.capabilityId;
      if (!id) break;
      const prev = next.capabilities[id];
      const stateMap = {
        "capability.spec_written": "specifying",
        "capability.build_started": "building",
        "capability.repair_started": "repairing",
        "capability.approval_requested": "awaiting_approval",
        "capability.installed": "installed",
        "capability.rejected": "failed",
      } as const;
      const cap: CapabilityTileVM = {
        id,
        name: prev?.name ?? String(detail.name ?? "Capability"),
        kind: prev?.kind ?? "skill",
        state: stateMap[event.type],
        version: detail.version ? String(detail.version) : prev?.version,
        slug: prev?.slug ?? String(detail.slug ?? ""),
        progress: prev?.progress,
        failingGate: prev?.failingGate,
      };

      let build = next.build;
      if (event.type === "capability.build_started") {
        build = {
          capabilityId: id,
          slug: cap.slug ?? "capability",
          attempt: Number(detail.attempt ?? 1),
          maxAttempts: Number(detail.maxAttempts ?? 2),
          gates: [],
          output: [],
          status: "building",
        };
      }
      if (event.type === "capability.repair_started" && build) {
        build = {
          ...build,
          attempt: Number(detail.attempt ?? build.attempt + 1),
          status: "repairing",
        };
      }
      if (event.type === "capability.approval_requested" && build) {
        build = { ...build, status: "awaiting_approval" };
      }
      if (event.type === "capability.installed") {
        build = null;
      }

      next = {
        ...next,
        capabilities: { ...next.capabilities, [id]: cap },
        build,
        status:
          event.type === "capability.approval_requested"
            ? "awaiting_approval"
            : next.status,
      };
      break;
    }

    case "capability.gate_started":
    case "capability.gate_passed":
    case "capability.gate_failed": {
      const build = next.build;
      if (!build) break;
      const gateId = String(detail.gateId ?? detail.name ?? event.seq);
      const name = String(detail.name ?? event.summary);
      const gates = [...build.gates];
      const idx = gates.findIndex((g) => g.id === gateId || g.name === name);
      if (event.type === "capability.gate_started") {
        if (idx === -1) {
          gates.push({ id: gateId, name, status: "running" });
        } else {
          gates[idx] = { ...gates[idx], status: "running" };
        }
      } else if (event.type === "capability.gate_passed") {
        const row = {
          id: gateId,
          name,
          status: "passed" as const,
          durationMs: detail.durationMs as number | undefined,
          passed: detail.passed as number | undefined,
          total: detail.total as number | undefined,
        };
        if (idx === -1) gates.push(row);
        else gates[idx] = { ...gates[idx], ...row };
      } else {
        const row = {
          id: gateId,
          name,
          status: "failed" as const,
          durationMs: detail.durationMs as number | undefined,
          message: String(detail.message ?? event.summary),
          passed: detail.passed as number | undefined,
          total: detail.total as number | undefined,
        };
        if (idx === -1) gates.push(row);
        else gates[idx] = { ...gates[idx], ...row };
      }

      const passed = gates.filter((g) => g.status === "passed").length;
      const total = Math.max(gates.length, Number(detail.totalGates ?? gates.length));
      const capId = event.refs.capabilityId ?? build.capabilityId;
      const prevCap = next.capabilities[capId];
      const capabilities = prevCap
        ? {
            ...next.capabilities,
            [capId]: {
              ...prevCap,
              state:
                event.type === "capability.gate_failed"
                  ? ("testing" as const)
                  : prevCap.state === "building"
                    ? ("testing" as const)
                    : prevCap.state,
              progress: { passed, total },
              failingGate:
                event.type === "capability.gate_failed"
                  ? name
                  : prevCap.failingGate,
            },
          }
        : next.capabilities;

      const buildNext: BuildConsoleVM = {
        ...build,
        gates,
        status: event.type === "capability.gate_failed" ? "repairing" : "verifying",
      };
      next = { ...next, build: buildNext, capabilities };
      break;
    }

    case "capability.build_output": {
      if (!next.build) break;
      next = {
        ...next,
        build: {
          ...next.build,
          output: [...next.build.output, String(detail.line ?? event.summary)].slice(-500),
        },
      };
      break;
    }

    case "artifact.declared":
    case "artifact.drafting":
    case "artifact.ready":
    case "artifact.published":
    case "artifact.failed": {
      const id = event.refs.artifactId ?? `art-${event.seq}`;
      const statusMap = {
        "artifact.declared": "declared",
        "artifact.drafting": "drafting",
        "artifact.ready": "ready",
        "artifact.published": "published",
        "artifact.failed": "failed",
      } as const;
      next = {
        ...next,
        artifacts: {
          ...next.artifacts,
          [id]: {
            id,
            title: String(detail.title ?? event.summary),
            type: String(detail.type ?? "document.markdown"),
            status: statusMap[event.type],
            metrics: detail.metrics ? String(detail.metrics) : undefined,
          },
        },
      };
      break;
    }

    case "approval.requested": {
      const approvalId = event.refs.approvalId ?? event.id;
      const approval = {
        id: approvalId,
        title: String(detail.title ?? event.summary),
        summary: String(detail.summary ?? event.summary),
        risk:
          (detail.risk as
            | "low"
            | "customer_facing"
            | "irreversible"
            | "capability_install") ?? "low",
        payloadPreview: String(detail.payloadPreview ?? ""),
        status: "pending" as const,
      };
      next = {
        ...next,
        approvals: [...next.approvals.filter((a) => a.id !== approvalId), approval],
        timeline: [
          ...next.timeline,
          {
            kind: "approval",
            id: event.id,
            seq: event.seq,
            approvalId,
            title: approval.title,
            summary: approval.summary,
            risk: approval.risk,
            payloadPreview: approval.payloadPreview,
          },
        ],
        status: "awaiting_approval",
      };
      break;
    }

    case "approval.granted":
    case "approval.denied":
    case "approval.expired": {
      const approvalId = event.refs.approvalId;
      next = {
        ...next,
        approvals: next.approvals.map((a) =>
          a.id === approvalId
            ? {
                ...a,
                status:
                  event.type === "approval.granted"
                    ? "granted"
                    : event.type === "approval.denied"
                      ? "denied"
                      : "expired",
              }
            : a,
        ),
        status: event.type === "approval.granted" ? "running" : next.status,
      };
      break;
    }

    case "cost.reserved":
      next = {
        ...next,
        budget: {
          ...next.budget,
          reserved: event.cost?.microcredits ?? Number(detail.microcredits ?? 0),
          ceiling: Number(detail.ceiling ?? next.budget.ceiling),
        },
      };
      break;
    case "cost.consumed":
      next = {
        ...next,
        budget: {
          ...next.budget,
          spent: next.budget.spent + (event.cost?.microcredits ?? 0),
        },
      };
      break;
    case "cost.ceiling_warning":
    case "cost.ceiling_stop":
      next = {
        ...next,
        timeline: [
          ...next.timeline,
          {
            kind: "notice",
            id: event.id,
            seq: event.seq,
            level: "warn",
            text: event.summary,
          },
        ],
      };
      break;

    case "system.degraded":
    case "system.warning":
    case "system.error":
      next = {
        ...next,
        timeline: [
          ...next.timeline,
          {
            kind: "notice",
            id: event.id,
            seq: event.seq,
            level: event.type === "system.error" ? "error" : "warn",
            text: event.summary,
          },
        ],
      };
      break;

    default:
      break;
  }

  return next;
}

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "reset":
      return initialRunState;
    case "connected":
      return { ...state, connected: true, disconnectedAt: null };
    case "disconnected":
      return {
        ...state,
        connected: false,
        disconnectedAt: new Date().toISOString(),
      };
    case "event":
      return applyEvent(state, action.event);
    default:
      return state;
  }
}
