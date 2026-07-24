import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./packages/db/src/schema/index.ts",
  out: "./packages/db/drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:forge@127.0.0.1:5432/forge",
  },
  strict: true,
  verbose: true,
});
