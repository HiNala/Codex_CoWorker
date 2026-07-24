import { describe, expect, it } from "vitest";
import { buildCheckoutSessionParams } from "./session";

describe("buildCheckoutSessionParams", () => {
  it("sets subscription mode", () => {
    const params = buildCheckoutSessionParams({
      priceId: "price_1QxTeamM",
      successUrl: "https://store.test/welcome",
      cancelUrl: "https://store.test/pricing",
    });
    expect(params.mode).toBe("subscription");
  });

  it("includes a single line item for the price", () => {
    const params = buildCheckoutSessionParams({
      priceId: "price_1QxTeamM",
      successUrl: "https://store.test/welcome",
      cancelUrl: "https://store.test/pricing",
    });
    expect(params.line_items).toEqual([{ price: "price_1QxTeamM", quantity: 1 }]);
  });

  it("wires success and cancel urls", () => {
    const params = buildCheckoutSessionParams({
      priceId: "price_1QxTeamM",
      successUrl: "https://store.test/welcome",
      cancelUrl: "https://store.test/pricing",
    });
    expect(params.success_url).toBe("https://store.test/welcome");
    expect(params.cancel_url).toBe("https://store.test/pricing");
  });

  it("optionally sets customer email", () => {
    const params = buildCheckoutSessionParams({
      priceId: "price_1QxTeamM",
      successUrl: "https://store.test/welcome",
      cancelUrl: "https://store.test/pricing",
      customerEmail: "priya@northwind.test",
    });
    expect(params.customer_email).toBe("priya@northwind.test");
  });
});
