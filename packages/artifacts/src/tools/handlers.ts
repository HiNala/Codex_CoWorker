import type { Session } from "@forge/contracts";
import type { ArtifactService } from "../service/artifact-service";
import type {
  AttachEvidenceInput,
  CreateArtifactInput,
  ListArtifactsFilter,
  UpdateArtifactInput,
} from "../types";
import { ArtifactValidationError } from "../errors";
import { ARTIFACT_TOOL_NAMES, type ArtifactToolName } from "./descriptors";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireString(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new ArtifactValidationError(`${key} must be a non-empty string`);
  }
  return value;
}

function optionalString(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new ArtifactValidationError(`${key} must be a string`);
  }
  return value;
}

function asArgs(args: unknown): Record<string, unknown> {
  if (!isRecord(args)) {
    throw new ArtifactValidationError("Tool arguments must be an object");
  }
  return args;
}

export function isArtifactToolName(name: string): name is ArtifactToolName {
  return (ARTIFACT_TOOL_NAMES as readonly string[]).includes(name);
}

/**
 * Dispatch a controlled artifact tool name to the corresponding service method.
 * Session is always the authority for tenant scope.
 */
export function dispatchArtifactTool(
  service: ArtifactService,
  session: Session,
  name: string,
  args: unknown,
): unknown {
  if (!isArtifactToolName(name)) {
    throw new ArtifactValidationError(`Unknown artifact tool: ${name}`);
  }

  switch (name) {
    case "artifact.create": {
      const a = asArgs(args);
      const input: CreateArtifactInput = {
        assignmentId: requireString(a, "assignmentId"),
        runId: requireString(a, "runId"),
        coworkerId: requireString(a, "coworkerId"),
        type: requireString(a, "type") as CreateArtifactInput["type"],
        title: requireString(a, "title"),
      };
      const projectId = a["projectId"];
      if (projectId === null) {
        input.projectId = null;
      } else if (typeof projectId === "string") {
        input.projectId = projectId;
      }
      const slug = optionalString(a, "slug");
      if (slug !== undefined) input.slug = slug;
      const visibility = optionalString(a, "visibility");
      if (visibility === "private" || visibility === "org" || visibility === "published") {
        input.visibility = visibility;
      }
      const description = optionalString(a, "description");
      if (description !== undefined) input.description = description;
      return service.create(session, input);
    }

    case "artifact.update": {
      const a = asArgs(args);
      const baseRaw = a["baseVersionId"];
      let baseVersionId: string | null;
      if (baseRaw === null) {
        baseVersionId = null;
      } else if (typeof baseRaw === "string") {
        baseVersionId = baseRaw;
      } else {
        throw new ArtifactValidationError("baseVersionId must be a string or null");
      }

      const input: UpdateArtifactInput = {
        artifactId: requireString(a, "artifactId"),
        baseVersionId,
        content: requireString(a, "content"),
        changeSummary: requireString(a, "changeSummary"),
        authorType: requireString(a, "authorType") as UpdateArtifactInput["authorType"],
        authorRef: requireString(a, "authorRef"),
      };
      const contentFormat = optionalString(a, "contentFormat");
      if (
        contentFormat === "markdown" ||
        contentFormat === "json" ||
        contentFormat === "diff"
      ) {
        input.contentFormat = contentFormat;
      }
      const range = a["sourceEventRange"];
      if (isRecord(range) && typeof range["from"] === "number" && typeof range["to"] === "number") {
        input.sourceEventRange = { from: range["from"], to: range["to"] };
      }
      return service.update(session, input);
    }

    case "artifact.read": {
      const a = asArgs(args);
      const artifactId = requireString(a, "artifactId");
      const versionId = optionalString(a, "versionId");
      return service.read(session, artifactId, versionId);
    }

    case "artifact.list": {
      const a = asArgs(args);
      const filter: ListArtifactsFilter = {};
      const assignmentId = optionalString(a, "assignmentId");
      if (assignmentId !== undefined) filter.assignmentId = assignmentId;
      const type = optionalString(a, "type");
      if (type !== undefined) filter.type = type as ListArtifactsFilter["type"];
      const status = optionalString(a, "status");
      if (status !== undefined) filter.status = status as ListArtifactsFilter["status"];
      const orgId = optionalString(a, "orgId");
      if (orgId !== undefined) filter.orgId = orgId;
      return service.list(session, filter);
    }

    case "artifact.attach_evidence": {
      const a = asArgs(args);
      const evidenceIdsRaw = a["evidenceIds"];
      if (!Array.isArray(evidenceIdsRaw) || evidenceIdsRaw.some((id) => typeof id !== "string")) {
        throw new ArtifactValidationError("evidenceIds must be an array of strings");
      }
      const input: AttachEvidenceInput = {
        artifactId: requireString(a, "artifactId"),
        anchor: requireString(a, "anchor"),
        evidenceIds: evidenceIdsRaw as string[],
      };
      return service.attachEvidence(session, input);
    }

    case "artifact.request_review": {
      const a = asArgs(args);
      return service.requestReview(session, requireString(a, "artifactId"));
    }

    case "artifact.compare_versions": {
      const a = asArgs(args);
      return service.compareVersions(
        session,
        requireString(a, "artifactId"),
        requireString(a, "versionAId"),
        requireString(a, "versionBId"),
      );
    }

    default: {
      const _exhaustive: never = name;
      throw new ArtifactValidationError(`Unhandled artifact tool: ${String(_exhaustive)}`);
    }
  }
}

/** @deprecated Prefer dispatchArtifactTool — same implementation. */
export const handleArtifactTool = dispatchArtifactTool;
