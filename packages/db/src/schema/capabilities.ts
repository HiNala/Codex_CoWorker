import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  capabilityBuildStatusEnum,
  capabilityKindEnum,
  capabilityStatusEnum,
  gateStatusEnum,
} from "./enums";
import { organizations } from "./identity";
import { assignmentRuns, planSteps } from "./runs";
import { createdAtColumn, idColumn, metadataColumn, orgIdColumn, updatedAtColumn } from "./shared";

export const capabilities = pgTable(
  "capabilities",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    kind: capabilityKindEnum("kind").notNull(),
    status: capabilityStatusEnum("status").notNull().default("available"),
    currentVersionId: uuid("current_version_id"),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("capabilities_org_slug_idx").on(table.orgId, table.slug),
    index("capabilities_org_status_idx").on(table.orgId, table.status),
  ],
);

export const capabilityVersions = pgTable(
  "capability_versions",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    capabilityId: uuid("capability_id")
      .notNull()
      .references(() => capabilities.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    manifest: jsonb("manifest").$type<Record<string, unknown>>().notNull(),
    bundleSha256: text("bundle_sha256").notNull(),
    bundleObjectKey: text("bundle_object_key"),
    verificationReport: jsonb("verification_report").$type<Record<string, unknown>>(),
    authoredBy: text("authored_by").notNull(),
    isCurrent: integer("is_current").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("capability_versions_semver_idx").on(table.capabilityId, table.version),
    uniqueIndex("capability_versions_one_current_idx")
      .on(table.capabilityId)
      .where(sql`${table.isCurrent} = 1 and ${table.archivedAt} is null`),
  ],
);

export const capabilityBuilds = pgTable(
  "capability_builds",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    capabilityId: uuid("capability_id").references(() => capabilities.id),
    runId: uuid("run_id")
      .notNull()
      .references(() => assignmentRuns.id, { onDelete: "cascade" }),
    stepId: uuid("step_id")
      .notNull()
      .references(() => planSteps.id, { onDelete: "cascade" }),
    spec: jsonb("spec").$type<Record<string, unknown>>().notNull(),
    status: capabilityBuildStatusEnum("status").notNull().default("queued"),
    attempt: integer("attempt").notNull().default(1),
    maxAttempts: integer("max_attempts").notNull().default(2),
    codexSessionId: text("codex_session_id"),
    failureCode: text("failure_code"),
    failureDetail: text("failure_detail"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("capability_builds_run_status_idx").on(table.runId, table.status),
    index("capability_builds_step_idx").on(table.stepId),
  ],
);

export const capabilityGateResults = pgTable(
  "capability_gate_results",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    buildId: uuid("build_id")
      .notNull()
      .references(() => capabilityBuilds.id, { onDelete: "cascade" }),
    gate: text("gate").notNull(),
    status: gateStatusEnum("status").notNull(),
    durationMs: integer("duration_ms").notNull(),
    passed: integer("passed").notNull().default(0),
    total: integer("total").notNull().default(0),
    message: text("message").notNull(),
    detail: text("detail"),
    attempt: integer("attempt").notNull(),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("capability_gate_results_build_gate_attempt_idx").on(
      table.buildId,
      table.gate,
      table.attempt,
    ),
  ],
);
