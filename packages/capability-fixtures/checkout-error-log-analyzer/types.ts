/**
 * Live-build capability I/O — frozen by 23-DEMO-SCENARIO §6.
 * Slug: checkout-error-log-analyzer
 */

export interface CheckoutErrorLogInput {
  /** Raw NDJSON lines (each line is one JSON object as a string). */
  lines: string[];
  window: {
    /** Inclusive ISO-8601 lower bound on `ts`. */
    from: string;
    /** Inclusive ISO-8601 upper bound on `ts`. */
    to: string;
  };
}

export interface CheckoutErrorLogOutput {
  /** Sorted unique customer ids that hit `checkout_failed` in-window. */
  affectedCustomers: string[];
  distinctCount: number;
  /** Event → count for every in-window line (all event kinds). */
  taxonomy: Record<string, number>;
  /** Earliest `checkout_failed` ts in window, or empty string if none. */
  firstSeen: string;
  /** Latest `checkout_failed` ts in window, or empty string if none. */
  lastSeen: string;
}

export type CheckoutErrorLogCase = {
  description: string;
  input: CheckoutErrorLogInput;
  expectedOutput: CheckoutErrorLogOutput;
};
