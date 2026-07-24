import { getFlags, parseWebEnv } from "@forge/config";
import { createDatabase } from "@forge/db";
import { S3ObjectStore } from "@forge/object-store";

export interface DependencyCheck {
  status: "up" | "down";
  detail: string;
  latencyMs: number;
}

export interface ReadinessReport {
  status: "ready" | "not_ready";
  checks: {
    database: DependencyCheck;
    schema: DependencyCheck;
    storage: DependencyCheck;
    queue: DependencyCheck;
  };
  queueDepth: number | null;
}

async function timed<T>(operation: () => Promise<T>, timeoutMs = 3_000): Promise<[T, number]> {
  const started = performance.now();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`dependency timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
    return [result, Math.round(performance.now() - started)];
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function down(error: unknown, started: number): DependencyCheck {
  return {
    status: "down",
    detail: error instanceof Error ? error.message : "unknown dependency failure",
    latencyMs: Math.round(performance.now() - started),
  };
}

export async function getReadiness(): Promise<ReadinessReport> {
  const environment = parseWebEnv();
  const { client } = createDatabase(environment.DATABASE_URL, { max: 1 });
  const objectStore = new S3ObjectStore(environment);
  let queueDepth: number | null = null;

  const databaseStarted = performance.now();
  let database: DependencyCheck;
  let schema: DependencyCheck;
  let queue: DependencyCheck;
  try {
    const [, latencyMs] = await timed(async () => client`select 1 as ok`);
    database = { status: "up", detail: "connected", latencyMs };

    const schemaStarted = performance.now();
    try {
      const [rows, schemaLatency] = await timed(
        async () => client<{ count: string }[]>`
          select count(*)::text as count
          from drizzle.__drizzle_migrations
        `,
      );
      schema = {
        status: "up",
        detail: `${rows[0]?.count ?? "0"} migration(s) applied`,
        latencyMs: schemaLatency,
      };
    } catch (error) {
      schema = down(error, schemaStarted);
    }

    const queueStarted = performance.now();
    try {
      const [rows, queueLatency] = await timed(
        async () => client<{ count: string }[]>`
          select count(*)::text as count from jobs where status = 'queued'
        `,
      );
      queueDepth = Number(rows[0]?.count ?? 0);
      queue = { status: "up", detail: "queue readable", latencyMs: queueLatency };
    } catch (error) {
      queue = down(error, queueStarted);
    }
  } catch (error) {
    database = down(error, databaseStarted);
    schema = { ...database, detail: "database unavailable" };
    queue = { ...database, detail: "database unavailable" };
  } finally {
    await client.end();
  }

  const storageStarted = performance.now();
  let storage: DependencyCheck;
  try {
    const [, latencyMs] = await timed(() => objectStore.head("health/readiness-marker"));
    storage = { status: "up", detail: "bucket reachable", latencyMs };
  } catch (error) {
    storage = down(error, storageStarted);
  }

  const checks = { database, schema, storage, queue };
  const ready = Object.values(checks).every((check) => check.status === "up");
  return { status: ready ? "ready" : "not_ready", checks, queueDepth };
}

export function getProviderStatus() {
  const flags = getFlags();
  const configured = (value: string | undefined) => (value ? "connected" : "not_configured");
  return {
    adapters: flags.adapters,
    providers: {
      openai:
        flags.adapters.openai === "fake" ? "degraded" : configured(process.env.OPENAI_API_KEY),
      codex: flags.adapters.codex === "fake" ? "degraded" : configured(process.env.CODEX_API_KEY),
      octen: flags.adapters.octen === "fake" ? "degraded" : configured(process.env.OCTEN_API_KEY),
      composio:
        flags.adapters.composio === "fake" ? "degraded" : configured(process.env.COMPOSIO_API_KEY),
      zendesk:
        flags.adapters.zendesk === "fake" ? "degraded" : configured(process.env.ZENDESK_API_TOKEN),
    },
  };
}
