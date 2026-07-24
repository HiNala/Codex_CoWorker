/**
 * SSE streams are keyed by runId (Cael GET /api/runs/:runId/stream).
 * The cockpit URL is /a/:assignmentId. Map known demo seed assignment → run.
 *
 * IDs are inlined (not imported from @forge/demo) so client components never
 * pull packages/demo/replay.ts → node:fs into the browser bundle.
 * Values match packages/demo DEMO_SEED_IDS / packages/db DEMO_IDS.
 */

/** Client-safe mirror of DEMO_SEED_IDS — keep in sync with packages/demo seed. */
export const DEMO_ASSIGNMENT_RUN_MAP = {
  activeAssignment: "0198206f-5f53-7000-8000-000000000005",
  activeRun: "0198206f-5f53-7000-8000-000000000006",
  historyAssignmentOne: "0198206f-5f53-7000-8000-000000000007",
  historyRunOne: "0198206f-5f53-7000-8000-000000000008",
  historyAssignmentTwo: "0198206f-5f53-7000-8000-000000000009",
  historyRunTwo: "0198206f-5f53-7000-8000-00000000000a",
} as const;

export function resolveStreamRunId(
  assignmentId: string,
  explicitRunId?: string | null,
): string {
  if (explicitRunId && explicitRunId.length > 0) return explicitRunId;
  if (assignmentId === DEMO_ASSIGNMENT_RUN_MAP.activeAssignment) {
    return DEMO_ASSIGNMENT_RUN_MAP.activeRun;
  }
  if (assignmentId === DEMO_ASSIGNMENT_RUN_MAP.historyAssignmentOne) {
    return DEMO_ASSIGNMENT_RUN_MAP.historyRunOne;
  }
  if (assignmentId === DEMO_ASSIGNMENT_RUN_MAP.historyAssignmentTwo) {
    return DEMO_ASSIGNMENT_RUN_MAP.historyRunTwo;
  }
  // Fallback: treat the path id as the run id (caller may pass run id directly)
  return assignmentId;
}
