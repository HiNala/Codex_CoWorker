import { describe, expect, it } from "vitest";
import { CapabilityInputError, createRestrictedContext } from "@forge/capability-sdk";
import capability from "../src/index";
import type { ReportComposerInput } from "../src/lib/types";

function sampleInput(overrides?: Partial<ReportComposerInput>): ReportComposerInput {
  return {
    title: "Webhook customer_ref regression",
    clusters: [
      {
        clusterId: "cl_aaa",
        label: "customer_ref missing",
        rootCauseHypothesis: "July release dropped customer_ref from metadata.",
        ticketIds: ["t1", "t2"],
        confidence: 0.85,
      },
    ],
    impactRows: [
      {
        rowId: "row_1",
        accountId: "acct-1",
        accountName: "Northwind <Corp>",
        plan: "enterprise",
        affectedClusterIds: ["cl_aaa"],
        ticketCount: 2,
        mrrAtRiskMicrodollars: 2_000_000_000,
        severity: "critical",
        evidenceRefs: ["t1", "t2"],
      },
    ],
    evidence: [
      {
        id: "t1",
        title: "Ticket t1",
        excerpt: "customer_ref is null in webhook payload",
      },
      {
        id: "t2",
        title: "Ticket t2",
        excerpt: "payment_intent.metadata missing field",
      },
    ],
    timeline: [
      { ts: "2026-07-01T10:00:00.000Z", event: "Release 2026-07-01 shipped" },
      { ts: "2026-07-01T14:00:00.000Z", event: "First ticket filed" },
    ],
    changeSummary: "Renamed customer_ref in payment_intent metadata",
    ...overrides,
  };
}

async function run(input: unknown) {
  return capability.execute(input as never, createRestrictedContext());
}

describe("incident-report-composer", () => {
  it("manifest version 2.0.0", () => {
    expect(capability.manifest.version).toBe("2.0.0");
    expect(capability.manifest.authoredBy).toBe("codex");
  });

  it("emits all seven sections", async () => {
    const out = await run(sampleInput());
    const headings = out.sections.map((s) => s.heading);
    expect(headings).toEqual([
      "Summary",
      "Impact",
      "Timeline",
      "Root cause",
      "Evidence",
      "Recommended actions",
      "Open questions",
    ]);
    expect(out.markdown).toContain("## Summary");
    expect(out.markdown).toContain("## Open questions");
  });

  it("citations map to real evidence ids", async () => {
    const out = await run(sampleInput());
    expect(out.citations.length).toBeGreaterThan(0);
    for (const c of out.citations) {
      expect(["t1", "t2"]).toContain(c.evidenceId);
      expect(out.markdown).toContain(`[^${c.anchorId}]`);
    }
  });

  it("never fabricates citations; unsupported claims warn", async () => {
    const out = await run(
      sampleInput({
        evidence: [],
        clusters: [
          {
            clusterId: "cl_x",
            label: "mystery",
            rootCauseHypothesis: "unknown",
            ticketIds: ["tx"],
            confidence: 0.1,
          },
        ],
      }),
    );
    expect(out.citations).toEqual([]);
    expect(out.warnings.length).toBeGreaterThan(0);
    expect(out.markdown).toContain("[unsupported]");
  });

  it("escapes HTML in user content", async () => {
    const out = await run(
      sampleInput({
        title: "Break <script>alert(1)</script>",
        impactRows: [
          {
            rowId: "r",
            accountId: "a",
            accountName: "Evil <img src=x>",
            plan: "pro",
            affectedClusterIds: ["cl_aaa"],
            ticketCount: 1,
            mrrAtRiskMicrodollars: 0,
            severity: "low",
            evidenceRefs: ["t1"],
          },
        ],
      }),
    );
    expect(out.markdown).not.toMatch(/<script/i);
    expect(out.markdown).not.toMatch(/<img/i);
    expect(out.markdown).toContain("&lt;");
  });

  it("is deterministic", async () => {
    const input = sampleInput();
    const a = await run(input);
    const b = await run(input);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("rejects empty title", async () => {
    await expect(run(sampleInput({ title: "  " }))).rejects.toBeInstanceOf(CapabilityInputError);
  });
});
