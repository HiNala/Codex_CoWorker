export interface ClusterRef {
  clusterId: string;
  ticketIds: string[];
  label?: string;
  rootCauseHypothesis?: string;
  confidence?: number;
  representativeQuotes?: Array<{ ticketId: string; quote: string }>;
}

export interface AccountContact {
  id: string;
  email: string;
}

export interface Account {
  id: string;
  name: string;
  plan: string;
  mrrMicrodollars: number;
  contacts: AccountContact[];
}

export interface ImpactMapperInput {
  clusters: ClusterRef[];
  accounts: Account[];
  ticketRequesterIndex: Record<string, string>;
}

export type Severity = "low" | "medium" | "high" | "critical";

export interface ImpactRow {
  rowId: string;
  accountId: string;
  accountName: string;
  plan: string;
  affectedClusterIds: string[];
  ticketCount: number;
  mrrAtRiskMicrodollars: number;
  severity: Severity;
  evidenceRefs: string[];
}

export interface ImpactMapperOutput {
  rows: ImpactRow[];
  totals: {
    accounts: number;
    tickets: number;
    mrrAtRiskMicrodollars: number;
  };
}

/** $1,000 expressed as integer microdollars. */
export const HIGH_MRR_THRESHOLD_MICRODOLLARS = 1_000_000_000;
