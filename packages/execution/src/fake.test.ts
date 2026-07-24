import { describe, expect, it } from "vitest";
import type { ExecSpec } from "@forge/contracts";
import { FakeExecutionBackend } from "./fake";

function spec(overrides: Partial<ExecSpec> = {}): ExecSpec {
  return {
    image: "fake",
    command: ["node", "index.js"],
    files: {
      "workspace/src/index.ts": "export default {}",
      "fixtures/case.json": '{"n":1}',
    },
    env: { TZ: "UTC" },
    timeoutMs: 5_000,
    memoryMb: 256,
    cpus: 1,
    network: "none",
    ...overrides,
  };
}

describe("FakeExecutionBackend", () => {
  it("round-trips input files into the result", async () => {
    const backend = new FakeExecutionBackend({ delayMs: 1 });
    const input = spec();
    const result = await backend.run(input);

    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.files["workspace/src/index.ts"]).toBe("export default {}");
    expect(result.files["fixtures/case.json"]).toBe('{"n":1}');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(backend.name).toBe("fake");
  });

  it("merges outputFiles and transform writes for foundry/verifier fakes", async () => {
    const backend = new FakeExecutionBackend({
      delayMs: 1,
      outputFiles: { "workspace/result.json": '{"ok":true}' },
      transformFiles: (files: Record<string, string>) => ({
        ...files,
        "workspace/src/index.ts": "export default { ok: true }",
      }),
    });
    const result = await backend.run(spec());
    expect(result.files["workspace/result.json"]).toBe('{"ok":true}');
    expect(result.files["workspace/src/index.ts"]).toBe("export default { ok: true }");
  });

  it("sets timedOut when delay exceeds timeoutMs", async () => {
    const backend = new FakeExecutionBackend({ delayMs: 50 });
    const result = await backend.run(spec({ timeoutMs: 5 }));
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(124);
  });

  it("honors forceTimeout", async () => {
    const backend = new FakeExecutionBackend({ delayMs: 1, forceTimeout: true });
    const result = await backend.run(spec());
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(124);
  });

  it("streams progressive onOutput chunks", async () => {
    const backend = new FakeExecutionBackend({
      delayMs: 1,
      stdout: "abcdefghij",
    });
    const chunks: string[] = [];
    await backend.run(spec(), (c) => chunks.push(c));
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toBe("abcdefghij");
  });

  it("rejects credential-shaped env like docker", async () => {
    const backend = new FakeExecutionBackend({ delayMs: 0 });
    await expect(backend.run(spec({ env: { CODEX_API_KEY: "nope" } }))).rejects.toThrow(
      /forbidden keys/i,
    );
  });

  it("reports healthy", async () => {
    await expect(new FakeExecutionBackend().healthy()).resolves.toBe(true);
  });
});
