import postgres from "postgres";
import {
  createRunEventStream,
  listRunEventsAfter,
  resumeAfter,
  RunEventBus,
  type EventSource,
} from "@forge/events";

const buses = new Map<string, RunEventBus>();

export function busForRun(runId: string): RunEventBus {
  let bus = buses.get(runId);
  if (!bus) {
    bus = new RunEventBus();
    buses.set(runId, bus);
  }
  return bus;
}

export function createPgEventSource(databaseUrl: string): EventSource {
  const sql = postgres(databaseUrl, { max: 2, prepare: false });
  return {
    async listAfter(runId, afterSeq) {
      try {
        return await listRunEventsAfter(sql, runId, afterSeq);
      } finally {
        // keep pool open for worker lifetime — do not end()
      }
    },
  };
}

/** Parse /runs/:runId/stream?... */
export function matchRunStream(url: string | undefined): { runId: string; after: number } | null {
  if (!url) return null;
  const parsed = new URL(url, "http://worker.local");
  const match = /^\/runs\/([0-9a-f-]{36})\/stream$/i.exec(parsed.pathname);
  if (!match) return null;
  const after = Number(parsed.searchParams.get("after") ?? "0");
  return {
    runId: match[1]!,
    after: Number.isFinite(after) && after >= 0 ? after : 0,
  };
}

export function isRunStreamPath(url: string | undefined): ReturnType<typeof matchRunStream> {
  if (!url) return null;
  return matchRunStream(url);
}

export function openSse(
  request: import("node:http").IncomingMessage,
  response: import("node:http").ServerResponse,
  databaseUrl: string,
  runId: string,
  afterSeq: number,
): void {
  const source = createPgEventSource(databaseUrl);
  const bus = busForRun(runId);
  const controller = new AbortController();

  // Resume from Last-Event-ID when present.
  const fakeReq = new Request(`http://worker.local/runs/${runId}/stream?after=${afterSeq}`, {
    headers: request.headers["last-event-id"]
      ? { "Last-Event-ID": String(request.headers["last-event-id"]) }
      : {},
  });
  const after = resumeAfter(fakeReq);

  const stream = createRunEventStream({
    runId,
    afterSeq: after,
    source,
    bus,
    signal: controller.signal,
    heartbeatMs: 15_000,
  });

  response.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });

  const reader = stream.getReader();
  const pump = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) response.write(Buffer.from(value));
      }
    } catch {
      // client gone
    } finally {
      try {
        response.end();
      } catch {
        // ignore
      }
    }
  };

  request.on("close", () => controller.abort());
  void pump();
}
