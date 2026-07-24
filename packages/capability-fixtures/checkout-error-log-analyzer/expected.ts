import type { CheckoutErrorLogOutput } from "./types";

/**
 * Pinned expected output for the full demo window over
 * demo/acme-store/logs/checkout-errors.ndjson.
 *
 * distinctCount MUST be 9. Naive top-level-only extraction yields 4.
 */
export const DEMO_SEED_EXPECTED: CheckoutErrorLogOutput = {
  affectedCustomers: [
    "cus_AC2",
    "cus_BR3",
    "cus_KT4",
    "cus_LM5",
    "cus_NW1",
    "cus_OP6",
    "cus_QR7",
    "cus_ST8",
    "cus_UV9",
  ],
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

/** What the naive implementation reports for the same seed (wrong). */
export const NAIVE_WRONG_DISTINCT = 4;
export const NAIVE_WRONG_CUSTOMERS = ["cus_AC2", "cus_BR3", "cus_KT4", "cus_NW1"] as const;

/**
 * Exact attempt-1 trusted-gate failure text (Node correction).
 * Must stay `expected 9, received 4` — not 5, not "distinct customers" prose.
 */
export const ATTEMPT_1_FAILURE_MESSAGE = "expected 9, received 4";

/** File inventory confirmed by Node (do not re-author the ndjson). */
export const NDJSON_RECORD_COUNT = 44;
export const NDJSON_TOP_LEVEL_ONLY = 26;
export const NDJSON_NESTED_ONLY = 15;
export const NDJSON_NO_ID = 3;
