"use client";

import { useCallback, useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArtifactCard } from "./ArtifactCard";
import type { ArtifactCardViewModel, ArtifactStatusKey } from "./types";

export type ArtifactDockProps = {
  artifacts: ArtifactCardViewModel[];
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  onOpenArtifact: (id: string) => void;
  className?: string;
};

function summarize(artifacts: ArtifactCardViewModel[]): string {
  const total = artifacts.length;
  const ready = artifacts.filter((a) => isReadyStatus(a.status)).length;
  const drafting = artifacts.filter(
    (a) => a.status === "drafting" || a.status === "declared",
  ).length;
  const parts = [`${total} output${total === 1 ? "" : "s"}`];
  if (ready > 0) parts.push(`${ready} ready`);
  if (drafting > 0) parts.push(`${drafting} drafting`);
  return parts.join(" · ");
}

function isReadyStatus(status: ArtifactStatusKey): boolean {
  return (
    status === "ready_for_review" ||
    status === "approved" ||
    status === "delivered" ||
    status === "published"
  );
}

export function ArtifactDock({
  artifacts,
  collapsed,
  onCollapsedChange,
  onOpenArtifact,
  className,
}: ArtifactDockProps) {
  const listRef = useRef<HTMLUListElement>(null);

  const onKeyNav = useCallback((event: KeyboardEvent<HTMLUListElement>) => {
    const list = listRef.current;
    if (!list) return;
    const items = Array.from(list.querySelectorAll<HTMLElement>("button[data-artifact-card]"));
    if (items.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    const idx = items.findIndex((el) => el === active || el.contains(active));
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = items[Math.min(items.length - 1, Math.max(0, idx) + 1)];
      next?.focus();
      next?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prev = items[Math.max(0, (idx < 0 ? 0 : idx) - 1)];
      prev?.focus();
      prev?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
  }, []);

  const summary = summarize(artifacts);

  return (
    <section
      aria-label="Assignment outputs"
      className={cn(
        "shrink-0 border-t border-border bg-card/90 backdrop-blur-xl",
        collapsed ? "h-14" : "",
        className,
      )}
      style={collapsed ? { height: 56 } : undefined}
    >
      <header className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-tight">Outputs</p>
          <p className="truncate text-xs text-muted-foreground">{summary}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={!collapsed}
          aria-controls="artifact-dock-list"
          onClick={() => onCollapsedChange(!collapsed)}
        >
          {collapsed ? "Expand" : "Collapse"}
        </Button>
      </header>

      {!collapsed ? (
        <ul
          id="artifact-dock-list"
          ref={listRef}
          role="list"
          tabIndex={0}
          onKeyDown={onKeyNav}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {artifacts.length === 0 ? (
            <li className="flex min-h-24 w-full items-center justify-center rounded-lg border border-dashed border-border px-4 text-sm text-muted-foreground">
              Outputs appear here when the contract is approved.
            </li>
          ) : (
            artifacts.map((a) => (
              <li key={a.id} className="snap-start" data-artifact-card>
                <ArtifactCard artifact={a} onOpen={() => onOpenArtifact(a.id)} />
              </li>
            ))
          )}
        </ul>
      ) : null}
    </section>
  );
}
