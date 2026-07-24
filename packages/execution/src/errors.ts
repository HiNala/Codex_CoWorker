/**
 * Honest degradation when an execution backend cannot run.
 * Callers should surface this as disconnected / not_configured UI, never as success.
 */
export class ExecutionNotConfiguredError extends Error {
  readonly code = "not_configured" as const;
  readonly backend: "docker" | "railway-sandbox" | "fake";

  constructor(backend: "docker" | "railway-sandbox" | "fake", detail: string) {
    super(`Execution backend "${backend}" is not_configured: ${detail}`);
    this.name = "ExecutionNotConfiguredError";
    this.backend = backend;
  }
}

/**
 * Raised when a backend is selected but cannot complete a run safely (e.g. leaked cleanup).
 */
export class ExecutionLifecycleError extends Error {
  readonly code = "lifecycle" as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ExecutionLifecycleError";
  }
}
