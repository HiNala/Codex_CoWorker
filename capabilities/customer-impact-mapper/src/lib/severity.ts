import { HIGH_MRR_THRESHOLD_MICRODOLLARS, type Severity } from "./types";

/**
 * Documented severity rules (see README):
 * 1. critical — plan is enterprise AND ticketCount ≥ 3
 * 2. high     — mrrAtRiskMicrodollars ≥ 1_000_000_000 ($1,000)
 * 3. medium   — ticketCount ≥ 2
 * 4. low      — otherwise
 *
 * Rules are checked in order; first match wins.
 */
export function computeSeverity(
  plan: string,
  ticketCount: number,
  mrrAtRiskMicrodollars: number,
): Severity {
  const planNorm = plan.trim().toLowerCase();
  if (planNorm === "enterprise" && ticketCount >= 3) {
    return "critical";
  }
  if (mrrAtRiskMicrodollars >= HIGH_MRR_THRESHOLD_MICRODOLLARS) {
    return "high";
  }
  if (ticketCount >= 2) {
    return "medium";
  }
  return "low";
}
