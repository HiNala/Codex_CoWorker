/**
 * Rehearsal audit: four prebuilt modules + live-build fixture.
 * Fails the build if any module throws, is non-deterministic, or the live
 * fixture drifts from 4→9.
 */
import { describe, expect, it } from "vitest";
import {
  ATTEMPT_1_FAILURE_MESSAGE,
  DEMO_SEED_EXPECTED,
  DEMO_WINDOW,
  loadCheckoutErrorNdjsonLines,
  naiveAnalyzeCheckoutErrors,
  referenceAnalyzeCheckoutErrors,
} from "./src/index";

// Prebuilt capabilities — import execute paths
import ticketCluster from "../../capabilities/ticket-cluster-analyzer/src/index";
import customerImpact from "../../capabilities/customer-impact-mapper/src/index";
import incidentReport from "../../capabilities/incident-report-composer/src/index";
import releaseNotes from "../../capabilities/release-note-drafter/src/index";
import {
  createRestrictedContext,
  stableStringify,
} from "@forge/capability-sdk";

describe("rehearsal audit — four prebuilt modules", () => {
  const ctx = createRestrictedContext({
    now: () => Date.parse("2026-07-23T12:00:00Z"),
  });

  it("ticket-cluster-analyzer: deterministic on small ticket set", async () => {
    const input = {
      tickets: [
        {
          id: "t1",
          subject: "annual checkout fails yearly billing",
          body: "toggle to annual and stripe errors",
          createdAt: "2026-07-20T10:00:00Z",
          requesterId: "r1",
          tags: ["billing"],
        },
        {
          id: "t2",
          subject: "annual checkout fails yearly plan",
          body: "cannot upgrade to annual team plan",
          createdAt: "2026-07-20T11:00:00Z",
          requesterId: "r2",
          tags: ["billing"],
        },
        {
          id: "t3",
          subject: "unrelated password reset",
          body: "forgot password link broken",
          createdAt: "2026-07-21T09:00:00Z",
          requesterId: "r3",
          tags: ["auth"],
        },
      ],
      minClusterSize: 2,
    };
    const a = await ticketCluster.execute(input, ctx);
    const b = await ticketCluster.execute(input, ctx);
    expect(stableStringify(a)).toBe(stableStringify(b));
    expect(a.summary.totalTickets).toBe(3);
    expect(ticketCluster.manifest.dependencies).toEqual([]);
  });

  it("customer-impact-mapper: severity rules + evidenceRefs", async () => {
    const input = {
      clusters: [
        {
          clusterId: "c1",
          label: "annual checkout",
          rootCauseHypothesis: "interval mismatch",
          ticketIds: ["t1", "t2", "t3"],
          confidence: 0.9,
          representativeQuotes: [],
        },
      ],
      accounts: [
        {
          id: "acc1",
          name: "Northwind",
          plan: "enterprise",
          mrrMicrodollars: 5_000_000_000,
          contacts: [{ id: "r1", email: "priya@northwind.test" }],
        },
      ],
      ticketRequesterIndex: { t1: "r1", t2: "r1", t3: "r1" },
    };
    const out = await customerImpact.execute(input, ctx);
    expect(out.rows.length).toBeGreaterThanOrEqual(1);
    for (const row of out.rows) {
      expect(row.evidenceRefs.length).toBeGreaterThan(0);
    }
    expect(stableStringify(out)).toBe(
      stableStringify(await customerImpact.execute(input, ctx)),
    );
  });

  it("incident-report-composer: no fabricated citations", async () => {
    const input = {
      title: "Annual checkout incident",
      clusters: [
        {
          clusterId: "c1",
          label: "annual checkout",
          rootCauseHypothesis: "yearly vs annual",
          ticketIds: ["t1"],
          confidence: 0.8,
          representativeQuotes: [{ ticketId: "t1", quote: "errors out" }],
        },
      ],
      impactRows: [
        {
          rowId: "r1",
          accountId: "acc1",
          accountName: "Northwind",
          plan: "enterprise",
          affectedClusterIds: ["c1"],
          ticketCount: 1,
          mrrAtRiskMicrodollars: 1_000_000,
          severity: "high" as const,
          evidenceRefs: ["t1"],
        },
      ],
      evidence: [
        {
          id: "ev1",
          kind: "ticket",
          title: "ZD-4471",
          excerpt: "annual fails",
          trust: "user_supplied",
        },
      ],
      timeline: [{ ts: "2026-07-16T09:14:02Z", event: "first failure" }],
    };
    const out = await incidentReport.execute(input as never, ctx);
    expect(out.markdown.length).toBeGreaterThan(0);
    expect(out.sections.length).toBeGreaterThanOrEqual(5);
    // citations must map to provided evidence ids only
    for (const c of out.citations) {
      expect(["ev1", "t1"]).toContain(c.evidenceId);
    }
    expect(stableStringify(out)).toBe(
      stableStringify(await incidentReport.execute(input as never, ctx)),
    );
  });

  it("release-note-drafter: customer audience strips internal", async () => {
    const input = {
      commits: [
        {
          sha: "abc1234",
          message: "feat: fix annual checkout interval",
          author: "nala",
          files: ["src/checkout/prices.ts"],
        },
        {
          sha: "def5678",
          message: "chore: refactor logger internals",
          author: "dev",
          files: ["src/lib/logger.ts"],
        },
      ],
      previousTag: "v1.0.0",
      newTag: "v1.1.0",
      audience: "customer" as const,
    };
    const out = await releaseNotes.execute(input, ctx);
    expect(out.markdown.length).toBeGreaterThan(0);
    expect(stableStringify(out)).toBe(
      stableStringify(await releaseNotes.execute(input, ctx)),
    );
  });
});

describe("rehearsal audit — live-build fixture", () => {
  it("naive 4 / reference 9 / exact failure message", () => {
    const input = {
      lines: loadCheckoutErrorNdjsonLines(),
      window: { ...DEMO_WINDOW },
    };
    const naive = naiveAnalyzeCheckoutErrors(input);
    const repaired = referenceAnalyzeCheckoutErrors(input);
    expect(naive.distinctCount).toBe(4);
    expect(repaired.distinctCount).toBe(9);
    expect(repaired).toEqual(DEMO_SEED_EXPECTED);
    expect(`expected ${repaired.distinctCount}, received ${naive.distinctCount}`).toBe(
      ATTEMPT_1_FAILURE_MESSAGE,
    );
  });
});
