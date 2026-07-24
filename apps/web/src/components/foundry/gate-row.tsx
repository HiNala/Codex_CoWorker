"use client";

import { StatusGlyph } from "@forge/ui";
import type { GateRowVM } from "@/hooks/run-state";
import { formatDuration } from "@/hooks/run-state";
import { cn } from "@/lib/utils";

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
    gate.passed != null && gate.total != null
      ? `${gate.passed}/${gate.total}`
      : null;

  return (
    <li
      className={cn(
        "rounded-md border border-transparent px-2.5 py-2 transition-colors duration-[var(--dur-quick)]",
        isFailed &&
          "border-[color:var(--status-repairing)]/40 bg-[color:var(--status-repairing)]/8",
        isPassed && "bg-[color:var(--status-success)]/5",
        isRunning && "bg-muted/40",
      )}
      data-gate-id={gate.id}
      data-status={gate.status}
      data-gate-name={gate.name}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 inline-flex shrink-0",
            isPassed && "text-[color:var(--status-success)]",
            isFailed && "text-[color:var(--status-repairing)]",
            isRunning && "text-[color:var(--status-testing)]",
            (gate.status === "pending" || gate.status === "skipped") &&
              "text-muted-foreground",
          )}
          aria-hidden
        >
          <StatusGlyph
            name={iconName}
            className={cn("size-3.5", isRunning && "motion-safe:animate-spin")}
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="text-sm font-medium leading-5">{gate.name}</p>
            <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums text-muted-foreground">
              {counter ? <span>{counter}</span> : null}
              {gate.durationMs != null ? (
                <span>{formatDuration(gate.durationMs)}</span>
              ) : isRunning ? (
                <span className="text-[color:var(--status-testing)]">…</span>
              ) : null}
            </div>
          </div>

          {isFailed && gate.message ? (
            <p
              className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-5 text-[color:var(--status-repairing)]"
              data-gate-message
            >
              {gate.message}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
