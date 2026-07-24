import type { LeasedJob } from "@forge/jobs";
import { JOB_KINDS } from "@forge/jobs";
import { log } from "@forge/config";
import { dispatchExecuteRunJob } from "@forge/agent-runtime";

/**
 * Job dispatch table.
 * EXECUTE_RUN wires the Gate-1 fake golden path:
 *   assignment/job → run-loop → same-tx events → streamable seq → artifact
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

    case JOB_KINDS.EXECUTE_RUN: {
      const result = await dispatchExecuteRunJob({
        runId: typeof job.runId === "string" ? job.runId : undefined,
        assignmentId:
          typeof job.payload.assignmentId === "string" ? job.payload.assignmentId : undefined,
        seededGolden: true,
      });
      log("info", "execute-run golden path finished.", {
        jobId: job.id,
        runId: result.runId,
        lastSeq: result.lastSeq,
        stepStatus: result.stepStatus,
        runFinished: result.runFinished,
        distinctCount: result.distinctCount,
        artifactCount: result.artifacts.length,
        // Handoff for Aria/Wisp (SSE): lastSeq + event type count — no payloads here.
        streamableEvents: result.eventTypes.length,
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
