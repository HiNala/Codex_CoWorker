import { describe, expect, it } from "vitest";
import { foldEvents } from "@forge/events";
import { ATTEMPT_1_FAILURE_MESSAGE, REPAIRED_DISTINCT } from "./ids";
import { attempt1FailureMessage, naiveAnalyzeSeed, repairedAnalyzeSeed } from "./checkout-analyzer-fake";
import { runSeededGoldenPath } from "./run-seeded";

describe("checkout-error-log-analyzer 4-vs-9 fixture contract", () => {
  it("pins attempt-1 failure message and distinct counts", () => {
    expect(naiveAnalyzeSeed().distinctCount).toBe(4);
    expect(repairedAnalyzeSeed().distinctCount).toBe(9);
    expect(attempt1FailureMessage(4, 9)).toBe("expected 9, received 4");
    expect(ATTEMPT_1_FAILURE_MESSAGE).toBe("expected 9, received 4");
  });
});

describe("seeded fake golden path", () => {
  it("dispatch → run-loop → same-tx events → repair 4→9 → artifact", async () => {
    const result = await runSeededGoldenPath();

    expect(result.runFinished).toBe("completed");
    expect(result.stepStatus).toBe("completed");
    expect(result.distinctCount).toBe(REPAIRED_DISTINCT);
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0]?.type).toBe("table.typed");
    expect(result.artifacts[0]?.title).toBe("Affected customers — annual checkout");
    const body = result.artifacts[0]?.versions[0]?.body ?? "";
    const table = JSON.parse(body) as { rows: Array<{ rowId: string }> };
    expect(table.rows).toHaveLength(9);
    expect(table.rows.map((r) => r.rowId)).toContain("cus_UV9");
    expect(table.rows.map((r) => r.rowId)).not.toContain("cus_ZZ9");

    const types = result.eventTypes;
    // Required seam sequence (subset, order-preserving)
    const required = [
      "plan.drafted",
      "plan.approved",
      "run.started",
      "step.started",
      "capability.gap_detected",
      "capability.build_started",
      "capability.gate_failed",
      "capability.repair_started",
      "capability.gate_passed",
      "capability.repair_succeeded",
      "capability.installed",
      "step.started", // reclaimed after install
      "artifact.ready", // writeArtifacts emits before step.completed
      "step.completed",
      "run.completed",
    ];

    let cursor = 0;
    for (const needed of required) {
      const idx = types.indexOf(needed, cursor);
      expect(
        idx,
        `missing ordered event ${needed} after index ${cursor}; types=${types.join(",")}`,
      ).toBeGreaterThanOrEqual(0);
      cursor = idx + 1;
    }

    const failEvent = result.events.find((e) => e.type === "capability.gate_failed");
    expect(failEvent?.summary).toContain(ATTEMPT_1_FAILURE_MESSAGE);
    expect(failEvent?.detail).toMatchObject({
      message: "expected 9, received 4",
      received: 4,
      expected: 9,
    });

    // Streamable: gapless seq, resume-from mid-run matches continuous fold
    expect(result.events.map((e) => e.seq)).toEqual(
      result.events.map((_, i) => i + 1),
    );
    const mid = Math.floor(result.lastSeq / 2);
    const continuous = foldEvents(result.events, 0);
    const resumed = foldEvents(result.events, mid);
    expect(resumed.lastSeq).toBe(continuous.lastSeq);
    expect([...types.slice(0, mid), ...resumed.types]).toEqual(continuous.types);
  });
});
