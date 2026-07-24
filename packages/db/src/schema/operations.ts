import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { jobAttemptStatusEnum, jobStatusEnum } from "./enums";
import { organizations } from "./identity";
import { assignmentRuns, planSteps } from "./runs";
import { createdAtColumn, idColumn, metadataColumn, orgIdColumn, updatedAtColumn } from "./shared";

export const jobs = pgTable(
  "jobs",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    runId: uuid("run_id").references(() => assignmentRuns.id, { onDelete: "cascade" }),
    stepId: uuid("step_id").references(() => planSteps.id),
    queue: text("queue").notNull().default("default"),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: jobStatusEnum("status").notNull().default("queued"),
    priority: integer("priority").notNull().default(0),
    runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
    leaseOwner: text("lease_owner"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
    attempt: integer("attempt").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    idempotencyKey: text("idempotency_key"),
    lastError: text("last_error"),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("jobs_ready_idx")
      .on(table.queue, table.priority, table.runAfter)
      .where(sql`${table.status} = 'queued'`),
    index("jobs_expired_lease_idx")
      .on(table.leaseExpiresAt)
      .where(sql`${table.status} = 'leased'`),
    uniqueIndex("jobs_org_idempotency_idx")
      .on(table.orgId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} is not null`),
  ],
);

export const jobAttempts = pgTable(
  "job_attempts",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    attempt: integer("attempt").notNull(),
    workerId: text("worker_id").notNull(),
    status: jobAttemptStatusEnum("status").notNull().default("running"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    error: text("error"),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("job_attempts_job_attempt_idx").on(table.jobId, table.attempt),
    index("job_attempts_worker_status_idx").on(table.workerId, table.status),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    requestId: text("request_id"),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("audit_events_org_created_idx").on(table.orgId, table.createdAt),
    index("audit_events_target_idx").on(table.targetType, table.targetId),
  ],
);

export const storedObjects = pgTable(
  "stored_objects",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    bucket: text("bucket").notNull(),
    key: text("key").notNull(),
    sha256: text("sha256").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    contentType: text("content_type").notNull(),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex("stored_objects_bucket_key_idx").on(table.bucket, table.key)],
);

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    responseStatus: integer("response_status").notNull(),
    responseBody: jsonb("response_body").$type<Record<string, unknown>>().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("idempotency_keys_org_key_idx").on(table.orgId, table.key),
    index("idempotency_keys_expiry_idx").on(table.expiresAt),
  ],
);
