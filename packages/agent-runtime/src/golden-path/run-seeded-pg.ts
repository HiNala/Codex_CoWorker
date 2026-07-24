import { createHash } from "node:crypto";
import postgres, { type Sql } from "postgres";
import type { PlanStep, RunEvent } from "@forge/contracts";
import {
  countRunEvents,
  createPostgresEventStoreTx,
  foldEvents,
  listRunEventsAfter,
  RunEventBus,
} from "@forge/events";
import { InMemoryBudget } from "../budget";
import { MemoryStepStore } from "../memory/step-store";
import { executeRun } from "../run-loop";
import type { RunContext, StepWorkResult } from "../types";
import { repairedAnalyzeSeed } from "./checkout-analyzer-fake";
import { FakeCheckoutFoundryPort } from "./fake-foundry-port";
import {
  ARTIFACT_SLUG,
  ARTIFACT_TITLE,
  ARTIFACT_TYPE,
  ATTEMPT_1_FAILURE_MESSAGE,
  CHECKOUT_ANALYZER_SLUG,
  GOLDEN,
  REPAIRED_DISTINCT,
} from "./ids";
import { MemoryArtifactPort } from "./memory-artifacts";
import { buildRigelArtifactSpec } from "./rigel-artifact";

/** Seeded demo IDs from packages/db seed (FK-safe). */
export const PG_SEED = {
  orgId: "0198206f-5f53-7000-8000-000000000001",
  coworkerId: "0198206f-5f53-7000-8000-000000000003",
  projectId: "0198206f-5f53-7000-8000-000000000004",
  assignmentId: "0198206f-5f53-7000-8000-000000000005",
  runId: "0198206f-5f53-7000-8000-000000000006",
} as const;

export interface PgGoldenPathResult {
  mode: "postgres";
  orgId: string;
  assignmentId: string;
  runId: string;
  eventCountInDb: number;
  lastSeq: number;
  eventTypes: string[];
  stepStatus: PlanStep["status"];
  artifactId: string;
  artifactTitle: string;
  artifactType: string;
  artifactContentFormat: string;
  distinctCount: number;
  attempt1FailureMessage: string;
  runFinished: string;
  /** First few summaries for IT RUNS logs (never secrets). */
  sampleSummaries: string[];
  /** Compact ordered event transcript for Aria/Wisp. */
  eventTranscript: string[];
  terminalEventCounts: Record<string, number>;
}

/**
 * Seeded fake assignment against real Postgres:
 * - Ensures seed assignment/run rows exist
 * - Runs executeRun with EventStoreTx bound to ONE sql transaction per emit
 *   (each transitionWithEvent/emit uses the same open begin() for the whole run
 *   so state+event land together; process dies mid-run → full rollback)
 * - Persists a markdown artifact row + version
 * - Returns streamable event sequence for SSE backfill
 */
