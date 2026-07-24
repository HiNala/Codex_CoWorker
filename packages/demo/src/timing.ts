/**
 * Deterministic timing budgets from Track J §3.
 * Measure at every gate; 50% overage is a blocked condition, not stage surprise.
 */

export const TIMING_BUDGETS_MS = {
  contractDraft: 8_000,
  research: 10_000,
  clusteringMapping: 4_000,
  capabilitySpec: 10_000,
  codexBuild: 45_000,
  verification: 15_000,
  repairReverify: 35_000,
  artifacts: 8_000,
} as const;

export type TimingBeat = keyof typeof TIMING_BUDGETS_MS;

export const TIMING_BEATS = Object.keys(TIMING_BUDGETS_MS) as TimingBeat[];

export const TIMING_TOTAL_BUDGET_MS = (
  Object.values(TIMING_BUDGETS_MS) as number[]
).reduce((sum, value) => sum + value, 0);

/** ~2m15s machine time leaves ~90s for narration and approvals in a 4-minute slot. */
export const DEMO_NARRATION_RESERVE_MS = 90_000;

/** Overage factor that should file a blocked changelog entry. */
export const BUDGET_OVERAGE_THRESHOLD = 1.5;

export function budgetFor(beat: TimingBeat): number {
  return TIMING_BUDGETS_MS[beat];
}

export function isBeatOverBudget(beat: TimingBeat, elapsedMs: number): boolean {
  return elapsedMs > TIMING_BUDGETS_MS[beat] * BUDGET_OVERAGE_THRESHOLD;
}

export function isBeatWithinBudget(beat: TimingBeat, elapsedMs: number): boolean {
  return elapsedMs <= TIMING_BUDGETS_MS[beat];
}

export type BeatTimingReport = {
  beat: TimingBeat;
  budgetMs: number;
  elapsedMs: number;
  withinBudget: boolean;
  overThreshold: boolean;
};

export function reportBeatTiming(beat: TimingBeat, elapsedMs: number): BeatTimingReport {
  return {
    beat,
    budgetMs: TIMING_BUDGETS_MS[beat],
    elapsedMs,
    withinBudget: isBeatWithinBudget(beat, elapsedMs),
    overThreshold: isBeatOverBudget(beat, elapsedMs),
  };
}

/** Scenario wall-clock estimates shown on the control panel (includes narration). */
export const SCENARIO_ESTIMATES_MS = {
  fullGoldenPath: 220_000,
  fromCapabilityGap: 80_000,
  fromApproval: 40_000,
  replay: 220_000,
} as const;

export function formatEstimate(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m${seconds.toString().padStart(2, "0")}s`;
}
