import { createHash } from "node:crypto";
import type { EvidenceRecord, ResearchGateway } from "@forge/contracts";

const ORG_ID = "0198206f-5f53-7000-8000-000000000001";
const NOW = "2026-07-23T22:00:00.000Z";

const sources = [
  {
    id: "0198206f-5f53-7000-8000-000000000601",
    title: "Checkout cadence contract",
    sourceUrl: "https://docs.example.test/checkout/cadence",
    excerpt: "The supported cadence key is annual; yearly is not a recognized price lookup key.",
  },
  {
    id: "0198206f-5f53-7000-8000-000000000602",
    title: "Pricing route deployment notes",
    sourceUrl: "https://docs.example.test/releases/pricing-route",
    excerpt: "The pricing page and checkout API must share the same cadence enum.",
  },
  {
    id: "0198206f-5f53-7000-8000-000000000603",
    title: "Support incident policy",
    sourceUrl: "https://docs.example.test/support/incidents",
    excerpt: "Customer-facing messages remain drafts until an approval is recorded.",
  },
  {
    id: "0198206f-5f53-7000-8000-000000000604",
    title: "Release verification checklist",
    sourceUrl: "https://docs.example.test/engineering/verification",
    excerpt: "Checkout changes require unit, route, and browser coverage before release.",
  },
] as const;

function evidence(): EvidenceRecord[] {
  return sources.map((source) => ({
    ...source,
    orgId: ORG_ID,
    kind: "web",
    contentSha256: createHash("sha256").update(source.excerpt).digest("hex"),
    retrievedAt: NOW,
    trust: "official",
    injectionSuspected: false,
  }));
}

export class FakeResearchGateway implements ResearchGateway {
  async search(_request: {
    query: string;
    includeDomains?: string[];
    excludeDomains?: string[];
    limit?: number;
    since?: string;
  }): Promise<EvidenceRecord[]> {
    void _request;
    return evidence();
  }

  async news(_request: { query: string; limit?: number }): Promise<EvidenceRecord[]> {
    void _request;
    return evidence().slice(0, 2);
  }

  async extract(_request: { urls: string[]; query?: string }): Promise<EvidenceRecord[]> {
    void _request;
    return evidence();
  }
}
