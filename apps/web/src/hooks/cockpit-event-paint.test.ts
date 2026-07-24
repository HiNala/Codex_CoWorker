/**
 * Regression: event-driven cockpit VMs for spotlight / trace / artifact / approval.
 * Status comes only from RunEvent projection — no timer fabricates state.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { serializeRunEvent } from "@forge/events";
import { buildDemoEvents } from "./demo-run-fixture";
import { extractSseDataPayload, parseSseRunEventData } from "./parse-sse-run-event";
import { runReducer } from "./run-reducer";
import { initialRunState, type RunState } from "./run-state";

function projectDemoViaSse(): RunState {
  let state = initialRunState;
  const decoder = new TextDecoder();
  for (const event of buildDemoEvents()) {
    const frame = decoder.decode(serializeRunEvent(event));
    const data = extractSseDataPayload(frame);
    const parsed = parseSseRunEventData(data!);
    expect(parsed).not.toBeNull();
    state = runReducer(state, { type: "event", event: parsed! });
  }
  return state;
}

describe("cockpit golden-path paint VMs (fake SSE)", () => {
  const state = projectDemoViaSse();

  it("spotlight: active step is running with startedAt from events (not a progress timer)", () => {
    expect(state.activeStepId).toBeTruthy();
    const active = state.steps[state.activeStepId!];
    expect(active).toBeDefined();
    expect(active!.status).toBe("running");
    expect(active!.startedAt).toBeTruthy();
    // Elapsed wall-clock may be displayed; status itself is event fact
    expect(active!.title.length).toBeGreaterThan(0);
  });

  it("trace: live or settled groups exist; settled carries summary from step.completed", () => {
    const traces = state.timeline.filter((t) => t.kind === "trace_group");
    expect(traces.length).toBeGreaterThan(0);
    const any = traces[0]!;
    expect(any.kind).toBe("trace_group");
    if (any.kind === "trace_group") {
      expect(any.traces.length).toBeGreaterThan(0);
      expect(["live", "settled"]).toContain(any.status);
    }
  });

  it("artifacts: declared/drafting cards appear from artifact.* events", () => {
    const arts = Object.values(state.artifacts);
    expect(arts.length).toBeGreaterThanOrEqual(3);
    expect(arts.some((a) => a.status === "declared" || a.status === "drafting")).toBe(true);
    expect(arts.every((a) => a.title.length > 0 && a.type.length > 0)).toBe(true);
  });

  it("approvals: pending capability_install from approval.requested", () => {
    const pending = state.approvals.filter((a) => a.status === "pending");
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.some((a) => a.risk === "capability_install")).toBe(true);
    expect(state.timeline.some((t) => t.kind === "approval")).toBe(true);
  });

  it("foundry: capability tiles + gate rows from capability.* events", () => {
    const caps = Object.values(state.capabilities);
    expect(caps.length).toBeGreaterThan(0);
    expect(caps.some((c) => c.state === "awaiting_approval" || c.state === "missing")).toBe(true);
    expect(state.build).not.toBeNull();
    expect(state.build!.gates.length).toBeGreaterThan(0);
    expect(state.build!.gates.some((g) => g.status === "passed" || g.status === "failed")).toBe(
      true,
    );
  });
});

describe("no timer / random as status source of truth (scoped sources)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const roots = [
    join(here, "use-run-stream.ts"),
    join(here, "run-reducer.ts"),
    join(here, "demo-run-fixture.ts"),
    join(here, "..", "components", "conversation", "trace-group.tsx"),
    join(here, "..", "components", "approvals", "approval-card.tsx"),
    join(here, "..", "components", "plan", "step-spotlight.tsx"),
    join(here, "..", "components", "foundry", "foundry-panel.tsx"),
    join(here, "..", "components", "dock", "artifact-dock.tsx"),
  ];

  it("scoped cockpit sources never call Math.random()", () => {
    for (const file of roots) {
      const src = readFileSync(file, "utf8");
      expect(src.includes("Math.random"), file).toBe(false);
    }
  });

  it("setInterval appears only as wall-clock elapsed in step-spotlight (not status)", () => {
    const spotlight = readFileSync(
      join(here, "..", "components", "plan", "step-spotlight.tsx"),
      "utf8",
    );
    expect(spotlight).toMatch(/setInterval/);
    expect(spotlight).toMatch(/wall-clock|elapsed|Date\.now/i);
    // Must not set status from the timer
    expect(spotlight).not.toMatch(/setInterval\([^)]*status/s);
    expect(spotlight).not.toMatch(/status\s*=\s*["']running["']/);

    const reducer = readFileSync(join(here, "run-reducer.ts"), "utf8");
    expect(reducer.includes("setTimeout")).toBe(false);
    expect(reducer.includes("setInterval")).toBe(false);
    expect(reducer.includes("Math.random")).toBe(false);

    const stream = readFileSync(join(here, "use-run-stream.ts"), "utf8");
    // Strip block + line comments so docstrings cannot false-positive the guard.
    const streamCode = stream
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    expect(streamCode.includes("setTimeout"), "use-run-stream must not call setTimeout").toBe(
      false,
    );
    expect(streamCode.includes("setInterval"), "use-run-stream must not call setInterval").toBe(
      false,
    );
  });
});
