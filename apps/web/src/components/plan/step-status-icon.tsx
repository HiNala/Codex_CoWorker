import { PLAN_STEP_STATUS_META, StatusGlyph, type PlanStepStatusUi } from "@forge/ui";
import { cn } from "@/lib/utils";

/**
 * Every PlanStepStatus has a distinct icon and text label.
 * Colour is never the only cue (19-PACK / 17-PACK §2).
 */
export function StepStatusIcon({
  status,
  className,
  showLabel = false,
  size = "md",
}: {
  status: PlanStepStatusUi;
  className?: string;
  /** When false, label is available to AT only (row renders the visible label). */
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const meta = PLAN_STEP_STATUS_META[status];
  const iconSize = size === "lg" ? "size-5" : size === "sm" ? "size-3.5" : "size-4";

  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1.5", showLabel && "min-w-0", className)}
      style={{ color: `var(--${meta.token})` }}
      data-status={status}
      title={meta.label}
    >
      <StatusGlyph
        name={meta.icon}
        className={cn(iconSize, status === "running" && "motion-safe:animate-pulse")}
      />
      {showLabel ? (
        <span className="truncate text-xs font-medium">{meta.label}</span>
      ) : (
        <span className="sr-only">{meta.label}</span>
      )}
    </span>
  );
}
