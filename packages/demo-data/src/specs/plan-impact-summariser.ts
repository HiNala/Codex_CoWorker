/**
 * Wildcard card 2 — group tickets by customer plan and rank impact.
 */

export const planImpactSummariserSpec = {
  slug: "plan-impact-summariser",
  name: "Plan impact summariser",
  purpose:
    "Group support tickets by customer plan and report which plan is hurting most.",
  inputSchema: {
    type: "object",
    required: ["tickets"],
    properties: {
      tickets: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "plan"],
          properties: {
            id: { type: "string" },
            plan: { type: "string", enum: ["starter", "team", "scale"] },
            priority: { type: "string" },
            subject: { type: "string" },
          },
        },
      },
    },
  },
  outputSchema: {
    type: "object",
    required: ["byPlan", "worstPlan"],
    properties: {
      byPlan: {
        type: "object",
        additionalProperties: {
          type: "object",
          properties: {
            count: { type: "integer" },
            ticketIds: { type: "array", items: { type: "string" } },
          },
        },
      },
      worstPlan: { type: "string" },
      summary: { type: "string" },
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
      name: "ranks team highest",
      input: {
        tickets: [
          { id: "1", plan: "team" },
          { id: "2", plan: "team" },
          { id: "3", plan: "starter" },
          { id: "4", plan: "scale" },
        ],
      },
      expected: { worstPlan: "team", teamCount: 2 },
    },
  ],
} as const;
