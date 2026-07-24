/**
 * Pure access-gating helpers for demo mutation endpoints.
 * Never log or return the access code itself.
 */

export type DemoEnv = {
  NODE_ENV?: string | undefined;
  DEMO_MODE?: string | undefined;
  DEMO_ACCESS_CODE?: string | undefined;
};

export type DemoAccessDenial =
  | { ok: false; status: 403; code: "production_blocked"; message: string }
  | { ok: false; status: 401; code: "invalid_access_code"; message: string };

export type DemoAccessOk = { ok: true };

export type DemoAccessResult = DemoAccessOk | DemoAccessDenial;

/** Demo mutations are refused in production unless DEMO_MODE=1. */
export function isDemoMutationAllowed(env: DemoEnv = process.env): boolean {
  if (env.NODE_ENV === "production" && env.DEMO_MODE !== "1") {
    return false;
  }
  return true;
}

/** Constant-time-ish equality for short access codes (no secrets in errors). */
export function verifyDemoAccessCode(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!expected || expected.length === 0) return false;
  if (!provided || provided.length === 0) return false;
  if (provided.length !== expected.length) {
    // Still walk both strings to avoid trivial length oracle on short codes.
    let mix = 0;
    for (let i = 0; i < expected.length; i += 1) {
      mix |= expected.charCodeAt(i) ^ (provided.charCodeAt(i % provided.length) ?? 0);
    }
    return mix === 0 && provided.length === expected.length;
  }
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Prefer header `x-demo-access-code`, then query `code` / `accessCode`.
 * Does not read cookies (sessionStorage is client-side only).
 */
export function extractDemoAccessCode(
  headers: { get(name: string): string | null },
  query?: { get(name: string): string | null },
): string | null {
  const fromHeader = headers.get("x-demo-access-code") ?? headers.get("X-Demo-Access-Code");
  if (fromHeader && fromHeader.trim().length > 0) {
    return fromHeader.trim();
  }
  if (query) {
    const fromQuery = query.get("code") ?? query.get("accessCode");
    if (fromQuery && fromQuery.trim().length > 0) {
      return fromQuery.trim();
    }
  }
  return null;
}

/** Full gate used by API routes. Does not echo the code. */
export function gateDemoMutation(
  env: DemoEnv,
  providedCode: string | null | undefined,
): DemoAccessResult {
  if (!isDemoMutationAllowed(env)) {
    return {
      ok: false,
      status: 403,
      code: "production_blocked",
      message: "Demo mutations are disabled in production unless DEMO_MODE=1.",
    };
  }
  if (!verifyDemoAccessCode(providedCode, env.DEMO_ACCESS_CODE)) {
    return {
      ok: false,
      status: 401,
      code: "invalid_access_code",
      message: "Invalid or missing demo access code.",
    };
  }
  return { ok: true };
}

/** Status/challenge endpoint may confirm whether a code is valid without mutating. */
export function gateDemoRead(
  env: DemoEnv,
  providedCode: string | null | undefined,
): DemoAccessResult {
  // Reads are allowed in production when DEMO_MODE=1; otherwise same production rule.
  return gateDemoMutation(env, providedCode);
}
