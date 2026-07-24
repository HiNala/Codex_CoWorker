import { PLAN_STEP_STATUS_META } from "@forge/ui";
import type { PlanStepVM } from "@/hooks/run-state";
import { formatCredits, formatDuration } from "@/hooks/run-state";
import { cn } from "@/lib/utils";
import { StepStatusIcon } from "./step-status-icon";

/**
 * Single plan step. Timing column is a fixed track so values align with rows.
 */
export function StepRow({
  step,
  active,
  onHover,
  depth = 0,
}: {
  step: PlanStepVM;
  active?: boolean;
  onHover?: (id: string | null) => void;
  depth?: number;
}) {
  const meta = PLAN_STEP_STATUS_META[step.status];
  const showReason =
    (step.status === "blocked" || step.status === "failed") && step.blockedReason;

  return (
    <li
      className={cn(
        "grid grid-cols-[1.25rem_minmax(0,1fr)_4.5rem] items-center gap-x-2 border-l-2 py-2.5 pr-3",
        active
          ? "border-l-[color:var(--ops-signal)] bg-[color:var(--ops-signal)]/8"
          : "border-l-transparent",
        step.status === "blocked" && !active && "border-l-[color:var(--ops-amber)]",
        step.status === "failed" && !active && "border-l-[color:var(--status-danger)]",
      )}
      style={{ paddingLeft: depth > 0 ? 12 + depth * 12 : 12 }}
      data-step-id={step.id}
      data-step-status={step.status}
      data-active={active ? "true" : "false"}
      onMouseEnter={() => onHover?.(step.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <StepStatusIcon status={step.status} className="justify-self-center" />
      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-[13px] font-medium leading-5",
            (step.status === "completed" || step.status === "skipped") &&
              "text-muted-foreground",
            step.status === "cancelled" && "text-muted-foreground line-through",
          )}
        >
          {step.title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <span className="font-medium" style={{ color: `var(--${meta.token})` }}>
            {meta.label}
          </span>
          {showReason ? (
            <span className="truncate text-[color:var(--ops-amber)]">{step.blockedReason}</span>
          ) : null}
        </p>
      </div>
      <div className="w-[4.5rem] shrink-0 self-center text-right ops-mono text-[11px] tabular-nums text-muted-foreground">
        {step.durationMs != null ? (
          <div className="leading-4">{formatDuration(step.durationMs)}</div>
        ) : (
          <div className="leading-4 opacity-40">—</div>
        )}
        {step.costMicrocredits ? (
          <div className="leading-4">${formatCredits(step.costMicrocredits)}</div>
        ) : null}
      </div>
    </li>
  );
}
