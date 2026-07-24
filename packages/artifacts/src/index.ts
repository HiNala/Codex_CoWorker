export const INLINE_CONTENT_LIMIT_BYTES = 64 * 1024;

export const artifactTools = [
  "artifact.declare",
  "artifact.read",
  "artifact.create_version",
  "artifact.link_evidence",
  "artifact.mark_ready",
  "artifact.export",
  "artifact.propose_publish",
] as const;

export function objectKeyForArtifact(orgId: string, artifactId: string, versionId: string): string {
  return `artifacts/${orgId}/${artifactId}/${versionId}`;
}
