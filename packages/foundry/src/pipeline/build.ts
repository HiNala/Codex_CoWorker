import type {
  CapabilitySpec,
  CodexAdapter,
  GateResult,
  VerificationReport,
} from "@forge/contracts";
import { hashFixtures, runAllGates, type VerifierWorkspace } from "@forge/verifier";
import { packBundle } from "../bundle";
import type { CapabilityRegistry } from "../registry";
import { assembleWorkspace } from "../workspace";

export type FoundryEvent =
  | { type: "capability.build_started"; summary: string }
  | { type: "capability.build_output"; summary: string; detail?: unknown }
  | { type: "capability.gate_started"; summary: string; detail: GateResult }
  | { type: "capability.gate_passed"; summary: string; detail: GateResult }
  | { type: "capability.gate_failed"; summary: string; detail: GateResult }
  | { type: "capability.repair_started"; summary: string; detail: GateResult }
  | { type: "capability.repair_succeeded"; summary: string }
  | { type: "capability.repair_exhausted"; summary: string }
  | { type: "capability.approval_requested"; summary: string; detail: ApprovalCard }
  | {
      type: "capability.installed";
      summary: string;
      detail: { versionId: string; sha256: string };
    };

export interface ApprovalCard {
  purpose: string;
  slug: string;
  version: string;
  inputSummary: string;
  outputSummary: string;
  permissions: CapabilitySpec["permissions"];
  filesChanged: Array<{ path: string; additions: number; deletions: number }>;
  diff: string;
  verification: {
    gatesPassed: number;
    gatesTotal: number;
    testsPassed: number;
    testsTotal: number;
    repairAttempts: number;
  };
  knownLimitations: string[];
  buildCostMicrocredits: number;
  rollback: string;
}

export interface BuildPipelineInput {
  orgId: string;
  spec: CapabilitySpec;
  codex: CodexAdapter;
  registry: CapabilityRegistry;
  maxRepairs?: number;
  /** When true, skip human approval and install immediately (fake/demo path). */
  autoInstall?: boolean;
  onEvent?: (event: FoundryEvent) => void | Promise<void>;
  /**
   * Optional pure execute used by the in-process verifier (fakes).
   * Live sandboxes supply this via isolated evaluation instead.
   */
  executeForVerify?: (input: unknown) => Promise<unknown> | unknown;
}

export interface BuildPipelineResult {
  report: VerificationReport;
  installed: boolean;
  versionId?: string;
  sha256?: string;
  approval?: ApprovalCard;
  repairAttempts: number;
}

const MAX_REPAIRS_DEFAULT = 2;

export async function runBuildPipeline(input: BuildPipelineInput): Promise<BuildPipelineResult> {
  const maxRepairs = input.maxRepairs ?? MAX_REPAIRS_DEFAULT;
  const workspaceFiles = assembleWorkspace(input.spec);
  // Hash fixtures at assemble time — never re-hash post-build contents.
  const fixtureHashes = await hashFixtures(workspaceFiles, "fixtures/");

  await input.onEvent?.({
    type: "capability.build_started",
    summary: `Building capability ${input.spec.slug} in an isolated sandbox.`,
  });

  let sessionId = "";
  let builtFiles: Record<string, string> = {};
  const build = await input.codex.build(
    {
      spec: input.spec,
      workspaceFiles,
      outputSchema: input.spec.outputSchema,
      timeoutMs: 180_000,
    },
    async (event) => {
      sessionId = event.sessionId;
      await input.onEvent?.({
        type: "capability.build_output",
        summary: event.summary,
        detail: event,
      });
    },
  );
  builtFiles = { ...workspaceFiles, ...prefixWorkspace(build.files) };
  sessionId = build.sessionId;

  let repairAttempts = 0;
  let report = await verify(input, builtFiles, fixtureHashes, repairAttempts + 1);

  while (report.overall === "failed" && repairAttempts < maxRepairs) {
    const failed = report.gates.find((gate) => gate.status === "failed");
    if (!failed) break;
    if (failed.message.includes("trusted_fixture_tampering")) {
      // No repair — fixtures are sacred.
      break;
    }

    repairAttempts += 1;
    await input.onEvent?.({
      type: "capability.repair_started",
      summary: `Repair attempt ${repairAttempts}: ${failed.message}`,
      detail: failed,
    });

    const repaired = await input.codex.repair(
      { sessionId, failure: failed, timeoutMs: 120_000 },
      async (event) => {
        await input.onEvent?.({
          type: "capability.build_output",
          summary: event.summary,
          detail: event,
        });
      },
    );
    builtFiles = { ...builtFiles, ...prefixWorkspace(repaired.files) };
    report = await verify(input, builtFiles, fixtureHashes, repairAttempts + 1);

    if (report.overall === "passed") {
      await input.onEvent?.({
        type: "capability.repair_succeeded",
        summary: `Repair attempt ${repairAttempts} restored a clean verification report.`,
      });
    }
  }

  if (report.overall === "failed") {
    if (repairAttempts >= maxRepairs) {
      await input.onEvent?.({
        type: "capability.repair_exhausted",
        summary: `Repair exhausted after ${repairAttempts} attempt(s) for ${input.spec.slug}.`,
      });
    }
    return { report, installed: false, repairAttempts };
  }

  const approval = buildApprovalCard(input.spec, builtFiles, report, repairAttempts);
  await input.onEvent?.({
    type: "capability.approval_requested",
    summary: `Capability ${input.spec.slug} is ready for human approval.`,
    detail: approval,
  });

  if (!input.autoInstall) {
    return { report, installed: false, repairAttempts, approval };
  }

  const bundle = packBundle(builtFiles);
  const ref = await input.registry.install({
    orgId: input.orgId,
    spec: input.spec,
    sha256: bundle.sha256,
    files: builtFiles,
  });
  await input.onEvent?.({
    type: "capability.installed",
    summary: `Installed ${input.spec.slug}@${ref.version} (pinned versionId).`,
    detail: { versionId: ref.versionId, sha256: bundle.sha256 },
  });

  return {
    report,
    installed: true,
    versionId: ref.versionId,
    sha256: bundle.sha256,
    repairAttempts,
    approval,
  };
}

