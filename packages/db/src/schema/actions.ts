import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import {
  approvalDecisionEnum,
  approvalKindEnum,
  approvalRiskEnum,
  connectionStateEnum,
  externalActionStatusEnum,
  externalProviderEnum,
  integrationProviderEnum,
} from "./enums";
import { organizations, users } from "./identity";
import { assignments, assignmentRuns, planSteps } from "./runs";
import { createdAtColumn, idColumn, metadataColumn, orgIdColumn, updatedAtColumn } from "./shared";

export const approvals = pgTable(
  "approvals",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    runId: uuid("run_id")
      .notNull()
      .references(() => assignmentRuns.id, { onDelete: "cascade" }),
    stepId: uuid("step_id").references(() => planSteps.id),
    kind: approvalKindEnum("kind").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    payloadSha256: text("payload_sha256").notNull(),
    risk: approvalRiskEnum("risk").notNull(),
    decision: approvalDecisionEnum("decision").notNull().default("pending"),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("approvals_pending_step_kind_idx")
      .on(table.stepId, table.kind)
      .where(sql`${table.decision} = 'pending' and ${table.stepId} is not null`),
    index("approvals_org_decision_idx").on(table.orgId, table.decision),
  ],
);

export const externalActions = pgTable(
  "external_actions",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    runId: uuid("run_id")
      .notNull()
      .references(() => assignmentRuns.id, { onDelete: "cascade" }),
    approvalId: uuid("approval_id").references(() => approvals.id),
    provider: externalProviderEnum("provider").notNull(),
    action: text("action").notNull(),
    accountRef: text("account_ref").notNull(),
    arguments: jsonb("arguments").$type<Record<string, unknown>>().notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: externalActionStatusEnum("status").notNull().default("proposed"),
    externalId: text("external_id"),
    permalink: text("permalink"),
    failureCode: text("failure_code"),
    failureDetail: text("failure_detail"),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("external_actions_org_idempotency_idx").on(table.orgId, table.idempotencyKey),
    index("external_actions_run_status_idx").on(table.runId, table.status),
  ],
);

export const integrationConnections = pgTable(
  "integration_connections",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").notNull(),
    accountRef: text("account_ref").notNull(),
    state: connectionStateEnum("state").notNull().default("not_configured"),
    encryptedCredentialRef: text("encrypted_credential_ref"),
    detail: text("detail"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("integration_connections_org_provider_account_idx").on(
      table.orgId,
      table.provider,
      table.accountRef,
    ),
  ],
);

export const webhookReceipts = pgTable(
  "webhook_receipts",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    invocationId: text("invocation_id").notNull(),
    payloadSha256: text("payload_sha256").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    responseStatus: text("response_status"),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("webhook_receipts_provider_invocation_idx").on(table.provider, table.invocationId),
  ],
);
