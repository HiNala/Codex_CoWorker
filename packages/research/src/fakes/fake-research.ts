import { createHash } from "node:crypto";
import type { EvidenceRecord, ResearchGateway } from "@forge/contracts";

const ORG_ID = "0198206f-5f53-7000-8000-000000000001";
const NOW = "2026-07-23T22:00:00.000Z";

/** Broken Checkout research chips — yearly vs annual enum drift (not API rename). */
const sources = [
  {
    id: "0198206f-5f53-7000-8000-000000000601",
    title: "Billing interval contract (pricing ↔ checkout)",
    sourceUrl: "https://docs.example.test/checkout/billing-interval",
    excerpt:
      "PlanToggle and PRICE_IDS must share BillingInterval 'monthly' | 'yearly'. A map keyed on 'annual' will miss yearly selections and return undefined price ids.",
  },
  {
    id: "0198206f-5f53-7000-8000-000000000602",
    title: "Stripe Checkout session create",
    sourceUrl: "https://docs.stripe.com/api/checkout/sessions/create",
    excerpt:
      "line_items[].price must be a valid Price id. Passing undefined fails the session create; catch-all 500s hide the mismatch as 'Something went wrong. Please try again.'",
  },
  {
    id: "0198206f-5f53-7000-8000-000000000603",
    title: "Support incident policy",
    sourceUrl: "https://docs.example.test/support/incidents",
    excerpt:
      "Customer-facing messages remain drafts until an approval is recorded. Private Zendesk notes are the default write.",
  },
  {
    id: "0198206f-5f53-7000-8000-000000000604",
    title: "Checkout verification checklist",
    sourceUrl: "https://docs.example.test/engineering/checkout-verification",
    excerpt:
      "Checkout interval changes require unit coverage for monthly and yearly across all plans before release.",
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
