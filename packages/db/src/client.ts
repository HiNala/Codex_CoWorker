import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDatabase(databaseUrl: string, options: { max?: number } = {}) {
  const client = postgres(databaseUrl, {
    max: options.max ?? 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  return {
    db: drizzle(client, { schema }),
    client,
  };
}

export type Database = ReturnType<typeof createDatabase>["db"];
