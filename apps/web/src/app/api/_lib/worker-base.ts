/**
 * Resolve worker origin for server-side proxies.
 * WORKER_INTERNAL_URL first (Railway private network); never browser-exposed.
 */
export function resolveWorkerBase(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string {
  const raw =
    env.WORKER_INTERNAL_URL ||
    env.WORKER_PUBLIC_URL ||
    env.WORKER_URL ||
    "http://127.0.0.1:3001";
  return raw.replace(/\/$/, "");
}
