#!/usr/bin/env node
/**
 * Poll GET /api/health/live until 200 or timeout.
 *
 * Usage:
 *   node scripts/wait-healthy.mjs <baseUrl> [--timeout-ms 180000] [--interval-ms 5000]
 *   node scripts/wait-healthy.mjs https://example.up.railway.app
 *
 * Exit 0 when live is healthy. Exit 1 on timeout / hard failure.
 * Also probes /api/health/ready when present (non-fatal if 503 during warm-up).
 */

const args = process.argv.slice(2);

function usage(exitCode = 1) {
  console.error(
    "usage: node scripts/wait-healthy.mjs <baseUrl> [--timeout-ms N] [--interval-ms N]",
  );
  process.exit(exitCode);
}

if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
  usage(args.includes("-h") || args.includes("--help") ? 0 : 1);
}

let baseUrl = "";
let timeoutMs = 180_000;
let intervalMs = 5_000;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--timeout-ms") {
    timeoutMs = Number(args[++i]);
  } else if (a === "--interval-ms") {
    intervalMs = Number(args[++i]);
  } else if (a.startsWith("--")) {
    console.error(`unknown flag: ${a}`);
    usage(1);
  } else if (!baseUrl) {
    baseUrl = a.replace(/\/$/, "");
  } else {
    console.error(`unexpected arg: ${a}`);
    usage(1);
  }
}

if (!baseUrl || !Number.isFinite(timeoutMs) || !Number.isFinite(intervalMs)) {
  usage(1);
}

const liveUrl = `${baseUrl}/api/health/live`;
const readyUrl = `${baseUrl}/api/health/ready`;
const deadline = Date.now() + timeoutMs;
let attempt = 0;

console.log(`wait-healthy: polling ${liveUrl}`);
console.log(`  timeout=${timeoutMs}ms interval=${intervalMs}ms`);

while (Date.now() < deadline) {
  attempt += 1;
  try {
    const response = await fetch(liveUrl, {
      signal: AbortSignal.timeout(8_000),
      headers: { accept: "application/json, text/plain, */*" },
    });
    const body = (await response.text()).slice(0, 200);
    if (response.ok) {
      console.log(`live OK attempt=${attempt} status=${response.status} body=${body}`);
      try {
        const ready = await fetch(readyUrl, {
          signal: AbortSignal.timeout(8_000),
          headers: { accept: "application/json, text/plain, */*" },
        });
        const readyBody = (await ready.text()).slice(0, 240);
        if (ready.ok) {
          console.log(`ready OK status=${ready.status}`);
        } else {
          console.log(
            `ready not green yet status=${ready.status} (non-fatal for wait-healthy) body=${readyBody}`,
          );
        }
      } catch (readyError) {
        const msg = readyError instanceof Error ? readyError.message : String(readyError);
        console.log(`ready probe failed (non-fatal): ${msg}`);
      }
      process.exit(0);
    }
    console.log(`live not ready attempt=${attempt} status=${response.status} body=${body}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`live probe error attempt=${attempt}: ${msg}`);
  }

  const remaining = deadline - Date.now();
  if (remaining <= 0) break;
  await new Promise((r) => setTimeout(r, Math.min(intervalMs, remaining)));
}

console.error(`wait-healthy: timed out after ${timeoutMs}ms (${attempt} attempts) for ${liveUrl}`);
process.exit(1);
