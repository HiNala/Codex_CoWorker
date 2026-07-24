import type { LeasedJob } from "@forge/jobs";
import { JOB_KINDS } from "@forge/jobs";
import { log } from "@forge/config";

/**
 * Job dispatch table. Fake-first: handlers are no-ops that log structured
 * progress until the live run-loop / foundry ports are wired with DB txs.
 * Never log secrets.
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

    case JOB_KINDS.EXECUTE_RUN:
      log("info", "execute-run accepted (fake path).", {
        jobId: job.id,
        runId: job.runId ?? job.payload.runId,
      });
      return;

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
