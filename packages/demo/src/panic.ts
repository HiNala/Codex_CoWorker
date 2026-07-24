/**
 * Adapter panic: force every provider adapter to the fake path.
 *
 * Returns the intended adapter map and records it on the mutable demo runtime.
 * Callers that read process env via `@forge/config` getFlags still need a
 * process restart for a full env flip — the control panel and API status
 * prefer this runtime map after panic.
 */

import { getDemoRuntime, markPanic, setDemoAdapters } from "./runtime";

export type LiveOrFake = "fake" | "live";
export type SandboxMode = "docker" | "railway" | "fake";

export type AdapterMap = {
  openai: LiveOrFake;
  codex: LiveOrFake;
  octen: LiveOrFake;
  composio: LiveOrFake;
  zendesk: LiveOrFake;
  sandbox: SandboxMode;
};

export const ADAPTER_KEYS = [
  "openai",
  "codex",
  "octen",
  "composio",
  "zendesk",
  "sandbox",
] as const satisfies ReadonlyArray<keyof AdapterMap>;

export function allFakeAdapters(): AdapterMap {
  return {
    openai: "fake",
    codex: "fake",
    octen: "fake",
    composio: "fake",
    zendesk: "fake",
    sandbox: "fake",
  };
}

/**
 * Reads baseline adapter modes from an env-shaped object (compatible with getFlags output).
 * Missing keys default to fake (safe demo default).
 */
export function adaptersFromEnv(environment: NodeJS.ProcessEnv = process.env): AdapterMap {
  const liveOrFake = (value: string | undefined): LiveOrFake =>
    value === "live" ? "live" : "fake";
  const sandbox = (value: string | undefined): SandboxMode => {
    if (value === "railway" || value === "docker" || value === "fake") return value;
    return "fake";
  };

  return {
    openai: liveOrFake(environment.ADAPTER_OPENAI),
    codex: liveOrFake(environment.ADAPTER_CODEX),
    octen: liveOrFake(environment.ADAPTER_OCTEN),
    composio: liveOrFake(environment.ADAPTER_COMPOSIO),
    zendesk: liveOrFake(environment.ADAPTER_ZENDESK),
    sandbox: sandbox(environment.ADAPTER_SANDBOX),
  };
}

/**
 * Active adapters for the demo control plane.
 * Panic always wins (all fake). Otherwise the in-memory runtime map is authoritative
 * so UI selectors and API status stay in sync without a process restart.
 */
export function resolveActiveAdapters(_environment: NodeJS.ProcessEnv = process.env): AdapterMap {
  const runtime = getDemoRuntime();
  if (runtime.panicActive) {
    return allFakeAdapters();
  }
  return { ...runtime.adapters };
}

/** Bootstrap runtime adapters from process env (call once from status/reset if desired). */
export function hydrateAdaptersFromEnv(environment: NodeJS.ProcessEnv = process.env): AdapterMap {
  const runtime = getDemoRuntime();
  if (runtime.panicActive) {
    return allFakeAdapters();
  }
  return setDemoAdapters(adaptersFromEnv(environment));
}

/**
 * PANIC: all adapters → fake. Returns the intended map for API responses.
 * Completes synchronously; target is under one second including network RTT.
 */
export function applyPanicAdapters(at: string = new Date().toISOString()): AdapterMap {
  const map = allFakeAdapters();
  setDemoAdapters(map);
  markPanic(at);
  return map;
}

export function isAllFake(adapters: AdapterMap): boolean {
  return ADAPTER_KEYS.every((key) => adapters[key] === "fake");
}
