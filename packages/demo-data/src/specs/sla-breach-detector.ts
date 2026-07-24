/**
 * Wildcard card 1 — "Find every ticket that breached our SLA last week."
 * Pre-written spec stub for a sub-90s foundry build.
 */

export const slaBreachDetectorSpec = {
  slug: "sla-breach-detector",
  name: "SLA breach detector",
  purpose:
    "Scan recent support tickets and return those that breached the org SLA window last week.",
  inputSchema: {
    type: "object",
    required: ["tickets", "slaHours"],
    properties: {
      tickets: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "createdAt", "firstResponseAt", "status"],
          properties: {
            id: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            firstResponseAt: { type: ["string", "null"], format: "date-time" },
            status: { type: "string" },
            priority: { type: "string" },
          },
        },
      },
      slaHours: { type: "number", minimum: 1 },
      window: {
        type: "object",
        properties: {
          from: { type: "string", format: "date-time" },
          to: { type: "string", format: "date-time" },
        },
      },
    },
  },
  outputSchema: {
    type: "object",
    required: ["breached", "count"],
    properties: {
      breached: {
        type: "array",
        items: {
          type: "object",
          required: ["ticketId", "hoursToFirstResponse", "slaHours"],
          properties: {
            ticketId: { type: "string" },
            hoursToFirstResponse: { type: "number" },
            slaHours: { type: "number" },
          },
        },
      },
      count: { type: "integer" },
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
      name: "flags ticket past sla",
      input: {
        slaHours: 24,
        tickets: [
          {
            id: "T-1",
            createdAt: "2026-07-14T10:00:00.000Z",
            firstResponseAt: "2026-07-16T12:00:00.000Z",
            status: "open",
          },
        ],
      },
      expected: { count: 1, breachedTicketIds: ["T-1"] },
    },
    {
      name: "ignores tickets inside sla",
      input: {
        slaHours: 24,
        tickets: [
          {
            id: "T-2",
            createdAt: "2026-07-20T10:00:00.000Z",
            firstResponseAt: "2026-07-20T12:00:00.000Z",
            status: "open",
          },
        ],
      },
      expected: { count: 0, breachedTicketIds: [] },
    },
  ],
} as const;
