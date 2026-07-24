import type { GateId, GateResult, VerificationReport } from "@forge/contracts";
import { detectFixtureTampering, gates } from "./gates";
import type { VerifierWorkspace } from "./workspace";
import { sha256Hex } from "./workspace";

const VERIFIER_VERSION = "1.0.0";

export interface RunGatesOptions {
  workspace: VerifierWorkspace;
  attempt?: number;
  onGate?: (event: { phase: "started" | "passed" | "failed"; result: GateResult }) => void | Promise<void>;
}

/**
 * Flat list of independent gates. Gate 8 is preceded by fixture-hash tamper detection.
 */
export async function runAllGates(options: RunGatesOptions): Promise<VerificationReport> {
  const attempt = options.attempt ?? 1;
  const results: GateResult[] = [];
  const order = Object.keys(gates) as GateId[];

  const tamper = await detectFixtureTampering(options.workspace);
  if (tamper) {
    results.push(tamper);
    await options.onGate?.({ phase: "failed", result: tamper });
    return report(options.workspace, attempt, results);
  }

  for (const gateId of order) {
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
