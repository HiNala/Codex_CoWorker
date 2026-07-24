import type { Capability, RestrictedCapabilityContext } from "@forge/capability-sdk";
import { deepFreeze } from "@forge/capability-sdk";
import { mapImpact } from "./lib/map";
import type { ImpactMapperInput, ImpactMapperOutput } from "./lib/types";
import { validateInput } from "./lib/validate";

export type {
  Account,
  ClusterRef,
  ImpactMapperInput,
  ImpactMapperOutput,
  ImpactRow,
  Severity,
} from "./lib/types";
export { computeSeverity } from "./lib/severity";
export { HIGH_MRR_THRESHOLD_MICRODOLLARS } from "./lib/types";

export const manifest = deepFreeze({
  schemaVersion: 1 as const,
  slug: "customer-impact-mapper",
  name: "Customer Impact Mapper",
  version: "1.0.1",
  kind: "skill" as const,
  description:
    "Joins ticket clusters to customer accounts and produces a severity-ranked impact table with evidence refs.",
  runtime: "node22" as const,
  entrypoint: "dist/index.js" as const,
  inputSchema: {
    type: "object",
    required: ["clusters", "accounts", "ticketRequesterIndex"],
    properties: {
      clusters: { type: "array" },
      accounts: { type: "array" },
      ticketRequesterIndex: { type: "object" },
    },
  },
  outputSchema: {
    type: "object",
    required: ["rows", "totals"],
    properties: {
      rows: { type: "array" },
      totals: { type: "object" },
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
    "Severity is rule-based, not model-scored",
    "Unmatched requesters are skipped (no row) rather than inventing accounts",
    "MRR at risk uses full account MRR when any ticket matches",
  ],
  authoredBy: "human" as const,
});

async function execute(
  rawInput: ImpactMapperInput,
  ctx: RestrictedCapabilityContext,
): Promise<ImpactMapperOutput> {
  const input = validateInput(rawInput);
  ctx.log(
    "info",
    `mapping ${input.clusters.length} clusters across ${input.accounts.length} accounts`,
  );
  return mapImpact(input, (level, message) => ctx.log(level, message));
}

const capability = {
  manifest,
  execute,
} as Capability<ImpactMapperInput, ImpactMapperOutput>;

export default capability;
