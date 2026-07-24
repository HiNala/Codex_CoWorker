import { z } from "zod";

const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");

const database = z.object({
  DATABASE_URL: z.string().url(),
});

const storage = z.object({
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_FORCE_PATH_STYLE: booleanString.default(true),
});

const common = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export const WebEnv = common
  .extend(database.shape)
  .extend(storage.shape)
  .extend({
    OPENAI_API_KEY: z.string().min(1).optional(),
    SESSION_SECRET: z.string().min(24),
    ZENDESK_WEBHOOK_SECRET: z.string().min(1).optional(),
    DEMO_ACCESS_CODE: z.string().min(1),
  });

export const WorkerEnv = common
  .extend(database.shape)
  .extend(storage.shape)
  .extend({
    OPENAI_API_KEY: z.string().min(1).optional(),
    OCTEN_API_KEY: z.string().min(1).optional(),
    COMPOSIO_API_KEY: z.string().min(1).optional(),
    ZENDESK_SUBDOMAIN: z.string().min(1).optional(),
    ZENDESK_EMAIL: z.email().optional(),
    ZENDESK_API_TOKEN: z.string().min(1).optional(),
    RAILWAY_API_TOKEN: z.string().min(1).optional(),
    WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1_000),
    JOB_LEASE_MS: z.coerce.number().int().positive().default(30_000),
    WORKER_HEALTH_PORT: z.coerce.number().int().positive().default(3_001),
    FOUNDRY_URL: z.string().url().default("http://127.0.0.1:3002"),
  });

export const FoundryEnv = common.extend({
  CODEX_API_KEY: z.string().min(1).optional(),
  FOUNDRY_PORT: z.coerce.number().int().positive().default(3_002),
  FAKE_CODEX_PACE_MS: z.coerce.number().int().nonnegative().default(6_000),
});

export const StorageEnv = storage;

export type WebEnv = z.infer<typeof WebEnv>;
export type WorkerEnv = z.infer<typeof WorkerEnv>;
export type FoundryEnv = z.infer<typeof FoundryEnv>;
export type StorageEnv = z.infer<typeof StorageEnv>;

export function parseWebEnv(environment: NodeJS.ProcessEnv = process.env): WebEnv {
  return WebEnv.parse(environment);
}

export function parseWorkerEnv(environment: NodeJS.ProcessEnv = process.env): WorkerEnv {
  return WorkerEnv.parse(environment);
}

export function parseFoundryEnv(environment: NodeJS.ProcessEnv = process.env): FoundryEnv {
  return FoundryEnv.parse(environment);
}

export function parseStorageEnv(environment: NodeJS.ProcessEnv = process.env): StorageEnv {
  return StorageEnv.parse(environment);
}
