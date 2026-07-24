/**
 * Two load-bearing rules for checkout-error-log-analyzer.
 * Authority: docs/agent-briefs/RIGEL-fixture-correction.md + 23-DEMO-SCENARIO §6.
 */

/** Rule 1 — count only real checkout errors (excludes warn/card_declined distractor). */
export function isCheckoutFailedError(row: Record<string, unknown>): boolean {
  return row.level === "error" && row.event === "checkout_failed";
}

/**
 * Rule 2 — field shape after logger migration.
 * Older: top-level customer_id. Newer: context.customer.id.
 * Naive implementations omit the nested path on purpose.
 */
export function resolveCustomerIdBothShapes(row: Record<string, unknown>): string | null {
  if (typeof row.customer_id === "string" && row.customer_id.length > 0) {
    return row.customer_id;
  }
  const context = row.context;
  if (context && typeof context === "object" && !Array.isArray(context)) {
    const customer = (context as Record<string, unknown>).customer;
    if (customer && typeof customer === "object" && !Array.isArray(customer)) {
      const id = (customer as Record<string, unknown>).id;
      if (typeof id === "string" && id.length > 0) return id;
    }
  }
  return null;
}

/** Naive Rule 2 failure: top-level only. */
export function resolveCustomerIdTopLevelOnly(row: Record<string, unknown>): string | null {
  if (typeof row.customer_id === "string" && row.customer_id.length > 0) {
    return row.customer_id;
  }
  return null;
}

export function inWindow(ts: string, from: string, to: string): boolean {
  return ts >= from && ts <= to;
}

export function parseLine(line: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(line) as unknown;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}
