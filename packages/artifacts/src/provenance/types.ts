/**
 * Provenance relations recorded on artifacts.
 * Matches Track E canvas: input artifacts · evidence · capability versions ·
 * tool invocations · human edits · approvals · source run.
 */
export type ProvenanceRelation =
  | "input_artifact"
  | "evidence"
  | "capability_version"
  | "tool_invocation"
  | "human_edit"
  | "approval"
  | "source_run";

export type ProvenanceNodeKind =
  | "artifact"
  | "artifact_version"
  | "evidence"
  | "capability_version"
  | "tool_invocation"
  | "human_edit"
  | "approval"
  | "run";

export type ProvenanceNode = {
  id: string;
  kind: ProvenanceNodeKind;
  label: string;
  /** Optional structured metadata for UI (hashes, ordinals, timestamps). */
  meta?: Record<string, unknown>;
};

/**
 * Directed edge: `fromId` depends on / was produced with `toId`.
 * Upstream traversal walks from → to.
 */
export type ProvenanceEdge = {
  fromId: string;
  toId: string;
  relation: ProvenanceRelation;
};

export type ProvenanceGraph = {
  rootId: string;
  nodes: ProvenanceNode[];
  edges: ProvenanceEdge[];
};

/** Raw relation row used to build a graph (service / DB shape). */
export type ProvenanceRelationInput = {
  fromId: string;
  toId: string;
  relation: ProvenanceRelation;
  label?: string;
  meta?: Record<string, unknown>;
};

/** Lightweight evidence pointer for graph node labels. */
export type ProvenanceEvidenceRef = {
  id: string;
  title: string;
  trust?: string;
  sourceUrl?: string | null;
};

/** Lightweight version pointer for graph node labels. */
export type ProvenanceVersionRef = {
  id: string;
  artifactId: string;
  ordinal: number;
  changeSummary?: string;
  sha256?: string;
};
