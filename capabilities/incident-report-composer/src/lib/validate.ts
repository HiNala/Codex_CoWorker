import { CapabilityInputError, assertArray, assertObject } from "@forge/capability-sdk";
import type {
  ClusterIn,
  EvidenceIn,
  ImpactRowIn,
  ReportComposerInput,
  TimelineEvent,
} from "./types";

function parseCluster(raw: unknown, i: number): ClusterIn {
  assertObject(raw, `clusters[${i}] must be an object`);
  if (typeof raw.clusterId !== "string") {
    throw new CapabilityInputError(`clusters[${i}].clusterId must be a string`);
  }
  if (typeof raw.label !== "string") {
    throw new CapabilityInputError(`clusters[${i}].label must be a string`);
  }
  if (typeof raw.rootCauseHypothesis !== "string") {
    throw new CapabilityInputError(`clusters[${i}].rootCauseHypothesis must be a string`);
  }
  assertArray(raw.ticketIds, `clusters[${i}].ticketIds must be an array`);
  if (typeof raw.confidence !== "number") {
    throw new CapabilityInputError(`clusters[${i}].confidence must be a number`);
  }
  const base: ClusterIn = {
    clusterId: raw.clusterId,
    label: raw.label,
    rootCauseHypothesis: raw.rootCauseHypothesis,
    ticketIds: raw.ticketIds as string[],
    confidence: raw.confidence,
  };
  if (Array.isArray(raw.representativeQuotes)) {
    // exactOptionalPropertyTypes: assign only when present; cast excludes `| undefined`
    // (ClusterIn["representativeQuotes"] is optional and therefore includes undefined).
    base.representativeQuotes = raw.representativeQuotes as NonNullable<
      ClusterIn["representativeQuotes"]
    >;
  }
  return base;
}

function parseImpact(raw: unknown, i: number): ImpactRowIn {
  assertObject(raw, `impactRows[${i}] must be an object`);
  const req = ["rowId", "accountId", "accountName", "plan", "severity"] as const;
  for (const k of req) {
    if (typeof raw[k] !== "string") {
      throw new CapabilityInputError(`impactRows[${i}].${k} must be a string`);
    }
  }
  if (typeof raw.ticketCount !== "number") {
    throw new CapabilityInputError(`impactRows[${i}].ticketCount must be a number`);
  }
  if (typeof raw.mrrAtRiskMicrodollars !== "number") {
    throw new CapabilityInputError(`impactRows[${i}].mrrAtRiskMicrodollars must be a number`);
  }
  assertArray(raw.affectedClusterIds, `impactRows[${i}].affectedClusterIds must be an array`);
  assertArray(raw.evidenceRefs, `impactRows[${i}].evidenceRefs must be an array`);
  return {
    rowId: raw.rowId as string,
    accountId: raw.accountId as string,
    accountName: raw.accountName as string,
    plan: raw.plan as string,
    affectedClusterIds: raw.affectedClusterIds as string[],
    ticketCount: raw.ticketCount,
    mrrAtRiskMicrodollars: raw.mrrAtRiskMicrodollars,
    severity: raw.severity as string,
    evidenceRefs: raw.evidenceRefs as string[],
  };
}

function parseEvidence(raw: unknown, i: number): EvidenceIn {
  assertObject(raw, `evidence[${i}] must be an object`);
  if (typeof raw.id !== "string" || raw.id.length === 0) {
    throw new CapabilityInputError(`evidence[${i}].id must be a non-empty string`);
  }
  if (typeof raw.title !== "string") {
    throw new CapabilityInputError(`evidence[${i}].title must be a string`);
  }
  if (typeof raw.excerpt !== "string") {
    throw new CapabilityInputError(`evidence[${i}].excerpt must be a string`);
  }
  const ev: EvidenceIn = {
    id: raw.id,
    title: raw.title,
    excerpt: raw.excerpt,
  };
  if (typeof raw.kind === "string") ev.kind = raw.kind;
  if (raw.sourceUrl === null || typeof raw.sourceUrl === "string") {
    ev.sourceUrl = raw.sourceUrl as string | null;
  }
  if (typeof raw.trust === "string") ev.trust = raw.trust;
  return ev;
}

function parseTimeline(raw: unknown, i: number): TimelineEvent {
  assertObject(raw, `timeline[${i}] must be an object`);
  if (typeof raw.ts !== "string") {
    throw new CapabilityInputError(`timeline[${i}].ts must be a string`);
  }
  if (typeof raw.event !== "string") {
    throw new CapabilityInputError(`timeline[${i}].event must be a string`);
  }
  return { ts: raw.ts, event: raw.event };
}

export function validateInput(input: unknown): ReportComposerInput {
  assertObject(input, "input must be an object");
  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    throw new CapabilityInputError("title must be a non-empty string");
  }
  assertArray(input.clusters, "clusters must be an array");
  assertArray(input.impactRows, "impactRows must be an array");
  assertArray(input.evidence, "evidence must be an array");
  assertArray(input.timeline, "timeline must be an array");

  let changeSummary: string | undefined;
  if (input.changeSummary !== undefined) {
    if (typeof input.changeSummary !== "string") {
      throw new CapabilityInputError("changeSummary must be a string");
    }
    changeSummary = input.changeSummary;
  }

  return {
    title: input.title,
    clusters: input.clusters.map(parseCluster),
    impactRows: input.impactRows.map(parseImpact),
    evidence: input.evidence.map(parseEvidence),
    timeline: input.timeline.map(parseTimeline),
    ...(changeSummary !== undefined ? { changeSummary } : {}),
  };
}
