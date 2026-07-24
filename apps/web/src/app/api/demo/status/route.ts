import {
  DEMO_SCENARIOS,
  TIMING_BUDGETS_MS,
  buildSeedResponse,
  describeCleanWorld,
  getDemoRuntime,
  goldenPath,
  hydrateAdaptersFromEnv,
  resolveActiveAdapters,
} from "@forge/demo";
import { authorizeDemoRequest, deny, demoEnv, jsonOk } from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/demo/status
 * Requires access code. Returns adapter modes + seed state summary.
 * Does not leak DEMO_ACCESS_CODE.
 */
export function GET(request: Request) {
  const auth = authorizeDemoRequest(request);
  if (!auth.ok) return deny(auth);

  // Keep runtime adapters aligned with process env when not panicked.
  const runtime = getDemoRuntime();
  if (!runtime.panicActive) {
    hydrateAdaptersFromEnv(process.env);
  }

  const adapters = resolveActiveAdapters(process.env);
  const snapshot = getDemoRuntime();
  const clean = describeCleanWorld();
  const seedIds = buildSeedResponse();

  return jsonOk({
    ok: true,
    demoMode: demoEnv().DEMO_MODE === "1" || process.env.NODE_ENV !== "production",
    nodeEnv: process.env.NODE_ENV ?? "development",
    adapters,
    panicActive: snapshot.panicActive,
    panicAt: snapshot.panicAt,
    seed: {
      ...snapshot.seed,
      expectedCapabilities: clean.capabilities,
      missingLiveBuild: clean.missingLiveBuild,
      defaultIds: seedIds,
    },
    replay: snapshot.replay,
    presenterMode: snapshot.presenterMode,
    goldenPath: {
      title: goldenPath.title,
      capabilityGap: goldenPath.capabilityGap,
      expectedImpactCustomers: goldenPath.expectedImpactCustomers,
    },
    scenarios: DEMO_SCENARIOS.map((s) => ({
      id: s.id,
      label: s.label,
      estimateLabel: s.estimateLabel,
      entryPoint: s.entryPoint,
    })),
    timingBudgetsMs: TIMING_BUDGETS_MS,
    note: snapshot.note,
  });
}
