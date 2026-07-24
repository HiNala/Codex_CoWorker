import type { ArtifactStatus } from "@forge/contracts";
import { ArtifactIllegalTransitionError } from "./errors";

/**
 * Legal artifact status transitions.
 *
 * Primary path: declared → drafting → ready_for_review → approved
 * After approval: delivered | published | superseded | archived
 * Side states: blocked, failed, rejected, withdrawn (with limited recovery)
 */
export const LEGAL_TRANSITIONS: Record<ArtifactStatus, readonly ArtifactStatus[]> = {
  declared: ["drafting", "blocked", "failed", "withdrawn"],
  drafting: ["ready_for_review", "blocked", "failed", "withdrawn"],
  ready_for_review: ["approved", "rejected", "drafting", "blocked", "failed", "withdrawn"],
  approved: ["delivered", "published", "superseded", "archived", "blocked", "failed"],
  delivered: ["archived", "superseded"],
  published: ["archived", "superseded"],
  superseded: ["archived"],
  archived: [],
  blocked: ["drafting", "failed", "withdrawn"],
  failed: ["drafting", "withdrawn"],
  rejected: ["drafting", "withdrawn"],
  withdrawn: [],
};

export function canTransition(from: ArtifactStatus, to: ArtifactStatus): boolean {
  if (from === to) return false;
  return LEGAL_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: ArtifactStatus, to: ArtifactStatus): void {
  if (!canTransition(from, to)) {
    throw new ArtifactIllegalTransitionError(
      `${from} -> ${to} is not a legal artifact status transition`,
    );
  }
}
