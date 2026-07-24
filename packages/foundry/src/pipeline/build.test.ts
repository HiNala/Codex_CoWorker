import { describe, expect, it } from "vitest";
import type { CapabilitySpec, CodexAdapter, CodexBuildResult, GateResult } from "@forge/contracts";
import { FakeCodex } from "../fakes/fake-codex";
import { MemoryCapabilityRegistry } from "../registry";
import { runBuildPipeline } from "./build";

const ORG = "01900000-0000-7000-8000-000000000021";

const spec: CapabilitySpec = {
  slug: "echo-tool",
  name: "Echo Tool",
  purpose: "Echo structured input as output",
  inputSchema: { type: "object" },
  outputSchema: { type: "object" },
  permissions: {
    network: false,
    filesystem: "none",
    evidenceRead: true,
    maxDurationMs: 10_000,
    maxMemoryMb: 256,
    maxOutputBytes: 500_000,
  },
  trustedTestCases: [
    { name: "empty", input: {}, expected: {} },
    { name: "a", input: { a: 1 }, expected: { a: 1 } },
    { name: "nested", input: { a: { b: 2 } }, expected: { a: { b: 2 } } },
  ],
};

class FastCodex extends FakeCodex {
  constructor() {
    super(0);
  }

  override async build(
    request: {
      spec: CapabilitySpec;
      workspaceFiles: Record<string, string>;
      outputSchema: object;
      timeoutMs: number;
    },
    onEvent: Parameters<CodexAdapter["build"]>[1],
  ): Promise<CodexBuildResult> {
    const result = await super.build(request, onEvent);
    return {
      ...result,
      files: {
        ...result.files,
        "src/index.ts": "export async function execute(input: unknown) { return input; }\n",
      },
    };
  }
}

describe("foundry build pipeline", () => {
  it("builds, verifies, and auto-installs under the fake Codex path", async () => {
    const events: string[] = [];
    const registry = new MemoryCapabilityRegistry();
    const result = await runBuildPipeline({
      orgId: ORG,
      spec,
      codex: new FastCodex(),
      registry,
      autoInstall: true,
      executeForVerify: async (input) => input,
      onEvent: async (event) => {
        events.push(event.type);
      },
    });

    expect(result.installed).toBe(true);
    expect(result.report.overall).toBe("passed");
    expect(result.versionId).toBeTruthy();
    expect(events).toContain("capability.build_started");
    expect(events).toContain("capability.gate_passed");
    expect(events).toContain("capability.installed");

    const resolved = await registry.resolve(ORG, {
      slug: "echo-tool",
      purpose: "Echo structured input as output",
      inputShape: "object",
      outputShape: "object",
    });
    expect(resolved?.versionId).toBe(result.versionId);
  });

  it("emits repair_exhausted when trusted tests keep failing", async () => {
    const failing: CodexAdapter = {
      async build(_req, onEvent) {
        onEvent({
          type: "session.started",
          sessionId: "s1",
          summary: "start",
        });
        onEvent({ type: "completed", sessionId: "s1", summary: "done" });
        return {
          sessionId: "s1",
          files: {
            "capability.json": JSON.stringify({
              schemaVersion: 1,
              slug: "echo-tool",
              name: "Echo",
              version: "1.0.0",
              runtime: "node22",
              dependencies: [],
              permissions: { network: false, filesystem: "none" },
            }),
            "src/index.ts": "export async function execute() { return { wrong: true }; }\n",
          },
          summary: "built wrong",
        };
      },
      async repair(request, onEvent) {
        onEvent({
          type: "output",
          sessionId: request.sessionId,
          summary: `repair for ${request.failure.gate}`,
        });
        return {
          sessionId: request.sessionId,
          files: {
            "src/index.ts": "export async function execute() { return { still: 'wrong' }; }\n",
          },
          summary: "still wrong",
        };
      },
      async cancel() {},
    };

    const events: string[] = [];
    const result = await runBuildPipeline({
      orgId: ORG,
      spec,
      codex: failing,
      registry: new MemoryCapabilityRegistry(),
      autoInstall: true,
      maxRepairs: 2,
      executeForVerify: async () => ({ wrong: true }),
      onEvent: async (event) => {
        events.push(event.type);
      },
    });

    expect(result.installed).toBe(false);
    expect(result.repairAttempts).toBe(2);
    expect(events).toContain("capability.repair_started");
    expect(events).toContain("capability.repair_exhausted");
  });

  it("does not repair trusted_fixture_tampering failures", async () => {
    const adapter: CodexAdapter = {
      async build(_req, onEvent) {
        onEvent({ type: "session.started", sessionId: "s2", summary: "start" });
        onEvent({ type: "completed", sessionId: "s2", summary: "done" });
        return {
          sessionId: "s2",
          files: {
            "capability.json": JSON.stringify({
              schemaVersion: 1,
              slug: "echo-tool",
              name: "Echo",
              version: "1.0.0",
              runtime: "node22",
              dependencies: [],
              permissions: { network: false, filesystem: "none" },
            }),
            "src/index.ts": "export async function execute(i){return i}\n",
            // Tamper with a fixture the pipeline already hashed from assembleWorkspace
            "fixtures/empty.json": JSON.stringify({ name: "empty", input: {}, expected: { hacked: true } }),
          },
          summary: "tampered",
        };
      },
      async repair() {
        throw new Error("repair must not be called for fixture tampering");
      },
      async cancel() {},
    };

    const result = await runBuildPipeline({
      orgId: ORG,
      spec,
      codex: adapter,
      registry: new MemoryCapabilityRegistry(),
      autoInstall: true,
      executeForVerify: async (input) => input,
    });

    expect(result.installed).toBe(false);
    expect(result.repairAttempts).toBe(0);
    expect(result.report.gates[0]?.message).toMatch(/trusted_fixture_tampering/);
  });
});
