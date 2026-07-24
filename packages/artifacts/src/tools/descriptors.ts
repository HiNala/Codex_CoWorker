import type { ToolDescriptor } from "@forge/contracts";

/** Exact controlled tool names (dot style). */
export const ARTIFACT_TOOL_NAMES = [
  "artifact.create",
  "artifact.update",
  "artifact.read",
  "artifact.list",
  "artifact.attach_evidence",
  "artifact.request_review",
  "artifact.compare_versions",
] as const;

export type ArtifactToolName = (typeof ARTIFACT_TOOL_NAMES)[number];

/**
 * Tool descriptors for the seven agent-facing artifact tools.
 * Registered under the Track E anchor in the agent-runtime tool registry.
 */
export const artifactToolDescriptors: ToolDescriptor[] = [
  {
    name: "artifact.create",
    description:
      "Declare a new artifact from the assignment contract expectedArtifacts (status: declared).",
    inputSchema: {
      type: "object",
      required: ["assignmentId", "runId", "coworkerId", "type", "title"],
      properties: {
        assignmentId: { type: "string", format: "uuid" },
        runId: { type: "string", format: "uuid" },
        coworkerId: { type: "string", format: "uuid" },
        projectId: { type: ["string", "null"], format: "uuid" },
        type: {
          type: "string",
          enum: [
            "document.markdown",
            "table.typed",
            "code.change",
            "capability.package",
            "receipt.assignment",
          ],
        },
        title: { type: "string", minLength: 1 },
        slug: { type: "string" },
        visibility: { type: "string", enum: ["private", "org", "published"] },
        description: { type: "string" },
      },
    },
  },
  {
    name: "artifact.update",
    description:
      "Create a new immutable content version. Requires baseVersionId matching currentVersionId (null for first version).",
    inputSchema: {
      type: "object",
      required: [
        "artifactId",
        "baseVersionId",
        "content",
        "changeSummary",
        "authorType",
        "authorRef",
      ],
      properties: {
        artifactId: { type: "string", format: "uuid" },
        baseVersionId: { type: ["string", "null"], format: "uuid" },
        content: { type: "string", minLength: 1 },
        changeSummary: { type: "string", minLength: 1 },
        authorType: { type: "string", enum: ["agent", "human", "capability"] },
        authorRef: { type: "string", minLength: 1 },
        contentFormat: { type: "string", enum: ["markdown", "json", "diff"] },
        sourceEventRange: {
          type: "object",
          properties: {
            from: { type: "integer", minimum: 0 },
            to: { type: "integer", minimum: 0 },
          },
        },
      },
    },
  },
  {
    name: "artifact.read",
    description: "Read an artifact by id, optionally a specific version.",
    inputSchema: {
      type: "object",
      required: ["artifactId"],
      properties: {
        artifactId: { type: "string", format: "uuid" },
        versionId: { type: "string", format: "uuid" },
      },
    },
  },
  {
    name: "artifact.list",
    description: "List artifacts filtered by assignmentId, type, status, orgId.",
    inputSchema: {
      type: "object",
      properties: {
        assignmentId: { type: "string", format: "uuid" },
        type: {
          type: "string",
          enum: [
            "document.markdown",
            "table.typed",
            "code.change",
            "capability.package",
            "receipt.assignment",
          ],
        },
        status: { type: "string" },
        orgId: { type: "string", format: "uuid" },
      },
    },
  },
  {
    name: "artifact.attach_evidence",
    description: "Attach evidence record ids to a citation/cell/section anchor on an artifact.",
    inputSchema: {
      type: "object",
      required: ["artifactId", "anchor", "evidenceIds"],
      properties: {
        artifactId: { type: "string", format: "uuid" },
        anchor: { type: "string", minLength: 1 },
        evidenceIds: {
          type: "array",
          items: { type: "string", format: "uuid" },
          minItems: 1,
        },
      },
    },
  },
  {
    name: "artifact.request_review",
    description: "Transition an artifact with content to ready_for_review for human approval.",
    inputSchema: {
      type: "object",
      required: ["artifactId"],
      properties: {
        artifactId: { type: "string", format: "uuid" },
      },
    },
  },
  {
    name: "artifact.compare_versions",
    description: "Return two versions of an artifact plus a simple text diff summary.",
    inputSchema: {
      type: "object",
      required: ["artifactId", "versionAId", "versionBId"],
      properties: {
        artifactId: { type: "string", format: "uuid" },
        versionAId: { type: "string", format: "uuid" },
        versionBId: { type: "string", format: "uuid" },
      },
    },
  },
];
