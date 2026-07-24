"use client";

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EvidenceViewModel } from "./types";

export type EvidencePanelProps = {
  evidence: EvidenceViewModel[];
  /** Currently highlighted evidence ids (from citation / row click). */
  activeIds?: string[];
  className?: string;
  emptyLabel?: string;
};

function truncateHash(hash: string, head = 8, tail = 6): string {
  if (hash.length <= head + tail + 1) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

function trustVariant(trust: string): "default" | "secondary" | "outline" | "destructive" {
  switch (trust) {
    case "official":
      return "default";
    case "secondary":
      return "secondary";
    case "user_supplied":
      return "outline";
    case "untrusted":
      return "destructive";
    default:
      return "outline";
  }
}

function formatRetrievedAt(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function HighlightedExcerpt({
  excerpt,
  highlight,
}: {
  excerpt: string;
  highlight: string | undefined;
}) {
  if (!highlight || !excerpt.toLowerCase().includes(highlight.toLowerCase())) {
    return <p className="text-sm leading-5 text-foreground/90">{excerpt}</p>;
  }
  const idx = excerpt.toLowerCase().indexOf(highlight.toLowerCase());
  const before = excerpt.slice(0, idx);
  const match = excerpt.slice(idx, idx + highlight.length);
  const after = excerpt.slice(idx + highlight.length);
  return (
    <p className="text-sm leading-5 text-foreground/90">
      {before}
      <mark className="rounded-sm bg-status-testing/30 px-0.5 text-foreground">{match}</mark>
      {after}
    </p>
  );
}

function CopyHashButton({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [hash]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={onCopy}
      className="font-mono"
      title={hash}
      aria-label="Copy content hash"
    >
      {copied ? "Copied" : truncateHash(hash)}
    </Button>
  );
}

export function EvidencePanel({
  evidence,
  activeIds = [],
  className,
  emptyLabel = "Select a citation or table row to inspect evidence.",
}: EvidencePanelProps) {
  const activeSet = new Set(activeIds);
  const ordered =
    activeIds.length === 0
      ? evidence
      : [
          ...evidence.filter((e) => activeSet.has(e.id)),
          ...evidence.filter((e) => !activeSet.has(e.id)),
        ];

  return (
    <aside
      aria-label="Evidence"
      className={cn("flex min-h-0 flex-col border-l border-border bg-card/40", className)}
    >
      <header className="shrink-0 border-b border-border/80 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight">Evidence</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {evidence.length} source{evidence.length === 1 ? "" : "s"}
          {activeIds.length > 0 ? ` · ${activeIds.length} focused` : ""}
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
        {ordered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          ordered.map((item) => {
            const active = activeSet.has(item.id);
            return (
              <article
                key={item.id}
                data-evidence-id={item.id}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  active
                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-card/60",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium leading-5">{item.title}</h4>
                  <Badge variant={trustVariant(item.trust)} className="capitalize">
                    {item.trust.replace(/_/g, " ")}
                  </Badge>
                </div>

                {item.sourceUrl ? (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate text-xs text-primary underline-offset-2 hover:underline"
                  >
                    {item.sourceUrl}
                  </a>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">No source URL</p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.625rem] text-muted-foreground">
                  <span>{formatRetrievedAt(item.retrievedAt)}</span>
                  <span aria-hidden>·</span>
                  <CopyHashButton hash={item.contentSha256} />
                  {item.injectionSuspected ? (
                    <Badge variant="destructive">injection suspected</Badge>
                  ) : null}
                </div>

                <div className="mt-3 border-t border-border/60 pt-2">
                  <HighlightedExcerpt excerpt={item.excerpt} highlight={item.highlight} />
                </div>
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}
