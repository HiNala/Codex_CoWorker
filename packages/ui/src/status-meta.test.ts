import { describe, expect, it } from "vitest";
import {
  CAPABILITY_STATE_META,
  PLAN_STEP_STATUS_META,
  type CapabilityState,
} from "./status-meta";

const ALL_CAPABILITY_STATES: CapabilityState[] = [
  "available",
  "active",
  "missing",
  "specifying",
  "building",
  "testing",
  "repairing",
  "awaiting_approval",
  "installed",
  "failed",
  "disabled",
];

describe("status meta", () => {
  it("every capability state has a unique label and icon", () => {
    const labels = new Set<string>();
    const icons = new Set<string>();
    for (const state of ALL_CAPABILITY_STATES) {
      const meta = CAPABILITY_STATE_META[state];
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.icon.length).toBeGreaterThan(0);
      expect(meta.token.startsWith("status-")).toBe(true);
      labels.add(meta.label);
      icons.add(`${meta.icon}:${meta.label}`);
    }
    expect(labels.size).toBe(ALL_CAPABILITY_STATES.length);
    expect(icons.size).toBe(ALL_CAPABILITY_STATES.length);
  });

  it("every plan step status has icon + label", () => {
    for (const [status, meta] of Object.entries(PLAN_STEP_STATUS_META)) {
      expect(status.length).toBeGreaterThan(0);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.icon.length).toBeGreaterThan(0);
    }
  });
});
