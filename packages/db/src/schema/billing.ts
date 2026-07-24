import { sql } from "drizzle-orm";
import { bigint, check, index, jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { usageProviderEnum } from "./enums";
import { organizations } from "./identity";
import { assignmentRuns, planSteps } from "./runs";
import { createdAtColumn, idColumn, metadataColumn, orgIdColumn, updatedAtColumn } from "./shared";

export const usageEvents = pgTable(
  "usage_events",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    runId: uuid("run_id")
      .notNull()
      .references(() => assignmentRuns.id, { onDelete: "cascade" }),
    stepId: uuid("step_id").references(() => planSteps.id),
    provider: usageProviderEnum("provider").notNull(),
    units: jsonb("units").$type<Record<string, number>>().notNull(),
    rawCostMicrodollars: bigint("raw_cost_microdollars", { mode: "number" }).notNull(),
    microcredits: bigint("microcredits", { mode: "number" }).notNull(),
    pricingVersion: text("pricing_version").notNull(),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("usage_events_run_idx").on(table.runId),
    index("usage_events_org_provider_idx").on(table.orgId, table.provider),
  ],
);

export const creditAccounts = pgTable(
  "credit_accounts",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Work Credits"),
    currency: text("currency").notNull().default("microcredit"),
    balanceMicrocredits: bigint("balance_microcredits", { mode: "number" }).notNull().default(0),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex("credit_accounts_org_name_idx").on(table.orgId, table.name)],
);

export const creditLedgerEntries = pgTable(
  "credit_ledger_entries",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => creditAccounts.id, { onDelete: "cascade" }),
    runId: uuid("run_id").references(() => assignmentRuns.id),
    entryGroupId: uuid("entry_group_id").notNull(),
    amountMicrocredits: bigint("amount_microcredits", { mode: "number" }).notNull(),
    balanceAfterMicrocredits: bigint("balance_after_microcredits", { mode: "number" }).notNull(),
    reason: text("reason").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("credit_ledger_entries_org_idempotency_idx").on(table.orgId, table.idempotencyKey),
    index("credit_ledger_entries_account_created_idx").on(table.accountId, table.createdAt),
    check("credit_ledger_entries_nonzero", sql`${table.amountMicrocredits} <> 0`),
  ],
);
