/**
 * SSE streams are keyed by runId (Cael GET /api/runs/:runId/stream).
 * The cockpit URL is /a/:assignmentId. Map known demo seed assignment → run.
 * Prefer explicit runId when provided.
 */
import { DEMO_SEED_IDS } from "@forge/demo";

export function resolveStreamRunId(
  assignmentId: string,
  explicitRunId?: string | null,
): string {
  if (explicitRunId && explicitRunId.length > 0) return explicitRunId;
  if (assignmentId === DEMO_SEED_IDS.activeAssignment) {
    return DEMO_SEED_IDS.activeRun;
  }
  // History assignment one → history run one (demo seed)
  if (assignmentId === DEMO_SEED_IDS.historyAssignmentOne) {
    return DEMO_SEED_IDS.historyRunOne;
  }
  if (assignmentId === DEMO_SEED_IDS.historyAssignmentTwo) {
    return DEMO_SEED_IDS.historyRunTwo;
  }
  // Fallback: treat the path id as the run id (caller may pass run id directly)
  return assignmentId;
}
