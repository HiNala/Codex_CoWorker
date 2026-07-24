import {
  bigint,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { coworkerStatusEnum, membershipRoleEnum, projectStatusEnum } from "./enums";
import { createdAtColumn, idColumn, metadataColumn, orgIdColumn, updatedAtColumn } from "./shared";

export const organizations = pgTable(
  "organizations",
  {
    id: idColumn(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex("organizations_slug_idx").on(table.slug)],
);

export const users = pgTable(
  "users",
  {
    id: idColumn(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export const memberships = pgTable(
  "memberships",
  {
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull(),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    primaryKey({ columns: [table.orgId, table.userId], name: "memberships_pk" }),
    index("memberships_user_idx").on(table.userId),
  ],
);

export const coworkers = pgTable(
  "coworkers",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    charter: text("charter").notNull(),
    status: coworkerStatusEnum("status").notNull().default("idle"),
    monthlyBudgetMicrocredits: bigint("monthly_budget_microcredits", { mode: "number" })
      .notNull()
      .default(0),
    perAssignmentCeilingMicrocredits: bigint("per_assignment_ceiling_microcredits", {
      mode: "number",
    })
      .notNull()
      .default(0),
    identitySeed: text("identity_seed").notNull(),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("coworkers_org_name_idx").on(table.orgId, table.name),
    index("coworkers_org_status_idx").on(table.orgId, table.status),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: idColumn(),
    orgId: orgIdColumn().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    repositories: jsonb("repositories").$type<string[]>().notNull().default([]),
    status: projectStatusEnum("status").notNull().default("active"),
    metadata: metadataColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("projects_org_slug_idx").on(table.orgId, table.slug),
    index("projects_org_status_idx").on(table.orgId, table.status),
  ],
);
