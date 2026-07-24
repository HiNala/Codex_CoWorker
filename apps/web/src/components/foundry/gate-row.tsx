"use client";

import { StatusGlyph } from "@forge/ui";
import type { GateRowVM } from "@/hooks/run-state";
import { formatDuration } from "@/hooks/run-state";
import { cn } from "@/lib/utils";

/**
 * Fixed 3-col grid: icon | body | duration track.
 * Timing lives in the last grid column — never a floating/detached column.
 */
export function GateRow({ gate }: { gate: GateRowVM }) {
  const isFailed = gate.status === "failed";
  const isPassed = gate.status === "passed";
  const isRunning = gate.status === "running";

  const iconName =
    gate.status === "passed"
      ? "check"
      : gate.status === "failed"
        ? "x"
        : gate.status === "running"
          ? "rotate-cw"
          : gate.status === "skipped"
            ? "skip-forward"
            : "circle";

  const counter =
    gate.passed != null && gate.total != null ? `${gate.passed}/${gate.total}` : null;

  return (
    <li
      className={cn(
        "grid grid-cols-[1.25rem_minmax(0,1fr)_3.25rem] items-start gap-x-2 rounded-md px-2 py-2",
        isFailed && "bg-[color:var(--status-repairing)]/10",
        isPassed && "bg-[color:var(--status-success)]/5",
        isRunning && "bg-muted/40",
      )}
      data-gate-id={gate.id}
      data-status={gate.status}
      data-gate-name={gate.name}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex justify-self-center",
          isPassed && "text-[color:var(--status-success)]",
          isFailed && "text-[color:var(--status-repairing)]",
          isRunning && "text-[color:var(--status-testing)]",
          (gate.status === "pending" || gate.status === "skipped") && "text-muted-foreground",
        )}
        aria-hidden
      >
        <StatusGlyph name={iconName} className="size-3.5" />
      </span>

      <div className="min-w-0">
        <p className="break-words text-[13px] font-medium leading-5">{gate.name}</p>
        {counter ? (
          <p className="ops-mono text-[11px] tabular-nums text-muted-foreground">{counter}</p>
        ) : null}
        {isFailed && gate.message ? (
          <p
            className="mt-1 break-words text-[12px] leading-5 text-[color:var(--status-repairing)]"
            data-gate-message
          >
            {gate.message}
          </p>
        ) : null}
      </div>

      <div className="ops-mono justify-self-end self-start text-right text-[11px] tabular-nums text-muted-foreground">
        {gate.durationMs != null ? (
          formatDuration(gate.durationMs)
        ) : isRunning ? (
          <span className="text-[color:var(--status-testing)]">…</span>
        ) : (
          <span className="opacity-40">—</span>
        )}
      </div>
    </li>
  );
}
