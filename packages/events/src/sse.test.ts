import { describe, expect, it } from "vitest";
import { resumeAfter, serializeHeartbeat } from "./sse";

describe("SSE primitives", () => {
  it("prefers Last-Event-ID for browser reconnects", () => {
    const request = new Request("http://forge.test/stream?after=7", {
      headers: { "Last-Event-ID": "12" },
    });
    expect(resumeAfter(request)).toBe(12);
  });

  it("serializes a heartbeat frame", () => {
    const text = new TextDecoder().decode(
      serializeHeartbeat(42, new Date("2026-07-23T22:00:00.000Z")),
    );
    expect(text).toContain("event: heartbeat");
    expect(text).toContain('"seq":42');
  });
});
