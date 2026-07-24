"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ArtifactCardViewModel, ArtifactStatusKey, ArtifactTypeKey } from "./types";

export type ArtifactCardProps = {
  artifact: ArtifactCardViewModel;
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

function isPlaceholder(status: ArtifactStatusKey): boolean {
  return status === "declared";
}

function isReady(status: ArtifactStatusKey): boolean {
  return (
    status === "ready_for_review" ||
    status === "approved" ||
    status === "delivered" ||
    status === "published"
  );
}

function formatStatus(status: ArtifactStatusKey): string {
  if (status === "ready_for_review") return "Ready";
  if (status === "declared") return "Declared";
  return status.replace(/_/g, " ");
}

export function metricsForType(
  type: ArtifactTypeKey,
  chips: string[] | undefined,
  versionLabel: string | undefined,
): string[] {
  if (chips && chips.length > 0) {
    return versionLabel && !chips.some((c) => c.startsWith("v")) ? [...chips, versionLabel] : chips;
  }
  // Sensible empty placeholders by type when metrics have not arrived yet
  switch (type) {
    case "document.markdown":
      return versionLabel ? ["— sections", "— sources", versionLabel] : ["— sections", "— sources"];
    case "table.typed":
      return versionLabel ? ["— rows", "— warnings", versionLabel] : ["— rows"];
    case "code.change":
      return versionLabel ? ["— files", versionLabel] : ["— files"];
    case "capability.package":
      return versionLabel ? ["— gates", versionLabel] : ["— gates"];
    case "receipt.assignment":
      return versionLabel ? ["—", versionLabel] : ["—"];
    default:
      return versionLabel ? [versionLabel] : [];
  }
}

export function ArtifactCard({ artifact, onOpen, className }: ArtifactCardProps) {
  const placeholder = isPlaceholder(artifact.status);
  const ready = isReady(artifact.status);
  const chips = metricsForType(artifact.type, artifact.metrics?.chips, artifact.versionLabel);
  const icon = TYPE_ICON[artifact.type] ?? "??";
  const typeLabel = TYPE_LABEL[artifact.type] ?? "Artifact";

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
        "group flex min-h-24 w-56 shrink-0 flex-col gap-2 rounded-lg px-3.5 py-3 text-left transition-[border-color,background-color,box-shadow,opacity,transform] duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        placeholder
          ? "border border-dashed border-border bg-transparent text-muted-foreground"
          : ready
            ? "border border-solid border-border bg-card text-card-foreground shadow-sm"
            : "border border-border/80 bg-card/60 text-card-foreground",
        className,
      )}
      data-artifact-card
      data-status={artifact.status}
      data-type={artifact.type}
      aria-label={`${artifact.title}, ${formatStatus(artifact.status)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          aria-hidden
          className={cn(
            "flex size-7 items-center justify-center rounded-md font-mono text-[0.625rem] font-semibold tracking-wide",
            placeholder ? "bg-muted/50 text-muted-foreground" : "bg-primary/15 text-primary",
          )}
        >
          {icon}
        </span>
        <Badge variant="outline" className="capitalize">
          {formatStatus(artifact.status)}
        </Badge>
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{artifact.title}</p>
        <p className="mt-0.5 text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground">
          {typeLabel}
        </p>
      </div>

      {chips.length > 0 ? (
        <p className="mt-auto truncate font-mono text-[0.625rem] tabular text-muted-foreground">
          {chips.join(" · ")}
        </p>
      ) : null}
    </button>
  );
}
