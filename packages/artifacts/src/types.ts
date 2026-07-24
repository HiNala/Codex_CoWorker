import type {
  Artifact,
  ArtifactStatus,
  ArtifactType,
  ArtifactVersion,
} from "@forge/contracts";

export type ContentFormat = ArtifactVersion["contentFormat"];
export type AuthorType = ArtifactVersion["authorType"];
export type ArtifactVisibility = Artifact["visibility"];

/** Declare an artifact from a contract expectedArtifacts entry + run context. */
export interface CreateArtifactInput {
  assignmentId: string;
  runId: string;
  coworkerId: string;
  projectId?: string | null;
  type: ArtifactType;
  title: string;
  slug?: string;
  visibility?: ArtifactVisibility;
  description?: string;
}

/** Create a new immutable version. Never mutates an existing version. */
export interface UpdateArtifactInput {
  artifactId: string;
  /**
   * Optimistic concurrency token. Must equal `currentVersionId`
   * (both null for the first version).
   */
  baseVersionId: string | null;
  content: string;
  changeSummary: string;
  authorType: AuthorType;
  authorRef: string;
  contentFormat?: ContentFormat;
  sourceEventRange?: { from: number; to: number };
}

export interface ListArtifactsFilter {
  assignmentId?: string;
  type?: ArtifactType;
  status?: ArtifactStatus;
  /** If provided and differs from session.orgId, results are empty. */
  orgId?: string;
}

export interface AttachEvidenceInput {
  artifactId: string;
  /** Citation / cell / section anchor on the artifact. */
  anchor: string;
  evidenceIds: string[];
}

export interface ArtifactReadResult {
  artifact: Artifact;
  version: ArtifactVersion | null;
  /** Resolved content (inline or from object store). */
  content: string | null;
  evidenceByAnchor: Record<string, string[]>;
}

export interface UpdateArtifactResult {
  artifact: Artifact;
  version: ArtifactVersion;
}

export interface AttachEvidenceResult {
  artifact: Artifact;
  anchor: string;
  evidenceIds: string[];
}

export interface VersionDiffSummary {
  contentEqual: boolean;
  changed: boolean;
  addedLines: number;
  removedLines: number;
}

export interface CompareVersionsResult {
  artifactId: string;
  versionA: ArtifactVersion;
  versionB: ArtifactVersion;
  contentA: string;
  contentB: string;
  summary: VersionDiffSummary;
}

export interface EvidenceAnchorMap {
  [anchor: string]: string[];
}
