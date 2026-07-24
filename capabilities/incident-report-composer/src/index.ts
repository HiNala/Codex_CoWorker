import type { Capability, RestrictedCapabilityContext } from "@forge/capability-sdk";
import { deepFreeze } from "@forge/capability-sdk";
import { composeReport } from "./lib/compose";
import type { ReportComposerInput, ReportComposerOutput } from "./lib/types";
import { validateInput } from "./lib/validate";

export type {
  Citation,
  ClusterIn,
  EvidenceIn,
  ImpactRowIn,
  ReportComposerInput,
  ReportComposerOutput,
  SectionMeta,
} from "./lib/types";

export const manifest = deepFreeze({
  schemaVersion: 1 as const,
  slug: "incident-report-composer",
  name: "Incident Report Composer",
  version: "2.0.0",
  kind: "skill" as const,
  description:
    "Composes a cited markdown incident report from clusters, impact rows, evidence, and timeline.",
  runtime: "node22" as const,
  entrypoint: "dist/index.js" as const,
  inputSchema: {
    type: "object",
    required: ["title", "clusters", "impactRows", "evidence", "timeline"],
    properties: {
      title: { type: "string" },
      clusters: { type: "array" },
      impactRows: { type: "array" },
      evidence: { type: "array" },
      timeline: { type: "array" },
      changeSummary: { type: "string" },
    },
  },
  outputSchema: {
    type: "object",
    required: ["markdown", "sections", "citations", "warnings"],
    properties: {
      markdown: { type: "string" },
      sections: { type: "array" },
      citations: { type: "array" },
      warnings: { type: "array" },
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
    "Never fabricates citations; unsupported claims become warnings",
    "Escapes HTML but does not run a full markdown sanitizer",
    "Recommended actions are template-based heuristics",
  ],
  authoredBy: "codex" as const,
});

async function execute(
  rawInput: ReportComposerInput,
  ctx: RestrictedCapabilityContext,
): Promise<ReportComposerOutput> {
  const input = validateInput(rawInput);
  ctx.log(
    "info",
    `composing report "${input.title}" with ${input.clusters.length} clusters, ${input.evidence.length} evidence`,
  );
  const out = composeReport(input);
  ctx.log(
    "info",
    `report ready: ${out.sections.length} sections, ${out.citations.length} citations, ${out.warnings.length} warnings`,
  );
  return out;
}

const capability = {
  manifest,
  execute,
} as Capability<ReportComposerInput, ReportComposerOutput>;

export default capability;
