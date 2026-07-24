import { describe, expect, it } from "vitest";
import { isKnownPlan, PRICE_IDS, resolvePriceId } from "./prices";

describe("resolvePriceId", () => {
  it("resolves starter monthly", () => {
    expect(resolvePriceId("starter", "monthly")).toBe(PRICE_IDS.starter_monthly);
  });

  it("resolves team monthly", () => {
    expect(resolvePriceId("team", "monthly")).toBe(PRICE_IDS.team_monthly);
  });

  it("resolves scale monthly", () => {
    expect(resolvePriceId("scale", "monthly")).toBe(PRICE_IDS.scale_monthly);
  });

  it("returns undefined for unknown plan", () => {
    expect(resolvePriceId("enterprise", "monthly")).toBeUndefined();
  });

  it("returns undefined for empty interval", () => {
    expect(resolvePriceId("team", "")).toBeUndefined();
  });

  it("validates known plans", () => {
    expect(isKnownPlan("team")).toBe(true);
    expect(isKnownPlan("hobby")).toBe(false);
  });
});
