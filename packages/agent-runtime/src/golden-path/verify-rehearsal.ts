/**
 * Production rehearsal support (Cael):
 * 1) Full worker-equivalent path: Postgres golden run + SSE backfill + 4→9 artifact
 * 2) Final seed/reset opening-state check (no further mutation after this seed)
 *
 *   pnpm exec dotenv -e .env.local -- tsx packages/agent-runtime/src/golden-path/verify-rehearsal.ts
 *   pnpm exec dotenv -e .env.local -- tsx packages/agent-runtime/src/golden-path/verify-rehearsal.ts --opening-only
 */
import postgres from "postgres";
import { listRunEventsAfter, countRunEvents } from "@forge/events";
import { runSeededGoldenPathPostgres, PG_SEED } from "./run-seeded-pg";

const openingOnly = process.argv.includes("--opening-only");
const url = process.env.DATABASE_URL;
console.log("DATABASE_URL", url && url.length ? "CONFIGURED" : "UNSET");
if (!url) process.exit(1);

const ASSIGN = PG_SEED.assignmentId;
const RUN = PG_SEED.runId;

async function verifyOpeningState(databaseUrl: string): Promise<{
  ok: boolean;
  report: Record<string, unknown>;
}> {
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    const a = await sql`
      select id, status, left(raw_request, 80) as req, contract->>'title' as title
      from assignments where id = ${ASSIGN}::uuid
    `;
    const r = await sql`
      select id, status, event_seq, cancel_requested_at, started_at, ended_at
      from assignment_runs where id = ${RUN}::uuid
    `;
    const caps = await sql`
      select slug, status from capabilities
      where org_id = ${PG_SEED.orgId}::uuid order by slug
    `;
    const ms = await sql`
      select title, status from milestones where run_id = ${RUN}::uuid order by ordinal
    `;
    const steps = await sql`
      select title, status from plan_steps where run_id = ${RUN}::uuid order by ordinal
    `;
    const eventCount = await countRunEvents(sql, RUN);
    const hasApiChange =
      JSON.stringify({ a, caps }).toLowerCase().includes("api-change") ||
      JSON.stringify(a).toLowerCase().includes("webhook field rename");
    const hasCheckout = JSON.stringify({ a, ms, steps }).includes("checkout");

    const run = r[0];
    const assign = a[0];
    const inventorySlugs = caps.map((c) => c.slug);
    const noLiveBuildInstalled = !inventorySlugs.includes("checkout-error-log-analyzer");
    const noApiChangeInstalled = !inventorySlugs.includes("api-change-impact-analyzer");

    // Opening state after final reset/seed:
    // - assignment approved Broken Checkout
    // - run queued, event_seq 0, no active partial progress events
    // - milestones/steps present for Mission Control
    // - checkout analyzer NOT in installed inventory (gap for live build)
    const ok =
      Boolean(assign) &&
      assign?.status === "approved" &&
      String(assign?.title ?? "").toLowerCase().includes("broken") &&
      Boolean(run) &&
      run?.status === "queued" &&
      Number(run?.event_seq ?? -1) === 0 &&
      eventCount === 0 &&
      ms.length >= 1 &&
      steps.length >= 1 &&
      String(steps[0]?.title ?? "").toLowerCase().includes("checkout") &&
      noLiveBuildInstalled &&
      noApiChangeInstalled &&
      !hasApiChange &&
      hasCheckout;

    return {
      ok,
      report: {
        assignmentId: ASSIGN,
        runId: RUN,
        assignmentStatus: assign?.status ?? null,
        contractTitle: assign?.title ?? null,
        runStatus: run?.status ?? null,
        eventSeq: run?.event_seq ?? null,
        eventCount,
        milestones: ms,
        steps,
        installedCapabilities: inventorySlugs,
        noActivePartialRun: run?.status === "queued" && eventCount === 0,
        hasApiChangeText: hasApiChange,
        hasCheckoutText: hasCheckout,
      },
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

if (!openingOnly) {
  console.log("=== PHASE 1: full golden path (Postgres + 4→9 + table.typed) ===");
  const result = await runSeededGoldenPathPostgres(url);
  const fullOk =
    result.eventCountInDb >= 10 &&
    result.lastSeq === result.eventCountInDb &&
    result.eventTypes.includes("capability.gate_failed") &&
    result.attempt1FailureMessage === "expected 9, received 4" &&
    result.eventTypes.includes("capability.installed") &&
    result.eventTypes.includes("artifact.ready") &&
    result.artifactType === "table.typed" &&
    result.distinctCount === 9 &&
    result.stepStatus === "completed";

  console.log(
    JSON.stringify(
      {
        phase: "full_path",
        ok: fullOk,
        assignmentId: result.assignmentId,
        runId: result.runId,
        eventCountInDb: result.eventCountInDb,
        lastSeq: result.lastSeq,
        distinctCount: result.distinctCount,
        attempt1FailureMessage: result.attempt1FailureMessage,
        artifactType: result.artifactType,
        artifactTitle: result.artifactTitle,
        terminalEventCounts: result.terminalEventCounts,
        streamUrl: `http://127.0.0.1:3001/runs/${result.runId}/stream?after=0`,
      },
      null,
      2,
    ),
  );

  // SSE backfill smoke from DB
  const sql = postgres(url, { max: 1, prepare: false });
  try {
    const events = await listRunEventsAfter(sql, result.runId, 0);
    const sseOk = events.length === result.eventCountInDb && events[0]?.seq === 1;
    console.log(
      JSON.stringify({
        phase: "sse_backfill",
        ok: sseOk,
        frames: events.length,
        firstType: events[0]?.type,
        lastType: events.at(-1)?.type,
      }),
    );
    if (!fullOk || !sseOk) {
      console.error("FAIL: full path or SSE backfill");
      process.exit(1);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  console.log("=== PHASE 2: final reset/seed (opening state) — last mutation ===");
  const { seedDatabase } = await import("@forge/db");
  await seedDatabase(url);
  console.log("seedDatabase complete (Wisp-equivalent final reset)");
}

console.log("=== PHASE 3: opening-state verify (read-only) ===");
const opening = await verifyOpeningState(url);
console.log(JSON.stringify({ phase: "opening_state", ok: opening.ok, ...opening.report }, null, 2));

if (!opening.ok) {
  console.error("FAIL: opening state not clean / not Broken Checkout");
  process.exit(1);
}

console.log("PASS: rehearsal full path + opening state after final seed");
console.log(
  JSON.stringify({
    ariaIds: {
      assignmentId: ASSIGN,
      runId: RUN,
      orgId: PG_SEED.orgId,
      approvalId: "0198206f-5f53-7000-8000-0000000000e1",
      liveBuildSlug: "checkout-error-log-analyzer",
    },
    note: "Do not mutate after Wisp final reset — opening-only recheck: --opening-only",
  }),
);
process.exit(0);
