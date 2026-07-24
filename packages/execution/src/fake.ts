import type { ExecResult, ExecSpec, ExecutionBackend } from "@forge/contracts";
import { assertCredentialFreeEnvironment } from "./security";

export interface FakeExecutionBackendOptions {
  /** Artificial work delay before returning (default 5ms). */
  delayMs?: number;
  /** Override exit code (default 0, or 124 when timed out). */
  exitCode?: number;
  /** Force timedOut=true regardless of delay vs timeout. */
  forceTimeout?: boolean;
  /** Extra files merged into the result after input round-trip. */
  outputFiles?: Record<string, string>;
  /** Transform round-tripped files (simulates workspace writes). */
  transformFiles?: (files: Record<string, string>, spec: ExecSpec) => Record<string, string>;
  stdout?: string | ((spec: ExecSpec) => string);
  stderr?: string | ((spec: ExecSpec) => string);
  /** When true, still assert credential-free env (default true). */
  enforceCredentialFree?: boolean;
}

/**
 * Deterministic sandbox for tests, foundry fakes, and the demo parachute.
 *
 * Realism guarantees used by foundry/verifier fakes:
 * - Input files round-trip into result.files (unless deleted by transform).
 * - durationMs reflects wall time spent in run().
 * - timedOut is set when delay exceeds timeoutMs (or forceTimeout).
 * - onOutput receives progressive chunks, not only the final buffer.
 * - Credential-shaped env is rejected the same as Docker.
 */
export class FakeExecutionBackend implements ExecutionBackend {
  readonly name = "fake" as const;

  private readonly delayMs: number;
  private readonly exitCode: number | undefined;
  private readonly forceTimeout: boolean;
  private readonly outputFiles: Record<string, string>;
  private readonly transformFiles:
    ((files: Record<string, string>, spec: ExecSpec) => Record<string, string>) | undefined;
  private readonly stdout: string | ((spec: ExecSpec) => string) | undefined;
  private readonly stderr: string | ((spec: ExecSpec) => string) | undefined;
  private readonly enforceCredentialFree: boolean;

  constructor(options: FakeExecutionBackendOptions | number = {}) {
    // Back-compat: `new FakeExecutionBackend(5)` still works.
    const opts: FakeExecutionBackendOptions =
      typeof options === "number" ? { delayMs: options } : options;
    this.delayMs = opts.delayMs ?? 5;
    this.exitCode = opts.exitCode;
    this.forceTimeout = opts.forceTimeout ?? false;
    this.outputFiles = opts.outputFiles ?? {};
    this.transformFiles = opts.transformFiles;
    this.stdout = opts.stdout;
    this.stderr = opts.stderr;
    this.enforceCredentialFree = opts.enforceCredentialFree ?? true;
  }

  async run(spec: ExecSpec, onOutput?: (chunk: string) => void): Promise<ExecResult> {
    if (this.enforceCredentialFree) {
      assertCredentialFreeEnvironment(spec.env);
    }

    const started = performance.now();
    const timedOut = this.forceTimeout || this.delayMs > spec.timeoutMs || spec.timeoutMs <= 0;

    const effectiveDelay = timedOut
      ? Math.min(this.delayMs, Math.max(0, spec.timeoutMs))
      : this.delayMs;

    if (effectiveDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, effectiveDelay));
    }

    const commandLine = spec.command.join(" ");
    const defaultStdout = timedOut
      ? `fake sandbox timed out after ${spec.timeoutMs}ms: ${commandLine}`
      : `fake sandbox: ${commandLine}`;
    const stdoutText =
      typeof this.stdout === "function" ? this.stdout(spec) : (this.stdout ?? defaultStdout);
    const stderrText = typeof this.stderr === "function" ? this.stderr(spec) : (this.stderr ?? "");

    // Progressive chunks so stream consumers (build console) exercise onOutput.
    if (onOutput) {
      const chunkSize = Math.max(1, Math.ceil(stdoutText.length / 3));
      for (let i = 0; i < stdoutText.length; i += chunkSize) {
        onOutput(stdoutText.slice(i, i + chunkSize));
      }
    }

    let files: Record<string, string> = { ...spec.files };
    if (this.transformFiles) {
      files = this.transformFiles(files, spec);
    }
    files = { ...files, ...this.outputFiles };

    const exitCode = this.exitCode !== undefined ? this.exitCode : timedOut ? 124 : 0;

    return {
      exitCode,
      stdout: stdoutText,
      stderr: stderrText,
      timedOut,
      durationMs: Math.max(0, Math.round(performance.now() - started)),
      files,
    };
  }

  async healthy(): Promise<boolean> {
    return true;
  }
}
