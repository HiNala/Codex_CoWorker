/**
 * IT RUNS proof entrypoint (fakes + Postgres).
 *
 *   pnpm exec dotenv -e .env.local -- tsx packages/agent-runtime/src/golden-path/prove-it-runs.ts
 *
 * Prints CONFIGURED/UNSET for DATABASE_URL only — never values.
 * Exits 0 only when events are in Postgres, sequence is gapless, repair beat
 * present, and an artifact row was written.
 */
import { runSeededGoldenPathPostgres, PG_SEED } from "./run-seeded-pg";

const url = process.env.DATABASE_URL;
console.log("DATABASE_URL", url && url.length > 0 ? "CONFIGURED" : "UNSET");

if (!url) {
  console.error("FAIL: DATABASE_URL UNSET — load via dotenv -e .env.local");
  process.exit(1);
}

const result = await runSeededGoldenPathPostgres(url);

console.log(JSON.stringify({
  mode: result.mode,
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
  hasGateFailed: result.eventTypes.includes("capability.gate_failed"),
  hasInstalled: result.eventTypes.includes("capability.installed"),
  hasArtifactReady: result.eventTypes.includes("artifact.ready"),
  hasRunCompleted: result.eventTypes.includes("run.completed"),
  eventTypes: result.eventTypes,
  sampleSummaries: result.sampleSummaries,
  streamUrl: `http://127.0.0.1:3001/runs/${PG_SEED.runId}/stream?after=0`,
  cockpitHint: "Aria: useRunStream(runId, { useDemoFixture: false }) → GET /api/runs/:id/stream (proxy to worker or packages/events)",
}, null, 2));

const ok =
  result.eventCountInDb >= 10 &&
  result.lastSeq === result.eventCountInDb &&
  result.eventTypes.includes("capability.gate_failed") &&
  result.eventTypes.includes("capability.installed") &&
  result.eventTypes.includes("artifact.ready") &&
  result.eventTypes.includes("run.completed") &&
  result.distinctCount === 9 &&
  result.artifactId.length > 0 &&
  result.stepStatus === "completed";

if (!ok) {
  console.error("FAIL: seeded golden path did not meet IT RUNS criteria");
  process.exit(1);
}

console.log("PASS: Postgres events + artifact + 4→9 repair sequence");
process.exit(0);
