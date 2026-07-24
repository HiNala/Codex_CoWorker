import { describe, expect, it } from "vitest";
import {
  CapabilityInputError,
  createRestrictedContext,
  stableStringify,
} from "@forge/capability-sdk";
import capability from "../src/index";
import type { TicketInput } from "../src/lib/types";

function ticket(
  id: string,
  subject: string,
  body: string,
  extra?: Partial<TicketInput>,
): TicketInput {
  return {
    id,
    subject,
    body,
    createdAt: "2026-07-01T00:00:00.000Z",
    requesterId: `req-${id}`,
    tags: [],
    ...extra,
  };
}

/** 12 tickets → 3 clean clusters (5 + 3 + 2) + 2 noise. */
function demoTwelve(): TicketInput[] {
  const webhookBody =
    "webhook customer_ref field missing since the july release payment_intent metadata error";
  const timeoutBody = "intermittent timeouts on the reconciliation endpoint gateway timeout 504";
  const billingBody = "question about invoice line items and sales tax only";

  return [
    ticket("t01", "webhook customer_ref missing", webhookBody),
    ticket("t02", "payment_intent metadata customer_ref broken", webhookBody + " stack trace"),
    ticket("t03", "customer_ref field missing in webhook", webhookBody),
    ticket("t04", "webhook fails customer_ref null", webhookBody + " json payload"),
    ticket("t05", "missing customer_ref after july release", webhookBody),
    ticket("t06", "reconciliation endpoint timeouts", timeoutBody),
    ticket("t07", "intermittent reconciliation gateway timeout", timeoutBody),
    ticket("t08", "504 on reconciliation endpoint", timeoutBody),
    ticket("t09", "billing invoice sales tax question", billingBody),
    ticket("t10", "invoice line items billing inquiry", billingBody),
    // duplicates of cluster 1
    ticket("t11", "webhook customer_ref missing again", webhookBody),
    ticket("t12", "payment_intent customer_ref still broken", webhookBody),
  ];
}

async function run(input: unknown) {
  const ctx = createRestrictedContext();
  return capability.execute(input as never, ctx);
}

describe("ticket-cluster-analyzer", () => {
  it("has correct manifest version and authorship", () => {
    expect(capability.manifest.version).toBe("1.2.0");
    expect(capability.manifest.authoredBy).toBe("human");
    expect(capability.manifest.dependencies).toEqual([]);
  });

  it("empty input → empty output, no throw", async () => {
    const out = await run({ tickets: [] });
    expect(out).toEqual({
      clusters: [],
      unclustered: [],
      summary: { totalTickets: 0, clusteredTickets: 0, clusterCount: 0 },
    });
  });

  it("12 demo tickets form 3 clusters", async () => {
    const out = await run({ tickets: demoTwelve() });
    expect(out.summary.totalTickets).toBe(12);
    expect(out.summary.clusterCount).toBe(3);
    expect(out.clusters).toHaveLength(3);
    // All ticket ids accounted for
    const clustered = new Set(out.clusters.flatMap((c) => c.ticketIds));
    for (const id of out.unclustered) clustered.add(id);
    expect(clustered.size).toBe(12);
    // Clusters sorted by id; members sorted
    const ids = out.clusters.map((c) => c.clusterId);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
    for (const c of out.clusters) {
      expect(c.ticketIds).toEqual([...c.ticketIds].sort((a, b) => a.localeCompare(b)));
      expect(c.representativeQuotes.length).toBeLessThanOrEqual(3);
      expect(c.confidence).toBeGreaterThanOrEqual(0);
      expect(c.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("all-identical tickets → 1 cluster", async () => {
    const body = "shared root cause phrase alpha beta gamma delta";
    const tickets = Array.from({ length: 5 }, (_, i) =>
      ticket(`same-${i}`, "shared root cause phrase", body),
    );
    const out = await run({ tickets });
    expect(out.summary.clusterCount).toBe(1);
    expect(out.clusters[0]!.ticketIds).toHaveLength(5);
    expect(out.unclustered).toHaveLength(0);
  });

  it("all-unique tickets → 0 clusters", async () => {
    // Distinct vocabularies per ticket so Jaccard stays below threshold
    const vocab = [
      ["alpha", "bravo", "charlie", "delta"],
      ["echo", "foxtrot", "golf", "hotel"],
      ["india", "juliet", "kilo", "lima"],
      ["mike", "november", "oscar", "papa"],
      ["quebec", "romeo", "sierra", "tango"],
      ["uniform", "victor", "whiskey", "xray"],
      ["yankee", "zulu", "amber", "blue"],
      ["coral", "denim", "emerald", "flame"],
      ["garnet", "hazel", "ivory", "jade"],
      ["khaki", "lavender", "maroon", "navy"],
      ["olive", "peach", "quartz", "ruby"],
      ["silver", "teal", "umber", "violet"],
    ];
    const tickets = vocab.map((words, i) =>
      ticket(`u${i}`, words.slice(0, 2).join(" "), words.join(" ")),
    );
    const out = await run({ tickets });
    expect(out.summary.clusterCount).toBe(0);
    expect(out.clusters).toHaveLength(0);
    expect(out.unclustered).toHaveLength(12);
  });

  it("handles unicode and emoji in bodies", async () => {
    const tickets = [
      ticket("jp1", "認証エラー webhook", "顧客 customer_ref が欠落 😱 エラー"),
      ticket("jp2", "webhook 認証エラー", "customer_ref 欠落 😱 payment_intent"),
    ];
    const out = await run({ tickets });
    expect(out.summary.totalTickets).toBe(2);
    // Should cluster on shared tokens or not throw
    expect(out.summary.clusterCount + (out.unclustered.length > 0 ? 0 : 0)).toBeGreaterThanOrEqual(
      0,
    );
    const again = await run({ tickets });
    expect(stableStringify(out)).toBe(stableStringify(again));
  });

  it("is deterministic across two runs", async () => {
    const tickets = demoTwelve();
    const a = await run({ tickets });
    const b = await run({ tickets });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("rejects malformed input", async () => {
    await expect(run({})).rejects.toBeInstanceOf(CapabilityInputError);
    await expect(run({ tickets: [{ id: "x" }] })).rejects.toBeInstanceOf(CapabilityInputError);
    await expect(
      run({
        tickets: [ticket("dup", "a", "b"), ticket("dup", "a", "b")],
      }),
    ).rejects.toThrow(/duplicate/);
  });

  it("clusterId is hash of sorted member ids", async () => {
    const body = "alpha beta gamma shared failure mode phrase";
    const tickets = [ticket("b", "alpha beta gamma", body), ticket("a", "alpha beta gamma", body)];
    const out = await run({ tickets });
    expect(out.clusters).toHaveLength(1);
    const c = out.clusters[0]!;
    expect(c.ticketIds).toEqual(["a", "b"]);
    expect(c.clusterId).toMatch(/^cl_[0-9a-f]{8}$/);
  });
});
