/**
 * Sandbox lifecycle helpers — leak prevention.
 *
 * Contract for every ExecutionBackend.run implementation:
 * 1. Allocate resources (temp dir, container, remote sandbox) before work.
 * 2. Run the job.
 * 3. Always destroy/cleanup in a `finally` — even on timeout, spawn error, or abort.
 *
 * Docker: force-remove named container + recursive rm of the job temp directory.
 * Railway: `await sandbox.destroy()` in finally (never leave billable VMs around).
 * Fake: no external resources; still wrap callers that allocate temp state.
 *
 * Never rely on process exit alone — workers stay up across many runs.
 */

export type CleanupFn = () => void | Promise<void>;

/**
 * Run work and always invoke cleanup afterward.
 * Cleanup errors are suppressed after the primary result/error is settled so
 * a failed destroy does not mask the original failure (logged via onCleanupError).
 */
export async function withCleanup<T>(
  cleanup: CleanupFn,
  work: () => Promise<T>,
  onCleanupError?: (error: unknown) => void,
): Promise<T> {
  try {
    return await work();
  } finally {
    try {
      await cleanup();
    } catch (error) {
      onCleanupError?.(error);
    }
  }
}

/**
 * Compose multiple cleanup steps (LIFO — reverse of registration order).
 * Typical order of registration: temp dir, then container; cleanup runs container then dir.
 */
export function composeCleanup(...steps: CleanupFn[]): CleanupFn {
  return async () => {
    const errors: unknown[] = [];
    for (const step of [...steps].reverse()) {
      try {
        await step();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length === 1) {
      throw errors[0];
    }
    if (errors.length > 1) {
      throw new AggregateError(errors, "Multiple sandbox cleanup steps failed");
    }
  };
}

/** Best-effort: never throws. Use in outer finally when swallow is required. */
export async function bestEffortCleanup(cleanup: CleanupFn): Promise<void> {
  try {
    await cleanup();
  } catch {
    // intentionally swallowed — leak prevention must not crash the worker loop
  }
}
