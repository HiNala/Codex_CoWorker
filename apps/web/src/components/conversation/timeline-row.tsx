"use client";

import { EvidenceChip } from "@forge/ui";
import type { TimelineItem, TraceDensity } from "@/hooks/run-state";
import { cn } from "@/lib/utils";
import { ApprovalCard } from "@/components/approvals/approval-card";
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
  onApprove,
  onDeny,
  onEvidenceOpen,
}: TimelineRowProps) {
  switch (item.kind) {
    case "user_message":
      return (
        <article className="ml-auto max-w-[62ch] rounded-xl bg-primary/15 px-4 py-3 text-foreground">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            You
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-6">{item.text}</p>
        </article>
      );

    case "coworker_message":
      return (
        <article className="max-w-[62ch]">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex size-6 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground"
              aria-hidden
              title="Nala"
            >
              N
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Nala
            </p>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-6">{item.text}</p>
        </article>
      );

    case "trace_group":
      return (
        <TraceGroup
          item={item}
          defaultExpanded={density === "everything"}
        />
      );

    case "evidence": {
      const chipProps = {
        domain: item.domain,
        title: item.title,
        retrievedAt: item.retrievedAt,
        trust: item.trust,
        ...(onEvidenceOpen ? { onOpen: () => onEvidenceOpen(item.id) } : {}),
      };
      return (
        <div className="flex justify-start">
          <EvidenceChip {...chipProps} />
        </div>
      );
    }

    case "gap_marker":
      return <GapMarker slug={item.slug} reason={item.reason} />;

    case "approval":
      return (
        <ApprovalCard
          title={item.title}
          summary={item.summary}
          risk={item.risk}
          payloadPreview={item.payloadPreview}
          onApprove={() => onApprove?.(item.approvalId)}
          onDeny={() => onDeny?.(item.approvalId)}
        />
      );

    case "notice":
      return (
        <div
          role="status"
          className={cn(
            "rounded-lg border px-3 py-2.5 text-sm leading-6",
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
