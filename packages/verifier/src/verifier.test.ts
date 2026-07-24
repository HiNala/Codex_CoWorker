import { describe, expect, it } from "vitest";
import { REQUIRED_GATES, runAllGates, trustedFixtureWasModified } from "./index";
import { hashFixtures, type VerifierWorkspace } from "./workspace";

function baseWorkspace(overrides: Partial<VerifierWorkspace> = {}): VerifierWorkspace {
  const files = {
    "capability.json": JSON.stringify({
      schemaVersion: 1,
      slug: "echo-tool",
      name: "Echo",
      version: "1.0.0",
      runtime: "node22",
      dependencies: [],
      permissions: { network: false, filesystem: "none" },
    }),
    "src/index.ts": "export async function execute(input) { return input; }\n",
    "fixtures/case-1.json": JSON.stringify({ name: "identity", input: { a: 1 }, expected: { a: 1 } }),
    ...overrides.files,
  };
  return {
    files,
    fixtureHashes: {},
    slug: "echo-tool",
    version: "1.0.0",
    permissions: {
      network: false,
      filesystem: "none",
      evidenceRead: true,
      maxDurationMs: 10_000,
      maxMemoryMb: 256,
      maxOutputBytes: 500_000,
    },
    inputSchema: { type: "object" },
    outputSchema: { type: "object" },
    trustedTests: [{ name: "identity", input: { a: 1 }, expected: { a: 1 } }],
    execute: async (input) => input,
    ...overrides,
  };
}

describe("verifier invariants", () => {
  it("defines all twelve independent gates", () => {
    expect(REQUIRED_GATES).toHaveLength(12);
  });

  it("detects any write into trusted fixtures path list", () => {
    expect(
      trustedFixtureWasModified(["src/index.ts", "packages/capability-fixtures/nested.json"]),
    ).toBe(true);
  });

  it("passes a pure identity capability under fakes", async () => {
    const workspace = baseWorkspace();
    workspace.fixtureHashes = await hashFixtures(workspace.files);
    const report = await runAllGates({ workspace });
    expect(report.overall).toBe("passed");
    expect(report.gates).toHaveLength(12);
  });

  it("fails gate imports when fs is imported", async () => {
    const workspace = baseWorkspace({
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
        "src/index.ts": "import fs from 'fs';\nexport async function execute(i){return i}\n",
        "fixtures/case-1.json": "{}",
      },
    });
    workspace.fixtureHashes = await hashFixtures(workspace.files);
    const report = await runAllGates({ workspace });
    expect(report.overall).toBe("failed");
    expect(report.gates.find((g) => g.gate === "imports")?.status).toBe("failed");
  });

  it("fails immediately on trusted fixture tampering", async () => {
    const workspace = baseWorkspace();
    workspace.fixtureHashes = await hashFixtures(workspace.files);
    workspace.files["fixtures/case-1.json"] = JSON.stringify({ tampered: true });
    const report = await runAllGates({ workspace });
    expect(report.overall).toBe("failed");
    expect(report.gates[0]?.message).toMatch(/trusted_fixture_tampering/);
  });

  it("fails determinism when execute uses randomness", async () => {
    // trusted_tests + schema_conformance consume early calls with a fixed value;
    // later identical inputs diverge so gate 10 fails.
    let phase = 0;
    const workspace = baseWorkspace({
      trustedTests: [{ name: "identity", input: { a: 1 }, expected: { n: 1 } }],
      execute: async () => {
        phase += 1;
        if (phase <= 2) return { n: 1 };
        return { n: Math.random() };
      },
    });
    workspace.fixtureHashes = await hashFixtures(workspace.files);
    const report = await runAllGates({ workspace });
    expect(report.overall).toBe("failed");
    expect(report.gates.find((g) => g.gate === "determinism")?.status).toBe("failed");
  });

  it("emits started/passed/failed gate callbacks in order", async () => {
    const phases: string[] = [];
    const workspace = baseWorkspace();
    workspace.fixtureHashes = await hashFixtures(workspace.files);
    await runAllGates({
      workspace,
      onGate: ({ phase, result }) => {
        phases.push(`${phase}:${result.gate}`);
      },
    });
    expect(phases.filter((p) => p.startsWith("started:"))).toHaveLength(12);
    expect(phases.filter((p) => p.startsWith("passed:"))).toHaveLength(12);
    expect(phases[0]).toBe("started:manifest");
    expect(phases[1]).toBe("passed:manifest");
  });
});
