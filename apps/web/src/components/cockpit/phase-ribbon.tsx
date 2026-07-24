"use client";

import type { RunState } from "@/hooks/run-state";
import { cn } from "@/lib/utils";

/** Event-driven ops phases — never advanced by timers. */
export const OPS_PHASES = ["Intake", "Diagnose", "Repair", "Verify", "Approve"] as const;
export type OpsPhase = (typeof OPS_PHASES)[number];

/**
 * Derive phase strictly from projected RunState facts.
 * Order is fixed; current index is the furthest phase justified by events.
 */
export function deriveOpsPhase(state: RunState): OpsPhase {
  const caps = Object.values(state.capabilities);
  const arts = Object.values(state.artifacts);
  const hasPendingApproval = state.approvals.some((a) => a.status === "pending");
  const hasGap = caps.some((c) =>
    ["missing", "specifying", "building", "testing", "repairing", "awaiting_approval"].includes(
      c.state,
    ),
  );
  const building = caps.some((c) =>
    ["building", "testing", "repairing", "specifying"].includes(c.state),
  );
  const verifiedish =
    caps.some((c) => c.state === "awaiting_approval" || c.state === "installed") ||
    (state.build?.gates.some((g) => g.status === "passed") ?? false);
  const hasArtifacts = arts.length > 0;

  if (hasPendingApproval || state.status === "awaiting_approval") return "Approve";
  if (verifiedish && !building) return "Verify";
  if (building || caps.some((c) => c.state === "repairing")) return "Repair";
  if (hasGap || state.timeline.some((t) => t.kind === "gap_marker" || t.kind === "trace_group"))
    return "Diagnose";
  if (hasArtifacts || state.timeline.some((t) => t.kind === "user_message")) return "Intake";
  return "Intake";
}

export function PhaseRibbon({ state }: { state: RunState }) {
  const current = deriveOpsPhase(state);
  const currentIdx = OPS_PHASES.indexOf(current);

  return (
    <nav
      className="flex min-h-9 w-full items-center gap-1 px-3 py-1.5"
      aria-label="Run phase"
      data-phase={current}
    >
      <ol className="flex min-w-0 flex-1 items-center gap-0">
        {OPS_PHASES.map((phase, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <li key={phase} className="flex min-w-0 flex-1 items-center">
              <div
                className={cn(
                  "flex min-h-8 w-full items-center justify-center gap-1.5 rounded-md px-2 text-[12px] font-medium tracking-wide",
                  active && "bg-[color:var(--ops-signal)]/15 text-[color:var(--ops-signal)]",
                  done && !active && "text-[color:var(--ops-success)]",
                  !done && !active && "text-muted-foreground",
                )}
                aria-current={active ? "step" : undefined}
                data-phase-step={phase}
                data-phase-state={active ? "active" : done ? "done" : "pending"}
              >
                <span
                  className={cn(
                    "inline-flex size-1.5 shrink-0 rounded-full",
                    active && "bg-[color:var(--ops-signal)]",
                    done && !active && "bg-[color:var(--ops-success)]",
                    !done && !active && "bg-border",
                  )}
                  aria-hidden
                />
                <span className="truncate">{phase}</span>
              </div>
              {i < OPS_PHASES.length - 1 ? (
                <span
                  className={cn(
                    "mx-0.5 hidden h-px w-3 shrink-0 sm:block",
                    i < currentIdx ? "bg-[color:var(--ops-success)]" : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="ms-3 hidden shrink-0 text-[12px] text-muted-foreground lg:block">
        <span className="font-medium text-foreground">{current}</span>
        <span className="mx-1.5 text-border">·</span>
        <span className="capitalize">{state.status.replaceAll("_", " ")}</span>
      </p>
    </nav>
  );
}
