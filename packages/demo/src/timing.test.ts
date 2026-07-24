import { describe, expect, it } from "vitest";
import {
  BUDGET_OVERAGE_THRESHOLD,
  TIMING_BUDGETS_MS,
  TIMING_TOTAL_BUDGET_MS,
  formatEstimate,
  isBeatOverBudget,
  isBeatWithinBudget,
  reportBeatTiming,
} from "./timing";

describe("timing budgets (Track J §3)", () => {
  it("matches documented per-beat budgets", () => {
    expect(TIMING_BUDGETS_MS.contractDraft).toBe(8_000);
    expect(TIMING_BUDGETS_MS.research).toBe(10_000);
    expect(TIMING_BUDGETS_MS.clusteringMapping).toBe(4_000);
    expect(TIMING_BUDGETS_MS.capabilitySpec).toBe(10_000);
    expect(TIMING_BUDGETS_MS.codexBuild).toBe(45_000);
    expect(TIMING_BUDGETS_MS.verification).toBe(15_000);
    expect(TIMING_BUDGETS_MS.repairReverify).toBe(35_000);
    expect(TIMING_BUDGETS_MS.artifacts).toBe(8_000);
  });

  it("sums to ~2m15s machine budget", () => {
    expect(TIMING_TOTAL_BUDGET_MS).toBe(135_000);
  });

  it("flags 50% overage as blocked threshold", () => {
    expect(BUDGET_OVERAGE_THRESHOLD).toBe(1.5);
    expect(isBeatWithinBudget("codexBuild", 45_000)).toBe(true);
    expect(isBeatOverBudget("codexBuild", 45_000)).toBe(false);
    expect(isBeatOverBudget("codexBuild", 45_000 * 1.5 + 1)).toBe(true);
  });

  it("reports beat timing fields", () => {
    const report = reportBeatTiming("research", 12_000);
    expect(report.withinBudget).toBe(false);
    expect(report.overThreshold).toBe(false);
    expect(report.budgetMs).toBe(10_000);
  });

  it("formats scenario estimates", () => {
    expect(formatEstimate(220_000)).toBe("3m40s");
    expect(formatEstimate(40_000)).toBe("0m40s");
  });
});
