/**
 * NAIVE implementation — deliberately incomplete on RULE 2 only.
 *
 * Rule 1 (filter) IS applied correctly:
 *   level === 'error' && event === 'checkout_failed'
 *   so cus_ZZ9 (warn / card_declined, line 22) is excluded.
 *
 * Rule 2 (field shape) is MISSED:
 *   only top-level customer_id — never context.customer.id
 *
 * Against demo/acme-store/logs/checkout-errors.ndjson:
 *   distinctCount = 4  (not 9)
 *
 * If this instead missed Rule 1, counts become 5 / 10 and the scripted beat breaks.
 * Do not "fix" the nested path here — the foundry repair is the stage beat.
 */
import type { CheckoutErrorLogInput, CheckoutErrorLogOutput } from "./types";
import { inWindow, isCheckoutFailedError, parseLine, resolveCustomerIdTopLevelOnly } from "./rules";

export function naiveAnalyze(input: CheckoutErrorLogInput): CheckoutErrorLogOutput {
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

    // Rule 1: correct filter (must keep — missing it yields 5 not 4)
    if (!isCheckoutFailedError(row)) continue;

    // Rule 2 NAIVE: top-level only
    const customerId = resolveCustomerIdTopLevelOnly(row);
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
