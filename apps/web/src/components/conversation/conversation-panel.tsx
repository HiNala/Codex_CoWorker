"use client";

import { useMemo, type ComponentProps } from "react";
import { StatusBadge, StatusGlyph, Odometer, Ring } from "@forge/ui";
import { Button } from "@/components/ui/button";
import { ApprovalCard } from "@/components/approvals/approval-card";
import type { RunState, TimelineItem, TraceDensity } from "@/hooks/run-state";
import { formatCredits } from "@/hooks/run-state";
import { cn } from "@/lib/utils";
import { Composer } from "./composer";
import { TimelineRow } from "./timeline-row";
import { usePinScroll } from "./use-pin-scroll";
import { useTraceDensity } from "./use-trace-density";
import { ArtifactCard } from "@/components/dock/artifact-card";

export interface ConversationPanelProps {
  state: RunState;
  assignmentId?: string;
  onSend?: (text: string) => void;
  onApprove?: (approvalId: string) => void;
  onDeny?: (approvalId: string) => void;
  onEvidenceOpen?: (id: string) => void;
  onPause?: () => void;
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
  return items;
}

/**
 * Dominant chat column: compact header, single scroll thread, pinned composer.
 * Approvals pinned above composer (never modal). Artifacts wrap in-thread (no dock).
 */
export function ConversationPanel({
  state,
  assignmentId,
  onSend,
  onApprove,
  onDeny,
  onEvidenceOpen,
  onPause,
  densityOverride,
  className,
}: ConversationPanelProps) {
  const { density: storedDensity, setDensity } = useTraceDensity("narrative");
  const density = densityOverride ?? storedDensity;

  // Approvals pinned; hide duplicates from scroll list
  const pendingApprovals = useMemo(
    () => state.approvals.filter((a) => a.status === "pending"),
    [state.approvals],
  );
  const pendingIds = useMemo(() => new Set(pendingApprovals.map((a) => a.id)), [pendingApprovals]);

  const items = useMemo(() => {
    const filtered = filterTimeline(state.timeline, density);
    return filtered.filter(
      (item) => item.kind !== "approval" || !pendingIds.has(item.approvalId),
    );
  }, [state.timeline, density, pendingIds]);

  const { scrollerRef, newCount, onScroll, jumpToLatest } = usePinScroll(items.length);

  // Pending approval must NOT lock chat — composer stays usable (binding model).
  const artifacts = Object.values(state.artifacts);
  const spent = state.budget.spent;
  const ceiling = state.budget.ceiling;

  return (
    <section
      aria-label="Conversation"
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[color:var(--ops-panel)]",
        className,
      )}
    >
      {/* Compact incident header — not a second app chrome */}
      <header className="panel-head flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="ops-title truncate text-[15px] leading-tight text-foreground">
              {state.title}
            </h1>
            <StatusBadge
              label={state.status.replaceAll("_", " ")}
              token={
                state.status === "awaiting_approval"
                  ? "status-warning"
                  : state.status === "running"
                    ? "status-active"
                    : state.status === "failed"
                      ? "status-danger"
                      : "status-idle"
              }
              icon={
                <StatusGlyph
                  name={
                    state.status === "awaiting_approval"
                      ? "lock"
                      : state.status === "running"
                        ? "play"
                        : "circle"
                  }
                />
              }
            />
          </div>
          <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
            Broken Checkout · Nala
            {assignmentId ? (
              <>
                <span className="mx-1 text-border">·</span>
                <span className="ops-mono text-[10px]">{assignmentId.slice(0, 8)}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="hidden items-center gap-1.5 sm:flex">
            <Ring
              value={spent}
              max={ceiling}
              size={24}
              label={`Budget ${formatCredits(spent)} of ${formatCredits(ceiling)}`}
            />
            <span className="ops-mono text-[11px] tabular-nums text-muted-foreground">
              $<Odometer value={formatCredits(spent)} />
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-8 px-2.5 text-[11px]"
            disabled={state.status !== "running"}
            onClick={onPause}
          >
            Pause
          </Button>
          <div
            role="group"
            aria-label="Detail level"
            className="flex rounded-md border border-border p-0.5"
          >
            {(["narrative", "detailed"] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={cn(
                  "min-h-7 rounded px-2 text-[11px] font-medium capitalize",
                  density === d || (d === "detailed" && density === "everything")
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground",
                )}
                aria-pressed={
                  density === d || (d === "detailed" && density === "everything")
                }
                onClick={() => {
                  if (!densityOverride) setDensity(d === "detailed" ? "detailed" : "narrative");
                }}
              >
                {d === "narrative" ? "Story" : "Detail"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Exactly one vertical scroller for the thread */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="panel-body space-y-5 px-5 py-5 sm:px-6 sm:py-6"
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

        {/* Wrap/grid artifact attachments in thread — never overflow-x dock */}
        {artifacts.length > 0 ? (
          <div className="rounded-xl border border-border bg-[color:var(--ops-raised)] p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Attachments · {artifacts.length}
            </p>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2">
              {artifacts.map((a) => (
                <li key={a.id} className="min-w-0">
                  <ArtifactCard artifact={a} onOpen={() => undefined} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {newCount > 0 ? (
        <div className="pointer-events-none relative z-10 -mt-10 flex justify-center">
          <Button
            type="button"
            size="sm"
            className="pointer-events-auto min-h-8 shadow-md"
            onClick={jumpToLatest}
          >
            {newCount} new
          </Button>
        </div>
      ) : null}

      {/* Exactly ONE actionable approval surface — chat only, never Foundry */}
      {pendingApprovals.map((a) => (
        <div
          key={a.id}
          id={`approval-${a.id}`}
          className="shrink-0 border-t border-[color:var(--ops-amber)]/40 bg-[color:var(--ops-amber)]/5 px-3 py-2"
          data-pinned-approval
          data-approval-id={a.id}
        >
          <ApprovalCard
            title={a.title}
            summary={a.summary}
            risk={a.risk}
            payloadPreview={a.payloadPreview}
            status={a.status}
            onApprove={() => onApprove?.(a.id)}
            onDeny={() => onDeny?.(a.id)}
            className="border-[color:var(--ops-amber)]/30 bg-[color:var(--ops-panel)] p-2.5 shadow-none"
          />
        </div>
      ))}

      {/* Composer always available — pending approval does not block chat */}
      <div className="shrink-0">
        <Composer {...(onSend ? { onSend } : {})} />
      </div>
    </section>
  );
}

function EmptyTimeline() {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-foreground">Start the assignment</p>
      <p className="mt-1 max-w-[36ch] text-sm text-muted-foreground">
        Messages, evidence, and approvals appear here in order.
      </p>
    </div>
  );
}
