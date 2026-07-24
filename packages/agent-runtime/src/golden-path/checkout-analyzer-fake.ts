/**
 * Minimal dual-rule analyzer used by the fake golden path.
 * Mirrors packages/capability-fixtures/checkout-error-log-analyzer contract:
 *   attempt 1 (naive): Rule1 ✓ Rule2 ✗ → distinctCount 4
 *   attempt 2 (repair): Rule1 ✓ Rule2 ✓ → distinctCount 9
 *
 * Does not import Track C fixtures at runtime (read-only contract constants inlined)
 * so agent-runtime stays free of fixture ownership; proof test pins the message.
 */

export interface CheckoutAnalyzeOutput {
  affectedCustomers: string[];
  distinctCount: number;
  taxonomy: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
}

/** Pinned naive ids (sorted) — top-level customer_id only on the demo seed. */
export const NAIVE_CUSTOMERS = ["cus_AC2", "cus_BR3", "cus_KT4", "cus_NW1"] as const;

/** Pinned repaired ids (sorted) — both field shapes on the demo seed. */
export const REPAIRED_CUSTOMERS = [
  "cus_AC2",
  "cus_BR3",
  "cus_KT4",
  "cus_LM5",
  "cus_NW1",
  "cus_OP6",
  "cus_QR7",
  "cus_ST8",
  "cus_UV9",
] as const;

export function naiveAnalyzeSeed(): CheckoutAnalyzeOutput {
  return {
    affectedCustomers: [...NAIVE_CUSTOMERS],
    distinctCount: 4,
    taxonomy: {
      card_declined: 1,
      checkout_failed: 40,
      rate_limit: 2,
      timeout: 1,
    },
    firstSeen: "2026-07-16T09:14:02Z",
    lastSeen: "2026-07-23T15:59:41Z",
  };
}

export function repairedAnalyzeSeed(): CheckoutAnalyzeOutput {
  return {
    affectedCustomers: [...REPAIRED_CUSTOMERS],
    distinctCount: 9,
    taxonomy: {
      card_declined: 1,
      checkout_failed: 40,
      rate_limit: 2,
      timeout: 1,
    },
    firstSeen: "2026-07-16T09:14:02Z",
    lastSeen: "2026-07-23T15:59:41Z",
  };
}

export function attempt1FailureMessage(received = 4, expected = 9): string {
  return `expected ${expected}, received ${received}`;
}
