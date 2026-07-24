import { randomUUID } from "node:crypto";
import type { Artifact, ArtifactStatus, ArtifactVersion, Session } from "@forge/contracts";
import {
  ArtifactNoContentError,
  ArtifactNotFoundError,
  ArtifactStaleBaseError,
  ArtifactValidationError,
} from "../errors";
import { contentByteLength, sha256Hex } from "../hash";
import { assertTransition } from "../lifecycle";
import type {
  ArtifactReadResult,
  AttachEvidenceInput,
  AttachEvidenceResult,
  CompareVersionsResult,
  CreateArtifactInput,
  ListArtifactsFilter,
  UpdateArtifactInput,
  UpdateArtifactResult,
} from "../types";
import {
  defaultContentFormat,
  lineDiffSummary,
  scanSecrets,
  slugifyTitle,
  validateContentForType,
} from "./content";
import { MemoryArtifactStore } from "./memory-store";

/** Mirrors packages/artifacts/src/index.ts — imported value to avoid circular wiring. */
const INLINE_CONTENT_LIMIT_BYTES = 64 * 1024;

function objectKeyForArtifact(orgId: string, artifactId: string, versionId: string): string {
  return `artifacts/${orgId}/${artifactId}/${versionId}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function cloneArtifact(artifact: Artifact): Artifact {
  return { ...artifact };
}

function cloneVersion(version: ArtifactVersion): ArtifactVersion {
  return {
    ...version,
    sourceEventRange: { ...version.sourceEventRange },
  };
}

/**
 * In-memory ArtifactService implementing the seven controlled tools.
 * Agents never touch tables — they call tools that land here.
 */
export class ArtifactService {
  readonly #store: MemoryArtifactStore;

  constructor(store: MemoryArtifactStore = new MemoryArtifactStore()) {
    this.#store = store;
  }

  get store(): MemoryArtifactStore {
    return this.#store;
  }

  /**
   * `artifact.create` — declare from contract expectedArtifacts (status: declared).
   */
  create(session: Session, input: CreateArtifactInput): Artifact {
    this.#assertIds(
      input.assignmentId,
      input.runId,
      input.coworkerId,
      input.projectId ?? undefined,
    );

    if (!input.title || input.title.trim().length === 0) {
      throw new ArtifactValidationError("title is required");
    }

    const ts = nowIso();
    const id = randomUUID();
    const slug = input.slug && input.slug.length > 0 ? input.slug : slugifyTitle(input.title);

    const artifact: Artifact = {
      id,
      orgId: session.orgId,
      projectId: input.projectId ?? null,
      assignmentId: input.assignmentId,
      runId: input.runId,
      coworkerId: input.coworkerId,
      type: input.type,
      title: input.title.trim(),
      slug,
      status: "declared",
      visibility: input.visibility ?? "org",
      currentVersionId: null,
      approvedVersionId: null,
      createdAt: ts,
      updatedAt: ts,
    };

    this.#store.putArtifact(artifact);
    return cloneArtifact(artifact);
  }

  /**
   * `artifact.update` — append a new immutable version; never mutates prior content.
   */
  update(session: Session, input: UpdateArtifactInput): UpdateArtifactResult {
    const artifact = this.#requireArtifact(session, input.artifactId);

    if (artifact.currentVersionId !== input.baseVersionId) {
      throw new ArtifactStaleBaseError(
        `baseVersionId ${input.baseVersionId ?? "null"} does not match currentVersionId ${artifact.currentVersionId ?? "null"}`,
      );
    }

    const contentFormat = input.contentFormat ?? defaultContentFormat(artifact.type);
    scanSecrets(input.content);
    validateContentForType(artifact.type, input.content, contentFormat);

    if (!input.changeSummary || input.changeSummary.trim().length === 0) {
      throw new ArtifactValidationError("changeSummary is required");
    }
    if (!input.authorRef || input.authorRef.trim().length === 0) {
      throw new ArtifactValidationError("authorRef is required");
    }

    const versionId = randomUUID();
    const ordinal = this.#store.nextOrdinal(artifact.id);
    const sha256 = sha256Hex(input.content);
    const bytes = contentByteLength(input.content);
    const storeInline = bytes < INLINE_CONTENT_LIMIT_BYTES;

    let contentInline: string | null;
    let objectKey: string | null;

    if (storeInline) {
      contentInline = input.content;
      objectKey = null;
    } else {
      contentInline = null;
      objectKey = objectKeyForArtifact(artifact.orgId, artifact.id, versionId);
      this.#store.putObjectBody(objectKey, input.content);
    }

    const version: ArtifactVersion = {
      id: versionId,
      artifactId: artifact.id,
      parentVersionId: input.baseVersionId,
      ordinal,
      authorType: input.authorType,
      authorRef: input.authorRef.trim(),
      contentFormat,
      contentInline,
      objectKey,
      sha256,
      changeSummary: input.changeSummary.trim(),
      sourceEventRange: input.sourceEventRange ?? { from: 0, to: 0 },
      createdAt: nowIso(),
    };

    // Append-only: never mutate existing version records.
    this.#store.putVersion(version);

    // First content, or new content while under/after review, returns to drafting.
    let nextStatus: ArtifactStatus = artifact.status;
    if (artifact.status === "declared") {
      nextStatus = "drafting";
    } else if (artifact.status === "ready_for_review" || artifact.status === "rejected") {
      nextStatus = "drafting";
    }

    if (nextStatus !== artifact.status) {
      assertTransition(artifact.status, nextStatus);
    }

    const updated: Artifact = {
      ...artifact,
      status: nextStatus,
      currentVersionId: versionId,
      updatedAt: nowIso(),
    };
    this.#store.putArtifact(updated);

    return {
      artifact: cloneArtifact(updated),
      version: cloneVersion(version),
    };
  }

  /**
   * `artifact.read` — by id + optional version. Cross-tenant → null (404 semantics).
   */
  read(
    session: Session,
    artifactId: string,
    versionId?: string,
  ): ArtifactReadResult | null {
    const artifact = this.#store.getArtifact(artifactId);
    if (!artifact || artifact.orgId !== session.orgId) {
      return null;
    }

    let version: ArtifactVersion | null = null;
    if (versionId !== undefined) {
      const found = this.#store.getVersion(versionId);
      if (!found || found.artifactId !== artifact.id) {
        return null;
      }
      version = cloneVersion(found);
    } else if (artifact.currentVersionId) {
      const found = this.#store.getVersion(artifact.currentVersionId);
      version = found ? cloneVersion(found) : null;
    }

    const content = version ? this.#store.resolveContent(version) : null;

    return {
      artifact: cloneArtifact(artifact),
      version,
      content,
      evidenceByAnchor: this.#store.evidenceAsRecord(artifact.id),
    };
  }

  /**
   * `artifact.list` — filter by assignmentId, type, status, orgId.
   * Always scoped to session.orgId; mismatch filter returns empty.
   */
  list(session: Session, filter: ListArtifactsFilter = {}): Artifact[] {
    if (filter.orgId !== undefined && filter.orgId !== session.orgId) {
      return [];
    }

    const results: Artifact[] = [];
    for (const artifact of this.#store.artifacts.values()) {
      if (artifact.orgId !== session.orgId) continue;
      if (filter.assignmentId !== undefined && artifact.assignmentId !== filter.assignmentId) {
        continue;
      }
      if (filter.type !== undefined && artifact.type !== filter.type) continue;
      if (filter.status !== undefined && artifact.status !== filter.status) continue;
      results.push(cloneArtifact(artifact));
    }

    results.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return results;
  }

  /**
   * `artifact.attach_evidence` — attach evidence ids to an anchor.
   */
  attachEvidence(session: Session, input: AttachEvidenceInput): AttachEvidenceResult {
    const artifact = this.#requireArtifact(session, input.artifactId);

    if (!input.anchor || input.anchor.trim().length === 0) {
      throw new ArtifactValidationError("anchor is required");
    }
    if (!Array.isArray(input.evidenceIds) || input.evidenceIds.length === 0) {
      throw new ArtifactValidationError("evidenceIds must be a non-empty array");
    }

    const map = this.#store.getEvidenceMap(artifact.id);
    const anchor = input.anchor.trim();
    const existing = map.get(anchor) ?? [];
    const merged = [...new Set([...existing, ...input.evidenceIds])];
    map.set(anchor, merged);

    const updated: Artifact = {
      ...artifact,
      updatedAt: nowIso(),
    };
    this.#store.putArtifact(updated);

    return {
      artifact: cloneArtifact(updated),
      anchor,
      evidenceIds: [...merged],
    };
  }

  /**
   * `artifact.request_review` — transition to ready_for_review when content exists.
   */
  requestReview(session: Session, artifactId: string): Artifact {
    const artifact = this.#requireArtifact(session, artifactId);

    if (!artifact.currentVersionId) {
      throw new ArtifactNoContentError(
        "Cannot request review for an artifact with no content version",
      );
    }

    assertTransition(artifact.status, "ready_for_review");

    const updated: Artifact = {
      ...artifact,
      status: "ready_for_review",
      updatedAt: nowIso(),
    };
    this.#store.putArtifact(updated);
    return cloneArtifact(updated);
  }

  /**
   * `artifact.compare_versions` — both version records + simple text diff summary.
   */
  compareVersions(
    session: Session,
    artifactId: string,
    versionAId: string,
    versionBId: string,
  ): CompareVersionsResult {
    const artifact = this.#requireArtifact(session, artifactId);

    const versionA = this.#store.getVersion(versionAId);
    const versionB = this.#store.getVersion(versionBId);

    if (!versionA || versionA.artifactId !== artifact.id) {
      throw new ArtifactNotFoundError(`Version not found: ${versionAId}`);
    }
    if (!versionB || versionB.artifactId !== artifact.id) {
      throw new ArtifactNotFoundError(`Version not found: ${versionBId}`);
    }

    const contentA = this.#store.resolveContent(versionA) ?? "";
    const contentB = this.#store.resolveContent(versionB) ?? "";

    return {
      artifactId: artifact.id,
      versionA: cloneVersion(versionA),
      versionB: cloneVersion(versionB),
      contentA,
      contentB,
      summary: lineDiffSummary(contentA, contentB),
    };
  }

  /**
   * Explicit status transition (approvals, archive, etc.). Not a tool — used by API/UI.
   */
  transition(session: Session, artifactId: string, to: ArtifactStatus): Artifact {
    const artifact = this.#requireArtifact(session, artifactId);
    assertTransition(artifact.status, to);

    const updated: Artifact = {
      ...artifact,
      status: to,
      updatedAt: nowIso(),
      approvedVersionId:
        to === "approved" ? artifact.currentVersionId : artifact.approvedVersionId,
    };
    this.#store.putArtifact(updated);
    return cloneArtifact(updated);
  }

  #requireArtifact(session: Session, artifactId: string): Artifact {
    const artifact = this.#store.getArtifact(artifactId);
    if (!artifact || artifact.orgId !== session.orgId) {
      // Cross-tenant and missing look identical — never leak existence.
      throw new ArtifactNotFoundError();
    }
    return artifact;
  }

  #assertIds(...ids: Array<string | undefined>): void {
    for (const id of ids) {
      if (id === undefined) continue;
      // Loose UUID check; contracts use z.string().uuid()
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      ) {
        throw new ArtifactValidationError(`Invalid id: ${id}`);
      }
    }
  }
}
