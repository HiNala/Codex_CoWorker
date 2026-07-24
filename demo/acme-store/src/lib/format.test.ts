import { describe, expect, it } from "vitest";
import { formatIntervalLabel, formatMoney } from "./format";

describe("formatMoney", () => {
  it("formats USD cents as whole dollars", () => {
    expect(formatMoney(2900, "USD")).toBe("$29");
  });

  it("defaults to USD", () => {
    expect(formatMoney(9900)).toBe("$99");
  });

  it("formats interval labels", () => {
    expect(formatIntervalLabel("monthly")).toBe("/mo");
    expect(formatIntervalLabel("yearly")).toBe("/yr");
  });
});
