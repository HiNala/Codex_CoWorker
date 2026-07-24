/** Trusted fixture case shape used by capability-fixtures and the verifier. */
export interface TrustedFixtureCase<I = unknown, O = unknown> {
  description: string;
  input: I;
  expectedOutput: O;
}

/** @deprecated Prefer TrustedFixtureCase — kept for early bootstrap callers. */
export interface TrustedFixture<Input = unknown, Output = unknown> {
  readonly name: string;
  readonly input: Input;
  readonly expected: Output;
}

// ---------------------------------------------------------------------------
// api-change-impact-analyzer I/O (pinned by Track C mission pack §6)
// ---------------------------------------------------------------------------

export type ApiChangeKind =
  | "field_rename"
  | "field_removal"
  | "type_change"
  | "endpoint_removal";

export interface ApiChange {
  kind: ApiChangeKind;
  path: string;
  newPath?: string;
  version: string;
}

export interface UsageSample {
  file: string;
  line: number;
  snippet: string;
}

export interface Consumer {
  id: string;
  name: string;
  usageSamples: UsageSample[];
}

export interface ApiChangeImpactInput {
  apiChange: ApiChange;
  consumers: Consumer[];
}

export type MatchKind = "exact" | "nested" | "aliased";
export type BreakingLikelihood = "certain" | "likely" | "possible";

export interface ImpactMatch {
  file: string;
  line: number;
  snippet: string;
  matchKind: MatchKind;
  confidence: number;
}

export interface AffectedConsumer {
  consumerId: string;
  consumerName: string;
  matches: ImpactMatch[];
  breakingLikelihood: BreakingLikelihood;
  suggestedFix: string;
}

export interface ApiChangeImpactOutput {
  affected: AffectedConsumer[];
  /** Consumer ids with no matches, sorted. */
  unaffected: string[];
  summary: {
    consumersScanned: number;
    consumersAffected: number;
    totalMatches: number;
  };
}

export type ApiChangeImpactCase = TrustedFixtureCase<
  ApiChangeImpactInput,
  ApiChangeImpactOutput
>;
