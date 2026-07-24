"use client";

import { useState } from "react";
import { useReducedMotion } from "@forge/ui";
import type { TimelineItem } from "@/hooks/run-state";
import { formatCredits, formatDuration } from "@/hooks/run-state";
import { cn } from "@/lib/utils";

type TraceGroupItem = Extract<TimelineItem, { kind: "trace_group" }>;

export interface TraceGroupProps {
  item: TraceGroupItem;
  /**
   * Density / parent preference:
   * - live steps always force open
   * - settled + defaultExpanded (everything) stay open until the user toggles
   * - settled without defaultExpanded collapse to the summary line
   */
  defaultExpanded?: boolean;
}

/**
 * Signature interaction: live groups stay open; settled groups collapse to one
 * summary line. Height collapse uses CSS grid-template-rows (not JS timers).
 * Open state is derived from events + optional user override — no setState-in-effect.
 * No nested scroll: parent .panel-body is the only vertical scroller.
 */
export function TraceGroup({ item, defaultExpanded = false }: TraceGroupProps) {
  const reduced = useReducedMotion();
  const [userToggle, setUserToggle] = useState<{
    forStatus: TraceGroupItem["status"];
    open: boolean;
  } | null>(null);

  const autoOpen = item.status === "live" || defaultExpanded;
  const open =
    userToggle && userToggle.forStatus === item.status ? userToggle.open : autoOpen;

  const toggle = () => {
    setUserToggle({ forStatus: item.status, open: !open });
  };

  const summary = item.summary ?? (item.status === "live" ? "Working…" : "Trace");

  return (
    <div
      className="min-w-0 rounded-lg border border-border/60 bg-muted/30"
      data-status={item.status}
      data-open={open}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={cn(
          "flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        )}
      >
        <span
          className={cn(
            "inline-block shrink-0 text-muted-foreground",
            !reduced && "transition-transform duration-[var(--dur-base)] ease-[var(--ease-soft)]",
            open && "rotate-90",
          )}
          aria-hidden
        >
          ▸
        </span>

        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            open && item.status === "live" ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {open && item.status === "live" ? "Working…" : summary}
        </span>

        {item.status === "live" ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-[color:var(--status-active)]">
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full bg-[color:var(--status-active)]",
                !reduced && "motion-safe:animate-pulse",
              )}
            />
            Live
          </span>
        ) : (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {item.traces.length} steps · {formatDuration(item.durationMs)} · $
            {formatCredits(item.costMicrocredits)}
          </span>
        )}
      </button>

      {/* Collapse animation only — overflow-hidden is not a nested scroller */}
      <div
        className={cn(
          "grid",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          !reduced &&
            "transition-[grid-template-rows] duration-[var(--dur-base)] ease-[var(--ease-out)]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="space-y-1.5 px-3 pb-3 pl-9">
            {item.traces.map((t) => (
              <li
                key={t.id}
                className="min-w-0 break-words text-sm leading-5 text-muted-foreground"
              >
                <span className="mr-2 font-medium text-foreground/80">{t.verb}</span>
                {t.text}
              </li>
            ))}
            {item.traces.length === 0 && item.status === "live" ? (
              <li className="text-sm italic text-muted-foreground">Collecting reasoning…</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
