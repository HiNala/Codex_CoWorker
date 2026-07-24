export type {
  TrustedFixture,
  TrustedFixtureCase,
  ApiChangeImpactCase,
  ApiChangeImpactInput,
  ApiChangeImpactOutput,
  ApiChangeKind,
  AffectedConsumer,
  ImpactMatch,
  MatchKind,
  BreakingLikelihood,
  Consumer,
  UsageSample,
  ApiChange,
} from "./types";

export { deepEqual, deepEqualDiff } from "./deep-equal";
export {
  runAllFixtureCases,
  runFixtureCase,
  type ExecuteFn,
  type FixtureRunResult,
} from "./run-fixture";
export {
  casesDirFor,
  loadApiChangeImpactCases,
  loadCustomerImpactCases,
  loadIncidentReportCases,
  loadReleaseNoteCases,
  loadTicketClusterCases,
  loadCheckoutErrorLogCases,
} from "./load-cases";

// Prebuilt fifth capability (war-room cut: not live-built on stage)
export type {
  CheckoutErrorLogInput,
  CheckoutErrorLogOutput,
  CheckoutErrorLogCase,
} from "../checkout-error-log-analyzer/types";
export { naiveAnalyze as naiveAnalyzeCheckoutErrors } from "../checkout-error-log-analyzer/naive-impl";
export { referenceAnalyze as referenceAnalyzeCheckoutErrors } from "../checkout-error-log-analyzer/reference-impl";
export {
  DEMO_SEED_EXPECTED,
  NAIVE_WRONG_DISTINCT,
  NAIVE_WRONG_CUSTOMERS,
  ATTEMPT_1_FAILURE_MESSAGE,
  NDJSON_RECORD_COUNT,
  NDJSON_TOP_LEVEL_ONLY,
  NDJSON_NESTED_ONLY,
  NDJSON_NO_ID,
} from "../checkout-error-log-analyzer/expected";
export {
  loadCheckoutErrorNdjsonLines,
  DEMO_WINDOW,
} from "../checkout-error-log-analyzer/load-demo-lines";
export {
  isCheckoutFailedError,
  resolveCustomerIdBothShapes,
  resolveCustomerIdTopLevelOnly,
} from "../checkout-error-log-analyzer/rules";

// Optional / prebuilt only (not the on-stage fail beat)
export { naiveAnalyze as naiveAnalyzeApiChangeImpact } from "../api-change-impact-analyzer/naive-impl";
export { referenceAnalyze as referenceAnalyzeApiChangeImpact } from "../api-change-impact-analyzer/reference-impl";
