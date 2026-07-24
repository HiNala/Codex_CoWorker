"use client";

import { useMemo, type ComponentProps } from "react";
import { WorkspacePanel } from "@/components/cockpit/workspace-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RunState, TimelineItem, TraceDensity } from "@/hooks/run-state";
import { Composer } from "./composer";
import { DensityControl } from "./density-control";
import { TimelineRow } from "./timeline-row";
import { usePinScroll } from "./use-pin-scroll";
import { useTraceDensity } from "./use-trace-density";

export interface ConversationPanelProps {
  state: RunState;
  onSend?: (text: string) => void;
  onApprove?: (approvalId: string) => void;
  onDeny?: (approvalId: string) => void;
  onEvidenceOpen?: (id: string) => void;
  /** Force density (e.g. presenter mode → narrative). */
  densityOverride?: TraceDensity;
  className?: string;
}

function filterTimeline(items: TimelineItem[], density: TraceDensity): TimelineItem[] {
  if (density === "narrative") {
    return items.filter(
      (item) =>
        item.kind === "user_message" ||
        item.kind === "coworker_message" ||
        item.kind === "approval" ||
        item.kind === "gap_marker" ||
        item.kind === "notice" ||
        item.kind === "evidence",
    );
  }
  // detailed + everything: full timeline (trace open state differs by density)
  return items;
}

export function ConversationPanel({
  state,
  onSend,
  onApprove,
  onDeny,
  onEvidenceOpen,
  densityOverride,
  className,
}: ConversationPanelProps) {
  const { density: storedDensity, setDensity } = useTraceDensity("narrative");
  const density = densityOverride ?? storedDensity;

  const items = useMemo(
    () => filterTimeline(state.timeline, density),
    [state.timeline, density],
  );

  const { scrollerRef, newCount, onScroll, jumpToLatest } = usePinScroll(items.length);

  const awaiting =
    state.status === "awaiting_approval" &&
    state.approvals.some((a) => a.status === "pending");

  return (
    <WorkspacePanel
      title="Conversation"
      description="Narrative, evidence, decisions, and approvals"
      badge={
        <Badge variant="outline" className="tabular-nums">
          {items.length} events
        </Badge>
      }
      actions={
        <DensityControl
          value={density}
          onChange={(d) => {
            if (!densityOverride) setDensity(d);
          }}
        />
      }
      className={className ?? "h-full"}
      bodyClassName="flex min-h-0 flex-col overflow-hidden p-0"
    >
      {!state.connected && state.disconnectedAt ? (
        <div
          role="status"
          className="shrink-0 border-b border-[color:var(--status-warning)]/40 bg-[color:var(--status-warning)]/10 px-4 py-2 text-xs text-foreground"
        >
          Reconnecting… showing events up to{" "}
          <span className="tabular-nums">
            {new Date(state.disconnectedAt).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="h-full space-y-4 overflow-auto overscroll-contain p-5"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Conversation timeline"
        >
          {items.length === 0 ? (
            <EmptyTimeline />
          ) : (
            items.map((item) => {
              const rowProps: ComponentProps<typeof TimelineRow> = {
                item,
                density,
              };
              if (onApprove) rowProps.onApprove = onApprove;
              if (onDeny) rowProps.onDeny = onDeny;
              if (onEvidenceOpen) rowProps.onEvidenceOpen = onEvidenceOpen;
              return <TimelineRow key={item.id} {...rowProps} />;
            })
          )}
        </div>

        {newCount > 0 ? (
          <Button
            type="button"
            size="sm"
            className="absolute bottom-3 left-1/2 min-h-9 -translate-x-1/2 shadow-md"
            onClick={jumpToLatest}
            aria-label={`Jump to ${newCount} new events`}
          >
            {newCount} new
          </Button>
        ) : null}
      </div>

      <Composer
        disabled={awaiting}
        {...(awaiting
          ? { disabledReason: "Respond to the pending approval first" }
          : {})}
        {...(onSend ? { onSend } : {})}
      />
    </WorkspacePanel>
  );
}

function EmptyTimeline() {
  return (
    <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-foreground">Start the assignment</p>
      <p className="mt-1 max-w-[36ch] text-sm text-muted-foreground">
        Messages, traces, evidence, and approvals will appear here in order.
      </p>
    </div>
  );
}
