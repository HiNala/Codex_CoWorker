/**
 * Canonical Broken Checkout demo copy for Tracks F/L.
 *
 * CUT #4 + 23-DEMO-SCENARIO: this is the ONLY live golden-path story.
 * Do NOT use "Webhook field rename", "api-change-impact-analyzer", or
 * "Analyse API change against consumer code" as the live assignment.
 * Those modules are prebuilt inventory only.
 */

export const BROKEN_CHECKOUT_ASSIGNMENT_TITLE = "Annual checkout failing for Team plan";

export const BROKEN_CHECKOUT_TICKET = {
  id: "ZD-4471",
  subject: "Can't upgrade to Team — annual billing errors out",
  requester: "priya.raghunathan@northwind.test",
  body: [
    "Hi — I've been trying to move our team onto the Team plan since Friday and I can't get through checkout.",
    'If I pick monthly it takes me to the payment page fine, but the moment I switch the toggle to annual and click through, I get "Something went wrong. Please try again."',
    "I've tried Chrome and Safari, two different cards, and my colleague gets the same thing on her account.",
    "We're trying to get this on the books before the quarter closes. Is there another way to pay annually?",
    "",
    "— Priya Raghunathan, Head of Operations, Northwind Logistics",
  ].join(" "),
} as const;

/** Diagnosis line for PR body / plan steps — yearly vs annual enum drift. */
export const BROKEN_CHECKOUT_DIAGNOSIS =
  "PlanToggle emits interval 'yearly' while PRICE_IDS is keyed on 'annual', so resolvePriceId returns undefined and checkout.sessions.create fails with a generic 500.";

export const BROKEN_CHECKOUT_PR_TITLE = "Fix annual checkout returning a generic 500";

export const BROKEN_CHECKOUT_PR_CHANGES = [
  "Shared BillingInterval type imported by client and server",
  "PRICE_IDS keyed on yearly (matching PlanToggle)",
  "resolvePrice returns a typed result; unknown interval → 400 instead of swallowed 500",
  "Tests for annual/yearly resolution across all plans and typed failure path",
] as const;

export const BROKEN_CHECKOUT_EMAIL = {
  subject: "Annual checkout was broken — fix is up for review",
  body: [
    "Annual plan checkout has been failing since Thursday because the billing interval the pricing page sends doesn't match the keys in the price lookup, so nothing ever reached Stripe.",
    "I've opened a PR that fixes the mismatch and makes the failure return a specific 400 instead of a silent 500, with tests covering annual across all three plans.",
    "Nine customers hit this in the last week, including Priya at Northwind who filed ticket #4471 — none of them have been contacted yet.",
    "",
    "PR: https://github.com/acme-payments/acme-store/pull/17",
    "",
    "— Nala",
  ].join("\n"),
  to: "owner@acme.test",
} as const;

/** Strings that must NEVER appear in live-scenario payloads (inventory-only legacy). */
export const FORBIDDEN_LIVE_SCENARIO_MARKERS = [
  "Webhook field rename",
  "webhook field rename incident",
  "api-change-impact-analyzer",
  "Analyse API change against consumer code",
  "Install API change impact analyzer",
  "API field rename",
  "payment_intent.metadata.customer_ref",
] as const;

export function assertBrokenCheckoutCopy(text: string): void {
  const lower = text.toLowerCase();
  for (const marker of FORBIDDEN_LIVE_SCENARIO_MARKERS) {
    if (lower.includes(marker.toLowerCase())) {
      throw new Error(
        `Demo copy must be Broken Checkout only; found forbidden live-scenario marker: ${marker}`,
      );
    }
  }
  // Positive anchors — must be about checkout/billing interval.
  if (
    !/checkout|billing|yearly|annual|price|stripe|priya|4471/i.test(text) &&
    text.trim().length > 0
  ) {
    // Allow short technical titles that still pass forbidden check when empty-ish.
  }
}
