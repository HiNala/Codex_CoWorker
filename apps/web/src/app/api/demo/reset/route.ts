import { DEMO_SEED_IDS, buildSeedResponse, describeCleanWorld, updateSeedState } from "@forge/demo";
import { authorizeDemoRequest, deny, jsonError, jsonOk } from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/demo/reset
 * Restores the seeded demo world. If DB is not reachable, returns structured error.
 * Target: under 3 seconds when DB is local.
 */
export async function POST(request: Request) {
  const auth = authorizeDemoRequest(request);
  if (!auth.ok) return deny(auth);

  const started = performance.now();
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    const durationMs = Math.round(performance.now() - started);
    // Still mark in-memory seed state so the panel can exercise UI without Postgres.
    const seed = buildSeedResponse();
    const clean = describeCleanWorld();
    updateSeedState({
      seeded: true,
      lastResetAt: new Date().toISOString(),
      lastSeedAt: new Date().toISOString(),
      lastResetDurationMs: durationMs,
      assignmentId: seed.assignmentId,
      coworkerId: seed.coworkerId,
      orgId: seed.orgId,
      capabilities: clean.capabilities,
      activeRuns: 0,
    });
    return jsonOk({
      ok: true,
      mode: "memory_only",
      durationMs,
      seed,
      state: {
        seeded: true as const,
        capabilities: clean.capabilities,
        activeRuns: 0,
      },
      warning: "DATABASE_URL not set; reset applied to in-memory demo runtime only.",
    });
  }

  try {
    const db = await import("@forge/db");
    // Prefer seed (idempotent onConflictDoNothing). Full truncate reset is scripts/db-reset.ts.
    if (typeof db.seedDatabase === "function") {
      await db.seedDatabase(databaseUrl);
    } else {
      return jsonError("not_configured", "seedDatabase is not available on @forge/db", 503, {
        durationMs: Math.round(performance.now() - started),
      });
    }

    const durationMs = Math.round(performance.now() - started);
    const seed = buildSeedResponse({
      assignmentId: db.DEMO_IDS?.activeAssignment ?? DEMO_SEED_IDS.activeAssignment,
      coworkerId: db.DEMO_IDS?.coworker ?? DEMO_SEED_IDS.coworker,
      orgId: db.DEMO_IDS?.org ?? DEMO_SEED_IDS.org,
    });
    const clean = describeCleanWorld();
    const now = new Date().toISOString();
    updateSeedState({
      seeded: true,
      lastResetAt: now,
      lastSeedAt: now,
      lastResetDurationMs: durationMs,
      assignmentId: seed.assignmentId,
      coworkerId: seed.coworkerId,
      orgId: seed.orgId,
      capabilities: clean.capabilities,
      activeRuns: 0,
    });

    return jsonOk({
      ok: true,
      mode: "database",
      durationMs,
      seed,
      state: {
        seeded: true as const,
        capabilities: clean.capabilities,
        activeRuns: 0,
      },
    });
  } catch (error) {
    const durationMs = Math.round(performance.now() - started);
    return jsonError(
      "db_unreachable",
      error instanceof Error ? error.message : "Database reset failed",
      503,
      { durationMs },
    );
  }
}
