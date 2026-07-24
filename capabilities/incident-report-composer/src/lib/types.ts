export interface ClusterIn {
  clusterId: string;
  label: string;
  rootCauseHypothesis: string;
  ticketIds: string[];
  confidence: number;
  representativeQuotes?: Array<{ ticketId: string; quote: string }>;
}

export interface ImpactRowIn {
  rowId: string;
  accountId: string;
  accountName: string;
  plan: string;
  affectedClusterIds: string[];
  ticketCount: number;
  mrrAtRiskMicrodollars: number;
  severity: string;
  evidenceRefs: string[];
}

export interface EvidenceIn {
  id: string;
  title: string;
  excerpt: string;
  kind?: string;
  sourceUrl?: string | null;
  trust?: string;
}

export interface TimelineEvent {
  ts: string;
  event: string;
}

export interface ReportComposerInput {
  title: string;
  clusters: ClusterIn[];
  impactRows: ImpactRowIn[];
  evidence: EvidenceIn[];
  timeline: TimelineEvent[];
  changeSummary?: string;
}

export interface SectionMeta {
  id: string;
  heading: string;
  wordCount: number;
}

export interface Citation {
  anchorId: string;
  evidenceId: string;
  claim: string;
}

export interface ReportComposerOutput {
  markdown: string;
  sections: SectionMeta[];
  citations: Citation[];
  warnings: string[];
}
