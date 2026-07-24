import { GateId, type GateResult, type VerificationReport } from "@forge/contracts";
import { detectFixtureTampering, gates } from "./gates";
import type { VerifierWorkspace } from "./workspace";
import { sha256Hex } from "./workspace";

const VERIFIER_VERSION = "1.0.0";

/** Canonical gate order — independent runners, executed in this sequence. */
export const GATE_ORDER: readonly GateId[] = GateId.options;

export interface RunGatesOptions {
  workspace: VerifierWorkspace;
  attempt?: number;
  onGate?: (event: {
    phase: "started" | "passed" | "failed";
    result: GateResult;
  }) => void | Promise<void>;
}

/**
 * Run all twelve gates independently.
 * Fixture-hash tamper detection runs before gate 8 (`trusted_tests`) and aborts
 * the whole run on mismatch — message always contains `trusted_fixture_tampering`.
 * No repair path is offered for this failure (foundry respects that).
 */
export async function runAllGates(options: RunGatesOptions): Promise<VerificationReport> {
  const attempt = options.attempt ?? 1;
  const results: GateResult[] = [];

  // Prove fixtures match assemble-time hashes before any gate treats them as
  // authoritative (and strictly before gate 8). Hard fail — no further gates.
  const tamper = await detectFixtureTampering(options.workspace);
  if (tamper) {
    results.push(tamper);
    await options.onGate?.({ phase: "failed", result: tamper });
    return report(options.workspace, attempt, results);
  }

  for (const gateId of GATE_ORDER) {
    const started: GateResult = {
      gate: gateId,
      status: "passed",
      durationMs: 0,
      passed: 0,
      total: 1,
      message: `Starting gate ${gateId}`,
    };
    await options.onGate?.({ phase: "started", result: started });

    const result = await gates[gateId](options.workspace);
    results.push(result);
    await options.onGate?.({
      phase: result.status === "passed" ? "passed" : "failed",
      result,
    });
  }

  return report(options.workspace, attempt, results);
}

async function report(
  workspace: VerifierWorkspace,
  attempt: number,
  gateResults: GateResult[],
): Promise<VerificationReport> {
  const bundleSource = Object.keys(workspace.files)
    .sort()
    .map((path) => `${path}\n${workspace.files[path]}`)
    .join("\n---\n");
  const overall = gateResults.every((gate) => gate.status === "passed") ? "passed" : "failed";

  return {
    capabilitySlug: workspace.slug,
    version: workspace.version,
    attempt,
    gates: gateResults,
    overall,
    bundleSha256: await sha256Hex(bundleSource),
    verifiedAt: new Date().toISOString(),
    verifierVersion: VERIFIER_VERSION,
  };
}
