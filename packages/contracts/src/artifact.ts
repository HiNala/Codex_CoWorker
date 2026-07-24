import { z } from "zod";
import { Id, Sha256, Slug, Ts } from "./primitives";

export const ArtifactType = z.enum([
  "document.markdown",
  "table.typed",
  "code.change",
  "capability.package",
  "receipt.assignment",
]);

export const ArtifactStatus = z.enum([
  "declared",
  "drafting",
  "ready_for_review",
  "approved",
  "delivered",
  "published",
  "superseded",
  "archived",
  "blocked",
  "failed",
  "rejected",
  "withdrawn",
]);

export const Artifact = z.object({
  id: Id,
  orgId: Id,
  projectId: Id.nullable(),
  assignmentId: Id,
  runId: Id,
  coworkerId: Id,
  type: ArtifactType,
  title: z.string().min(1),
  slug: Slug,
  status: ArtifactStatus,
  visibility: z.enum(["private", "org", "published"]).default("org"),
  currentVersionId: Id.nullable(),
  approvedVersionId: Id.nullable(),
  createdAt: Ts,
  updatedAt: Ts,
});

export const ArtifactVersion = z.object({
  id: Id,
  artifactId: Id,
  parentVersionId: Id.nullable(),
  ordinal: z.number().int().positive(),
  authorType: z.enum(["agent", "human", "capability"]),
  authorRef: z.string().min(1),
  contentFormat: z.enum(["markdown", "json", "diff"]),
  contentInline: z.string().nullable(),
  objectKey: z.string().nullable(),
  sha256: Sha256,
  changeSummary: z.string(),
  sourceEventRange: z.object({
    from: z.number().int().nonnegative(),
    to: z.number().int().nonnegative(),
  }),
  createdAt: Ts,
});

export const EvidenceRecord = z.object({
  id: Id,
  orgId: Id,
  kind: z.enum(["web", "ticket", "repo", "test_run", "human", "capability_output"]),
  sourceUrl: z.string().url().nullable(),
  title: z.string().min(1),
  excerpt: z.string().max(2_000),
  contentSha256: Sha256,
  retrievedAt: Ts,
  trust: z.enum(["official", "secondary", "user_supplied", "untrusted"]),
  injectionSuspected: z.boolean().default(false),
});

export type ArtifactType = z.infer<typeof ArtifactType>;
export type ArtifactStatus = z.infer<typeof ArtifactStatus>;
export type Artifact = z.infer<typeof Artifact>;
export type ArtifactVersion = z.infer<typeof ArtifactVersion>;
export type EvidenceRecord = z.infer<typeof EvidenceRecord>;
