import { boolean, index, integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import {
  artifactAuthorTypeEnum,
  artifactStatusEnum,
  artifactTypeEnum,
  artifactVisibilityEnum,
  contentFormatEnum,
  evidenceKindEnum,
  evidenceTrustEnum,
} from "./enums";
import { coworkers, organizations, projects } from "./identity";
import { assignments, assignmentRuns } from "./runs";
import { createdAtColumn, idColumn, metadataColumn, orgIdColumn, updatedAtColumn } from "./shared";

export const artifacts = pgTable(
  "artifacts",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    runId: uuid("run_id")
      .notNull()
      .references(() => assignmentRuns.id, { onDelete: "cascade" }),
    coworkerId: uuid("coworker_id")
      .notNull()
      .references(() => coworkers.id),
    type: artifactTypeEnum("type").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    status: artifactStatusEnum("status").notNull().default("declared"),
    visibility: artifactVisibilityEnum("visibility").notNull().default("org"),
    currentVersionId: uuid("current_version_id"),
    approvedVersionId: uuid("approved_version_id"),
    searchText: text("search_text").notNull().default(""),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("artifacts_assignment_slug_idx").on(table.assignmentId, table.slug),
    index("artifacts_org_type_status_idx").on(table.orgId, table.type, table.status),
    index("artifacts_project_idx").on(table.projectId),
  ],
);

export const artifactVersions = pgTable(
  "artifact_versions",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    artifactId: uuid("artifact_id")
      .notNull()
      .references(() => artifacts.id, { onDelete: "cascade" }),
    parentVersionId: uuid("parent_version_id"),
    ordinal: integer("ordinal").notNull(),
    authorType: artifactAuthorTypeEnum("author_type").notNull(),
    authorRef: text("author_ref").notNull(),
    contentFormat: contentFormatEnum("content_format").notNull(),
    contentInline: text("content_inline"),
    objectKey: text("object_key"),
    sha256: text("sha256").notNull(),
    changeSummary: text("change_summary").notNull(),
    sourceEventFrom: integer("source_event_from").notNull(),
    sourceEventTo: integer("source_event_to").notNull(),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("artifact_versions_artifact_ordinal_idx").on(table.artifactId, table.ordinal),
    uniqueIndex("artifact_versions_artifact_sha_idx").on(table.artifactId, table.sha256),
  ],
);

export const artifactRelations = pgTable(
  "artifact_relations",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    fromArtifactId: uuid("from_artifact_id")
      .notNull()
      .references(() => artifacts.id, { onDelete: "cascade" }),
    toArtifactId: uuid("to_artifact_id")
      .notNull()
      .references(() => artifacts.id, { onDelete: "cascade" }),
    relation: text("relation").notNull(),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("artifact_relations_unique_idx").on(
      table.fromArtifactId,
      table.toArtifactId,
      table.relation,
    ),
  ],
);

export const evidenceRecords = pgTable(
  "evidence_records",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id").references(() => assignments.id, {
      onDelete: "cascade",
    }),
    runId: uuid("run_id").references(() => assignmentRuns.id, { onDelete: "cascade" }),
    kind: evidenceKindEnum("kind").notNull(),
    sourceUrl: text("source_url"),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    contentSha256: text("content_sha256").notNull(),
    trust: evidenceTrustEnum("trust").notNull(),
    injectionSuspected: boolean("injection_suspected").notNull().default(false),
    metadata: metadataColumn(),
    retrievedAt: createdAtColumn(),
  },
  (table) => [
    index("evidence_records_org_kind_idx").on(table.orgId, table.kind),
    index("evidence_records_run_idx").on(table.runId),
  ],
);
