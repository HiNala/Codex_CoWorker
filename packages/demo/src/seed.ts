/**
 * Reset/seed orchestration types and pure helpers.
 * Side-effecting DB work lives in API routes (dynamic import of @forge/db).
 *
 * Seed IDs mirror packages/db/src/seed DEMO_IDS so demo routes work even when
 * the DB package shape changes slightly — prefer importing DEMO_IDS from
 * @forge/db at the call site when available.
 */

export const DEMO_SEED_IDS = {
  org: "0198206f-5f53-7000-8000-000000000001",
  user: "0198206f-5f53-7000-8000-000000000002",
  coworker: "0198206f-5f53-7000-8000-000000000003",
  project: "0198206f-5f53-7000-8000-000000000004",
  activeAssignment: "0198206f-5f53-7000-8000-000000000005",
  activeRun: "0198206f-5f53-7000-8000-000000000006",
  historyAssignmentOne: "0198206f-5f53-7000-8000-000000000007",
  historyRunOne: "0198206f-5f53-7000-8000-000000000008",
  historyAssignmentTwo: "0198206f-5f53-7000-8000-000000000009",
  historyRunTwo: "0198206f-5f53-7000-8000-00000000000a",
  creditAccount: "0198206f-5f53-7000-8000-00000000000b",
} as const;

/** Authoritative golden-path request text (scenario 23). */
export const GOLDEN_PATH_REQUEST =
  "Find out why customers cannot buy the annual plan and prepare a verified fix. " +
  "Customer Priya Raghunathan (Northwind Logistics) reports Team annual billing errors out " +
  'with "Something went wrong. Please try again." while monthly checkout works. ' +
  "Assess impact from checkout error logs, build any missing capability needed, open a PR, " +
  "and draft a short owner email.";

export const GOLDEN_PATH_TICKET_SUBJECT =
  "Can't upgrade to Team — annual billing errors out";

export const GOLDEN_PATH_CAPABILITY_GAP = "checkout-error-log-analyzer";

export const INSTALLED_CAPABILITY_SLUGS = [
  "ticket-clusterer",
  "customer-impact-mapper",
  "release-note-drafter",
  "repository-change-proposer",
] as const;

/** api-change-impact-analyzer / checkout-error-log-analyzer must NOT be installed at demo start. */
export const LIVE_BUILD_CAPABILITY_SLUG = GOLDEN_PATH_CAPABILITY_GAP;

export type SeedIds = {
  assignmentId: string;
  coworkerId: string;
  orgId: string;
  projectId: string;
  runId: string;
};

export type SeedResponseBody = {
  assignmentId: string;
  coworkerId: string;
  orgId: string;
};

export type ResetOk = {
  ok: true;
  durationMs: number;
  seed: SeedResponseBody;
  state: {
    seeded: true;
    capabilities: number;
    activeRuns: number;
  };
};

export type ResetErr = {
  ok: false;
  code: "db_unreachable" | "db_error" | "not_configured" | "not_allowed";
  message: string;
  durationMs: number;
};

export type ResetResult = ResetOk | ResetErr;

export function buildSeedResponse(
  ids: Pick<SeedIds, "assignmentId" | "coworkerId" | "orgId"> = {
    assignmentId: DEMO_SEED_IDS.activeAssignment,
    coworkerId: DEMO_SEED_IDS.coworker,
    orgId: DEMO_SEED_IDS.org,
  },
): SeedResponseBody {
  return {
    assignmentId: ids.assignmentId,
    coworkerId: ids.coworkerId,
    orgId: ids.orgId,
  };
}

export function defaultSeedIds(): SeedIds {
  return {
    assignmentId: DEMO_SEED_IDS.activeAssignment,
    coworkerId: DEMO_SEED_IDS.coworker,
    orgId: DEMO_SEED_IDS.org,
    projectId: DEMO_SEED_IDS.project,
    runId: DEMO_SEED_IDS.activeRun,
  };
}

/** Expected clean world after reset — pure description for status UI. */
export function describeCleanWorld(): {
  capabilities: number;
  installedSlugs: readonly string[];
  missingLiveBuild: string;
  activeRuns: number;
  tickets: number;
} {
  return {
    capabilities: INSTALLED_CAPABILITY_SLUGS.length,
    installedSlugs: INSTALLED_CAPABILITY_SLUGS,
    missingLiveBuild: LIVE_BUILD_CAPABILITY_SLUG,
    activeRuns: 0,
    tickets: 12,
  };
}
