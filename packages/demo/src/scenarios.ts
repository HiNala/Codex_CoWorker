import { formatEstimate, SCENARIO_ESTIMATES_MS } from "./timing";
import { GOLDEN_PATH_CAPABILITY_GAP, GOLDEN_PATH_REQUEST } from "./seed";

export type ScenarioId = "full_golden_path" | "from_capability_gap" | "from_approval" | "replay";

export type DemoScenario = {
  id: ScenarioId;
  label: string;
  description: string;
  estimateMs: number;
  estimateLabel: string;
  entryPoint: "start" | "capability_gap" | "approval" | "replay";
  request: string;
  capabilityGap: string;
};

export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  {
    id: "full_golden_path",
    label: "Full golden path",
    description: "Broken checkout ticket → gap → build → PR → email",
    estimateMs: SCENARIO_ESTIMATES_MS.fullGoldenPath,
    estimateLabel: formatEstimate(SCENARIO_ESTIMATES_MS.fullGoldenPath),
    entryPoint: "start",
    request: GOLDEN_PATH_REQUEST,
    capabilityGap: GOLDEN_PATH_CAPABILITY_GAP,
  },
  {
    id: "from_capability_gap",
    label: "From capability gap",
    description: "Skip triage; start at gap detection and live build",
    estimateMs: SCENARIO_ESTIMATES_MS.fromCapabilityGap,
    estimateLabel: formatEstimate(SCENARIO_ESTIMATES_MS.fromCapabilityGap),
    entryPoint: "capability_gap",
    request: GOLDEN_PATH_REQUEST,
    capabilityGap: GOLDEN_PATH_CAPABILITY_GAP,
  },
  {
    id: "from_approval",
    label: "From approval",
    description: "Jump to install + external action approval money shot",
    estimateMs: SCENARIO_ESTIMATES_MS.fromApproval,
    estimateLabel: formatEstimate(SCENARIO_ESTIMATES_MS.fromApproval),
    entryPoint: "approval",
    request: GOLDEN_PATH_REQUEST,
    capabilityGap: GOLDEN_PATH_CAPABILITY_GAP,
  },
  {
    id: "replay",
    label: "Replay recorded run",
    description: "Re-emit golden-path.jsonl through the event pipeline",
    estimateMs: SCENARIO_ESTIMATES_MS.replay,
    estimateLabel: formatEstimate(SCENARIO_ESTIMATES_MS.replay),
    entryPoint: "replay",
    request: GOLDEN_PATH_REQUEST,
    capabilityGap: GOLDEN_PATH_CAPABILITY_GAP,
  },
] as const;

export function getScenario(id: ScenarioId): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((scenario) => scenario.id === id);
}
