import { describe, expect, it } from "vitest";
import type { RunEvent } from "@forge/contracts";
import { runReducer } from "./run-reducer";
import { initialRunState } from "./run-state";
import { buildDemoEvents, buildDemoRunState } from "./demo-run-fixture";

function baseEvent(overrides: Partial<RunEvent> & Pick<RunEvent, "seq" | "type">): RunEvent {
  return {
    id: `01900000-0000-7000-8000-${String(overrides.seq).padStart(12, "0")}`,
    runId: "01900000-0000-7000-8000-000000000010",
    assignmentId: "01900000-0000-7000-8000-000000000020",
    orgId: "01900000-0000-7000-8000-000000000001",
    ts: new Date().toISOString(),
    channel: "system",
    level: "info",
    visibility: "user",
    summary: "test",
    detail: {},
    refs: {},
    ...overrides,
  };
}

describe("runReducer", () => {
  it("drops duplicate seq", () => {
    const e = baseEvent({ seq: 1, type: "run.started", summary: "start" });
    const s1 = runReducer(initialRunState, { type: "event", event: e });
    const s2 = runReducer(s1, { type: "event", event: e });
    expect(s2.lastSeq).toBe(1);
    expect(s2.status).toBe("running");
  });

  it("ignores out-of-order older seq", () => {
    let s = runReducer(initialRunState, {
      type: "event",
      event: baseEvent({ seq: 5, type: "run.started" }),
    });
    s = runReducer(s, {
      type: "event",
      event: baseEvent({ seq: 3, type: "user.message", channel: "narrative", summary: "old" }),
    });
    expect(s.lastSeq).toBe(5);
    expect(s.timeline).toHaveLength(0);
  });

  it("projects demo fixture into coherent state", () => {
    const state = buildDemoRunState();
    expect(state.lastSeq).toBeGreaterThan(20);
    expect(state.timeline.some((t) => t.kind === "gap_marker")).toBe(true);
    expect(state.timeline.some((t) => t.kind === "trace_group")).toBe(true);
    expect(state.build?.gates.some((g) => g.status === "failed" || g.status === "passed")).toBe(
      true,
    );
    expect(Object.keys(state.artifacts).length).toBeGreaterThanOrEqual(3);
    expect(state.approvals.some((a) => a.status === "pending")).toBe(true);
  });

  it("applies all demo events idempotently twice", () => {
    let s = buildDemoRunState();
    const seq = s.lastSeq;
    for (const event of buildDemoEvents()) {
      s = runReducer(s, { type: "event", event });
    }
    expect(s.lastSeq).toBe(seq);
  });
});
