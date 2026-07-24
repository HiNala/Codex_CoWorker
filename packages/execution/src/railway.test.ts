import { describe, expect, it } from "vitest";
import type { ExecSpec } from "@forge/contracts";
import { ExecutionNotConfiguredError } from "./errors";
import { RailwaySandboxBackend } from "./railway";

const sampleSpec: ExecSpec = {
  image: "forge/sandbox-runner:local",
  command: ["node", "run.mjs"],
  files: { "workspace/a.ts": "export {}" },
  env: { TZ: "UTC" },
  timeoutMs: 1_000,
  memoryMb: 512,
  cpus: 1,
  network: "isolated",
};

describe("RailwaySandboxBackend stub", () => {
  it("healthy() is false when tokens are absent", async () => {
    const backend = new RailwaySandboxBackend({});
    expect(backend.isConfigured()).toBe(false);
    await expect(backend.healthy()).resolves.toBe(false);
    expect(backend.name).toBe("railway-sandbox");
  });

  it("healthy() is false when only one token is set", async () => {
    const backend = new RailwaySandboxBackend({
      RAILWAY_API_TOKEN: "tok",
    });
    expect(backend.isConfigured()).toBe(false);
    await expect(backend.healthy()).resolves.toBe(false);
  });

  it("run() throws not_configured when tokens are absent — never fake success", async () => {
    const backend = new RailwaySandboxBackend({});
    await expect(backend.run(sampleSpec)).rejects.toBeInstanceOf(ExecutionNotConfiguredError);
    try {
      await backend.run(sampleSpec);
    } catch (error) {
      expect(error).toBeInstanceOf(ExecutionNotConfiguredError);
      const e = error as ExecutionNotConfiguredError;
      expect(e.code).toBe("not_configured");
      expect(e.backend).toBe("railway-sandbox");
      expect(e.message).toMatch(/not_configured/i);
    }
  });

  it("run() still refuses success when tokens present but SDK not wired", async () => {
    const backend = new RailwaySandboxBackend({
      RAILWAY_API_TOKEN: "tok",
      RAILWAY_ENVIRONMENT_ID: "env-1",
    });
    expect(backend.isConfigured()).toBe(true);
    await expect(backend.healthy()).resolves.toBe(false);
    await expect(backend.run(sampleSpec)).rejects.toMatchObject({
      code: "not_configured",
    });
  });

  it("rejects credential-shaped exec env before other checks", async () => {
    const backend = new RailwaySandboxBackend({
      RAILWAY_API_TOKEN: "tok",
      RAILWAY_ENVIRONMENT_ID: "env-1",
    });
    await expect(
      backend.run({ ...sampleSpec, env: { OPENAI_API_KEY: "x" } }),
    ).rejects.toThrow(/forbidden keys/i);
  });
});
