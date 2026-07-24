import { describe, expect, it } from "vitest";
import { applyLedgerEntry } from "./index";

describe("credit ledger arithmetic", () => {
  it("uses integer microcredits", () => {
    expect(applyLedgerEntry(1_000_000, -25_000)).toBe(975_000);
    expect(() => applyLedgerEntry(1.1, 1)).toThrow(/safe integers/);
  });
});
