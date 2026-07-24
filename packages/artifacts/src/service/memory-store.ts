import type { Artifact, ArtifactVersion } from "@forge/contracts";

/**
 * In-memory, Map-based artifact store for unit tests and pre-DB adapters.
 * Not durable. Not multi-process. Deterministic enough for service tests.
 */
export class MemoryArtifactStore {
  readonly artifacts = new Map<string, Artifact>();
  /** versionId → version record */
  readonly versions = new Map<string, ArtifactVersion>();
  /** artifactId → ordered version ids (ordinal ascending) */
  readonly versionOrder = new Map<string, string[]>();
  /** artifactId → anchor → evidence ids */
  readonly evidenceByArtifact = new Map<string, Map<string, string[]>>();
  /** objectKey → full content body (simulates object storage) */
  readonly objectBodies = new Map<string, string>();

  clear(): void {
    this.artifacts.clear();
    this.versions.clear();
    this.versionOrder.clear();
    this.evidenceByArtifact.clear();
    this.objectBodies.clear();
  }

  getArtifact(id: string): Artifact | undefined {
    return this.artifacts.get(id);
  }

  putArtifact(artifact: Artifact): void {
    this.artifacts.set(artifact.id, artifact);
  }

  getVersion(id: string): ArtifactVersion | undefined {
    return this.versions.get(id);
  }

  putVersion(version: ArtifactVersion): void {
    this.versions.set(version.id, version);
    const order = this.versionOrder.get(version.artifactId) ?? [];
    order.push(version.id);
    this.versionOrder.set(version.artifactId, order);
  }

  listVersionIds(artifactId: string): readonly string[] {
    return this.versionOrder.get(artifactId) ?? [];
  }

  listVersions(artifactId: string): ArtifactVersion[] {
    return this.listVersionIds(artifactId)
      .map((id) => this.versions.get(id))
      .filter((v): v is ArtifactVersion => v !== undefined);
  }

  nextOrdinal(artifactId: string): number {
    return this.listVersionIds(artifactId).length + 1;
  }

  putObjectBody(objectKey: string, content: string): void {
    this.objectBodies.set(objectKey, content);
  }

  getObjectBody(objectKey: string): string | undefined {
    return this.objectBodies.get(objectKey);
  }

  resolveContent(version: ArtifactVersion): string | null {
    if (version.contentInline !== null) return version.contentInline;
    if (version.objectKey !== null) {
      return this.objectBodies.get(version.objectKey) ?? null;
    }
    return null;
  }

  getEvidenceMap(artifactId: string): Map<string, string[]> {
    let map = this.evidenceByArtifact.get(artifactId);
    if (!map) {
      map = new Map();
      this.evidenceByArtifact.set(artifactId, map);
    }
    return map;
  }

  evidenceAsRecord(artifactId: string): Record<string, string[]> {
    const map = this.evidenceByArtifact.get(artifactId);
    if (!map) return {};
    const out: Record<string, string[]> = {};
    for (const [anchor, ids] of map) {
      out[anchor] = [...ids];
    }
    return out;
  }
}
