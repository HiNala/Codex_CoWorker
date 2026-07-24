import type { ArtifactPort } from "../types";

export interface StoredArtifact {
  id: string;
  runId: string;
  type: string;
  title: string;
  description: string;
  versions: Array<{ versionId: string; stepId: string; title: string; body: string }>;
}

export class MemoryArtifactPort implements ArtifactPort {
  readonly items: StoredArtifact[] = [];
  #next = 0;

  constructor(
    private readonly fixed?: { artifactId: string; versionId: string },
  ) {}

  async declare(
    runId: string,
    spec: { type: string; title: string; description: string },
  ): Promise<{ id: string }> {
    const id = this.fixed?.artifactId ?? `019f0000-0000-7000-8000-${String(++this.#next).padStart(12, "0")}`;
    this.items.push({
      id,
      runId,
      type: spec.type,
      title: spec.title,
      description: spec.description,
      versions: [],
    });
    return { id };
  }

  async write(
    ref: { artifactId: string; stepId: string },
    content: { title: string; body: string },
  ): Promise<{ versionId: string }> {
    const item = this.items.find((a) => a.id === ref.artifactId);
    if (!item) throw new Error(`Unknown artifact ${ref.artifactId}`);
    const versionId =
      this.fixed?.versionId ?? `019f0000-0000-7000-8000-${String(++this.#next).padStart(12, "0")}`;
    item.versions.push({
      versionId,
      stepId: ref.stepId,
      title: content.title,
      body: content.body,
    });
    return { versionId };
  }
}
