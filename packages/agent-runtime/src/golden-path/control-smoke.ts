/**
 * Worker control-plane smoke (in-process = same code as worker handlers).
 *   pnpm exec dotenv -e .env.local -- tsx packages/agent-runtime/src/golden-path/control-smoke.ts
 */
import { seedDatabase } from "@forge/db";
import { decideApproval } from "../approvals/decide";
import { GOLDEN } from "./ids";
import { PG_SEED, runSeededGoldenPathPostgres } from "./run-seeded-pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL UNSET");
  process.exit(1);
}

console.log("DATABASE_URL CONFIGURED");

// Opening seed
await seedDatabase(url);

// Fixed seeded assignment/run — must not invent new ids
const r = await runSeededGoldenPathPostgres(url);
const fixedIds =
  r.assignmentId === PG_SEED.assignmentId && r.runId === PG_SEED.runId;

const goldenOk =
  fixedIds &&
  r.eventCountInDb >= 20 &&
  r.lastSeq === r.eventCountInDb &&
  r.attempt1FailureMessage === "expected 9, received 4" &&
  r.distinctCount === 9 &&
  r.artifactType === "table.typed" &&
  r.eventTypes.includes("approval.requested") &&
  r.eventTypes.includes("approval.granted") &&
  r.eventTypes.includes("capability.gate_failed") &&
  r.eventTypes.includes("run.completed");

console.log(
  JSON.stringify(
    {
      endpoint: "POST /v1/golden-path/run (equivalent)",
      ok: goldenOk,
      fixedSeededIds: fixedIds,
      assignmentId: r.assignmentId,
      runId: r.runId,
      eventCountInDb: r.eventCountInDb,
      lastSeq: r.lastSeq,
      distinctCount: r.distinctCount,
      artifactType: r.artifactType,
      attempt1FailureMessage: r.attempt1FailureMessage,
      approvalId: GOLDEN.approvalId,
      hasApprovalRequested: r.eventTypes.includes("approval.requested"),
      hasApprovalGranted: r.eventTypes.includes("approval.granted"),
    },
    null,
    2,
  ),
);

// Decide — first may alreadyDecided if smoke auto-granted; still 200
const d1 = await decideApproval(url, {
  approvalId: GOLDEN.approvalId,
  decision: "approved",
  runId: PG_SEED.runId,
  assignmentId: PG_SEED.assignmentId,
  orgId: PG_SEED.orgId,
});
const d2 = await decideApproval(url, {
  approvalId: GOLDEN.approvalId,
  decision: "approved",
  runId: PG_SEED.runId,
  assignmentId: PG_SEED.assignmentId,
  orgId: PG_SEED.orgId,
});

const decideOk =
  d1.ok === true &&
  d2.ok === true &&
  d1.decision === "approved" &&
  d2.alreadyDecided === true;

console.log(
  JSON.stringify(
    {
      endpoint: "POST /approvals/:id/decide",
      ok: decideOk,
      first: d1.ok
        ? { decision: d1.decision, alreadyDecided: d1.alreadyDecided, runId: d1.runId }
        : d1,
      secondIdempotent: d2.ok
        ? { decision: d2.decision, alreadyDecided: d2.alreadyDecided }
        : d2,
    },
    null,
    2,
  ),
);

// Final seed — opening state (last mutation for local smoke)
await seedDatabase(url);
const sql = (await import("postgres")).default(url, { max: 1, prepare: false });
const run = await sql`
  select status, event_seq from assignment_runs where id = ${PG_SEED.runId}::uuid
`;
const events = await sql`
  select count(*)::int as n from run_events where run_id = ${PG_SEED.runId}::uuid
`;
await sql.end({ timeout: 5 });

const openingOk =
  run[0]?.status === "queued" &&
  Number(run[0]?.event_seq) === 0 &&
  Number(events[0]?.n) === 0;

console.log(
  JSON.stringify({
    finalReset: "seedDatabase",
    openingOk,
    runStatus: run[0]?.status,
    eventSeq: run[0]?.event_seq,
    eventCount: events[0]?.n,
    cockpitUrl: `https://dextwork.com/a/${PG_SEED.assignmentId}`,
    note: "Populated cockpit requires POST golden-path/run AFTER seed; seed alone is empty opening.",
  }),
);

if (!goldenOk || !decideOk || !openingOk) {
  console.error("FAIL control smoke");
  process.exit(1);
}
console.log("PASS control smoke: golden-path fixed ids + decide idempotent + opening after seed");
process.exit(0);
