/**
 * Wildcard card 3 — already installed on the demo coworker.
 * Correct outcome is declining to rebuild; stub still ships for fixtures.
 */

export const releaseNoteDrafterSpec = {
  slug: "release-note-drafter",
  name: "Release note drafter",
  purpose: "Draft customer-facing release notes from a list of commits or change summaries.",
  inputSchema: {
    type: "object",
    required: ["changes"],
    properties: {
      changes: {
        type: "array",
        items: {
          type: "object",
          required: ["title"],
          properties: {
            title: { type: "string" },
            body: { type: "string" },
            type: { type: "string", enum: ["fix", "feat", "chore", "breaking"] },
          },
        },
      },
      audience: { type: "string", default: "customers" },
    },
  },
  outputSchema: {
    type: "object",
    required: ["markdown", "headline"],
    properties: {
      headline: { type: "string" },
      markdown: { type: "string" },
      bullets: { type: "array", items: { type: "string" } },
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
      name: "drafts bullets from commits",
      input: {
        changes: [
          { title: "Fix annual checkout interval mismatch", type: "fix" },
          { title: "Return typed 400 for unknown plan/interval", type: "fix" },
        ],
        audience: "customers",
      },
      expected: {
        contains: ["annual checkout", "plan"],
      },
    },
  ],
  /** Demo note: already installed — coworker should reuse, not rebuild. */
  alreadyInstalledInDemoSeed: true,
} as const;
