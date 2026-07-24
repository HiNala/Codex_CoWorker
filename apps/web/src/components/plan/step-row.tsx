import { PLAN_STEP_STATUS_META } from "@forge/ui";
import type { PlanStepVM } from "@/hooks/run-state";
import { formatCredits, formatDuration } from "@/hooks/run-state";
import { cn } from "@/lib/utils";
import { StepStatusIcon } from "./step-status-icon";

/**
 * Single plan step. Status is props-only — never transitions itself.
 * Blocked/failed reasons render inline (not tooltip-only).
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
        "grid grid-cols-[28px_1fr_auto] items-start gap-3 border-l-2 px-5 py-3.5 transition-colors duration-[var(--dur-quick)]",
        active
          ? "border-l-[color:var(--status-active)] bg-[color:var(--status-active)]/5"
          : "border-l-transparent",
        step.status === "blocked" &&
          !active &&
          "border-l-[color:var(--status-warning)]",
        step.status === "failed" &&
          !active &&
          "border-l-[color:var(--status-danger)]",
      )}
      style={depth > 0 ? { paddingLeft: `${20 + depth * 16}px` } : undefined}
      data-step-id={step.id}
      data-step-status={step.status}
      data-active={active ? "true" : "false"}
      onMouseEnter={() => onHover?.(step.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <StepStatusIcon status={step.status} className="mt-0.5" />
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm font-medium leading-5",
            step.status === "completed" && "text-muted-foreground",
            step.status === "skipped" && "text-muted-foreground",
            step.status === "cancelled" && "text-muted-foreground line-through",
          )}
        >
          {step.title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium" style={{ color: `var(--${meta.token})` }}>
            {meta.label}
          </span>
          {step.changedAfterApproval ? (
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground">
              Plan updated
            </span>
          ) : null}
          {step.status === "needs_capability" ? (
            <span className="text-[10px] uppercase tracking-wide text-[color:var(--status-building)]">
              needs ✓
            </span>
          ) : null}
        </p>
        {showReason ? (
          <p
            className="mt-1 text-xs leading-5"
            style={{
              color:
                step.status === "failed"
                  ? "var(--status-danger)"
                  : "var(--status-warning)",
            }}
          >
            {step.blockedReason}
          </p>
        ) : null}
        {step.artifactIds.length > 0 ? (
          <p className="mt-1 text-[11px] text-muted-foreground">
            ⇢ {step.artifactIds.length} output
            {step.artifactIds.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>
      <div className="text-end font-mono text-[11px] tabular-nums text-muted-foreground">
        {step.durationMs != null ? <div>{formatDuration(step.durationMs)}</div> : null}
        {step.costMicrocredits ? (
          <div>${formatCredits(step.costMicrocredits)}</div>
        ) : null}
      </div>
    </li>
  );
}
