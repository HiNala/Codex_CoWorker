import { migrate } from "drizzle-orm/postgres-js/migrator";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createDatabase } from "./client";

const MIGRATION_LOCK = 918273645;

export async function runMigrations(databaseUrl: string): Promise<void> {
  const { db, client } = createDatabase(databaseUrl, { max: 1 });
  const migrationsFolder = resolve(process.cwd(), "packages/db/drizzle");

  await client`select pg_advisory_lock(${MIGRATION_LOCK})`;
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await client`select pg_advisory_unlock(${MIGRATION_LOCK})`;
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run migrations.");
  }

  await runMigrations(databaseUrl);
  console.log("Database migrations are current.");
}
