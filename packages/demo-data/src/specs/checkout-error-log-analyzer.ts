/**
 * Live-build capability for the golden path (scenario 23).
 * Pinned fallback if the model wanders while specifying the gap.
 */

export const checkoutErrorLogAnalyzerSpec = {
  slug: "checkout-error-log-analyzer",
  name: "Checkout error log analyzer",
  purpose:
    "Parse checkout error log lines and report distinct affected customers, taxonomy, and window.",
  inputSchema: {
    type: "object",
    required: ["lines", "window"],
    properties: {
      lines: { type: "array", items: { type: "string" } },
      window: {
        type: "object",
        required: ["from", "to"],
        properties: {
          from: { type: "string", format: "date-time" },
          to: { type: "string", format: "date-time" },
        },
      },
    },
  },
  outputSchema: {
    type: "object",
    required: ["affectedCustomers", "distinctCount", "taxonomy", "firstSeen", "lastSeen"],
    properties: {
      affectedCustomers: { type: "array", items: { type: "string" } },
      distinctCount: { type: "integer" },
      taxonomy: { type: "object", additionalProperties: { type: "integer" } },
      firstSeen: { type: "string", format: "date-time" },
      lastSeen: { type: "string", format: "date-time" },
    },
  },
  permissions: {
    network: false as const,
    filesystem: "none" as const,
    evidenceRead: true,
    maxDurationMs: 10_000,
    maxMemoryMb: 256,
    maxOutputBytes: 500_000,
  },
  trustedTestCases: [
    {
      name: "counts nested and top-level customer ids as 9",
      input: {
        window: { from: "2026-07-16T00:00:00.000Z", to: "2026-07-24T00:00:00.000Z" },
        lines: ["__use_checkout_errors_fixture__"],
      },
      expected: { distinctCount: 9 },
    },
    {
      name: "naive top-level-only implementation fails this case",
      input: {
        window: { from: "2026-07-16T00:00:00.000Z", to: "2026-07-24T00:00:00.000Z" },
        lines: ["__use_checkout_errors_fixture__"],
      },
      expected: {
        distinctCount: 9,
        note: "A naive top-level customer_id reader returns 4 and must repair.",
      },
    },
  ],
  notInstalledAtDemoStart: true,
} as const;
