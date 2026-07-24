import { describe, expect, it } from "vitest";
import { buildProvenanceGraph, nodesByRelation, traverseUpstream } from "./graph";
import type { ProvenanceRelationInput } from "./types";

const ARTIFACT_ID = "0198206f-5f53-7000-8000-000000000701";
const INPUT_ARTIFACT = "0198206f-5f53-7000-8000-000000000700";
const EVIDENCE_A = "0198206f-5f53-7000-8000-000000000601";
const EVIDENCE_B = "0198206f-5f53-7000-8000-000000000602";
const CAP_VER = "0198206f-5f53-7000-8000-000000000801";
const TOOL_INV = "0198206f-5f53-7000-8000-000000000901";
const RUN_ID = "0198206f-5f53-7000-8000-000000000501";
const VERSION_ID = "0198206f-5f53-7000-8000-000000000711";
const APPROVAL_ID = "0198206f-5f53-7000-8000-000000000721";
const EDIT_ID = "0198206f-5f53-7000-8000-000000000731";

const relations: ProvenanceRelationInput[] = [
  {
    fromId: ARTIFACT_ID,
    toId: INPUT_ARTIFACT,
    relation: "input_artifact",
    label: "Prior incident notes",
  },
  {
    fromId: ARTIFACT_ID,
    toId: EVIDENCE_A,
    relation: "evidence",
  },
  {
    fromId: ARTIFACT_ID,
    toId: EVIDENCE_B,
    relation: "evidence",
  },
  {
    fromId: ARTIFACT_ID,
    toId: CAP_VER,
    relation: "capability_version",
    label: "ticket-clusterer@1.0.0",
  },
  {
    fromId: ARTIFACT_ID,
    toId: TOOL_INV,
    relation: "tool_invocation",
    label: "artifact.link_evidence",
  },
  {
    fromId: ARTIFACT_ID,
    toId: RUN_ID,
    relation: "source_run",
  },
  {
    fromId: ARTIFACT_ID,
    toId: APPROVAL_ID,
    relation: "approval",
    label: "Ready-for-review approval",
  },
  {
    fromId: ARTIFACT_ID,
    toId: EDIT_ID,
    relation: "human_edit",
    label: "Title tweak",
  },
];

const evidence = [
  {
    id: EVIDENCE_A,
    title: "Checkout cadence contract",
    trust: "official",
    sourceUrl: "https://docs.example.test/checkout/cadence",
  },
  {
    id: EVIDENCE_B,
    title: "Ticket #4412",
    trust: "secondary",
    sourceUrl: null,
  },
];

const versions = [
  {
    id: VERSION_ID,
    artifactId: ARTIFACT_ID,
    ordinal: 2,
    changeSummary: "Add citation anchors",
    sha256: "d".repeat(64),
  },
];

describe("buildProvenanceGraph", () => {
  it("includes the root artifact and all relation targets", () => {
    const graph = buildProvenanceGraph(ARTIFACT_ID, relations, evidence, versions);
    expect(graph.rootId).toBe(ARTIFACT_ID);
    const ids = new Set(graph.nodes.map((n) => n.id));
    expect(ids.has(ARTIFACT_ID)).toBe(true);
    expect(ids.has(EVIDENCE_A)).toBe(true);
    expect(ids.has(CAP_VER)).toBe(true);
    expect(ids.has(RUN_ID)).toBe(true);
    // Version catalog is indexed as nodes even without a relation edge.
    expect(ids.has(VERSION_ID)).toBe(true);
  });

  it("labels evidence nodes from the catalog", () => {
    const graph = buildProvenanceGraph(ARTIFACT_ID, relations, evidence, versions);
    const node = graph.nodes.find((n) => n.id === EVIDENCE_A);
    expect(node?.kind).toBe("evidence");
    expect(node?.label).toBe("Checkout cadence contract");
    expect(node?.meta?.trust).toBe("official");
  });

  it("dedupes identical relation edges", () => {
    const duped = [
      ...relations,
      { fromId: ARTIFACT_ID, toId: EVIDENCE_A, relation: "evidence" as const },
    ];
    const graph = buildProvenanceGraph(ARTIFACT_ID, duped, evidence, versions);
    const evidenceEdges = graph.edges.filter(
      (e) => e.toId === EVIDENCE_A && e.relation === "evidence",
    );
    expect(evidenceEdges).toHaveLength(1);
  });

  it("records every provenance relation kind", () => {
    const graph = buildProvenanceGraph(ARTIFACT_ID, relations, evidence, versions);
    const kinds = new Set(graph.edges.map((e) => e.relation));
    for (const rel of [
      "input_artifact",
      "evidence",
      "capability_version",
      "tool_invocation",
      "human_edit",
      "approval",
      "source_run",
    ] as const) {
      expect(kinds.has(rel)).toBe(true);
    }
  });
});

describe("traverseUpstream", () => {
  it("returns upstream dependencies in BFS order excluding the start", () => {
    const graph = buildProvenanceGraph(ARTIFACT_ID, relations, evidence, versions);
    const upstream = traverseUpstream(graph, ARTIFACT_ID);
    const ids = upstream.map((n) => n.id);
    expect(ids).not.toContain(ARTIFACT_ID);
    expect(ids).toContain(EVIDENCE_A);
    expect(ids).toContain(INPUT_ARTIFACT);
    expect(ids).toContain(RUN_ID);
    // Versions are catalog nodes without synthetic edges unless related explicitly.
    expect(ids).not.toContain(VERSION_ID);
  });

  it("handles cycles without looping forever", () => {
    const cyclic: ProvenanceRelationInput[] = [
      { fromId: "a", toId: "b", relation: "input_artifact" },
      { fromId: "b", toId: "a", relation: "input_artifact" },
    ];
    const graph = buildProvenanceGraph("a", cyclic);
    const upstream = traverseUpstream(graph, "a");
    expect(upstream.map((n) => n.id)).toEqual(["b"]);
  });

  it("returns empty when node has no outbound edges", () => {
    const graph = buildProvenanceGraph(ARTIFACT_ID, []);
    expect(traverseUpstream(graph, ARTIFACT_ID)).toEqual([]);
  });
});

describe("nodesByRelation", () => {
  it("filters direct dependencies by relation", () => {
    const graph = buildProvenanceGraph(ARTIFACT_ID, relations, evidence, versions);
    const evidenceNodes = nodesByRelation(graph, ARTIFACT_ID, "evidence");
    expect(evidenceNodes.map((n) => n.id).sort()).toEqual([EVIDENCE_A, EVIDENCE_B].sort());
  });
});
