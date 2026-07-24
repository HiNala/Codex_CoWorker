/**
 * Checkout error log fixtures for the broken-checkout scenario.
 *
 * Naive top-level `customer_id` reads yield 4 distinct customers.
 * Correct nested `context.customer.id` handling yields 9.
 */

export type CheckoutErrorLogLine = {
  ts: string;
  level: "error";
  message: "checkout_failed";
  plan: "starter" | "team" | "scale";
  interval: "monthly" | "yearly";
  /** Present only on older log lines (pre-logger-refactor). */
  customer_id?: string;
  /** Present on newer log lines after logger refactor. */
  context?: {
    customer?: {
      id?: string;
    };
  };
  error?: string;
};

/** Distinct customers that only appear at top-level customer_id (naive path sees these). */
const TOP_LEVEL_CUSTOMERS = ["cus_top_01", "cus_top_02", "cus_top_03", "cus_top_04"] as const;

/** Distinct customers that only appear nested under context.customer.id. */
const NESTED_CUSTOMERS = [
  "cus_nest_05",
  "cus_nest_06",
  "cus_nest_07",
  "cus_nest_08",
  "cus_nest_09",
] as const;

export const NAIVE_DISTINCT_CUSTOMER_COUNT = TOP_LEVEL_CUSTOMERS.length; // 4
export const CORRECT_DISTINCT_CUSTOMER_COUNT = TOP_LEVEL_CUSTOMERS.length + NESTED_CUSTOMERS.length; // 9

function line(
  partial: Omit<CheckoutErrorLogLine, "level" | "message"> &
    Partial<Pick<CheckoutErrorLogLine, "level" | "message">>,
): CheckoutErrorLogLine {
  return {
    level: "error",
    message: "checkout_failed",
    error: "Something went wrong. Please try again.",
    ...partial,
  };
}

