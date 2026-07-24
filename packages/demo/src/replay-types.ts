/**
 * Client-safe transcript types and pure JSONL parsers.
 * ZERO Node built-ins — safe for browser bundles.
 */

export type TranscriptEvent = {
  seq: number;
  type: string;
  channel: string;
  summary: string;
  ts: string;
  level?: "info" | "warn" | "error";
  detail?: unknown;
};

export type LoadedTranscript = {
  id: string;
  path: string;
  events: TranscriptEvent[];
  eventCount: number;
};

export const GOLDEN_PATH_TRANSCRIPT_ID = "golden-path";

export function parseTranscriptLine(line: string, lineNumber: number): TranscriptEvent {
  const trimmed = line.trim();
  if (!trimmed) {
    throw new Error(`Empty transcript line at ${lineNumber}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(`Invalid JSON on transcript line ${lineNumber}`);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Transcript line ${lineNumber} must be an object`);
  }
  const record = parsed as Record<string, unknown>;
  if (typeof record["seq"] !== "number" || !Number.isInteger(record["seq"])) {
    throw new Error(`Transcript line ${lineNumber} missing integer seq`);
  }
  if (typeof record["type"] !== "string" || record["type"].length === 0) {
    throw new Error(`Transcript line ${lineNumber} missing type`);
  }
  if (typeof record["channel"] !== "string" || record["channel"].length === 0) {
    throw new Error(`Transcript line ${lineNumber} missing channel`);
  }
  if (typeof record["summary"] !== "string" || record["summary"].length === 0) {
    throw new Error(`Transcript line ${lineNumber} missing summary`);
  }
  if (typeof record["ts"] !== "string" || record["ts"].length === 0) {
    throw new Error(`Transcript line ${lineNumber} missing ts`);
  }

  const event: TranscriptEvent = {
    seq: record["seq"],
    type: record["type"],
    channel: record["channel"],
    summary: record["summary"],
    ts: record["ts"],
  };
  if (record["level"] === "info" || record["level"] === "warn" || record["level"] === "error") {
    event.level = record["level"];
  }
  if ("detail" in record) {
    event.detail = record["detail"];
  }
  return event;
}

export function parseTranscriptJsonl(content: string): TranscriptEvent[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const events = lines.map((line, index) => parseTranscriptLine(line, index + 1));
  for (let i = 1; i < events.length; i += 1) {
    const prev = events[i - 1];
    const curr = events[i];
    if (!prev || !curr) continue;
    if (curr.seq <= prev.seq) {
      throw new Error(
        `Transcript seq must be strictly increasing (line ${i + 1}: ${curr.seq} after ${prev.seq})`,
      );
    }
  }
  return events;
}

export type ReplayStartResult = {
  ok: true;
  transcriptId: string;
  eventCount: number;
  startedAt: string;
  events: TranscriptEvent[];
};
