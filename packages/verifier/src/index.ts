import { GateId, type GateId as GateName } from "@forge/contracts";

export const VERIFIER_VERSION = "1.0.0";
export const REQUIRED_GATES: readonly GateName[] = GateId.options;

export function trustedFixtureWasModified(
  changedFiles: readonly string[],
  fixtureRoot = "packages/capability-fixtures/",
): boolean {
  return changedFiles.some((file) => file.replaceAll("\\", "/").startsWith(fixtureRoot));
}

export * from "./gates";
export * from "./run-gates";
export * from "./workspace";
