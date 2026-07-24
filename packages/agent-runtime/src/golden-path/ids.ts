/** Deterministic UUIDs for the Gate-1 fake golden path (no Math.random). */
export const GOLDEN = {
  orgId: "019f0000-0000-7000-8000-00000000a001",
  assignmentId: "019f0000-0000-7000-8000-00000000a002",
  runId: "019f0000-0000-7000-8000-00000000a003",
  milestoneId: "019f0000-0000-7000-8000-00000000a004",
  stepAnalyzeId: "019f0000-0000-7000-8000-00000000a005",
  capabilityId: "019f0000-0000-7000-8000-00000000a006",
  versionId: "019f0000-0000-7000-8000-00000000a007",
  artifactId: "019f0000-0000-7000-8000-00000000a008",
  artifactVersionId: "019f0000-0000-7000-8000-00000000a009",
} as const;

export const CHECKOUT_ANALYZER_SLUG = "checkout-error-log-analyzer";

/** Exact attempt-1 trusted-gate failure (Rigel contract / Node correction). */
export const ATTEMPT_1_FAILURE_MESSAGE = "expected 9, received 4";

export const NAIVE_DISTINCT = 4;
export const REPAIRED_DISTINCT = 9;
