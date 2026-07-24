"use client";

import { useMemo } from "react";
import { WorkspacePanel } from "@/components/cockpit/workspace-panel";
import { Badge } from "@/components/ui/badge";
import type { MilestoneVM, PlanStepVM, RunState } from "@/hooks/run-state";
import { MilestoneHeader } from "./milestone-header";
import { StepList } from "./step-list";
import { StepSpotlight } from "./step-spotlight";

/**
 * Stable spine order: milestone ordinal, then insertion order of steps.
 * Never reshuffles by status (19-PACK §5).
 */
function orderSteps(
  steps: Record<string, PlanStepVM>,
  milestones: MilestoneVM[],
): PlanStepVM[] {
  const milestoneRank = new Map(
    [...milestones]
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((m, i) => [m.id, i] as const),
  );
  const insertion = Object.keys(steps);

  return Object.values(steps).sort((a, b) => {
    const ma = milestoneRank.get(a.milestoneId) ?? Number.MAX_SAFE_INTEGER;
    const mb = milestoneRank.get(b.milestoneId) ?? Number.MAX_SAFE_INTEGER;
    if (ma !== mb) return ma - mb;
    return insertion.indexOf(a.id) - insertion.indexOf(b.id);
  });
}

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
    (s) =>
      s.status === "running" ||
      s.status === "building_capability" ||
      s.status === "retrying",
  ).length;

  const ratio =
    state.budget.ceiling > 0 ? state.budget.spent / state.budget.ceiling : 0;
  const showCeiling = ratio >= 0.95 && state.budget.ceiling > 0;

  return (
    <WorkspacePanel
      title="Mission control"
      description="Approved milestones and legal step transitions"
      badge={
        <Badge variant="outline">
          {activeCount} active
        </Badge>
      }
      className="h-full min-h-0"
      bodyClassName="flex min-h-0 flex-col overflow-hidden p-0"
    >
      <MilestoneHeader
        milestones={state.milestones}
        {...(active?.title ? { activeTitle: active.title } : {})}
      />
      {active ? <StepSpotlight step={active} /> : null}
      <div className="relative min-h-0 flex-1 overflow-auto overscroll-contain">
        <StepList
          steps={steps}
          activeStepId={state.activeStepId}
          {...(onStepHover ? { onHover: onStepHover } : {})}
        />
        {showCeiling ? (
          <div className="sticky bottom-0 border-t border-[color:var(--status-warning)]/40 bg-[color:var(--status-warning)]/15 px-5 py-3 backdrop-blur">
            <p className="text-sm font-medium text-[color:var(--status-warning)]">
              Spend ceiling reached
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Raise ceiling or review spend before continuing.
            </p>
          </div>
        ) : null}
      </div>
    </WorkspacePanel>
  );
}