export async function runSeededGoldenPathPostgres(
  databaseUrl: string,
): Promise<PgGoldenPathResult> {
  const sql = postgres(databaseUrl, { max: 2, prepare: false });
  try {
    await ensureSeededRun(sql);

    // Clear prior golden-path events for this run so the proof is deterministic.
    await sql`delete from outbox where event_id in (select id from run_events where run_id = ${PG_SEED.runId}::uuid)`;
    await sql`delete from run_events where run_id = ${PG_SEED.runId}::uuid`;
    await sql`update assignment_runs set event_seq = 0, status = 'running', updated_at = now() where id = ${PG_SEED.runId}::uuid`;

    const bus = new RunEventBus();
    const live: RunEvent[] = [];
    const foundry = new FakeCheckoutFoundryPort();
    const artifacts = new MemoryArtifactPort({
      artifactId: GOLDEN.artifactId,
      versionId: GOLDEN.artifactVersionId,
    });

    const steps: PlanStep[] = [
      {
        id: GOLDEN.stepAnalyzeId,
        runId: PG_SEED.runId,
        milestoneId: GOLDEN.milestoneId,
        parentStepId: null,
        ordinal: 0,
        title: "Analyze checkout error logs for affected customers",
        description: "checkout-error-log-analyzer over seeded demo window",
        status: "ready",
        dependsOn: [],
        capabilityRefs: [],
        artifactIds: [],
        blockedReason: null,
        attempt: 0,
        maxAttempts: 3,
        startedAt: null,
        endedAt: null,
        costMicrocredits: 0,
        changedAfterApproval: false,
      },
    ];
    const stepStore = new MemoryStepStore(steps);
    const budget = new InMemoryBudget({
      ceilingMicrocredits: 5_000_000,
      reservedMicrocredits: 5_000_000,
      spentMicrocredits: 0,
      warned: false,
      stopped: false,
    });

    let finished = "unknown";

    // Entire run shares one SQL transaction so every emit is atomic with any
    // accompanying assignment_runs update performed by nextSeq.
    await sql.begin(async (tx) => {
      const eventTx = createPostgresEventStoreTx(tx as unknown as Sql);

      const ctx: RunContext = {
        runId: PG_SEED.runId,
        assignmentId: PG_SEED.assignmentId,
        orgId: PG_SEED.orgId,
        tx: eventTx,
        steps: stepStore,
        capabilities: {
          async resolve() {
            const pin = foundry.getInstalled(CHECKOUT_ANALYZER_SLUG);
            return pin
              ? { resolved: [pin], missing: [] }
              : { resolved: [], missing: [] };
          },
        },
        foundry,
        artifacts,
        budget,
        control: {
          async shouldStop() {
            return false;
          },
          async markFinished(_id, status) {
            finished = status;
            await tx`
              update assignment_runs
              set status = ${status === "completed" ? "completed" : status === "failed" ? "failed" : "cancelled"}::run_status,
                  ended_at = now(),
                  updated_at = now()
              where id = ${PG_SEED.runId}::uuid
            `;
          },
        },
        onEvent: (event) => {
          live.push(event);
          bus.publish(event);
        },
        async runStepWork(_step, resolved): Promise<StepWorkResult> {
          const pin = resolved[0] ?? foundry.getInstalled(CHECKOUT_ANALYZER_SLUG);
          if (!pin) {
            return {
              kind: "needs_capability",
              missing: {
                slug: CHECKOUT_ANALYZER_SLUG,
                purpose: "Count distinct customers in checkout_failed logs",
                inputShape: "{ lines, window }",
                outputShape: "{ affectedCustomers, distinctCount }",
              },
            };
          }
          const output = repairedAnalyzeSeed();
          const rigel = buildRigelArtifactSpec(output);
          return {
            kind: "ok",
            summary: `Identified ${output.distinctCount} affected customers (dual-shape ids).`,
            artifacts: [
              {
                type: rigel.type,
                title: rigel.title,
                description: rigel.description,
                content: rigel.content,
              },
            ],
          };
        },
      };

      const { emit } = await import("@forge/events");
      await emit(eventTx, {
        runId: PG_SEED.runId,
        assignmentId: PG_SEED.assignmentId,
        orgId: PG_SEED.orgId,
        type: "plan.drafted",
        summary: "Drafted seeded assignment contract for checkout log diagnosis.",
      });
      await emit(eventTx, {
        runId: PG_SEED.runId,
        assignmentId: PG_SEED.assignmentId,
        orgId: PG_SEED.orgId,
        type: "plan.approved",
        summary: "Contract approved; execute-run started (fake adapters).",
      });

      await executeRun(ctx);

      // Persist Rigel table.typed artifact inside the same SQL transaction.
      const art = artifacts.items[0];
      const version = art?.versions[0];
      if (art && version) {
        const sha = createHash("sha256").update(version.body).digest("hex");
        await tx`
          insert into artifacts (
            id, org_id, project_id, assignment_id, run_id, coworker_id,
            type, title, slug, status, visibility, search_text, created_at, updated_at
          ) values (
            ${art.id}::uuid,
            ${PG_SEED.orgId}::uuid,
            ${PG_SEED.projectId}::uuid,
            ${PG_SEED.assignmentId}::uuid,
            ${PG_SEED.runId}::uuid,
            ${PG_SEED.coworkerId}::uuid,
            ${ARTIFACT_TYPE}::artifact_type,
            ${art.title},
            ${ARTIFACT_SLUG},
            'ready_for_review'::artifact_status,
            'org'::artifact_visibility,
            ${version.body.slice(0, 2000)},
            now(),
            now()
          )
          on conflict (id) do update set
            type = ${ARTIFACT_TYPE}::artifact_type,
            title = excluded.title,
            slug = excluded.slug,
            status = 'ready_for_review'::artifact_status,
            search_text = excluded.search_text,
            updated_at = now()
        `;
        await tx`
          insert into artifact_versions (
            id, org_id, artifact_id, ordinal, author_type, author_ref,
            content_format, content_inline, sha256, change_summary,
            source_event_from, source_event_to, created_at
          ) values (
            ${version.versionId}::uuid,
            ${PG_SEED.orgId}::uuid,
            ${art.id}::uuid,
            1,
            'capability'::artifact_author_type,
            ${`${CHECKOUT_ANALYZER_SLUG}@1.0.0`},
            'json'::content_format,
            ${version.body},
            ${sha},
            ${`checkout-error-log-analyzer v1.0.0 → ${REPAIRED_DISTINCT} distinct customers`},
            1,
            ${live.at(-1)?.seq ?? 1},
            now()
          )
          on conflict (id) do update set
            content_inline = excluded.content_inline,
            content_format = 'json'::content_format,
            sha256 = excluded.sha256,
            author_type = 'capability'::artifact_author_type,
            author_ref = excluded.author_ref,
            change_summary = excluded.change_summary
        `;
        await tx`
          update artifacts
          set current_version_id = ${version.versionId}::uuid,
              updated_at = now()
          where id = ${art.id}::uuid
        `;
      }
    });

    const eventCountInDb = await countRunEvents(sql, PG_SEED.runId);
    const fromDb = await listRunEventsAfter(sql, PG_SEED.runId, 0);
    const folded = foldEvents(fromDb, 0);
    const step = steps[0]!;
    const art = artifacts.items[0];
    const terminalKeys = [
      "run.completed",
      "run.failed",
      "artifact.ready",
      "capability.installed",
      "capability.gate_failed",
    ] as const;
    const terminalEventCounts: Record<string, number> = {};
    for (const key of terminalKeys) {
      terminalEventCounts[key] = folded.types.filter((t) => t === key).length;
    }

    return {
      mode: "postgres",
      orgId: PG_SEED.orgId,
      assignmentId: PG_SEED.assignmentId,
      runId: PG_SEED.runId,
      eventCountInDb,
      lastSeq: folded.lastSeq,
      eventTypes: folded.types,
      stepStatus: step.status,
      artifactId: art?.id ?? "",
      artifactTitle: art?.title ?? ARTIFACT_TITLE,
      artifactType: art?.type ?? ARTIFACT_TYPE,
      artifactContentFormat: "json",
      distinctCount: REPAIRED_DISTINCT,
      attempt1FailureMessage: ATTEMPT_1_FAILURE_MESSAGE,
      runFinished: finished,
      sampleSummaries: fromDb.slice(0, 5).map((e) => e.summary),
      eventTranscript: folded.types.map((t, i) => `${i + 1}. ${t}`),
      terminalEventCounts,
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function ensureSeededRun(sql: Sql): Promise<void> {
  // Prefer full package seed when available; otherwise minimal FK row insert.
  try {
    const { seedDatabase } = await import("@forge/db");
    const url = process.env.DATABASE_URL;
    if (url && typeof seedDatabase === "function") {
      await seedDatabase(url);
      return;
    }
  } catch {
    // fall through to minimal insert
  }

  const org = await sql`select id from organizations where id = ${PG_SEED.orgId}::uuid limit 1`;
  if (org.length === 0) {
    throw new Error(
      "Postgres has no seed org. Run: pnpm db:seed (dotenv -e .env.local) before golden path.",
    );
  }
}
