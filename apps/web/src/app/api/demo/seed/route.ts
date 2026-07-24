import {
  DEMO_SEED_IDS,
  buildSeedResponse,
  updateSeedState,
} from "@forge/demo";
import { authorizeDemoRequest, deny, jsonError, jsonOk } from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/demo/seed → { assignmentId, coworkerId, orgId }
 * Prefers @forge/db DEMO_IDS when importable; falls back to DEMO_SEED_IDS.
 */
export async function POST(request: Request) {
  const auth = authorizeDemoRequest(request);
  if (!auth.ok) return deny(auth);

  let ids = buildSeedResponse({
    assignmentId: DEMO_SEED_IDS.activeAssignment,
    coworkerId: DEMO_SEED_IDS.coworker,
    orgId: DEMO_SEED_IDS.org,
  });

  let source: "db_package" | "demo_constants" = "demo_constants";

  try {
    const db = await import("@forge/db");
    if (db.DEMO_IDS) {
      ids = buildSeedResponse({
        assignmentId: db.DEMO_IDS.activeAssignment,
        coworkerId: db.DEMO_IDS.coworker,
        orgId: db.DEMO_IDS.org,
      });
      source = "db_package";
    }
  } catch {
    // Keep constant fallback — do not crash.
  }

  // Optional: ensure seed rows exist when DATABASE_URL is set.
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const db = await import("@forge/db");
      if (typeof db.seedDatabase === "function") {
        await db.seedDatabase(databaseUrl);
      }
    } catch (error) {
      return jsonError(
        "db_unreachable",
        error instanceof Error ? error.message : "Database seed failed",
        503,
        { partial: ids, source },
      );
    }
  }

  const now = new Date().toISOString();
  updateSeedState({
    seeded: true,
    lastSeedAt: now,
    assignmentId: ids.assignmentId,
    coworkerId: ids.coworkerId,
    orgId: ids.orgId,
    capabilities: 4,
    activeRuns: 0,
  });

  return jsonOk({
    ok: true,
    ...ids,
    source,
    seededAt: now,
  });
}