/** ~40 entries across seven days (Jul 16–23 2026). */
export const checkoutErrorLogLines: readonly CheckoutErrorLogLine[] = [
  // Older shape — top-level customer_id
  line({
    ts: "2026-07-16T09:12:00.000Z",
    plan: "team",
    interval: "yearly",
    customer_id: "cus_top_01",
  }),
  line({
    ts: "2026-07-16T11:40:00.000Z",
    plan: "team",
    interval: "yearly",
    customer_id: "cus_top_01",
  }),
  line({
    ts: "2026-07-16T15:05:00.000Z",
    plan: "starter",
    interval: "yearly",
    customer_id: "cus_top_02",
  }),
  line({
    ts: "2026-07-17T08:22:00.000Z",
    plan: "scale",
    interval: "yearly",
    customer_id: "cus_top_03",
  }),
  line({
    ts: "2026-07-17T10:01:00.000Z",
    plan: "team",
    interval: "yearly",
    customer_id: "cus_top_04",
  }),
  line({
    ts: "2026-07-17T14:33:00.000Z",
    plan: "team",
    interval: "yearly",
    customer_id: "cus_top_02",
  }),
  line({
    ts: "2026-07-18T09:00:00.000Z",
    plan: "team",
    interval: "yearly",
    customer_id: "cus_top_03",
  }),
  line({
    ts: "2026-07-18T12:18:00.000Z",
    plan: "starter",
    interval: "yearly",
    customer_id: "cus_top_04",
  }),
  // Logger refactor — nested context.customer.id only
  line({
    ts: "2026-07-18T16:44:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_05" } },
  }),
  line({
    ts: "2026-07-19T08:05:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_05" } },
  }),
  line({
    ts: "2026-07-19T09:30:00.000Z",
    plan: "scale",
    interval: "yearly",
    context: { customer: { id: "cus_nest_06" } },
  }),
  line({
    ts: "2026-07-19T11:12:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_07" } },
  }),
  line({
    ts: "2026-07-19T13:55:00.000Z",
    plan: "starter",
    interval: "yearly",
    context: { customer: { id: "cus_nest_08" } },
  }),
  line({
    ts: "2026-07-19T15:40:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_09" } },
  }),
  line({
    ts: "2026-07-20T08:20:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_06" } },
  }),
  line({
    ts: "2026-07-20T10:02:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_07" } },
  }),
  line({
    ts: "2026-07-20T12:47:00.000Z",
    plan: "scale",
    interval: "yearly",
    context: { customer: { id: "cus_nest_08" } },
  }),
  line({
    ts: "2026-07-20T14:11:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_09" } },
  }),
  line({
    ts: "2026-07-20T16:30:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_05" } },
  }),
  line({
    ts: "2026-07-21T09:15:00.000Z",
    plan: "starter",
    interval: "yearly",
    context: { customer: { id: "cus_nest_06" } },
  }),
  line({
    ts: "2026-07-21T11:00:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_07" } },
  }),
  line({
    ts: "2026-07-21T13:22:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_08" } },
  }),
  line({
    ts: "2026-07-21T15:48:00.000Z",
    plan: "scale",
    interval: "yearly",
    context: { customer: { id: "cus_nest_09" } },
  }),
  line({
    ts: "2026-07-22T08:40:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_05" } },
  }),
  line({
    ts: "2026-07-22T10:25:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_06" } },
  }),
  line({
    ts: "2026-07-22T12:05:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_07" } },
  }),
  line({
    ts: "2026-07-22T14:50:00.000Z",
    plan: "starter",
    interval: "yearly",
    context: { customer: { id: "cus_nest_08" } },
  }),
  line({
    ts: "2026-07-22T16:18:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_09" } },
  }),
  // Interleave a few monthly successes? No — fixture is error-only.
  // Final day includes Priya-like bursts + mixed shapes
  line({
    ts: "2026-07-23T08:10:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_05" } },
  }),
  line({
    ts: "2026-07-23T09:05:00.000Z",
    plan: "team",
    interval: "yearly",
    customer_id: "cus_top_01",
  }),
  line({
    ts: "2026-07-23T10:20:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_06" } },
  }),
  line({
    ts: "2026-07-23T11:33:00.000Z",
    plan: "scale",
    interval: "yearly",
    context: { customer: { id: "cus_nest_07" } },
  }),
  line({
    ts: "2026-07-23T12:40:00.000Z",
    plan: "team",
    interval: "yearly",
    customer_id: "cus_top_02",
  }),
  line({
    ts: "2026-07-23T13:15:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_08" } },
  }),
  line({
    ts: "2026-07-23T14:02:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_09" } },
  }),
  line({
    ts: "2026-07-23T14:22:00.000Z",
    plan: "team",
    interval: "yearly",
    customer_id: "cus_top_03",
  }),
  line({
    ts: "2026-07-23T15:08:00.000Z",
    plan: "starter",
    interval: "yearly",
    context: { customer: { id: "cus_nest_05" } },
  }),
  line({
    ts: "2026-07-23T15:45:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_06" } },
  }),
  line({
    ts: "2026-07-23T16:10:00.000Z",
    plan: "team",
    interval: "yearly",
    customer_id: "cus_top_04",
  }),
  line({
    ts: "2026-07-23T16:55:00.000Z",
    plan: "team",
    interval: "yearly",
    context: { customer: { id: "cus_nest_09" } },
  }),
];

/** NDJSON string matching logs/checkout-errors.ndjson shape. */
export function checkoutErrorsNdjson(): string {
  return checkoutErrorLogLines.map((entry) => JSON.stringify(entry)).join("\n");
}

/** Naive extraction: top-level customer_id only → 4. */
export function naiveDistinctCustomers(
  lines: readonly CheckoutErrorLogLine[] = checkoutErrorLogLines,
): string[] {
  const ids = new Set<string>();
  for (const entry of lines) {
    if (entry.customer_id) ids.add(entry.customer_id);
  }
  return [...ids].sort();
}

/** Correct extraction: top-level or nested → 9. */
export function correctDistinctCustomers(
  lines: readonly CheckoutErrorLogLine[] = checkoutErrorLogLines,
): string[] {
  const ids = new Set<string>();
  for (const entry of lines) {
    if (entry.customer_id) ids.add(entry.customer_id);
    const nested = entry.context?.customer?.id;
    if (nested) ids.add(nested);
  }
  return [...ids].sort();
}
