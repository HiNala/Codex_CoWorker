import { describe, expect, it } from "vitest";
import { emit } from "./emit";
import { MemoryEventStore } from "./memory-store";
import { foldEvents } from "./stream";
import { channelFor } from "./channel";

const ORG = "01900000-0000-7000-8000-000000000001";
const ASSIGNMENT = "01900000-0000-7000-8000-000000000002";
const RUN = "01900000-0000-7000-8000-000000000003";
const STEP = "01900000-0000-7000-8000-000000000004";

describe("transactional emit", () => {
  it("assigns gapless per-run sequences and routes channels", async () => {
    const store = new MemoryEventStore();
    await store.withTx(async (tx) => {
      await emit(tx, {
        runId: RUN,
        assignmentId: ASSIGNMENT,
        orgId: ORG,
        type: "step.started",
        summary: "Started clustering 47 checkout tickets by root cause.",
        refs: { stepId: STEP },
      });
      await emit(tx, {
        runId: RUN,
        assignmentId: ASSIGNMENT,
        orgId: ORG,
        type: "step.completed",
        summary: "Clustered 47 tickets into 4 root causes.",
        refs: { stepId: STEP },
      });
    });

    const events = store.list(RUN);
    expect(events.map((e) => e.seq)).toEqual([1, 2]);
    expect(events[0]?.channel).toBe("plan");
    expect(events[1]?.summary).toMatch(/Clustered 47 tickets/);
    expect(store.outbox()).toHaveLength(2);
  });

  it("keeps seq monotonic under concurrent emits on one run", async () => {
    const store = new MemoryEventStore();
    const tx = store.begin();
    await Promise.all(
      Array.from({ length: 50 }, (_, index) =>
        emit(tx, {
          runId: RUN,
          assignmentId: ASSIGNMENT,
          orgId: ORG,
          type: "trace.observed",
          summary: `Observation ${index + 1}: ticket field inspected.`,
        }),
      ),
    );
    const seqs = store.list(RUN).map((e) => e.seq).sort((a, b) => a - b);
    expect(seqs).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it("resume-after reproduces the same fold as a continuous consumer", async () => {
    const store = new MemoryEventStore();
    await store.withTx(async (tx) => {
      for (let i = 0; i < 10; i += 1) {
        await emit(tx, {
          runId: RUN,
          assignmentId: ASSIGNMENT,
          orgId: ORG,
          type: i % 2 === 0 ? "trace.observed" : "trace.decided",
          summary: `Beat ${i + 1}: recorded a decision point.`,
        });
      }
    });

    const all = store.list(RUN);
    const continuous = foldEvents(all, 0);
    const firstHalf = foldEvents(all, 0);
    // disconnect at seq 4, resume
    const resumed = foldEvents(all, 4);
    expect([...firstHalf.types.slice(0, 4), ...resumed.types]).toEqual(continuous.types);
    expect(resumed.lastSeq).toBe(continuous.lastSeq);
  });

  it("maps capability and cost event types to the right channels", () => {
    expect(channelFor("capability.gate_failed")).toBe("capability");
    expect(channelFor("cost.ceiling_stop")).toBe("cost");
    expect(channelFor("coworker.message")).toBe("narrative");
  });
});
