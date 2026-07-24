import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Load the authoritative seeded log from demo/acme-store.
 * Path is fixed by 23-DEMO-SCENARIO and Birch override.
 */
export function loadCheckoutErrorNdjsonLines(): string[] {
  const here = dirname(fileURLToPath(import.meta.url));
  // packages/capability-fixtures/checkout-error-log-analyzer → repo root
  const root = join(here, "..", "..", "..");
  const logPath = join(root, "demo", "acme-store", "logs", "checkout-errors.ndjson");
  const raw = readFileSync(logPath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Demo window covering the full seven-day seed (Jul 16–23 2026). */
export const DEMO_WINDOW = {
  from: "2026-07-16T00:00:00Z",
  to: "2026-07-23T23:59:59Z",
} as const;
