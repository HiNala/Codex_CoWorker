import { describe, expect, it } from "vitest";
import {
  defaultTranscriptPath,
  loadGoldenPathTranscript,
  parseTranscriptJsonl,
  startReplayFromTranscript,
} from "./replay";

describe("transcript reader", () => {
  it("parses golden-path.jsonl fixture", () => {
    const loaded = loadGoldenPathTranscript(defaultTranscriptPath());
    expect(loaded.id).toBe("golden-path");
    expect(loaded.eventCount).toBeGreaterThanOrEqual(10);
    expect(loaded.events[0]?.type).toBe("run.started");
    expect(loaded.events.some((e) => e.type === "capability.gap_detected")).toBe(
      true,
    );
    expect(loaded.events.some((e) => e.type === "capability.gate_failed")).toBe(true);
    expect(loaded.events.at(-1)?.type).toBe("run.completed");
  });

  it("rejects non-increasing seq", () => {
    const bad = [
      `{"seq":1,"type":"run.started","channel":"system","summary":"a","ts":"2026-07-23T00:00:00.000Z"}`,
      `{"seq":1,"type":"run.completed","channel":"system","summary":"b","ts":"2026-07-23T00:00:01.000Z"}`,
    ].join("\n");
    expect(() => parseTranscriptJsonl(bad)).toThrow(/strictly increasing/);
  });

  it("startReplayFromTranscript returns loaded events", () => {
    const result = startReplayFromTranscript(
      defaultTranscriptPath(),
      "2026-07-23T19:00:00.000Z",
    );
    expect(result.ok).toBe(true);
    expect(result.eventCount).toBe(result.events.length);
    expect(result.startedAt).toBe("2026-07-23T19:00:00.000Z");
  });
});
