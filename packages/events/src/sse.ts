import { RunEvent, type RunEvent as RunEventValue } from "@forge/contracts";

const encoder = new TextEncoder();

export function serializeRunEvent(event: RunEventValue): Uint8Array {
  const parsed = RunEvent.parse(event);
  return encoder.encode(`id: ${parsed.seq}\nevent: run.event\ndata: ${JSON.stringify(parsed)}\n\n`);
}

export function serializeHeartbeat(sequence: number, now = new Date()): Uint8Array {
  return encoder.encode(
    `event: heartbeat\ndata: ${JSON.stringify({ ts: now.toISOString(), seq: sequence })}\n\n`,
  );
}

export function resumeAfter(request: Request): number {
  const url = new URL(request.url);
  const candidate = request.headers.get("last-event-id") ?? url.searchParams.get("after") ?? "0";
  const value = Number(candidate);
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}
