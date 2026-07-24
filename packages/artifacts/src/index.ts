export const INLINE_CONTENT_LIMIT_BYTES = 64 * 1024;

export { ARTIFACT_TOOL_NAMES, artifactToolDescriptors } from "./tools/descriptors";
export type { ArtifactToolName } from "./tools/descriptors";

/** Seven controlled tools (dot style) — length checked by foundation tests. */
export const artifactTools = [
  "artifact.create",
  "artifact.update",
  "artifact.read",
  "artifact.list",
  "artifact.attach_evidence",
  "artifact.request_review",
  "artifact.compare_versions",
] as const;

export function objectKeyForArtifact(orgId: string, artifactId: string, versionId: string): string {
  return `artifacts/${orgId}/${artifactId}/${versionId}`;
}

export { sha256Hex, contentByteLength } from "./hash";
export { canTransition, assertTransition, LEGAL_TRANSITIONS } from "./lifecycle";
export {
  ArtifactStaleBaseError,
  ArtifactNotFoundError,
  ArtifactIllegalTransitionError,
  ArtifactSecretDetectedError,
  ArtifactValidationError,
  ArtifactNoContentError,
} from "./errors";
export type * from "./types";

export { ArtifactService } from "./service/artifact-service";
export { MemoryArtifactStore } from "./service/memory-store";
export { dispatchArtifactTool } from "./tools/handlers";

export * from "./renderers/index";
export * from "./evidence/resolve";
export * from "./evidence/trust";
export type * from "./evidence/types";
export * from "./provenance/graph";
export type * from "./provenance/types";
