import type {
  ProvenanceEdge,
  ProvenanceEvidenceRef,
  ProvenanceGraph,
  ProvenanceNode,
  ProvenanceNodeKind,
  ProvenanceRelation,
  ProvenanceRelationInput,
  ProvenanceVersionRef,
} from "./types";

const RELATION_TO_TARGET_KIND: Record<ProvenanceRelation, ProvenanceNodeKind> = {
  input_artifact: "artifact",
  evidence: "evidence",
  capability_version: "capability_version",
  tool_invocation: "tool_invocation",
  human_edit: "human_edit",
  approval: "approval",
  source_run: "run",
};

function defaultLabel(kind: ProvenanceNodeKind, id: string): string {
  switch (kind) {
    case "artifact":
      return `Artifact ${shortId(id)}`;
    case "artifact_version":
      return `Version ${shortId(id)}`;
    case "evidence":
      return `Evidence ${shortId(id)}`;
    case "capability_version":
      return `Capability ${shortId(id)}`;
    case "tool_invocation":
      return `Tool ${shortId(id)}`;
    case "human_edit":
      return `Edit ${shortId(id)}`;
    case "approval":
      return `Approval ${shortId(id)}`;
    case "run":
      return `Run ${shortId(id)}`;
    default:
      return shortId(id);
  }
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

function upsertNode(
  nodes: Map<string, ProvenanceNode>,
  node: ProvenanceNode,
): void {
  const existing = nodes.get(node.id);
  if (!existing) {
    nodes.set(node.id, node);
    return;
  }
  // Prefer richer labels / meta; never drop known kind.
  nodes.set(node.id, {
    ...existing,
    label: node.label && node.label !== defaultLabel(node.kind, node.id)
      ? node.label
      : existing.label,
    meta: { ...existing.meta, ...node.meta },
  });
}

/**
 * Build a provenance graph for an artifact from explicit relations plus
 * optional evidence and version catalogs used for node labels.
 *
 * Edges point from consumer → dependency (upstream is edge.toId).
 */
export function buildProvenanceGraph(
  artifactId: string,
  relations: readonly ProvenanceRelationInput[],
  evidence: readonly ProvenanceEvidenceRef[] = [],
  versions: readonly ProvenanceVersionRef[] = [],
): ProvenanceGraph {
  const nodes = new Map<string, ProvenanceNode>();
  const edges: ProvenanceEdge[] = [];
  const edgeKeys = new Set<string>();

  const evidenceById = new Map(evidence.map((e) => [e.id, e]));
  const versionsById = new Map(versions.map((v) => [v.id, v]));

  upsertNode(nodes, {
    id: artifactId,
    kind: "artifact",
    label: `Artifact ${shortId(artifactId)}`,
  });

  // Version catalog enriches node labels / kinds. Edges only come from explicit
  // relations — never invent a relation for version history (Canvas owns that UI).
  for (const version of versions) {
    upsertNode(nodes, {
      id: version.id,
      kind: "artifact_version",
      label: `v${version.ordinal}${version.changeSummary ? `: ${version.changeSummary}` : ""}`,
      meta: {
        ordinal: version.ordinal,
        sha256: version.sha256,
        artifactId: version.artifactId,
      },
    });
  }

  for (const rel of relations) {
    const fromId = rel.fromId || artifactId;
    const toId = rel.toId;
    if (!toId) continue;

    const targetKind = RELATION_TO_TARGET_KIND[rel.relation];
    let label = rel.label;
    let meta = rel.meta ? { ...rel.meta } : undefined;

    if (rel.relation === "evidence") {
      const ev = evidenceById.get(toId);
      if (ev) {
        label = label ?? ev.title;
        meta = {
          ...meta,
          trust: ev.trust,
          sourceUrl: ev.sourceUrl ?? null,
        };
      }
    }

    if (targetKind === "artifact_version" || versionsById.has(toId)) {
      const ver = versionsById.get(toId);
      if (ver) {
        label = label ?? `v${ver.ordinal}`;
        meta = { ...meta, ordinal: ver.ordinal, sha256: ver.sha256 };
      }
    }

    upsertNode(nodes, {
      id: fromId,
      kind: "artifact",
      label:
        fromId === artifactId
          ? `Artifact ${shortId(artifactId)}`
          : defaultLabel("artifact", fromId),
    });

    upsertNode(nodes, {
      id: toId,
      kind: versionsById.has(toId) ? "artifact_version" : targetKind,
      label: label ?? defaultLabel(targetKind, toId),
      meta,
    });

    const key = `${fromId}->${toId}:${rel.relation}`;
    if (edgeKeys.has(key)) continue;
    edgeKeys.add(key);
    edges.push({ fromId, toId, relation: rel.relation });
  }

  // Attach evidence catalog nodes even if no explicit relation row yet
  // (caller may pass evidence scoped to this artifact for panel display).
  for (const ev of evidence) {
    if (!nodes.has(ev.id)) {
      upsertNode(nodes, {
        id: ev.id,
        kind: "evidence",
        label: ev.title,
        meta: { trust: ev.trust, sourceUrl: ev.sourceUrl ?? null },
      });
    }
  }

  return {
    rootId: artifactId,
    nodes: [...nodes.values()],
    edges,
  };
}

/**
 * Walk upstream dependencies from `fromId` (BFS along edges from → to).
 * Returns nodes in discovery order, excluding the start node.
 * Cycles are ignored via a visited set.
 */
export function traverseUpstream(
  graph: ProvenanceGraph,
  fromId: string,
): ProvenanceNode[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, string[]>();

  for (const edge of graph.edges) {
    const list = adjacency.get(edge.fromId);
    if (list) list.push(edge.toId);
    else adjacency.set(edge.fromId, [edge.toId]);
  }

  const visited = new Set<string>([fromId]);
  const queue: string[] = [fromId];
  const result: ProvenanceNode[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const nextIds = adjacency.get(current) ?? [];
    for (const nextId of nextIds) {
      if (visited.has(nextId)) continue;
      visited.add(nextId);
      const node = byId.get(nextId);
      if (node) {
        result.push(node);
      } else {
        // Edge target without node entry — still surface a stub for honesty.
        result.push({
          id: nextId,
          kind: "artifact",
          label: defaultLabel("artifact", nextId),
        });
      }
      queue.push(nextId);
    }
  }

  return result;
}

/** Collect nodes by relation type from edges leaving a node. */
export function nodesByRelation(
  graph: ProvenanceGraph,
  fromId: string,
  relation: ProvenanceRelation,
): ProvenanceNode[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const out: ProvenanceNode[] = [];
  for (const edge of graph.edges) {
    if (edge.fromId !== fromId || edge.relation !== relation) continue;
    const node = byId.get(edge.toId);
    if (node) out.push(node);
  }
  return out;
}
