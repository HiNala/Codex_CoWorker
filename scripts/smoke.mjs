#!/usr/bin/env node
/**
 * Production / staging smoke checks against a public base URL.
 * Graceful: optional routes skip or WARN instead of hard-failing when missing.
 *
 * Usage:
 *   node scripts/smoke.mjs <baseUrl>
 *   node scripts/smoke.mjs https://example.up.railway.app
 *   FORGE_SMOKE_STRICT=1 node scripts/smoke.mjs <baseUrl>   # treat warnings as failures
 *
 * Checks (Track I §5, reduced for partial stacks):
 *   1 GET /                     — 200 (or 3xx)
 *   2 GET /pricing              — 200 if present, WARN if 404
 *   3 GET /api/health/live      — 200 required
 *   4 GET /api/health/ready     — 200 preferred; WARN on 503
 *   5 Security headers          — WARN if missing (HSTS may be absent off Railway edge)
 *   6 GET /api/health/status    — optional; WARN if missing; fail if secret-shaped body
 */

const STRICT = process.env.FORGE_SMOKE_STRICT === "1";
const baseArg = process.argv[2];

if (!baseArg || baseArg === "-h" || baseArg === "--help") {
  console.error("usage: node scripts/smoke.mjs <baseUrl>");
  process.exit(baseArg ? 0 : 1);
}

const baseUrl = baseArg.replace(/\/$/, "");
const results = [];

function record(name, ok, detail, level = ok ? "pass" : "fail") {
  results.push({ name, ok, detail, level });
  const tag = level.toUpperCase().padEnd(4);
  console.log(`[${tag}] ${name}: ${detail}`);
}

async function get(path, { timeoutMs = 12_000, redirect = "manual" } = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    method: "GET",
    redirect,
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: "text/html, application/json, */*" },
  });
  const text = await response.text();
  return { response, text, url };
}

/** Rough secret redaction check — never log matches. */
function looksSecretBearing(body) {
  const patterns = [
    /\bsk-[a-zA-Z0-9_-]{10,}\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\b(api[_-]?key|secret|token|password)\s*[:=]\s*['\"][^'\"]{8,}/i,
    /\beyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}\./, // JWT-ish
  ];
  return patterns.some((re) => re.test(body));
}

const expectedHeaders = [
  { name: "x-content-type-options", expect: /nosniff/i, required: false },
  { name: "referrer-policy", expect: /.+/, required: false },
  { name: "content-security-policy", expect: /.+/, required: false },
  { name: "strict-transport-security", expect: /max-age/i, required: false },
];

console.log(`smoke: base=${baseUrl} strict=${STRICT ? "yes" : "no"}`);
console.log("---");

// 1) GET /
try {
  const { response, text } = await get("/", { redirect: "follow" });
  if (response.ok) {
    const snippet = text.replace(/\s+/g, " ").slice(0, 80);
    record("GET /", true, `${response.status} ok (${snippet}${text.length > 80 ? "…" : ""})`);
  } else {
    record("GET /", false, `${response.status} ${response.statusText}`);
  }
} catch (error) {
  record("GET /", false, error instanceof Error ? error.message : String(error));
}

// 2) GET /pricing
try {
  const { response } = await get("/pricing", { redirect: "follow" });
  if (response.ok) {
    record("GET /pricing", true, `${response.status}`);
  } else if (response.status === 404) {
    record("GET /pricing", true, "404 (page not deployed yet)", "warn");
  } else {
    record("GET /pricing", false, `${response.status} ${response.statusText}`);
  }
} catch (error) {
  record(
    "GET /pricing",
    true,
    `skipped: ${error instanceof Error ? error.message : error}`,
    "warn",
  );
}

// 3) GET /api/health/live — required
try {
  const { response, text } = await get("/api/health/live");
  if (response.ok) {
    record("GET /api/health/live", true, `${response.status} ${text.slice(0, 120)}`);
  } else {
    record("GET /api/health/live", false, `${response.status} ${text.slice(0, 200)}`);
  }
} catch (error) {
  record("GET /api/health/live", false, error instanceof Error ? error.message : String(error));
}

// 4) GET /api/health/ready — preferred
try {
  const { response, text } = await get("/api/health/ready");
  if (response.ok) {
    record("GET /api/health/ready", true, `${response.status}`);
  } else if (response.status === 503) {
    record(
      "GET /api/health/ready",
      true,
      `503 not ready (deps may still be wiring): ${text.slice(0, 160)}`,
      "warn",
    );
  } else if (response.status === 404) {
    record("GET /api/health/ready", true, "404 (endpoint missing)", "warn");
  } else {
    record("GET /api/health/ready", false, `${response.status} ${text.slice(0, 200)}`);
  }
} catch (error) {
  record(
    "GET /api/health/ready",
    true,
    `skipped: ${error instanceof Error ? error.message : error}`,
    "warn",
  );
}

// 5) Security headers (sample from live or /)
try {
  const { response } = await get("/api/health/live");
  const missing = [];
  const present = [];
  for (const h of expectedHeaders) {
    const value = response.headers.get(h.name);
    if (value && h.expect.test(value)) {
      present.push(h.name);
    } else {
      missing.push(h.name);
    }
  }
  if (missing.length === 0) {
    record("security headers", true, `present: ${present.join(", ")}`);
  } else {
    record(
      "security headers",
      true,
      `missing or weak: ${missing.join(", ")} (present: ${present.join(", ") || "none"})`,
      "warn",
    );
  }
} catch (error) {
  record(
    "security headers",
    true,
    `skipped: ${error instanceof Error ? error.message : error}`,
    "warn",
  );
}

// 6) Optional status + secret leak guard
try {
  const { response, text } = await get("/api/health/status");
  if (response.status === 404 || response.status === 401 || response.status === 403) {
    record("GET /api/health/status", true, `${response.status} (optional/auth)`, "warn");
  } else if (response.ok) {
    if (looksSecretBearing(text)) {
      record(
        "GET /api/health/status",
        false,
        "response body appears to contain secret-shaped values",
      );
    } else {
      record("GET /api/health/status", true, `${response.status} no secret-shaped strings`);
    }
  } else {
    record("GET /api/health/status", true, `${response.status} optional`, "warn");
  }
} catch (error) {
  record(
    "GET /api/health/status",
    true,
    `skipped: ${error instanceof Error ? error.message : error}`,
    "warn",
  );
}

console.log("---");
const fails = results.filter((r) => r.level === "fail");
const warns = results.filter((r) => r.level === "warn");
console.log(
  `smoke summary: pass=${results.filter((r) => r.level === "pass").length} warn=${warns.length} fail=${fails.length}`,
);

if (fails.length > 0) {
  process.exit(1);
}
if (STRICT && warns.length > 0) {
  console.error("smoke: FORGE_SMOKE_STRICT=1 and warnings present");
  process.exit(1);
}
process.exit(0);
