/**
 * Demo-control helpers for golden-path e2e.
 * Against fakes is the default path; endpoints are gated by DEMO_ACCESS_CODE.
 */

export const DEMO_BASE_URL = (
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100"
).replace(/\/$/, "");

export const DEMO_ACCESS_CODE = process.env.DEMO_ACCESS_CODE ?? "forge-local";

/** Seeded assignment from packages/db seed (DEMO_IDS.activeAssignment). */
export const SEEDED_ASSIGNMENT_ID = "0198206f-5f53-7000-8000-000000000005";

export const GOLDEN_PROMPT =
  "Find out why customers cannot buy the annual plan and prepare a verified fix.";

export interface DemoRequestResult {
  ok: boolean;
  status: number;
  body: unknown;
}

export interface SeedDemoResult extends DemoRequestResult {
  assignmentId?: string;
  coworkerId?: string;
  orgId?: string;
}

async function demoPost(
  path: string,
  extraBody: Record<string, unknown> = {},
): Promise<DemoRequestResult> {
  const url = `${DEMO_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-demo-access-code": DEMO_ACCESS_CODE,
      },
      body: JSON.stringify({
        accessCode: DEMO_ACCESS_CODE,
        ...extraBody,
      }),
    });

    let body: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = text;
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/** POST /api/demo/reset — truncates run-scoped tables and restores the seeded world. */
export async function resetDemo(): Promise<DemoRequestResult> {
  return demoPost("/api/demo/reset");
}

/** POST /api/demo/seed — returns { assignmentId, coworkerId, orgId }. */
export async function seedDemo(): Promise<SeedDemoResult> {
  const result = await demoPost("/api/demo/seed");
  const body =
    result.body && typeof result.body === "object"
      ? (result.body as Record<string, unknown>)
      : {};

  return {
    ...result,
    assignmentId: typeof body.assignmentId === "string" ? body.assignmentId : undefined,
    coworkerId: typeof body.coworkerId === "string" ? body.coworkerId : undefined,
    orgId: typeof body.orgId === "string" ? body.orgId : undefined,
  };
}

/**
 * POST /api/demo/panic — force every adapter to fake (demo parachute).
 * Body matches Track J control panel: all adapters → fake in under one second.
 */
export async function panicAdapters(): Promise<DemoRequestResult> {
  return demoPost("/api/demo/panic", { mode: "all_fake" });
}
