"use client";

import { useMemo, useState, type ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CodeChangeArtifact } from "./CodeChangeArtifact";
import { EvidencePanel } from "./EvidencePanel";
import { MarkdownArtifact } from "./MarkdownArtifact";
import { TypedTableArtifact } from "./TypedTableArtifact";
import { UnknownArtifactFallback } from "./UnknownArtifactFallback";
import type { ArtifactCanvasModel, ArtifactRendererProps } from "./types";

export type ArtifactCanvasProps = {
  artifact: ArtifactCanvasModel;
  onClose?: () => void;
  onExport?: () => void;
  onApprove?: () => void;
  onVersionChange?: (versionId: string) => void;
  className?: string;
  /** Hide the evidence rail (e.g. compact layouts). */
  hideEvidence?: boolean;
};

const RENDERERS: Record<string, ComponentType<ArtifactRendererProps>> = {
  // <anchor:E>
  "document.markdown": MarkdownArtifact,
  "table.typed": TypedTableArtifact,
  "code.change": CodeChangeArtifact,
  // </anchor:E>
  // capability.package / receipt.assignment filled by other tracks
};

function formatStatus(status: string): string {
  if (status === "ready_for_review") return "Ready for review";
  return status.replace(/_/g, " ");
}

export function ArtifactCanvas({
  artifact,
  onClose,
  onExport,
  onApprove,
  onVersionChange,
  className,
  hideEvidence = false,
}: ArtifactCanvasProps) {
  const [activeEvidenceIds, setActiveEvidenceIds] = useState<string[]>([]);

  const Renderer = useMemo(() => {
    return RENDERERS[artifact.type] ?? UnknownArtifactFallback;
  }, [artifact.type]);

  const evidence = artifact.evidence ?? [];

  return (
    <section
      aria-label={`Artifact canvas: ${artifact.title}`}
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card/80",
        className,
      )}
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-tight">{artifact.title}</h2>
            <Badge variant="outline">{artifact.type}</Badge>
            <Badge variant="secondary" className="capitalize">
              {formatStatus(artifact.status)}
            </Badge>
            {artifact.versionLabel ? (
              <span className="font-mono text-xs text-muted-foreground">
                {artifact.versionLabel}
              </span>
            ) : null}
          </div>
          {artifact.versions && artifact.versions.length > 0 ? (
            <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              Version
              <select
                className="rounded-md border border-border bg-background px-2 py-1 font-mono text-xs text-foreground"
                value={artifact.currentVersionId ?? artifact.versions[0]?.id}
                onChange={(e) => onVersionChange?.(e.target.value)}
              >
                {artifact.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onExport ? (
            <Button type="button" variant="outline" size="sm" onClick={onExport}>
              Export
            </Button>
          ) : null}
          {onApprove ? (
            <Button type="button" size="sm" onClick={onApprove}>
              Approve
            </Button>
          ) : null}
          {onClose ? (
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          ) : null}
        </div>
      </header>

      <div
        className={cn(
          "grid min-h-0 flex-1",
          hideEvidence ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[1fr_320px]",
        )}
      >
        <main className="min-h-0 overflow-auto p-4 sm:p-5">
          <Renderer
            artifact={artifact}
            onEvidenceSelect={(ids) => setActiveEvidenceIds(ids)}
            {...(onExport ? { onExport } : {})}
            {...(onApprove ? { onApprove } : {})}
          />
        </main>

        {!hideEvidence ? (
          <EvidencePanel
            evidence={evidence}
            activeIds={activeEvidenceIds}
            className="hidden min-h-0 lg:flex"
          />
        ) : null}
      </div>
    </section>
  );
}
