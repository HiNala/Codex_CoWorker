import { describe, expect, it } from "vitest";
import type { EvidenceRecord } from "@forge/contracts";
import {
  allSupported,
  normalizeMarkdownAnchor,
  resolveAllCitations,
  resolveCitation,
  resolveEvidence,
  resolveRowEvidence,
  unsupportedOnly,
} from "./resolve";
import {
  aggregateTrust,
  applyTrustTransition,
  clampTrust,
  isTrustUpgrade,
  trustRank,
  weakerTrust,
} from "./trust";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const SHA_C = "c".repeat(64);

const records: EvidenceRecord[] = [
  {
    id: "0198206f-5f53-7000-8000-000000000601",
    orgId: "0198206f-5f53-7000-8000-000000000001",
    kind: "web",
    sourceUrl: "https://docs.example.test/checkout/cadence",
    title: "Checkout cadence contract",
    excerpt: "The supported cadence key is annual.",
    contentSha256: SHA_A,
    retrievedAt: "2026-07-23T22:00:00.000Z",
    trust: "official",
    injectionSuspected: false,
  },
  {
    id: "0198206f-5f53-7000-8000-000000000602",
    orgId: "0198206f-5f53-7000-8000-000000000001",
    kind: "ticket",
    sourceUrl: null,
    title: "Ticket #4412 annual checkout fail",
    excerpt: "Customer cannot complete annual plan purchase.",
    contentSha256: SHA_B,
    retrievedAt: "2026-07-23T21:00:00.000Z",
    trust: "secondary",
    injectionSuspected: false,
  },
  {
    id: "0198206f-5f53-7000-8000-000000000603",
    orgId: "0198206f-5f53-7000-8000-000000000001",
    kind: "human",
    sourceUrl: null,
    title: "Operator note",
    excerpt: "Confirmed in staging.",
    contentSha256: SHA_C,
    retrievedAt: "2026-07-23T20:00:00.000Z",
    trust: "user_supplied",
    injectionSuspected: false,
  },
];

describe("resolveEvidence", () => {
  it("resolves known ids in order", () => {
    const resolved = resolveEvidence(records, [records[1]!.id, records[0]!.id]);
    expect(resolved).toHaveLength(2);
    expect(resolved[0]).toMatchObject({
      supported: true,
      evidenceId: records[1]!.id,
    });
    expect(resolved[1]).toMatchObject({
      supported: true,
      evidenceId: records[0]!.id,
    });
    if (resolved[0]?.supported) {
      expect(resolved[0].record.title).toBe("Ticket #4412 annual checkout fail");
    }
  });

  it("marks missing evidence as unsupported without fabricating", () => {
    const missing = "0198206f-5f53-7000-8000-000000000699";
    const resolved = resolveEvidence(records, [records[0]!.id, missing]);
    expect(resolved[0]?.supported).toBe(true);
    expect(resolved[1]).toEqual({
      supported: false,
      unsupported: true,
      evidenceId: missing,
      anchorId: undefined,
      claim: undefined,
      reason: "missing_evidence",
    });
  });

  it("marks empty refs as unsupported", () => {
    const resolved = resolveEvidence(records, [""]);
    expect(resolved[0]).toMatchObject({
      unsupported: true,
      reason: "empty_ref",
      evidenceId: null,
    });
  });
});

describe("resolveRowEvidence", () => {
  it("resolves row evidenceRefs the same way as resolveEvidence", () => {
    const rowRefs = [records[0]!.id, "0198206f-5f53-7000-8000-0000000006ff"];
    const resolved = resolveRowEvidence(rowRefs, records);
    expect(resolved[0]?.supported).toBe(true);
    expect(resolved[1]).toMatchObject({
      unsupported: true,
      reason: "missing_evidence",
    });
  });
});

describe("resolveCitation", () => {
  const citations = [
    { anchorId: "e1", evidenceId: records[0]!.id, claim: "annual is the cadence key" },
    { anchorId: "e2", evidenceId: "0198206f-5f53-7000-8000-0000000006aa" },
  ];

  it("normalizes markdown anchors", () => {
    expect(normalizeMarkdownAnchor("[^e1]")).toBe("e1");
    expect(normalizeMarkdownAnchor("[e1]")).toBe("e1");
    expect(normalizeMarkdownAnchor("^e1")).toBe("e1");
    expect(normalizeMarkdownAnchor("e1")).toBe("e1");
  });

  it("resolves a known citation to its record", () => {
    const result = resolveCitation("[^e1]", citations, records);
    expect(result).toMatchObject({
      supported: true,
      unsupported: false,
      anchorId: "e1",
      evidenceId: records[0]!.id,
      claim: "annual is the cadence key",
    });
  });

  it("returns bare unsupported when anchor has no citation entry", () => {
    const result = resolveCitation("[^missing]", citations, records);
    expect(result).toEqual({ unsupported: true });
  });

  it("returns unsupported marker when citation points at missing evidence", () => {
    const result = resolveCitation("[^e2]", citations, records);
    expect(result).toMatchObject({
      supported: false,
      unsupported: true,
      anchorId: "e2",
      reason: "missing_evidence",
    });
  });

  it("never fabricates a record for an unknown id", () => {
    const result = resolveCitation("e2", citations, records);
    expect("record" in result && result.record).toBeFalsy();
  });
});

describe("resolveAllCitations / helpers", () => {
  it("flags partial citation maps", () => {
    const resolutions = resolveAllCitations(
      [
        { anchorId: "e1", evidenceId: records[0]!.id },
        { anchorId: "e9", evidenceId: "0198206f-5f53-7000-8000-0000000006ff" },
      ],
      records,
    );
    expect(allSupported(resolutions)).toBe(false);
    expect(unsupportedOnly(resolutions)).toHaveLength(1);
  });
});

describe("trust ranking", () => {
  it("ranks official above secondary above user_supplied above untrusted", () => {
    expect(trustRank("official")).toBeGreaterThan(trustRank("secondary"));
    expect(trustRank("secondary")).toBeGreaterThan(trustRank("user_supplied"));
    expect(trustRank("user_supplied")).toBeGreaterThan(trustRank("untrusted"));
  });

  it("never upgrades trust via weakerTrust / clamp / apply", () => {
    expect(weakerTrust("official", "untrusted")).toBe("untrusted");
    expect(weakerTrust("user_supplied", "secondary")).toBe("user_supplied");
    expect(clampTrust("official", "secondary")).toBe("secondary");
    expect(clampTrust("untrusted", "official")).toBe("untrusted");
    expect(isTrustUpgrade("secondary", "official")).toBe(true);
    expect(isTrustUpgrade("official", "secondary")).toBe(false);
    expect(applyTrustTransition("secondary", "official")).toBe("secondary");
    expect(applyTrustTransition("official", "user_supplied")).toBe("user_supplied");
  });

  it("aggregates to the weakest trust in the set", () => {
    expect(aggregateTrust(["official", "secondary", "user_supplied"])).toBe("user_supplied");
    expect(aggregateTrust([])).toBe("untrusted");
  });
});
