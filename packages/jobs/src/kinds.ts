/**
 * Canonical job kinds for the FORGE worker.
 * Documented in Track A §6 — keep in sync with worker handlers.
 */
export const JOB_KINDS = {
  DRAFT_CONTRACT: "draft-contract",
  EXECUTE_RUN: "execute-run",
  EXECUTE_STEP: "execute-step",
  RESUME_STEP: "resume-step",
  BUILD_CAPABILITY: "build-capability",
  SETTLE_COST: "settle-cost",
  RECONCILE_RUN: "reconcile-run",
  DELIVER_WEBHOOK: "deliver-webhook",
} as const;

export type JobKind = (typeof JOB_KINDS)[keyof typeof JOB_KINDS];

export const JOB_KIND_LIST: readonly JobKind[] = Object.values(JOB_KINDS);
