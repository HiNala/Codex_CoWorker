/**
 * Stripe Price IDs for each plan × billing cadence.
 * Keys are composed as `${plan}_${interval}`.
 */
export const PRICE_IDS = {
  starter_monthly: "price_1QxStarterM",
  starter_annual: "price_1QxStarterA",
  team_monthly: "price_1QxTeamM",
  team_annual: "price_1QxTeamA",
  scale_monthly: "price_1QxScaleM",
  scale_annual: "price_1QxScaleA",
} as const;

export type PriceKey = keyof typeof PRICE_IDS;

export function resolvePriceId(plan: string, interval: string): string | undefined {
  return PRICE_IDS[`${plan}_${interval}` as keyof typeof PRICE_IDS];
}

export function isKnownPlan(plan: string): plan is "starter" | "team" | "scale" {
  return plan === "starter" || plan === "team" || plan === "scale";
}
