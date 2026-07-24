import { createDatabase } from "../packages/db/src/client";
import { runMigrations } from "../packages/db/src/migrate";
import { seedDatabase } from "../packages/db/src/seed";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const dangerousTarget = /(railway|prod|production|neon)/i.test(databaseUrl);
if (dangerousTarget && process.env.I_UNDERSTAND !== "drop-everything") {
  throw new Error(
    "Refusing to reset a production-shaped database. Set I_UNDERSTAND=drop-everything only after verifying the exact target.",
  );
}

const { client } = createDatabase(databaseUrl, { max: 1 });
try {
  await client.unsafe("drop schema if exists drizzle cascade");
  await client.unsafe("drop schema if exists public cascade");
  await client.unsafe("create schema public");
} finally {
  await client.end();
}

await runMigrations(databaseUrl);
await seedDatabase(databaseUrl);
console.log("Database reset, migrated, and seeded.");
