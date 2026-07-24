import { describe, expect, it } from "vitest";
import {
  CapabilityInputError,
  createRestrictedContext,
} from "@forge/capability-sdk";
import capability, {
  computeSeverity,
  HIGH_MRR_THRESHOLD_MICRODOLLARS,
} from "../src/index";
import type { ImpactMapperInput } from "../src/lib/types";

function baseInput(overrides?: Partial<ImpactMapperInput>): ImpactMapperInput {
  return {
    clusters: [
      { clusterId: "cl_a", ticketIds: ["t1", "t2", "t3"] },
      { clusterId: "cl_b", ticketIds: ["t4"] },
    ],
    accounts: [
      {
        id: "acct-ent",
        name: "Northwind Enterprise",
        plan: "enterprise",
        mrrMicrodollars: 5_000_000_000,
        contacts: [
          { id: "req-1", email: "a@northwind.test" },
          { id: "req-2", email: "b@northwind.test" },
        ],
      },
      {
        id: "acct-pro",
        name: "Pro Shop",
        plan: "pro",
        mrrMicrodollars: 500_000_000,
        contacts: [{ id: "req-3", email: "c@pro.test" }],
      },
      {
        id: "acct-zero",
        name: "Free Tier Co",
        plan: "free",
        mrrMicrodollars: 0,
        contacts: [{ id: "req-4", email: "d@free.test" }],
      },
    ],
    ticketRequesterIndex: {
      t1: "req-1",
      t2: "req-1",
      t3: "req-2",
      t4: "req-3",
    },
    ...overrides,
  };
}

async function run(input: unknown) {
  return capability.execute(input as never, createRestrictedContext());
}

describe("customer-impact-mapper", () => {
  it("manifest version 1.0.1", () => {
    expect(capability.manifest.version).toBe("1.0.1");
    expect(capability.manifest.authoredBy).toBe("human");
  });

  it("maps enterprise account with 3 tickets to critical", async () => {
    const out = await run(baseInput());
    const ent = out.rows.find((r) => r.accountId === "acct-ent");
    expect(ent).toBeDefined();
    expect(ent!.ticketCount).toBe(3);
    expect(ent!.severity).toBe("critical");
    expect(ent!.evidenceRefs).toEqual(["t1", "t2", "t3"]);
    expect(ent!.affectedClusterIds).toContain("cl_a");
    expect(ent!.evidenceRefs.length).toBeGreaterThan(0);
  });

  it("one account across several clusters", async () => {
    const input = baseInput({
      clusters: [
        { clusterId: "cl_x", ticketIds: ["t1"] },
        { clusterId: "cl_y", ticketIds: ["t2"] },
      ],
      ticketRequesterIndex: { t1: "req-1", t2: "req-1" },
    });
    const out = await run(input);
    const ent = out.rows.find((r) => r.accountId === "acct-ent");
    expect(ent!.affectedClusterIds).toEqual(["cl_x", "cl_y"]);
    expect(ent!.ticketCount).toBe(2);
    // enterprise but only 2 tickets → not critical; MRR ≥ $1k → high
    expect(ent!.severity).toBe("high");
  });

  it("unmatched requester does not throw", async () => {
    const input = baseInput({
      ticketRequesterIndex: {
        t1: "req-1",
        t2: "ghost-requester",
        t3: "req-1",
        t4: "req-3",
      },
    });
    const out = await run(input);
    expect(out.rows.length).toBeGreaterThan(0);
    // t2 skipped — enterprise has t1,t3 only
    const ent = out.rows.find((r) => r.accountId === "acct-ent");
    expect(ent!.evidenceRefs).toEqual(["t1", "t3"]);
  });

  it("severity boundary cases", () => {
    expect(computeSeverity("enterprise", 3, 0)).toBe("critical");
    expect(computeSeverity("Enterprise", 3, 0)).toBe("critical");
    // enterprise + 2 tickets, zero MRR → medium (not critical)
    expect(computeSeverity("enterprise", 2, 0)).toBe("medium");
    // enterprise + 2 tickets, high MRR → high (critical requires ≥3 tickets)
    expect(
      computeSeverity("enterprise", 2, HIGH_MRR_THRESHOLD_MICRODOLLARS),
    ).toBe("high");
    expect(computeSeverity("pro", 1, HIGH_MRR_THRESHOLD_MICRODOLLARS)).toBe(
      "high",
    );
    expect(computeSeverity("pro", 1, HIGH_MRR_THRESHOLD_MICRODOLLARS - 1)).toBe(
      "low",
    );
    expect(computeSeverity("pro", 2, 0)).toBe("medium");
    expect(computeSeverity("free", 1, 0)).toBe("low");
  });

  it("zero-MRR accounts still produce rows", async () => {
    const input = baseInput({
      clusters: [{ clusterId: "cl_z", ticketIds: ["tz"] }],
      ticketRequesterIndex: { tz: "req-4" },
    });
    const out = await run(input);
    const row = out.rows.find((r) => r.accountId === "acct-zero");
    expect(row).toBeDefined();
    expect(row!.mrrAtRiskMicrodollars).toBe(0);
    expect(row!.severity).toBe("low");
    expect(row!.evidenceRefs).toEqual(["tz"]);
  });

  it("every row has evidenceRefs", async () => {
    const out = await run(baseInput());
    for (const row of out.rows) {
      expect(row.evidenceRefs.length).toBeGreaterThan(0);
      expect(row.evidenceRefs).toEqual(
        [...row.evidenceRefs].sort((a, b) => a.localeCompare(b)),
      );
    }
  });

  it("is deterministic", async () => {
    const input = baseInput();
    const a = await run(input);
    const b = await run(input);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("empty clusters → empty rows", async () => {
    const out = await run(baseInput({ clusters: [] }));
    expect(out.rows).toEqual([]);
    expect(out.totals).toEqual({
      accounts: 0,
      tickets: 0,
      mrrAtRiskMicrodollars: 0,
    });
  });

  it("rejects malformed input", async () => {
    await expect(run({})).rejects.toBeInstanceOf(CapabilityInputError);
    await expect(
      run({ clusters: [], accounts: [], ticketRequesterIndex: null }),
    ).rejects.toBeInstanceOf(CapabilityInputError);
  });
});
