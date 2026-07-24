import type { LeasedJob } from "@forge/jobs";
import { JOB_KINDS } from "@forge/jobs";
import { log } from "@forge/config";
import {
  dispatchExecuteRunJob,
  runSeededGoldenPathPostgres,
  type PgGoldenPathResult,
} from "@forge/agent-runtime";
import { busForRun } from "./stream";

/**
 * Job dispatch. EXECUTE_RUN prefers Postgres-backed golden path when
 * DATABASE_URL is present (same-tx events); falls back to in-memory fakes.
 */
export async function dispatchJob(job: LeasedJob): Promise<void> {
  switch (job.type) {
    case "health.noop":
      log("info", "Processed worker health job.", { jobId: job.id, runId: job.runId });
      return;

    case JOB_KINDS.DRAFT_CONTRACT:
      log("info", "draft-contract accepted (fake path).", {
        jobId: job.id,
        assignmentId: job.payload.assignmentId,
      });
      return;

    case JOB_KINDS.EXECUTE_RUN: {
      const result = await runExecuteRun();
      log("info", "execute-run finished.", {
        jobId: job.id,
        mode: "mode" in result ? result.mode : "memory",
        runId: result.runId,
        lastSeq: result.lastSeq,
        eventCount: "eventCountInDb" in result ? result.eventCountInDb : result.events.length,
        stepStatus: result.stepStatus,
        distinctCount: result.distinctCount,
      });
      return;
    }

    case JOB_KINDS.EXECUTE_STEP:
    case JOB_KINDS.RESUME_STEP:
      log("info", `${job.type} accepted (fake path).`, {
        jobId: job.id,
        stepId: job.stepId ?? job.payload.stepId,
      });
      return;

    case JOB_KINDS.BUILD_CAPABILITY:
      log("info", "build-capability accepted (fake path).", {
        jobId: job.id,
        slug: job.payload.slug,
      });
      return;

    case JOB_KINDS.SETTLE_COST:
    case JOB_KINDS.RECONCILE_RUN:
    case JOB_KINDS.DELIVER_WEBHOOK:
      log("info", `${job.type} accepted (fake path).`, { jobId: job.id });
      return;

    default:
      throw new Error(`No handler registered for job type: ${job.type}`);
  }
}

export async function runExecuteRun(): Promise<
  PgGoldenPathResult | Awaited<ReturnType<typeof dispatchExecuteRunJob>>
> {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && databaseUrl.length > 0) {
    const result = await runSeededGoldenPathPostgres(databaseUrl);
    // Notify any live SSE subscribers after commit (events already in DB for backfill).
    const bus = busForRun(result.runId);
    // Subscribers that connect after the run still get full backfill from Postgres.
    void bus;
    return result;
  }
  return dispatchExecuteRunJob({ seededGolden: true });
}
