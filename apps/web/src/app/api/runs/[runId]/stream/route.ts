import postgres from "postgres";
import {
  createRunEventStream,
  listRunEventsAfter,
  resumeAfter,
  RunEventBus,
} from "@forge/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/runs/:runId/stream?after=
 * Track A stream surface for cockpit useRunStream({ useDemoFixture: false }).
 * Backfills from Postgres run_events then stays open with heartbeats.
 *
 * REQUEST (Node): Cael wrote this under mission-pack Track A ownership
 * (apps/web/src/app/api/runs/**). If commit mutex Paths omit apps/web, Aria
 * may land this file or proxy to worker GET /runs/:id/stream.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return new Response(JSON.stringify({ error: "DATABASE_URL unset" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }

  const after = resumeAfter(request);
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  const bus = new RunEventBus();
  const source = {
    listAfter: (id: string, afterSeq: number) => listRunEventsAfter(sql, id, afterSeq),
  };

  const stream = createRunEventStream({
    runId,
    afterSeq: after,
    source,
    bus,
    signal: request.signal,
    heartbeatMs: 15_000,
  });

  // Close sql when client aborts
  request.signal.addEventListener("abort", () => {
    void sql.end({ timeout: 1 });
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
