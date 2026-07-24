import { describe, expect, it } from "vitest";
import { serializeRunEvent } from "@forge/events";
import { buildDemoEvents } from "./demo-run-fixture";
import { extractSseDataPayload, parseSseRunEventData } from "./parse-sse-run-event";
import { runReducer } from "./run-reducer";
import { initialRunState } from "./run-state";

describe("fake SSE → reducer (Cael wire format)", () => {
  it("parses serializeRunEvent frames from @forge/events", () => {
    const events = buildDemoEvents();
    const first = events[0]!;
    const frame = new TextDecoder().decode(serializeRunEvent(first));
    expect(frame).toContain("event: run.event");
    const data = extractSseDataPayload(frame);
    expect(data).toBeTruthy();
    const parsed = parseSseRunEventData(data!);
    expect(parsed?.seq).toBe(first.seq);
    expect(parsed?.type).toBe(first.type);
  });

  it("projects full demo stream through SSE parse path into cockpit VMs", () => {
    let state = initialRunState;
    const decoder = new TextDecoder();
    for (const event of buildDemoEvents()) {
      const frame = decoder.decode(serializeRunEvent(event));
      const data = extractSseDataPayload(frame);
      const parsed = parseSseRunEventData(data!);
      expect(parsed).not.toBeNull();
      state = runReducer(state, { type: "event", event: parsed! });
    }
    expect(state.lastSeq).toBeGreaterThan(20);
    expect(state.timeline.some((t) => t.kind === "gap_marker")).toBe(true);
    expect(Object.keys(state.artifacts).length).toBeGreaterThanOrEqual(3);
    expect(state.approvals.some((a) => a.status === "pending")).toBe(true);
    expect(state.build?.gates.length).toBeGreaterThan(0);
  });
});
