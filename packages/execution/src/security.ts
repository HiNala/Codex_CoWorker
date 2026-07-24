/**
 * Credential-shaped keys must never enter a generic sandbox exec env.
 *
 * CODEX_API_KEY matches api[_-]?key / codex and is rejected by default. Codex
 * invocations that need a key must scope it to a single child process outside
 * this path — never via ExecSpec.env on any ExecutionBackend.
 */
const forbiddenEnvironmentKey =
  /(token|secret|password|credential|api[_-]?key|database_url|s3_|zendesk|composio|octen|openai|railway|codex)/i;

export function assertCredentialFreeEnvironment(environment: Record<string, string>): void {
  const forbidden = Object.keys(environment).filter((key) => forbiddenEnvironmentKey.test(key));
  if (forbidden.length > 0) {
    throw new Error(`Sandbox environment contains forbidden keys: ${forbidden.join(", ")}`);
  }
}

/** True when a key name looks like a credential (for tests and callers). */
export function isCredentialShapedKey(key: string): boolean {
  return forbiddenEnvironmentKey.test(key);
}
