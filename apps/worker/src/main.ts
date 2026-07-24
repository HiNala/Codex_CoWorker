import { createServer, type Server } from "node:http";
import { hostname } from "node:os";
import { getFlags, log, parseWorkerEnv } from "@forge/config";
import { PostgresJobQueue } from "@forge/jobs";
import { S3ObjectStore } from "@forge/object-store";
import { dispatchJob, runExecuteRun } from "./handlers";
import { matchRunStream, openSse } from "./stream";

// Config from process.env — root scripts inject via dotenv -e .env.local.
const environment = parseWorkerEnv();
const flags = getFlags();
const workerId = `${hostname()}-${process.pid}`;
const queue = new PostgresJobQueue(environment.DATABASE_URL);
const objectStore = new S3ObjectStore(environment);

let stopping = false;

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function json(
  response: import("node:http").ServerResponse,
  status: number,
  body: Record<string, unknown>,
): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readiness(): Promise<Record<string, unknown>> {
  const [depth, storageMarker] = await Promise.all([
    queue.depth(),
    objectStore.head("health/readiness-marker"),
  ]);
  return {
    status: "ready",
    workerId,
    queueDepth: depth,
    objectStore: storageMarker ? "marker_present" : "reachable",
    adapters: flags.adapters,
    openai: environment.OPENAI_API_KEY ? "configured" : "unset",
    database: environment.DATABASE_URL ? "configured" : "unset",
  };
}

function startHealthServer(): Server {
  const server = createServer((request, response) => {
    void (async () => {
      const url = request.url ?? "";

      if (request.method === "GET" && url.startsWith("/health/live")) {
        json(response, 200, { status: "live", workerId });
        return;
      }
      if (request.method === "GET" && url.startsWith("/health/ready")) {
        try {
          json(response, 200, await readiness());
        } catch (error) {
          json(response, 503, {
            status: "not_ready",
            reason: error instanceof Error ? error.message : "unknown dependency failure",
          });
        }
        return;
      }

      // Runtime SSE integration — GET /runs/:runId/stream?after=
      const streamMatch = matchRunStream(url);
      if (request.method === "GET" && streamMatch) {
        // Unambiguous for Aria: only fall back to demo fixture on this shape.
        if (!environment.DATABASE_URL) {
          json(response, 503, {
            status: "not_configured",
            reason: "DATABASE_URL unset — run event stream unavailable",
            stream: false,
          });
          return;
        }
        openSse(
          request,
          response,
          environment.DATABASE_URL,
          streamMatch.runId,
          streamMatch.after,
        );
        return;
      }

      // Seeded fake golden path — POST /v1/golden-path/run
      if (request.method === "POST" && url.startsWith("/v1/golden-path/run")) {
        try {
          const result = await runExecuteRun();
          json(response, 200, {
            ok: true,
            ...("mode" in result
              ? {
                  mode: result.mode,
                  runId: result.runId,
                  assignmentId: result.assignmentId,
                  eventCountInDb: result.eventCountInDb,
                  lastSeq: result.lastSeq,
                  eventTypes: result.eventTypes,
                  stepStatus: result.stepStatus,
                  artifactId: result.artifactId,
                  artifactTitle: result.artifactTitle,
                  distinctCount: result.distinctCount,
                  attempt1FailureMessage: result.attempt1FailureMessage,
                  runFinished: result.runFinished,
                  streamPath: `/runs/${result.runId}/stream?after=0`,
                }
              : {
                  mode: "memory",
                  runId: result.runId,
                  lastSeq: result.lastSeq,
                  eventTypes: result.eventTypes,
                  stepStatus: result.stepStatus,
                  distinctCount: result.distinctCount,
                }),
          });
        } catch (error) {
          json(response, 500, {
            ok: false,
            error: error instanceof Error ? error.message : "golden path failed",
          });
        }
        return;
      }

      json(response, 404, { status: "not_found" });
    })();
  });
  server.listen(environment.WORKER_HEALTH_PORT, "0.0.0.0");
  return server;
}

async function runLoop(): Promise<void> {
  while (!stopping) {
    try {
      await queue.releaseExpiredLeases();
      const job = await queue.lease("default", workerId, environment.JOB_LEASE_MS);
      if (!job) {
        await sleep(environment.WORKER_POLL_INTERVAL_MS);
        continue;
      }

      const heartbeat = setInterval(
        () => {
          void queue.heartbeat(job.id, workerId, environment.JOB_LEASE_MS);
        },
        Math.max(5_000, Math.floor(environment.JOB_LEASE_MS / 3)),
      );

      try {
        await dispatchJob(job);
        const completed = await queue.complete(job.id, workerId);
        if (!completed) {
          log("warn", "Job lease was lost before completion.", { jobId: job.id });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown worker error";
        const disposition = await queue.fail(job.id, workerId, message);
        log("error", "Job failed.", { jobId: job.id, disposition, error: message });
      } finally {
        clearInterval(heartbeat);
      }
    } catch (error) {
      log("error", "Worker loop dependency error; retrying.", {
        error: error instanceof Error ? error.message : "unknown dependency error",
      });
      await sleep(Math.max(environment.WORKER_POLL_INTERVAL_MS, 1_000));
    }
  }
}

async function shutdown(signal: string, server: Server): Promise<void> {
  if (stopping) return;
  stopping = true;
  log("info", "Worker shutdown started.", { signal, workerId });
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await queue.close();
}

const healthServer = startHealthServer();
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown(signal, healthServer);
  });
}

log("info", "Worker started.", {
  workerId,
  queue: "default",
  healthPort: environment.WORKER_HEALTH_PORT,
  sse: "/runs/:runId/stream",
  goldenPath: "POST /v1/golden-path/run",
});
await runLoop();
