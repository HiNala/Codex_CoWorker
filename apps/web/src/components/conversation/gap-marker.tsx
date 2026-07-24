import { cn } from "@/lib/utils";

export interface GapMarkerProps {
  slug: string;
  reason: string;
  className?: string;
}

/**
 * Distinctive inline marker for capability.gap_detected —
 * the story beat where the coworker realises a tool is missing.
 */
export function GapMarker({ slug, reason, className }: GapMarkerProps) {
  return (
    <div
      role="status"
      className={cn(
        "relative overflow-hidden rounded-xl border border-dashed border-[color:var(--status-building)]/70",
        "bg-[color:var(--status-building)]/10 px-4 py-3.5",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[color:var(--status-building)]"
      />
      <div className="flex items-start gap-3 pl-1">
        <span
          aria-hidden
          className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-dashed border-[color:var(--status-building)]/80 bg-card/60 font-mono text-sm font-semibold text-[color:var(--status-building)]"
        >
          +
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--status-building)]">
            Capability gap
          </p>
          <p className="mt-1 break-words font-mono text-sm font-medium text-foreground">{slug}</p>
          <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{reason}</p>
        </div>
      </div>
    </div>
  );
}
