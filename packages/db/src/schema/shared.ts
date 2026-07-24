import { jsonb, timestamp, uuid } from "drizzle-orm/pg-core";

export function idColumn(name = "id") {
  return uuid(name).primaryKey();
}

export function orgIdColumn() {
  return uuid("org_id").notNull();
}

export function metadataColumn() {
  return jsonb("metadata").$type<Record<string, unknown>>().notNull().default({});
}

export function createdAtColumn() {
  return timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
}

export function updatedAtColumn() {
  return timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
}
