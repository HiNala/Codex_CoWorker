/**
 * Golden path constants. Scenario authority:
 * docs/forge-mission-pack/23-DEMO-SCENARIO-the-broken-checkout.md
 */

import { GOLDEN_PATH_CAPABILITY_GAP, GOLDEN_PATH_REQUEST } from "./seed";

export const goldenPath = {
  title: "The broken annual checkout",
  request: GOLDEN_PATH_REQUEST,
  capabilityGap: GOLDEN_PATH_CAPABILITY_GAP,
  ticketId: "4471",
  customer: {
    name: "Priya Raghunathan",
    role: "Head of Operations",
    company: "Northwind Logistics",
  },
  expectedArtifactTypes: [
    "document.markdown",
    "table.typed",
    "code.change",
    "capability.package",
    "receipt.assignment",
  ],
  expectedImpactCustomers: 9,
  naiveImpactCustomers: 4,
  trustedTestFailRatio: "7/8",
} as const;
