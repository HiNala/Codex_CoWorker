"use client";

import { EvidenceChip } from "@forge/ui";
import type { TimelineItem, TraceDensity } from "@/hooks/run-state";
import { cn } from "@/lib/utils";
import { GapMarker } from "./gap-marker";
import { TraceGroup } from "./trace-group";

export interface TimelineRowProps {
  item: TimelineItem;
  density: TraceDensity;
  onApprove?: (approvalId: string) => void;
  onDeny?: (approvalId: string) => void;
  onEvidenceOpen?: (id: string) => void;
}

export function TimelineRow({
  item,
  density,
  onEvidenceOpen,
}: TimelineRowProps) {
  switch (item.kind) {
    case "user_message":
      return (
        <article className="ml-auto max-w-[min(62ch,100%)] min-w-0 rounded-xl bg-primary/15 px-4 py-3 text-foreground">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            You
          </p>
          <p className="mt-2 break-words whitespace-pre-wrap text-[15px] leading-6">
            {item.text}
          </p>
        </article>
      );

    case "coworker_message":
      return (
        <article className="max-w-[min(62ch,100%)] min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground"
              aria-hidden
              title="Nala"
            >
              N
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Nala
            </p>
          </div>
          <p className="mt-2 break-words whitespace-pre-wrap text-[15px] leading-6">
            {item.text}
          </p>
        </article>
      );

    case "trace_group":
      return <TraceGroup item={item} defaultExpanded={density === "everything"} />;

    case "evidence": {
      const chipProps = {
        domain: item.domain,
        title: item.title,
        retrievedAt: item.retrievedAt,
        trust: item.trust,
        ...(onEvidenceOpen ? { onOpen: () => onEvidenceOpen(item.id) } : {}),
      };
      return (
        <div className="flex min-w-0 max-w-full justify-start">
          <EvidenceChip {...chipProps} />
        </div>
      );
    }

    case "gap_marker":
      return <GapMarker slug={item.slug} reason={item.reason} />;

    case "approval":
      // Non-interactive summary only — actionable Hold/Deny lives on the pinned chat card.
      return (
        <div
          className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm"
          data-approval-summary
          data-approval-id={item.approvalId}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Approval
          </p>
          <p className="mt-0.5 font-medium text-foreground">{item.title}</p>
          <p className="mt-0.5 break-words text-[12px] text-muted-foreground">{item.summary}</p>
          <a
            href={`#approval-${item.approvalId}`}
            className="mt-1 inline-block text-[12px] font-medium text-[color:var(--ops-signal)] underline-offset-2 hover:underline"
          >
            Review in chat
          </a>
        </div>
      );

    case "notice":
      return (
        <div
          role="status"
          className={cn(
            "min-w-0 break-words rounded-lg border px-3 py-2.5 text-sm leading-6",
            item.level === "error" &&
              "border-[color:var(--status-danger)]/50 bg-[color:var(--status-danger)]/10 text-foreground",
            item.level === "warn" &&
              "border-[color:var(--status-warning)]/50 bg-[color:var(--status-warning)]/10 text-foreground",
            item.level === "info" && "border-border/70 bg-muted/40 text-muted-foreground",
          )}
        >
          {item.text}
        </div>
      );

    default:
      return null;
  }
}
