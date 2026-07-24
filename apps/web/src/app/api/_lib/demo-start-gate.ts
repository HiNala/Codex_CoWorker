/**
 * Gate for POST /api/demo/start only.
 * Deterministic DEMO_MODE action — no DEMO_ACCESS_CODE (cockpit Start has none).
 * Reset/panic stay on authorizeDemoRequest + access code.
 */

export type DemoStartEnv = {
  NODE_ENV?: string | undefined;
  DEMO_MODE?: string | undefined;
};

export type DemoStartGateResult =
  | { ok: true }
  | { ok: false; status: 403; code: "production_blocked"; message: string };

/** Production requires DEMO_MODE=1. Development always allowed. */
export function gateDemoStart(env: DemoStartEnv = process.env): DemoStartGateResult {
  if (env.NODE_ENV === "production" && env.DEMO_MODE !== "1") {
    return {
      ok: false,
      status: 403,
      code: "production_blocked",
      message: "Start is disabled in production unless DEMO_MODE=1.",
    };
  }
  return { ok: true };
}
