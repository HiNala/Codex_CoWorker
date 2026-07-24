"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { PhaseRibbon } from "@/components/cockpit/phase-ribbon";
import type { MilestoneVM, PlanStepVM, RunState } from "@/hooks/run-state";
import { MilestoneHeader } from "./milestone-header";
import { StepList } from "./step-list";
import { StepSpotlight } from "./step-spotlight";

function orderSteps(steps: Record<string, PlanStepVM>, milestones: MilestoneVM[]): PlanStepVM[] {
  const milestoneRank = new Map(
    [...milestones].sort((a, b) => a.ordinal - b.ordinal).map((m, i) => [m.id, i] as const),
  );
  const insertion = Object.keys(steps);
  return Object.values(steps).sort((a, b) => {
    const ma = milestoneRank.get(a.milestoneId) ?? Number.MAX_SAFE_INTEGER;
    const mb = milestoneRank.get(b.milestoneId) ?? Number.MAX_SAFE_INTEGER;
    if (ma !== mb) return ma - mb;
    return insertion.indexOf(a.id) - insertion.indexOf(b.id);
  });
}

/**
 * Column-3 top: Task list / Mission Control.
 * Phase ribbon + active step dominate; one panel-body scroll for the list.
 */
export function MissionControl({
  state,
  onStepHover,
}: {
  state: RunState;
  onStepHover?: (stepId: string | null) => void;
}) {
  const steps = useMemo(
    () => orderSteps(state.steps, state.milestones),
    [state.steps, state.milestones],
  );
  const active = state.activeStepId ? state.steps[state.activeStepId] : null;
  const activeCount = steps.filter(
    (s) => s.status === "running" || s.status === "building_capability" || s.status === "retrying",
  ).length;

  return (
    <section
      aria-label="Mission control"
      className="flex h-full min-h-0 flex-col overflow-hidden bg-[color:var(--ops-panel)]"
    >
      <header className="panel-head flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h2 className="ops-panel-title text-foreground">Tasks</h2>
        <Badge variant="outline" className="tabular-nums">
          {activeCount} active
        </Badge>
      </header>

      <div className="shrink-0 border-b border-border">
        <PhaseRibbon state={state} />
      </div>

      {active ? (
        <div className="shrink-0 border-b border-border">
          <StepSpotlight step={active} />
        </div>
      ) : null}

      {state.milestones.length > 0 ? (
        <div className="shrink-0">
          <MilestoneHeader
            milestones={state.milestones}
            {...(active?.title ? { activeTitle: active.title } : {})}
          />
        </div>
      ) : null}

      {/* Single scroll for step list only */}
      <div className="panel-body">
        <StepList
          steps={steps}
          activeStepId={state.activeStepId}
          {...(onStepHover ? { onHover: onStepHover } : {})}
        />
      </div>
    </section>
  );
}
