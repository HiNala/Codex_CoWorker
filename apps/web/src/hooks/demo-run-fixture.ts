import type { RunEvent } from "@forge/contracts";
import type { RunState } from "./run-state";
import { runReducer, type RunAction } from "./run-reducer";
import { initialRunState } from "./run-state";

const ORG = "01900000-0000-7000-8000-000000000001";
const RUN = "01900000-0000-7000-8000-000000000010";
const ASSIGN = "01900000-0000-7000-8000-000000000020";
const M1 = "01900000-0000-7000-8000-000000000031";
const M2 = "01900000-0000-7000-8000-000000000032";
const S1 = "01900000-0000-7000-8000-000000000041";
const S2 = "01900000-0000-7000-8000-000000000042";
const S3 = "01900000-0000-7000-8000-000000000043";
const S4 = "01900000-0000-7000-8000-000000000044";
const S5 = "01900000-0000-7000-8000-000000000045";
const CAP = "01900000-0000-7000-8000-000000000050";
const ART1 = "01900000-0000-7000-8000-000000000061";
const ART2 = "01900000-0000-7000-8000-000000000062";
const ART3 = "01900000-0000-7000-8000-000000000063";
const APPROVAL = "01900000-0000-7000-8000-000000000070";

function ev(
  seq: number,
  type: RunEvent["type"],
  channel: RunEvent["channel"],
  summary: string,
  partial: Partial<RunEvent> = {},
): RunEvent {
  return {
    id: `01900000-0000-7000-8000-${String(seq).padStart(12, "0")}`,
    seq,
    runId: RUN,
    assignmentId: ASSIGN,
    orgId: ORG,
    ts: new Date(Date.UTC(2026, 6, 23, 14, 0, seq)).toISOString(),
    type,
    channel,
    level: "info",
    visibility: "user",
    summary,
    detail: {},
    refs: {},
    ...partial,
  };
}

