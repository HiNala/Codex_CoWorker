import type { Capability, RestrictedCapabilityContext } from "@forge/capability-sdk";
import { deepFreeze } from "@forge/capability-sdk";
import { draftReleaseNotes } from "./lib/draft";
import type { ReleaseNoteInput, ReleaseNoteOutput } from "./lib/types";
import { validateInput } from "./lib/validate";

export type {
  Audience,
  CommitInput,
  GroupKey,
  ReleaseNoteInput,
  ReleaseNoteOutput,
} from "./lib/types";

export const manifest = deepFreeze({
  schemaVersion: 1 as const,
  slug: "release-note-drafter",
  name: "Release Note Drafter",
  version: "1.0.0",
  kind: "skill" as const,
  description: "Drafts release notes from conventional commits for internal or customer audiences.",
  runtime: "node22" as const,
  entrypoint: "dist/index.js" as const,
  inputSchema: {
    type: "object",
    required: ["commits", "previousTag", "newTag", "audience"],
    properties: {
      commits: { type: "array" },
      previousTag: { type: "string" },
      newTag: { type: "string" },
      audience: { type: "string", enum: ["internal", "customer"] },
    },
  },
  outputSchema: {
    type: "object",
    required: ["markdown", "grouped", "breakingChangeCount"],
    properties: {
      markdown: { type: "string" },
      grouped: { type: "object" },
      breakingChangeCount: { type: "integer" },
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
  dependencies: [] as string[],
  knownLimitations: [
    "Heuristic conventional-commit parser; nonstandard messages fall back to internal/features",
    "Customer audience rewrites are template-based, not LLM-authored",
  ],
  authoredBy: "codex" as const,
});

async function execute(
  rawInput: ReleaseNoteInput,
  ctx: RestrictedCapabilityContext,
): Promise<ReleaseNoteOutput> {
  const input = validateInput(rawInput);
  ctx.log(
    "info",
    `drafting notes ${input.previousTag}→${input.newTag} for ${input.audience} (${input.commits.length} commits)`,
  );
  const out = draftReleaseNotes(input);
  ctx.log(
    "info",
    `drafted notes: breaking=${out.breakingChangeCount}, features=${out.grouped.features.length}`,
  );
  return out;
}

const capability = {
  manifest,
  execute,
} as Capability<ReleaseNoteInput, ReleaseNoteOutput>;

export default capability;
