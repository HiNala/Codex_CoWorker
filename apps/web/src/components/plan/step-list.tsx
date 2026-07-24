import type { PlanStepVM } from "@/hooks/run-state";
import { StepRow } from "./step-row";

/**
 * Ordered plan steps. Rows never reorder randomly — order is caller-stable
 * (insertion / milestone spine from persisted events).
 */
export function StepList({
  steps,
  activeStepId,
  onHover,
}: {
  steps: PlanStepVM[];
  activeStepId: string | null;
  onHover?: (id: string | null) => void;
}) {
  if (steps.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <p className="text-sm font-medium">No plan steps yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Steps appear here after the assignment contract is approved.
        </p>
      </div>
    );
  }

  return (
    <ol className="divide-y divide-border/70" aria-label="Plan steps">
      {steps.map((step) => (
        <StepRow
          key={step.id}
          step={step}
          active={step.id === activeStepId}
          {...(onHover ? { onHover } : {})}
        />
      ))}
    </ol>
  );
}
