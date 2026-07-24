const forbiddenEnvironmentKey =
  /(token|secret|password|credential|api[_-]?key|database_url|s3_|zendesk|composio|octen|openai|railway)/i;

export function assertCredentialFreeEnvironment(environment: Record<string, string>): void {
  const forbidden = Object.keys(environment).filter((key) => forbiddenEnvironmentKey.test(key));
  if (forbidden.length > 0) {
    throw new Error(`Sandbox environment contains forbidden keys: ${forbidden.join(", ")}`);
  }
}
