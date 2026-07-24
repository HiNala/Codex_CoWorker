/** Deterministic UUIDs for the Gate-1 fake golden path (no Math.random). */
export const GOLDEN = {
  orgId: "019f0000-0000-7000-8000-00000000a001",
  assignmentId: "019f0000-0000-7000-8000-00000000a002",
  runId: "019f0000-0000-7000-8000-00000000a003",
  milestoneId: "019f0000-0000-7000-8000-00000000a004",
  stepAnalyzeId: "019f0000-0000-7000-8000-00000000a005",
  capabilityId: "019f0000-0000-7000-8000-00000000a006",
  versionId: "019f0000-0000-7000-8000-00000000a007",
  /** Rigel GOLDEN-ARTIFACT.json ids — Aria dock consumes these. */
  artifactId: "0198206f-5f53-7000-8000-000000000101",
  artifactVersionId: "0198206f-5f53-7000-8000-000000000102",
  /** Capability install approval id (cockpit Hold-to-approve). */
  approvalId: "0198206f-5f53-7000-8000-0000000000e1",
} as const;

export const CHECKOUT_ANALYZER_SLUG = "checkout-error-log-analyzer";
export const ARTIFACT_TITLE = "Affected customers — annual checkout";
export const ARTIFACT_SLUG = "affected-customers-annual-checkout";
export const ARTIFACT_TYPE = "table.typed";

/** Exact attempt-1 trusted-gate failure (Rigel contract / Node correction). */
export const ATTEMPT_1_FAILURE_MESSAGE = "expected 9, received 4";

export const NAIVE_DISTINCT = 4;
export const REPAIRED_DISTINCT = 9;
