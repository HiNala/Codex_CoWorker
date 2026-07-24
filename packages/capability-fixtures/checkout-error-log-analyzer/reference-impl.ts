/**
 * REFERENCE implementation — ground truth for verifier + fake Codex transcript.
 * NOT installed as a product capability.
 *
 * Applies BOTH rules:
 *   Rule 1 — level === 'error' && event === 'checkout_failed'
 *   Rule 2 — customer_id (top-level) OR context.customer.id (nested)
 */
import type { CheckoutErrorLogInput, CheckoutErrorLogOutput } from "./types";
import { inWindow, isCheckoutFailedError, parseLine, resolveCustomerIdBothShapes } from "./rules";

export { resolveCustomerIdBothShapes as resolveCustomerId };

export function referenceAnalyze(input: CheckoutErrorLogInput): CheckoutErrorLogOutput {
  const { from, to } = input.window;
  const customers = new Set<string>();
  const taxonomy: Record<string, number> = {};
  let firstSeen = "";
  let lastSeen = "";

  for (const line of input.lines) {
    const row = parseLine(line);
    if (!row) continue;
    const ts = typeof row.ts === "string" ? row.ts : "";
    if (!ts || !inWindow(ts, from, to)) continue;

    const event = typeof row.event === "string" ? row.event : "unknown";
    taxonomy[event] = (taxonomy[event] ?? 0) + 1;

    // Rule 1
    if (!isCheckoutFailedError(row)) continue;

    // Rule 2 — both shapes
    const customerId = resolveCustomerIdBothShapes(row);
    if (customerId) {
      customers.add(customerId);
    }

    if (!firstSeen || ts < firstSeen) firstSeen = ts;
    if (!lastSeen || ts > lastSeen) lastSeen = ts;
  }

  const affectedCustomers = [...customers].sort((a, b) => a.localeCompare(b));
  const sortedTaxonomy: Record<string, number> = {};
  for (const key of Object.keys(taxonomy).sort((a, b) => a.localeCompare(b))) {
    sortedTaxonomy[key] = taxonomy[key]!;
  }

  return {
    affectedCustomers,
    distinctCount: affectedCustomers.length,
    taxonomy: sortedTaxonomy,
    firstSeen,
    lastSeen,
  };
}