/** Scripted golden-path events for the broken checkout demo (static fixture). */
export function buildDemoEvents(): RunEvent[] {
  return [
    ev(1, "run.started", "system", "Run started", {
      detail: { title: "Webhook field rename incident" },
    }),
    ev(2, "cost.reserved", "cost", "Reserved work ceiling", {
      detail: { ceiling: 8_000_000, microcredits: 8_000_000 },
      cost: { microcredits: 8_000_000, provider: "openai", units: {} },
    }),
    ev(3, "user.message", "narrative", "User assignment", {
      detail: {
        text: "Find out why customers cannot buy the annual plan and prepare a verified fix.",
      },
    }),
    ev(4, "coworker.message", "narrative", "Contract drafted", {
      detail: {
        text: "I drafted a bounded contract: cluster tickets, map customer impact, build an API-change impact analyzer if needed, and produce a verified code change with an incident report.",
      },
    }),
    ev(5, "plan.approved", "plan", "Plan approved", {
      detail: {
        title: "Webhook field rename incident",
        milestones: [
          { id: M1, ordinal: 1, title: "Establish root cause", status: "completed" },
          { id: M2, ordinal: 2, title: "Determine customer impact", status: "active" },
        ],
        steps: [
          {
            id: S1,
            milestoneId: M1,
            title: "Retrieve current webhook documentation",
            status: "completed",
            dependsOn: [],
            capabilityRefs: [],
            artifactIds: [],
            durationMs: 11000,
            costMicrocredits: 40_000,
          },
          {
            id: S2,
            milestoneId: M1,
            title: "Cluster 47 tickets by root cause",
            status: "completed",
            dependsOn: [S1],
            capabilityRefs: [],
            artifactIds: [],
            durationMs: 7000,
            costMicrocredits: 80_000,
          },
          {
            id: S3,
            milestoneId: M2,
            title: "Analyse API change against consumer code",
            status: "running",
            dependsOn: [S2],
            capabilityRefs: [CAP],
            artifactIds: [],
            startedAt: new Date(Date.UTC(2026, 6, 23, 14, 0, 20)).toISOString(),
          },
          {
            id: S4,
            milestoneId: M2,
            title: "Map affected customer accounts",
            status: "pending",
            dependsOn: [S3],
            capabilityRefs: [],
            artifactIds: [],
          },
          {
            id: S5,
            milestoneId: M2,
            title: "Draft incident report",
            status: "pending",
            dependsOn: [S4],
            capabilityRefs: [],
            artifactIds: [ART1],
          },
        ],
      },
    }),
    ev(6, "artifact.declared", "artifact", "Incident report declared", {
      refs: { artifactId: ART1 },
      detail: { title: "Incident report", type: "document.markdown" },
    }),
    ev(7, "artifact.declared", "artifact", "Affected customers declared", {
      refs: { artifactId: ART2 },
      detail: { title: "Affected customers", type: "table.typed" },
    }),
    ev(8, "artifact.declared", "artifact", "Code change declared", {
      refs: { artifactId: ART3 },
      detail: { title: "Code change", type: "code.diff" },
    }),
    ev(9, "step.started", "plan", "Analyse API change", {
      refs: { stepId: S3, milestoneId: M2 },
    }),
    ev(10, "trace.observed", "trace", "Ticket pattern", {
      refs: { stepId: S3 },
      detail: {
        text: "47 of 61 tickets mention payment_intent.metadata.customer_ref after the rename.",
      },
    }),
    ev(11, "trace.decided", "trace", "Cluster first", {
      refs: { stepId: S3 },
      detail: {
        text: "Cluster before mapping — the mapper needs stable cluster ids.",
      },
    }),
    ev(12, "trace.considered", "trace", "Rejected direct search", {
      refs: { stepId: S3 },
      detail: {
        text: "Direct string search, rejected: misses aliased access paths.",
      },
    }),
    ev(13, "research.evidence", "trace", "Webhook docs", {
      detail: {
        domain: "developer.zendesk.com",
        title: "Webhook payload reference — 2026-07-01",
        trust: "official",
      },
    }),
    ev(14, "capability.gap_detected", "capability", "Gap: impact analyzer", {
      refs: { capabilityId: CAP },
      detail: {
        name: "API change impact analyzer",
        slug: "api-change-impact-analyzer",
        kind: "skill",
        reason:
          "No installed skill can resolve nested/aliased field renames across consumer call sites.",
      },
    }),
    ev(15, "capability.spec_written", "capability", "Spec written", {
      refs: { capabilityId: CAP },
      detail: { name: "API change impact analyzer", slug: "api-change-impact-analyzer" },
    }),
    ev(16, "capability.build_started", "capability", "Build started", {
      refs: { capabilityId: CAP },
      detail: { attempt: 1, maxAttempts: 2, slug: "api-change-impact-analyzer" },
    }),
    ev(17, "capability.gate_started", "capability", "manifest", {
      refs: { capabilityId: CAP },
      detail: { name: "manifest", gateId: "g1" },
    }),
    ev(18, "capability.gate_passed", "capability", "manifest passed", {
      refs: { capabilityId: CAP },
      detail: { name: "manifest", gateId: "g1", durationMs: 12 },
      cost: { microcredits: 5_000, provider: "sandbox", units: {} },
    }),
    ev(19, "capability.gate_started", "capability", "typecheck", {
      refs: { capabilityId: CAP },
      detail: { name: "typecheck", gateId: "g2" },
    }),
    ev(20, "capability.gate_passed", "capability", "typecheck passed", {
      refs: { capabilityId: CAP },
      detail: { name: "typecheck", gateId: "g2", durationMs: 1200 },
    }),
    ev(21, "capability.gate_started", "capability", "trusted tests", {
      refs: { capabilityId: CAP },
      detail: { name: "trusted tests", gateId: "g3" },
    }),
    ev(22, "capability.gate_failed", "capability", "trusted tests failed", {
      refs: { capabilityId: CAP },
      detail: {
        name: "trusted tests",
        gateId: "g3",
        durationMs: 1800,
        passed: 7,
        total: 8,
        message: "nested field rename not detected in payment_intent.metadata.customer_ref",
      },
    }),
    ev(23, "capability.repair_started", "capability", "Repair attempt 1", {
      refs: { capabilityId: CAP },
      detail: { attempt: 1 },
    }),
    ev(24, "capability.gate_started", "capability", "trusted tests re-run", {
      refs: { capabilityId: CAP },
      detail: { name: "trusted tests", gateId: "g3r" },
    }),
    ev(25, "capability.gate_passed", "capability", "trusted tests passed", {
      refs: { capabilityId: CAP },
      detail: { name: "trusted tests", gateId: "g3r", durationMs: 1600, passed: 8, total: 8 },
    }),
    ev(26, "capability.approval_requested", "capability", "Install approval", {
      refs: { capabilityId: CAP, approvalId: APPROVAL },
      detail: {
        name: "API change impact analyzer",
        version: "1.1.0",
        slug: "api-change-impact-analyzer",
      },
    }),
    ev(27, "approval.requested", "approval", "Approve capability install", {
      refs: { approvalId: APPROVAL, capabilityId: CAP },
      detail: {
        title: "Install API change impact analyzer",
        summary:
          "Given an API change and consumer samples, finds every call site that breaks, including aliased and nested access.",
        risk: "capability_install",
        payloadPreview:
          "permissions: no network · no filesystem · no credentials\nfiles: src/index.ts +148, src/lib/resolve.ts +72, tests/unit.test.ts +94\nverification: 12/12 gates · 14/14 tests · 1 repair",
      },
    }),
    ev(28, "cost.consumed", "cost", "Build cost", {
      cost: { microcredits: 410_000, provider: "codex", units: {} },
    }),
    ev(29, "artifact.drafting", "artifact", "Incident report drafting", {
      refs: { artifactId: ART1 },
      detail: { title: "Incident report", type: "document.markdown", metrics: "draft" },
    }),
  ];
}

export function buildDemoRunState(): RunState {
  let state: RunState = {
    ...initialRunState,
    connected: true,
    title: "Webhook field rename incident",
  };
  for (const event of buildDemoEvents()) {
    state = runReducer(state, { type: "event", event } satisfies RunAction);
  }
  // Seed a few installed toolbelt tiles for idle contrast
  state = {
    ...state,
    capabilities: {
      ...state.capabilities,
      "01900000-0000-7000-8000-000000000051": {
        id: "01900000-0000-7000-8000-000000000051",
        name: "Ticket clusterer",
        kind: "skill",
        state: "installed",
        version: "1.0.2",
      },
      "01900000-0000-7000-8000-000000000052": {
        id: "01900000-0000-7000-8000-000000000052",
        name: "Zendesk connection",
        kind: "connection",
        state: "active",
        version: "2.0.0",
      },
      "01900000-0000-7000-8000-000000000053": {
        id: "01900000-0000-7000-8000-000000000053",
        name: "Repo change proposer",
        kind: "workflow",
        state: "installed",
        version: "0.9.1",
      },
    },
  };
  return state;
}
