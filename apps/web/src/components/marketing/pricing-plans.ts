/**
 * Provisional plan catalogue for the marketing pricing page.
 * Canonical product truth belongs in packages/config once Track K lands pricing.ts.
 * Display values are labelled provisional outside production.
 */

export type PlanCta = "start_trial" | "checkout" | "contact_sales";

export interface PricingPlanView {
  id: string;
  name: string;
  description: string;
  /** Monthly price in whole USD. Null = custom / contact. */
  monthlyPriceUsd: number | null;
  includedCredits: number;
  features: string[];
  limits: Record<string, number | boolean | string>;
  cta: PlanCta;
  ctaLabel: string;
  emphasized: boolean;
}

/** Work Credits are internal ledger units — never OpenAI / provider credits. */
export const WORK_CREDITS_BLURB =
  "Work Credits are FORGE’s internal balance. One typical assignment burns roughly 40–120 credits depending on research depth, capability builds, and artifact volume.";

export const OVERAGE_POLICY =
  "When included credits run out you can top up in packs of 500, or pause new assignments until the next cycle. Spend never exceeds the maximum you authorise on each assignment.";

export const EXAMPLE_ASSIGNMENT_COST =
  "Example: diagnosing a broken checkout and shipping a fix typically costs ~80 Work Credits — research, one capability build, verification, and a pull request.";

export const pricingPlans: PricingPlanView[] = [
  {
    id: "starter",
    name: "Starter",
    description: "One coworker, clear budgets, real deliverables for solo operators.",
    monthlyPriceUsd: 49,
    includedCredits: 500,
    features: [
      "1 named coworker",
      "500 Work Credits / month",
      "Assignment contracts & receipts",
      "Capability foundry (build missing tools)",
      "Artifact library with provenance",
    ],
    limits: {
      coworkers: 1,
      seats: 1,
      concurrentAssignments: 2,
    },
    cta: "start_trial",
    ctaLabel: "Start with Starter",
    emphasized: false,
  },
  {
    id: "team",
    name: "Team",
    description: "Shared toolbelts, approvals, and budgets for product and support crews.",
    monthlyPriceUsd: 149,
    includedCredits: 2_000,
    features: [
      "Up to 5 coworkers",
      "2,000 Work Credits / month",
      "Human approval gates",
      "Per-assignment spend ceilings",
      "Channel integrations",
      "Shared capability registry",
    ],
    limits: {
      coworkers: 5,
      seats: 10,
      concurrentAssignments: 8,
    },
    cta: "checkout",
    ctaLabel: "Choose Team",
    emphasized: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Dedicated limits, SSO-ready identity path, and procurement-friendly terms.",
    monthlyPriceUsd: null,
    includedCredits: 10_000,
    features: [
      "Custom coworker fleet",
      "Custom Work Credit pool",
      "SSO / SCIM (when configured)",
      "Private network connectors",
      "Audit exports & retention controls",
      "Priority foundry capacity",
    ],
    limits: {
      coworkers: "custom",
      seats: "custom",
      concurrentAssignments: "custom",
    },
    cta: "contact_sales",
    ctaLabel: "Contact sales",
    emphasized: false,
  },
];

export const pricingFaq: { question: string; answer: string }[] = [
  {
    question: "What do I actually pay for?",
    answer:
      "You buy access to FORGE plus an included pool of Work Credits. Credits fund assignment work — planning, tool use, capability builds, and verification. They are not resold provider credits.",
  },
  {
    question: "How do Work Credits work?",
    answer: `${WORK_CREDITS_BLURB} ${EXAMPLE_ASSIGNMENT_COST}`,
  },
  {
    question: "What happens if I run out of credits?",
    answer: OVERAGE_POLICY,
  },
  {
    question: "Who approves what the coworker does?",
    answer:
      "You do. Capability installs, external writes, and spend above the assignment ceiling require human approval. Budgets and rollback stay under your control.",
  },
  {
    question: "How is my data handled?",
    answer:
      "Tenant data stays in your org boundary. Artifacts and events are stored privately; integrations only run with credentials you connect. See Privacy for the full policy surface.",
  },
  {
    question: "Can I cancel?",
    answer:
      "Yes. Cancel anytime; remaining included credits expire at the end of the billing period. Artifact libraries and receipts stay downloadable for a retention window.",
  },
];

export function pricesAreProvisional(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
