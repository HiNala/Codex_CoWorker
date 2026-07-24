"use client";

import { Badge } from "@/components/ui/badge";
import type { ArtifactCardVM } from "@/hooks/run-state";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@forge/ui";

export type ArtifactCardProps = {
  artifact: ArtifactCardVM;
  onOpen: () => void;
  className?: string;
};

const TYPE_LABEL: Record<string, string> = {
  "document.markdown": "Doc",
  "table.typed": "Table",
  "code.change": "Code",
  "capability.package": "Capability",
  "receipt.assignment": "Receipt",
};

const TYPE_ICON: Record<string, string> = {
  "document.markdown": "MD",
  "table.typed": "TB",
  "code.change": "DF",
  "capability.package": "CP",
  "receipt.assignment": "RC",
};

function isPlaceholder(status: ArtifactCardVM["status"]): boolean {
  return status === "declared";
}

function isDrafting(status: ArtifactCardVM["status"]): boolean {
  return status === "drafting";
}

function isReady(status: ArtifactCardVM["status"]): boolean {
  return status === "ready" || status === "published";
}

function isFailed(status: ArtifactCardVM["status"]): boolean {
  return status === "failed";
}

function formatStatus(status: ArtifactCardVM["status"]): string {
  switch (status) {
    case "declared":
      return "Declared";
    case "drafting":
      return "Drafting";
    case "ready":
      return "Ready";
    case "published":
      return "Published";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export function ArtifactCard({ artifact, onOpen, className }: ArtifactCardProps) {
  const reduced = useReducedMotion();
  const placeholder = isPlaceholder(artifact.status);
  const drafting = isDrafting(artifact.status);
  const ready = isReady(artifact.status);
  const failed = isFailed(artifact.status);
  const icon = TYPE_ICON[artifact.type] ?? "??";
  const typeLabel = TYPE_LABEL[artifact.type] ?? "Artifact";
  const statusLabel = formatStatus(artifact.status);

  return (
    <button
      type="button"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group flex min-h-11 w-56 shrink-0 flex-col gap-2 rounded-lg px-3.5 py-3 text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        // Ready transition: dashed → solid, fill, 320ms once (event-driven via status class)
        "transition-[border-color,background-color,opacity,transform] duration-[320ms] ease-[var(--ease-out,cubic-bezier(0.16,1,0.3,1))]",
        !reduced && "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2",
        placeholder
          ? "border border-dashed border-border bg-transparent text-muted-foreground"
          : drafting
            ? "border border-dashed border-border/80 bg-card/40 text-card-foreground"
            : ready
              ? "border border-solid border-border bg-card text-card-foreground shadow-sm"
              : failed
                ? "border border-solid border-[color:var(--status-danger,oklch(0.55_0.2_25))]/50 bg-[color:var(--status-danger,oklch(0.55_0.2_25))]/5 text-card-foreground"
                : "border border-border/80 bg-card/60 text-card-foreground",
        className,
      )}
      data-artifact-card
      data-status={artifact.status}
      data-type={artifact.type}
      aria-label={`${artifact.title}, ${statusLabel}${artifact.metrics ? `, ${artifact.metrics}` : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          aria-hidden
          className={cn(
            "flex size-7 items-center justify-center rounded-md font-mono text-[0.625rem] font-semibold tracking-wide",
            placeholder || drafting
              ? "bg-muted/50 text-muted-foreground"
              : failed
                ? "bg-[color:var(--status-danger,oklch(0.55_0.2_25))]/15 text-[color:var(--status-danger,oklch(0.55_0.2_25))]"
                : "bg-primary/15 text-primary",
          )}
        >
          {icon}
        </span>
        <Badge
          variant="outline"
          className={cn(
            "capitalize",
            ready && "border-primary/30 text-primary",
            failed && "border-[color:var(--status-danger,oklch(0.55_0.2_25))]/40 text-[color:var(--status-danger,oklch(0.55_0.2_25))]",
          )}
        >
          {statusLabel}
        </Badge>
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{artifact.title}</p>
        <p className="mt-0.5 text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground">
          {typeLabel}
        </p>
      </div>

      {artifact.metrics ? (
        <p className="mt-auto truncate font-mono text-[0.625rem] tabular-nums text-muted-foreground">
          {artifact.metrics}
        </p>
      ) : placeholder ? (
        <p className="mt-auto text-[0.625rem] text-muted-foreground">Declared in contract</p>
      ) : null}
    </button>
  );
}
