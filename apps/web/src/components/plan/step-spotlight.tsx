"use client";

import { useEffect, useState } from "react";
import type { PlanStepVM } from "@/hooks/run-state";
import { formatDuration } from "@/hooks/run-state";
import { PLAN_STEP_STATUS_META } from "@forge/ui";
import { StepStatusIcon } from "./step-status-icon";

/** Substance under the title — never a fabricated progress percentage. */
function statusDetail(step: PlanStepVM): string {
  const meta = PLAN_STEP_STATUS_META[step.status];
  switch (step.status) {
    case "building_capability":
      return step.capabilityRefs.length > 0
        ? `building capability · ${step.capabilityRefs.length} linked`
        : "building capability";
    case "needs_capability":
      return "needs a capability before this step can run";
    case "awaiting_approval":
      return "waiting for your approval";
    case "retrying":
      return "retrying after a failure";
    case "blocked":
      return step.blockedReason ?? meta.label;
    case "failed":
      return step.blockedReason ?? meta.label;
    case "running":
      return step.capabilityRefs.length > 0
        ? `working · ${step.capabilityRefs.length} capability linked`
        : "working on this step";
    default:
      return meta.label;
  }
}

/**
 * Pinned "now working on" row. Elapsed timer counts wall clock only;
 * it does not invent progress (07-TRACK-D §3, 17-PACK §3).
 */
export function StepSpotlight({ step }: { step: PlanStepVM }) {
  const [now, setNow] = useState(() => Date.now());
  const meta = PLAN_STEP_STATUS_META[step.status];

  useEffect(() => {
    if (step.status !== "running" && step.status !== "retrying") return;
    if (!step.startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [step.status, step.startedAt]);

  const elapsed =
    (step.status === "running" || step.status === "retrying") && step.startedAt
      ? Math.max(0, now - Date.parse(step.startedAt))
      : step.durationMs;

  const reason =
    (step.status === "blocked" || step.status === "failed") && step.blockedReason
      ? step.blockedReason
      : null;

  return (
    <div
      className="shrink-0 border-b border-[color:var(--status-active)]/25 bg-[color:var(--status-active)]/8 px-5 py-3.5"
      data-spotlight-step={step.id}
      data-step-status={step.status}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--status-active)]">
          Now
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StepStatusIcon status={step.status} size="lg" />
            <p className="truncate text-sm font-semibold">{step.title}</p>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            <span
              className="font-medium"
              style={{ color: `var(--${meta.token})` }}
            >
              {meta.label}
            </span>
            <span className="text-muted-foreground"> · {statusDetail(step)}</span>
          </p>
          {reason ? (
            <p
              className="mt-1 text-xs leading-5"
              style={{
                color:
                  step.status === "failed"
                    ? "var(--status-danger)"
                    : "var(--status-warning)",
              }}
            >
              {reason}
            </p>
          ) : null}
        </div>
        <span
          className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground"
          aria-label={
            elapsed != null ? `Elapsed ${formatDuration(elapsed)}` : undefined
          }
        >
          {formatDuration(elapsed)}
        </span>
      </div>
    </div>
  );
}
