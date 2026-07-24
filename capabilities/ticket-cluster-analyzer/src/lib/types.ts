export interface TicketInput {
  id: string;
  subject: string;
  body: string;
  createdAt: string;
  requesterId: string;
  tags: string[];
}

export interface ClusterAnalyzerInput {
  tickets: TicketInput[];
  minClusterSize?: number;
}

export interface RepresentativeQuote {
  ticketId: string;
  quote: string;
}

export interface Cluster {
  clusterId: string;
  label: string;
  rootCauseHypothesis: string;
  ticketIds: string[];
  confidence: number;
  representativeQuotes: RepresentativeQuote[];
}

export interface ClusterAnalyzerOutput {
  clusters: Cluster[];
  unclustered: string[];
  summary: {
    totalTickets: number;
    clusteredTickets: number;
    clusterCount: number;
  };
}
