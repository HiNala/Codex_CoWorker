import { describe, expect, it } from "vitest";
import {
  defaultTranscriptPath,
  loadGoldenPathTranscript,
  parseTranscriptJsonl,
  startReplayFromTranscript,
} from "./replay-server";
import { GOLDEN_PATH_TRANSCRIPT_ID, parseTranscriptLine } from "./replay-types";

describe("golden-path transcript", () => {
  it("parses golden-path.jsonl fixture", () => {
    const loaded = loadGoldenPathTranscript(defaultTranscriptPath());
    expect(loaded.id).toBe(GOLDEN_PATH_TRANSCRIPT_ID);
    expect(loaded.eventCount).toBeGreaterThan(0);
    expect(loaded.events[0]?.seq).toBe(1);
  });

  it("rejects non-increasing seq", () => {
    expect(() =>
      parseTranscriptJsonl(
        [
          JSON.stringify({
            seq: 1,
            type: "a",
            channel: "system",
            summary: "one",
            ts: "2026-01-01T00:00:00.000Z",
          }),
          JSON.stringify({
            seq: 1,
            type: "b",
            channel: "system",
            summary: "two",
            ts: "2026-01-01T00:00:01.000Z",
          }),
        ].join("\n"),
      ),
    ).toThrow(/strictly increasing/);
  });

  it("parses a single valid line", () => {
    const event = parseTranscriptLine(
      JSON.stringify({
        seq: 3,
        type: "plan.drafted",
        channel: "plan",
        summary: "plan",
        ts: "2026-01-01T00:00:00.000Z",
        level: "info",
      }),
      1,
    );
    expect(event.seq).toBe(3);
    expect(event.level).toBe("info");
  });

  it("startReplayFromTranscript returns event list", () => {
    const result = startReplayFromTranscript();
    expect(result.ok).toBe(true);
    expect(result.transcriptId).toBe(GOLDEN_PATH_TRANSCRIPT_ID);
    expect(result.eventCount).toBe(result.events.length);
  });
});
