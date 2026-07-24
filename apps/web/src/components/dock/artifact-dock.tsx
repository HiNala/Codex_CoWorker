"use client";

import { useCallback, useRef, type KeyboardEvent } from "react";
import { EmptyState, useReducedMotion } from "@forge/ui";
import { Button } from "@/components/ui/button";
import type { ArtifactCardVM } from "@/hooks/run-state";
import { cn } from "@/lib/utils";
import { ArtifactCard } from "./artifact-card";

export type ArtifactDockProps = {
  artifacts: ArtifactCardVM[];
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  onOpenArtifact: (id: string) => void;
  className?: string;
};

function summarize(artifacts: ArtifactCardVM[]): string {
  const total = artifacts.length;
  const ready = artifacts.filter((a) => a.status === "ready" || a.status === "published").length;
  const drafting = artifacts.filter(
    (a) => a.status === "drafting" || a.status === "declared",
  ).length;
  const parts = [`${total} output${total === 1 ? "" : "s"}`];
  if (ready > 0) parts.push(`${ready} ready`);
  if (drafting > 0) parts.push(`${drafting} drafting`);
  return parts.join(" · ");
}

/**
 * Collapsible artifact rail: 56px collapsed / ~200px open.
 * Placeholder cards for declared artifacts; ready vs drafting states;
 * horizontal snap scroll with keyboard arrow navigation.
 */
export function ArtifactDock({
  artifacts,
  collapsed,
  onCollapsedChange,
  onOpenArtifact,
  className,
}: ArtifactDockProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const reduced = useReducedMotion();
  const summary = summarize(artifacts);

  const onKeyNav = useCallback((event: KeyboardEvent<HTMLUListElement>) => {
    const list = listRef.current;
    if (!list) return;
    const items = Array.from(list.querySelectorAll<HTMLElement>("button[data-artifact-card]"));
    if (items.length === 0) return;

    const active = document.activeElement as HTMLElement | null;
    const idx = items.findIndex((el) => el === active || el.contains(active));

    const scrollOpts: ScrollIntoViewOptions = {
      inline: "nearest",
      block: "nearest",
      behavior: reduced ? "auto" : "smooth",
    };

    if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = items[Math.min(items.length - 1, Math.max(0, idx) + 1)];
      next?.focus();
      next?.scrollIntoView(scrollOpts);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prev = items[Math.max(0, (idx < 0 ? 0 : idx) - 1)];
      prev?.focus();
      prev?.scrollIntoView(scrollOpts);
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
      items[0]?.scrollIntoView(scrollOpts);
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
      items[items.length - 1]?.scrollIntoView(scrollOpts);
    } else if (event.key === "Enter" && active) {
      // Card buttons already handle Enter; keep list focusable for arrows
    }
  }, [reduced]);

  return (
    <section
      aria-label="Assignment outputs"
      className={cn(
        "shrink-0 border-t border-border bg-card/90 backdrop-blur-xl",
        collapsed ? "h-14" : "min-h-[200px]",
        className,
      )}
      style={collapsed ? { height: 56 } : { minHeight: 200 }}
    >
      <header className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-tight">Outputs</p>
          <p className="truncate text-xs text-muted-foreground" aria-live="polite">
            {summary}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="min-h-11 min-w-11"
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
          className={cn(
            "flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring/30",
            !reduced && "scroll-smooth",
          )}
          aria-label="Artifact cards"
        >
          {artifacts.length === 0 ? (
            <li className="w-full min-w-0">
              <EmptyState
                className="min-h-24 py-6"
                headline="No outputs yet"
                description="Outputs appear here when the contract is approved. Declared artifacts show as placeholders until ready."
              />
            </li>
          ) : (
            artifacts.map((a) => (
              <li key={a.id} className="snap-start">
                <ArtifactCard artifact={a} onOpen={() => onOpenArtifact(a.id)} />
              </li>
            ))
          )}
        </ul>
      ) : null}
    </section>
  );
}
