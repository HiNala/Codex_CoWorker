/**
 * IT RUNS proof — Broken Checkout only (CUT #4: checkout-error-log-analyzer).
 *
 *   pnpm exec dotenv -e .env.local -- tsx packages/agent-runtime/src/golden-path/prove-it-runs.ts
 */
import { runSeededGoldenPathPostgres, PG_SEED } from "./run-seeded-pg";
import { ARTIFACT_TITLE, ARTIFACT_TYPE } from "./ids";

const url = process.env.DATABASE_URL;
console.log("DATABASE_URL", url && url.length > 0 ? "CONFIGURED" : "UNSET");

if (!url) {
  console.error("FAIL: DATABASE_URL UNSET — load via dotenv -e .env.local");
  process.exit(1);
}

const result = await runSeededGoldenPathPostgres(url);

const localBase = process.env.WORKER_PUBLIC_URL ?? "http://127.0.0.1:3001";
const streamPath = `/runs/${result.runId}/stream`;

const report = {
  mode: result.mode,
  capability: "checkout-error-log-analyzer",
  cut: 4,
  runId: result.runId,
  assignmentId: result.assignmentId,
  eventCountInDb: result.eventCountInDb,
  lastSeq: result.lastSeq,
  stepStatus: result.stepStatus,
  runFinished: result.runFinished,
  distinctCount: result.distinctCount,
  attempt1FailureMessage: result.attempt1FailureMessage,
  artifactId: result.artifactId,
  artifactTitle: result.artifactTitle,
  artifactType: result.artifactType,
  artifactContentFormat: result.artifactContentFormat,
  terminalEventCounts: result.terminalEventCounts,
  eventTranscript: result.eventTranscript,
  eventTypes: result.eventTypes,
  /** Aria/Node handoff — worker owns this; do not call apps/web from Cael. */
  ariaSseHandoff: {
    localBaseUrl: localBase,
    prodBaseUrlEnv: "WORKER_PUBLIC_URL",
    streamUrl: `${localBase}${streamPath}?after=0`,
    pathTemplate: "/runs/:runId/stream",
    seededRunId: PG_SEED.runId,
    queryResume: "after=<seq>  (integer, events with seq > after)",
    headerResume: "Last-Event-ID: <seq>  (preferred over ?after when both set)",
    eventName: "run.event",
    heartbeatEventName: "heartbeat",
    contentType: "text/event-stream; charset=utf-8",
    envelope:
      "id: <seq>\\nevent: run.event\\ndata: <JSON RunEvent>\\n\\n  — RunEvent: { id, seq, runId, assignmentId, orgId, ts, type, channel, level, visibility, summary, detail?, refs, cost? }",
    goldenPathTrigger: `POST ${localBase}/v1/golden-path/run`,
    health: `GET ${localBase}/health/ready`,
  },
};

console.log(JSON.stringify(report, null, 2));

const ok =
  result.eventCountInDb >= 10 &&
  result.lastSeq === result.eventCountInDb &&
  result.eventTypes.includes("capability.gate_failed") &&
  result.eventTypes.includes("capability.installed") &&
  result.eventTypes.includes("artifact.ready") &&
  result.eventTypes.includes("run.completed") &&
  result.distinctCount === 9 &&
  result.attempt1FailureMessage === "expected 9, received 4" &&
  result.artifactType === ARTIFACT_TYPE &&
  result.artifactTitle === ARTIFACT_TITLE &&
  result.artifactContentFormat === "json" &&
  result.terminalEventCounts["run.completed"] === 1 &&
  result.terminalEventCounts["artifact.ready"] === 1 &&
  result.stepStatus === "completed";

if (!ok) {
  console.error("FAIL: seeded golden path did not meet IT RUNS criteria");
  process.exit(1);
}

console.log("PASS: Postgres events + table.typed artifact + 4→9 repair");
process.exit(0);
