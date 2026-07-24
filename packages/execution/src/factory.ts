import type { ExecutionBackend } from "@forge/contracts";
import { DockerExecutionBackend } from "./docker";
import { FakeExecutionBackend, type FakeExecutionBackendOptions } from "./fake";
import { RailwaySandboxBackend, type RailwaySandboxEnv } from "./railway";

export type ExecutionBackendName = ExecutionBackend["name"];

export interface CreateExecutionBackendOptions {
  /** Env for Railway credential detection (defaults to process.env). */
  railwayEnv?: RailwaySandboxEnv;
  /** Options for FakeExecutionBackend when name is "fake". */
  fake?: FakeExecutionBackendOptions | number;
}

/**
 * Select an ExecutionBackend by adapter name (flags.adapters.sandbox).
 *
 * - docker — local hardened containers
 * - railway-sandbox — remote VMs; honest not_configured without tokens
 * - fake — tests / demo parachute
 */
export function createExecutionBackend(
  name: ExecutionBackendName,
  options: CreateExecutionBackendOptions = {},
): ExecutionBackend {
  switch (name) {
    case "docker":
      return new DockerExecutionBackend();
    case "railway-sandbox":
      return new RailwaySandboxBackend(options.railwayEnv);
    case "fake":
      return new FakeExecutionBackend(options.fake);
    default: {
      const exhaustive: never = name;
      throw new Error(`Unknown execution backend: ${String(exhaustive)}`);
    }
  }
}
