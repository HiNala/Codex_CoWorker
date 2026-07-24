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

/** Scripted golden-path events — Broken Checkout (default demo, not webhook rename). */
export function buildDemoEvents(): RunEvent[] {
  return [
    ev(1, "run.started", "system", "Run started", {
      detail: { title: "Broken Checkout" },
    }),
    ev(2, "cost.reserved", "cost", "Reserved work ceiling", {
      detail: { ceiling: 8_000_000, microcredits: 8_000_000 },
      cost: { microcredits: 8_000_000, provider: "openai", units: {} },
    }),
    ev(3, "user.message", "narrative", "User assignment", {
      detail: {
        text: "Customers cannot complete annual plan checkout. Find the root cause, measure impact, and prepare a verified fix.",
      },
    }),
    ev(4, "coworker.message", "narrative", "Contract drafted", {
      detail: {
        text: "I drafted a bounded contract: cluster support tickets, reproduce the annual checkout failure, map affected customers, and deliver a verified code change with an incident report.",
      },
    }),
    ev(5, "plan.approved", "plan", "Plan approved", {
      detail: {
        title: "Broken Checkout",
        milestones: [
          { id: M1, ordinal: 1, title: "Establish root cause", status: "completed" },
          { id: M2, ordinal: 2, title: "Measure impact and fix", status: "active" },
        ],
        steps: [
          {
            id: S1,
            milestoneId: M1,
            title: "Collect support evidence",
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
            title: "Reproduce annual checkout failure",
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
            title: "Analyse checkout error logs",
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
            artifactIds: [ART2],
          },
          {
            id: S5,
            milestoneId: M2,
            title: "Prepare and verify the fix",
            status: "pending",
            dependsOn: [S4],
            capabilityRefs: [],
            artifactIds: [ART1, ART3],
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
    ev(9, "step.started", "plan", "Analyse checkout error logs", {
      refs: { stepId: S3, milestoneId: M2 },
    }),
    ev(10, "trace.observed", "trace", "Ticket pattern", {
      refs: { stepId: S3 },
      detail: {
        text: "12 of 18 recent tickets fail on annual plan with the same checkout signature.",
      },
    }),
    ev(11, "trace.decided", "trace", "Reproduce first", {
      refs: { stepId: S3 },
      detail: {
        text: "Reproduce in staging before mapping customers — need a stable error code.",
      },
    }),
    ev(12, "trace.considered", "trace", "Rejected generic retry", {
      refs: { stepId: S3 },
      detail: {
        text: "Client-side retry alone rejected: failure is server-side on plan period validation.",
      },
    }),
    ev(13, "research.evidence", "trace", "Checkout docs", {
      detail: {
        domain: "docs.stripe.com",
        title: "Subscription period and proration — 2026-07",
        trust: "official",
      },
    }),
    ev(14, "capability.gap_detected", "capability", "Gap: checkout log analyzer", {
      refs: { capabilityId: CAP },
      detail: {
        name: "Checkout error log analyzer",
        slug: "checkout-error-log-analyzer",
        kind: "skill",
        reason:
          "No installed skill can correlate checkout error codes with annual-plan period edge cases.",
      },
    }),
    ev(15, "capability.spec_written", "capability", "Spec written", {
      refs: { capabilityId: CAP },
      detail: { name: "Checkout error log analyzer", slug: "checkout-error-log-analyzer" },
    }),
    ev(16, "capability.build_started", "capability", "Build started", {
      refs: { capabilityId: CAP },
      detail: { attempt: 1, maxAttempts: 2, slug: "checkout-error-log-analyzer" },
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
        message: "annual plan period edge case not detected in checkout.session.completed handler",
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
        name: "Checkout error log analyzer",
        version: "1.0.0",
        slug: "checkout-error-log-analyzer",
      },
    }),
    ev(27, "approval.requested", "approval", "Approve capability install", {
      refs: { approvalId: APPROVAL, capabilityId: CAP },
      detail: {
        title: "Install checkout error log analyzer",
        summary:
          "Given checkout error logs and plan metadata, finds annual-plan period failures and groups them by root cause.",
        risk: "capability_install",
        payloadPreview:
          "permissions: no network · no filesystem · no credentials\nfiles: src/index.ts +120, src/lib/period.ts +64, tests/unit.test.ts +80\nverification: 12/12 gates · 14/14 tests · 1 repair",
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
    title: "Broken Checkout",
  };
  for (const event of buildDemoEvents()) {
    state = runReducer(state, { type: "event", event } satisfies RunAction);
  }
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
        name: "Support connection",
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
