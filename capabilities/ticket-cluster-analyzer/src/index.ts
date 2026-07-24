import type { Capability, RestrictedCapabilityContext } from "@forge/capability-sdk";
import { deepFreeze } from "@forge/capability-sdk";
import {
  agglomerate,
  buildCluster,
  buildSignature,
  JACCARD_THRESHOLD,
} from "./lib/cluster";
import type {
  ClusterAnalyzerInput,
  ClusterAnalyzerOutput,
} from "./lib/types";
import { validateInput } from "./lib/validate";

export type {
  Cluster,
  ClusterAnalyzerInput,
  ClusterAnalyzerOutput,
  TicketInput,
} from "./lib/types";

export const manifest = deepFreeze({
  schemaVersion: 1 as const,
  slug: "ticket-cluster-analyzer",
  name: "Ticket Cluster Analyzer",
  version: "1.2.0",
  kind: "skill" as const,
  description:
    "Groups support tickets by root cause using deterministic lexical clustering (n-grams + Jaccard).",
  runtime: "node22" as const,
  entrypoint: "dist/index.js" as const,
  inputSchema: {
    type: "object",
    required: ["tickets"],
    properties: {
      tickets: { type: "array" },
      minClusterSize: { type: "integer" },
    },
  },
  outputSchema: {
    type: "object",
    required: ["clusters", "unclustered", "summary"],
    properties: {
      clusters: { type: "array" },
      unclustered: { type: "array" },
      summary: { type: "object" },
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
    "Lexical clustering only — no embeddings or semantic model",
    "English stopword list; other languages may under-cluster",
    "Does not de-duplicate identical requesters across clusters",
  ],
  authoredBy: "human" as const,
});

async function execute(
  rawInput: ClusterAnalyzerInput,
  ctx: RestrictedCapabilityContext,
): Promise<ClusterAnalyzerOutput> {
  const input = validateInput(rawInput);
  const minClusterSize = input.minClusterSize ?? 2;

  ctx.log("info", `clustering ${input.tickets.length} tickets (minSize=${minClusterSize})`);

  if (input.tickets.length === 0) {
    ctx.log("info", "empty ticket list — returning empty result");
    return {
      clusters: [],
      unclustered: [],
      summary: { totalTickets: 0, clusteredTickets: 0, clusterCount: 0 },
    };
  }

  const signatures = input.tickets.map(buildSignature);
  const byId = new Map(signatures.map((s) => [s.ticket.id, s]));
  const groups = agglomerate(signatures, JACCARD_THRESHOLD);

  const clusters = [];
  const unclustered: string[] = [];

  for (const group of groups) {
    if (group.length >= minClusterSize) {
      clusters.push(buildCluster(group, byId));
    } else {
      unclustered.push(...group);
    }
  }

  clusters.sort((a, b) => a.clusterId.localeCompare(b.clusterId));
  unclustered.sort((a, b) => a.localeCompare(b));

  const clusteredTickets = clusters.reduce((n, c) => n + c.ticketIds.length, 0);

  ctx.log(
    "info",
    `produced ${clusters.length} clusters, ${unclustered.length} unclustered`,
  );

  return {
    clusters,
    unclustered,
    summary: {
      totalTickets: input.tickets.length,
      clusteredTickets,
      clusterCount: clusters.length,
    },
  };
}

const capability = {
  manifest,
  execute,
} as Capability<ClusterAnalyzerInput, ClusterAnalyzerOutput>;

export default capability;
