import { describe, expect, it } from "vitest";
import { DEMO_ASSIGNMENT_HREF } from "./constants";
import {
  formatUsd,
  pricesAreProvisional,
  pricingFaq,
  pricingPlans,
} from "./pricing-plans";

describe("marketing pricing catalogue", () => {
  it("ships three provisional plans with integer credit pools", () => {
    expect(pricingPlans).toHaveLength(3);
    for (const plan of pricingPlans) {
      expect(plan.id).toBeTruthy();
      expect(plan.includedCredits).toBeGreaterThan(0);
      expect(Number.isInteger(plan.includedCredits)).toBe(true);
      expect(plan.features.length).toBeGreaterThan(0);
      if (plan.monthlyPriceUsd !== null) {
        expect(Number.isInteger(plan.monthlyPriceUsd)).toBe(true);
      }
    }
  });

  it("marks exactly one plan as emphasized", () => {
    expect(pricingPlans.filter((p) => p.emphasized)).toHaveLength(1);
  });

  it("formats USD without cents for display prices", () => {
    expect(formatUsd(149)).toBe("$149");
  });

  it("exposes FAQ covering cost, credits, approvals, data, and cancel", () => {
    const blob = pricingFaq.map((f) => `${f.question} ${f.answer}`).join(" ").toLowerCase();
    expect(blob).toContain("work credit");
    expect(blob).toContain("approv");
    expect(blob).toContain("data");
    expect(blob).toContain("cancel");
  });

  it("labels prices provisional outside production", () => {
    if (process.env.NODE_ENV !== "production") {
      expect(pricesAreProvisional()).toBe(true);
    }
  });
});

describe("marketing CTAs", () => {
  it("points the demo CTA at the locked assignment id", () => {
    expect(DEMO_ASSIGNMENT_HREF).toBe("/a/0198206f-5f53-7000-8000-000000000005");
  });
});