async function verify(
  input: BuildPipelineInput,
  files: Record<string, string>,
  fixtureHashes: Record<string, string>,
  attempt: number,
): Promise<VerificationReport> {
  const workspace: VerifierWorkspace = {
    files,
    // Original assemble-time hashes — tamper detection compares against these.
    fixtureHashes,
    slug: input.spec.slug,
    version: "1.0.0",
    permissions: input.spec.permissions,
    inputSchema: input.spec.inputSchema,
    outputSchema: input.spec.outputSchema,
    trustedTests: input.spec.trustedTestCases,
    execute: input.executeForVerify ?? (async (value) => value),
  };

  return runAllGates({
    workspace,
    attempt,
    onGate: async ({ phase, result }) => {
      if (phase === "started") {
        await input.onEvent?.({
          type: "capability.gate_started",
          summary: `Gate ${result.gate} started.`,
          detail: result,
        });
      } else if (phase === "passed") {
        await input.onEvent?.({
          type: "capability.gate_passed",
          summary: `Gate ${result.gate} passed: ${result.message}`,
          detail: result,
        });
      } else {
        await input.onEvent?.({
          type: "capability.gate_failed",
          summary: `Gate ${result.gate} failed: ${result.message}`,
          detail: result,
        });
      }
    },
  });
}

function prefixWorkspace(files: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    if (path.startsWith("src/") || path.startsWith("tests/") || path.startsWith("dist/")) {
      out[path] = content;
    } else if (path === "capability.json") {
      out[path] = content;
    } else if (path.startsWith("workspace/")) {
      out[path.slice("workspace/".length)] = content;
    } else {
      out[path] = content;
    }
  }
  return out;
}

function buildApprovalCard(
  spec: CapabilitySpec,
  files: Record<string, string>,
  report: VerificationReport,
  repairAttempts: number,
): ApprovalCard {
  const filesChanged = Object.keys(files)
    .filter((path) => path.startsWith("src/") || path === "capability.json")
    .map((path) => ({
      path,
      additions: (files[path] ?? "").split("\n").length,
      deletions: 0,
    }));
  const trusted = report.gates.find((gate) => gate.gate === "trusted_tests");
  const passed = report.gates.filter((gate) => gate.status === "passed").length;

  return {
    purpose: spec.purpose,
    slug: spec.slug,
    version: "1.0.0",
    inputSummary: JSON.stringify(spec.inputSchema).slice(0, 200),
    outputSummary: JSON.stringify(spec.outputSchema).slice(0, 200),
    permissions: spec.permissions,
    filesChanged,
    diff: filesChanged.map((file) => `+++ ${file.path}\n${files[file.path] ?? ""}`).join("\n"),
    verification: {
      gatesPassed: passed,
      gatesTotal: report.gates.length,
      testsPassed: trusted?.passed ?? 0,
      testsTotal: trusted?.total ?? 0,
      repairAttempts,
    },
    knownLimitations: ["Generated under FORGE sandbox constraints; human-approved before install."],
    buildCostMicrocredits: 50_000,
    rollback: "Disable this version in the registry; historical receipts keep the versionId.",
  };
}
