import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
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
  assignmentSourceEnum,
  assignmentStatusEnum,
  eventChannelEnum,
  eventLevelEnum,
  eventVisibilityEnum,
  milestoneStatusEnum,
  planStepStatusEnum,
  runStatusEnum,
} from "./enums";
import { coworkers, organizations, projects } from "./identity";
import { createdAtColumn, idColumn, metadataColumn, orgIdColumn, updatedAtColumn } from "./shared";

export const assignments = pgTable(
  "assignments",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    coworkerId: uuid("coworker_id")
      .notNull()
      .references(() => coworkers.id),
    projectId: uuid("project_id").references(() => projects.id),
    rawRequest: text("raw_request").notNull(),
    contract: jsonb("contract").$type<Record<string, unknown>>(),
    contractVersion: integer("contract_version").notNull().default(0),
    status: assignmentStatusEnum("status").notNull().default("drafting"),
    ceilingMicrocredits: bigint("ceiling_microcredits", { mode: "number" }).notNull().default(0),
    spentMicrocredits: bigint("spent_microcredits", { mode: "number" }).notNull().default(0),
    source: assignmentSourceEnum("source").notNull(),
    sourceRef: text("source_ref"),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("assignments_org_status_idx").on(table.orgId, table.status),
    index("assignments_coworker_created_idx").on(table.coworkerId, table.createdAt),
  ],
);

export const assignmentRuns = pgTable(
  "assignment_runs",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    status: runStatusEnum("status").notNull().default("queued"),
    eventSeq: integer("event_seq").notNull().default(0),
    cancelRequestedAt: timestamp("cancel_requested_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    failureCode: text("failure_code"),
    failureDetail: text("failure_detail"),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("assignment_runs_assignment_idx").on(table.assignmentId),
    index("assignment_runs_org_status_idx").on(table.orgId, table.status),
  ],
);

export const milestones = pgTable(
  "milestones",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    runId: uuid("run_id")
      .notNull()
      .references(() => assignmentRuns.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    title: text("title").notNull(),
    outcome: text("outcome").notNull(),
    status: milestoneStatusEnum("status").notNull().default("pending"),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("milestones_run_ordinal_idx").on(table.runId, table.ordinal),
    index("milestones_org_status_idx").on(table.orgId, table.status),
  ],
);

export const planSteps = pgTable(
  "plan_steps",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    runId: uuid("run_id")
      .notNull()
      .references(() => assignmentRuns.id, { onDelete: "cascade" }),
    milestoneId: uuid("milestone_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    parentStepId: uuid("parent_step_id"),
    ordinal: integer("ordinal").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: planStepStatusEnum("status").notNull().default("pending"),
    dependsOn: jsonb("depends_on").$type<string[]>().notNull().default([]),
    capabilityRefs: jsonb("capability_refs")
      .$type<Array<Record<string, unknown>>>()
      .notNull()
      .default([]),
    artifactIds: jsonb("artifact_ids").$type<string[]>().notNull().default([]),
    blockedReason: text("blocked_reason"),
    attempt: integer("attempt").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    costMicrocredits: bigint("cost_microcredits", { mode: "number" }).notNull().default(0),
    changedAfterApproval: boolean("changed_after_approval").notNull().default(false),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("plan_steps_run_ordinal_idx").on(table.runId, table.ordinal),
    index("plan_steps_run_status_idx").on(table.runId, table.status),
    index("plan_steps_milestone_idx").on(table.milestoneId),
  ],
);

export const runEvents = pgTable(
  "run_events",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    runId: uuid("run_id")
      .notNull()
      .references(() => assignmentRuns.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    type: text("type").notNull(),
    channel: eventChannelEnum("channel").notNull(),
    level: eventLevelEnum("level").notNull().default("info"),
    visibility: eventVisibilityEnum("visibility").notNull().default("user"),
    summary: text("summary").notNull(),
    detail: jsonb("detail"),
    refs: jsonb("refs").$type<Record<string, unknown>>().notNull().default({}),
    cost: jsonb("cost").$type<Record<string, unknown>>(),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("run_events_run_seq_idx").on(table.runId, table.seq),
    index("run_events_org_created_idx").on(table.orgId, table.createdAt),
    index("run_events_type_idx").on(table.type),
  ],
);

export const outbox = pgTable(
  "outbox",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => runEvents.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    lastError: text("last_error"),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("outbox_event_idx").on(table.eventId),
    index("outbox_unpublished_idx")
      .on(table.availableAt)
      .where(sql`${table.publishedAt} is null`),
  ],
);
