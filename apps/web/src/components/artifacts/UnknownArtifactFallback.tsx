"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ArtifactRendererProps } from "./types";

function truncateHash(hash: string, head = 8, tail = 6): string {
  if (hash.length <= head + tail + 1) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

/**
 * Safe metadata-and-download fallback for unknown artifact types.
 * Never attempts to interpret or render the payload body.
 */
export function UnknownArtifactFallback({ artifact, onExport }: ArtifactRendererProps) {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Unsupported type
          </p>
          <h3 className="mt-1 truncate text-base font-semibold">{artifact.title}</h3>
        </div>
        <Badge variant="outline">{artifact.type}</Badge>
      </div>

      <p className="mt-4 text-sm leading-5 text-muted-foreground">
        This artifact type has no specialized renderer. Metadata is shown below; download the
        original content if available.
      </p>

      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Status</dt>
          <dd className="font-medium capitalize">{artifact.status.replace(/_/g, " ")}</dd>
        </div>
        {artifact.versionLabel ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Version</dt>
            <dd className="font-mono">{artifact.versionLabel}</dd>
          </div>
        ) : null}
        {artifact.contentFormat ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Format</dt>
            <dd className="font-mono">{artifact.contentFormat}</dd>
          </div>
        ) : null}
        {artifact.sha256 ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">SHA-256</dt>
            <dd className="font-mono text-xs" title={artifact.sha256}>
              {truncateHash(artifact.sha256)}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        {artifact.downloadUrl ? (
          <Button asChild size="sm">
            <a href={artifact.downloadUrl} rel="noopener noreferrer">
              Download
            </a>
          </Button>
        ) : null}
        {onExport ? (
          <Button type="button" variant="outline" size="sm" onClick={onExport}>
            Export
          </Button>
        ) : null}
      </div>
    </div>
  );
}
