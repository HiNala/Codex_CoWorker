import { describe, expect, it } from "vitest";
import {
  CORRECT_DISTINCT_CUSTOMER_COUNT,
  NAIVE_DISTINCT_CUSTOMER_COUNT,
  checkoutErrorLogLines,
  correctDistinctCustomers,
  naiveDistinctCustomers,
} from "./logs/checkout-errors";

describe("checkout error log fixtures", () => {
  it("has ~40 lines", () => {
    expect(checkoutErrorLogLines.length).toBeGreaterThanOrEqual(35);
    expect(checkoutErrorLogLines.length).toBeLessThanOrEqual(50);
  });

  it("naive path sees 4 customers; correct path sees 9", () => {
    expect(naiveDistinctCustomers().length).toBe(NAIVE_DISTINCT_CUSTOMER_COUNT);
    expect(correctDistinctCustomers().length).toBe(CORRECT_DISTINCT_CUSTOMER_COUNT);
    expect(NAIVE_DISTINCT_CUSTOMER_COUNT).toBe(4);
    expect(CORRECT_DISTINCT_CUSTOMER_COUNT).toBe(9);
  });
});
