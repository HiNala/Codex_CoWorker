import { describe, expect, it } from "vitest";
import {
  Approval,
  ArtifactStatus,
  AssignmentStatus,
  CapabilityKind,
  CapabilityManifest,
  CapabilityPermissions,
  CoworkerStatus,
  EventChannel,
  GateId,
  Microcredits,
  Milestone,
  PlanStep,
  PlanStepStatus,
  Project,
  RunEvent,
  RunEventType,
  Session,
  UsageEvent,
  VerificationReport,
} from "./index";

const ID = "0198206f-5f53-7000-8000-000000000001";
const ID_2 = "0198206f-5f53-7000-8000-000000000002";
const TS = "2026-07-23T22:00:00.000Z";
const HASH = "a".repeat(64);

const manifest = {
  schemaVersion: 1,
  slug: "checkout-log-analyzer",
  name: "Checkout log analyzer",
  version: "1.0.0",
  kind: "skill",
  description: "Counts checkout failures from structured log evidence.",
  runtime: "node22",
  entrypoint: "dist/index.js",
  inputSchema: { type: "object" },
  outputSchema: { type: "object" },
  permissions: {
    network: false,
    filesystem: "none",
  },
  dependencies: [],
  knownLimitations: [],
  authoredBy: "codex",
} as const;

describe("frozen contracts reject invalid states", () => {
  it.each([
    AssignmentStatus,
    ArtifactStatus,
    CapabilityKind,
    CoworkerStatus,
    EventChannel,
    GateId,
    PlanStepStatus,
    RunEventType,
  ])("rejects an unknown enum member", (schema) => {
    expect(schema.safeParse("not-a-real-member").success).toBe(false);
  });

  it("rejects fractional microcredits", () => {
    expect(Microcredits.safeParse(1.5).success).toBe(false);
  });

  it("rejects negative microcredits", () => {
    expect(Microcredits.safeParse(-1).success).toBe(false);
  });

  it("rejects network permission", () => {
    expect(CapabilityPermissions.safeParse({ network: true, filesystem: "none" }).success).toBe(
      false,
    );
  });

  it("rejects filesystem permission", () => {
    expect(CapabilityPermissions.safeParse({ network: false, filesystem: "read" }).success).toBe(
      false,
    );
  });

  it("rejects capability dependencies", () => {
    expect(CapabilityManifest.safeParse({ ...manifest, dependencies: ["left-pad"] }).success).toBe(
      false,
    );
  });

  it("accepts a locked-down capability", () => {
    expect(CapabilityManifest.parse(manifest).permissions.network).toBe(false);
  });

  it("rejects a run event with sequence zero", () => {
    expect(
      RunEvent.safeParse({
        id: ID,
        seq: 0,
        runId: ID,
        assignmentId: ID,
        orgId: ID,
        ts: TS,
        type: "run.started",
        channel: "system",
        summary: "Run started.",
      }).success,
    ).toBe(false);
  });

  it("requires a safe run-event summary", () => {
    expect(
      RunEvent.safeParse({
        id: ID,
        seq: 1,
        runId: ID,
        assignmentId: ID,
        orgId: ID,
        ts: TS,
        type: "run.started",
        channel: "system",
      }).success,
    ).toBe(false);
  });

  it("rejects approval hashes of the wrong length", () => {
    expect(
      Approval.safeParse({
        id: ID,
        orgId: ID,
        assignmentId: ID,
        runId: ID,
        stepId: null,
        kind: "external_action",
        title: "Open draft pull request",
        summary: "Create a draft for review.",
        payload: {},
        payloadSha256: "short",
        risk: "reversible_external_write",
        decision: "pending",
        decidedBy: null,
        decidedAt: null,
        expiresAt: TS,
        createdAt: TS,
      }).success,
    ).toBe(false);
  });

  it("rejects invalid session roles", () => {
    expect(
      Session.safeParse({
        userId: ID,
        orgId: ID,
        email: "demo@forge.dev",
        role: "admin",
        displayName: "Demo",
      }).success,
    ).toBe(false);
  });

  it("rejects malformed session email", () => {
    expect(
      Session.safeParse({
        userId: ID,
        orgId: ID,
        email: "not-email",
        role: "owner",
        displayName: "Demo",
      }).success,
    ).toBe(false);
  });

  it("rejects malformed project slugs", () => {
    expect(
      Project.safeParse({
        id: ID,
        orgId: ID,
        name: "Acme",
        slug: "Not Valid",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid plan step status", () => {
    expect(
      PlanStep.safeParse({
        id: ID,
        runId: ID,
        milestoneId: ID_2,
        parentStepId: null,
        ordinal: 0,
        title: "Inspect logs",
        status: "done",
        blockedReason: null,
        startedAt: null,
        endedAt: null,
      }).success,
    ).toBe(false);
  });

  it("rejects non-positive max attempts", () => {
    expect(
      PlanStep.safeParse({
        id: ID,
        runId: ID,
        milestoneId: ID_2,
        parentStepId: null,
        ordinal: 0,
        title: "Inspect logs",
        status: "ready",
        blockedReason: null,
        maxAttempts: 0,
        startedAt: null,
        endedAt: null,
      }).success,
    ).toBe(false);
  });

  it("rejects invalid milestone status", () => {
    expect(
      Milestone.safeParse({
        id: ID,
        runId: ID_2,
        ordinal: 0,
        title: "Diagnose",
        outcome: "Cause identified",
        status: "running",
      }).success,
    ).toBe(false);
  });

  it("rejects verification reports with malformed hashes", () => {
    expect(
      VerificationReport.safeParse({
        capabilitySlug: "checkout-log-analyzer",
        version: "1.0.0",
        attempt: 1,
        gates: [],
        overall: "passed",
        bundleSha256: "nope",
        verifiedAt: TS,
        verifierVersion: "1",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid usage providers", () => {
    expect(
      UsageEvent.safeParse({
        id: ID,
        orgId: ID,
        runId: ID_2,
        stepId: null,
        provider: "stripe",
        units: {},
        rawCostMicrodollars: 1,
        microcredits: 1,
        pricingVersion: "v1",
        ts: TS,
      }).success,
    ).toBe(false);
  });

  it("accepts a 64-character lower-case digest", () => {
    const parsed = VerificationReport.safeParse({
      capabilitySlug: "checkout-log-analyzer",
      version: "1.0.0",
      attempt: 1,
      gates: [],
      overall: "passed",
      bundleSha256: HASH,
      verifiedAt: TS,
      verifierVersion: "1",
    });
    expect(parsed.success).toBe(true);
  });
});
