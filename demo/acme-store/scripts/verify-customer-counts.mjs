/**
 * Hand-check for the nested customer_id trap in logs/checkout-errors.ndjson.
 *
 * Naive implementations only read top-level `customer_id` → 4 distinct.
 * Correct implementations also read `context.customer.id` → 9 distinct.
 *
 * Usage: node scripts/verify-customer-counts.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logPath = join(root, "logs", "checkout-errors.ndjson");
const raw = readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean);
const events = raw.map((line) => JSON.parse(line));
const failed = events.filter((e) => e.event === "checkout_failed");

const naive = new Set();
const correct = new Set();
const taxonomy = {};

for (const e of events) {
  taxonomy[e.event] = (taxonomy[e.event] ?? 0) + 1;
}

for (const e of failed) {
  if (typeof e.customer_id === "string") {
    naive.add(e.customer_id);
    correct.add(e.customer_id);
  }
  const nested = e?.context?.customer?.id;
  if (typeof nested === "string") {
    correct.add(nested);
  }
}

const firstSeen = failed[0]?.ts;
const lastSeen = failed[failed.length - 1]?.ts;

const report = {
  totalLines: events.length,
  failedAttempts: failed.length,
  naiveDistinct: naive.size,
  correctDistinct: correct.size,
  firstSeen,
  lastSeen,
  taxonomy,
};

console.log(JSON.stringify(report, null, 2));

const ok =
  failed.length === 40 &&
  naive.size === 4 &&
  correct.size === 9 &&
  firstSeen?.startsWith("2026-07-16") &&
  lastSeen?.startsWith("2026-07-23");

if (!ok) {
  console.error("VERIFY FAILED: expected 40 failures, naive=4, correct=9, window Jul 16–23");
  process.exit(1);
}

console.log("VERIFY OK: naive=4, correct=9, failedAttempts=40");
