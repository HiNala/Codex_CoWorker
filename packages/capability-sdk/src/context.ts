import type { EvidenceRecord, RestrictedCapabilityContext } from "@forge/contracts";

export type LogLevel = "debug" | "info" | "warn";

export interface CollectedLogEntry {
  level: LogLevel;
  message: string;
}

export interface CreateRestrictedContextOptions {
  evidence?: readonly EvidenceRecord[];
  log?: (level: LogLevel, message: string) => void;
  signal?: AbortSignal;
  /** Fixed clock; defaults to epoch (0). */
  now?: () => number;
  /** When true (default), log calls are collected on `logs`. */
  collectLogs?: boolean;
}

export interface RestrictedCapabilityContextWithLogs extends RestrictedCapabilityContext {
  /** Populated when collectLogs is true (default). */
  readonly logs: CollectedLogEntry[];
}

/**
 * Build a restricted capability context for unit tests and offline runs.
 * Default now() is fixed at 0; default log is a no-op collector.
 */
export function createRestrictedContext(
  partial?: CreateRestrictedContextOptions,
): RestrictedCapabilityContextWithLogs {
  const logs: CollectedLogEntry[] = [];
  const collect = partial?.collectLogs !== false;
  const userLog = partial?.log;

  const log = (level: LogLevel, message: string): void => {
    if (collect) {
      logs.push({ level, message });
    }
    userLog?.(level, message);
  };

  const signal = partial?.signal ?? new AbortController().signal;
  const now = partial?.now ?? (() => 0);
  const evidence = partial?.evidence ?? [];

  return {
    evidence,
    log,
    signal,
    now,
    logs,
  };
}
