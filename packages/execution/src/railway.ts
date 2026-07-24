import type { ExecResult, ExecSpec, ExecutionBackend } from "@forge/contracts";
import { ExecutionNotConfiguredError } from "./errors";
import { assertCredentialFreeEnvironment } from "./security";

export interface RailwaySandboxEnv {
  RAILWAY_API_TOKEN?: string | undefined;
  RAILWAY_ENVIRONMENT_ID?: string | undefined;
}

/**
 * Railway Sandboxes backend (Track B SHOULD / Gate 2).
 *
 * When RAILWAY_API_TOKEN or RAILWAY_ENVIRONMENT_ID are absent, degrades honestly:
 * - healthy() → false
 * - run() → throws ExecutionNotConfiguredError (code: not_configured)
 *
 * Never reports success without a real isolated VM. Tokens live only in
 * worker/foundry service env — never in web or browser bundles.
 *
 * Lifecycle (when live SDK is wired): always `await sandbox.destroy()` in finally.
 * See lifecycle.ts and Track B §4.
 */
export class RailwaySandboxBackend implements ExecutionBackend {
  readonly name = "railway-sandbox" as const;

  private readonly env: RailwaySandboxEnv;

  constructor(env: RailwaySandboxEnv = process.env) {
    this.env = env;
  }

  /** Both Railway credentials present and non-empty. */
  isConfigured(): boolean {
    return Boolean(this.env.RAILWAY_API_TOKEN?.trim() && this.env.RAILWAY_ENVIRONMENT_ID?.trim());
  }

  async healthy(): Promise<boolean> {
    // Absent tokens → not healthy. Present tokens without live SDK still false
    // until the Railway TypeScript client is wired (honest degradation).
    if (!this.isConfigured()) {
      return false;
    }
    // Stub: credentials exist but live path is not implemented yet.
    return false;
  }

  async run(spec: ExecSpec, _onOutput?: (chunk: string) => void): Promise<ExecResult> {
    assertCredentialFreeEnvironment(spec.env);

    if (!this.isConfigured()) {
      throw new ExecutionNotConfiguredError(
        "railway-sandbox",
        "RAILWAY_API_TOKEN and RAILWAY_ENVIRONMENT_ID are required. " +
          "Set them only on the worker/foundry service; never in web. " +
          "Use createExecutionBackend('fake') or 'docker' for local runs.",
      );
    }

    // Credentials present but SDK path not shipped yet — still not a fake success.
    throw new ExecutionNotConfiguredError(
      "railway-sandbox",
      "Railway Sandbox SDK path is not implemented yet (stub). " +
        "Credentials were detected but run() refuses to pretend success. " +
        "Use docker or fake until Gate 2 live wiring lands.",
    );
  }
}
