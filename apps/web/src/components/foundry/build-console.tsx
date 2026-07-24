"use client";

import { useState } from "react";
import { CapabilityStateBadge, CapabilityTile } from "@forge/ui";
import type { BuildConsoleVM, CapabilityTileVM } from "@/hooks/run-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { GateRow } from "./gate-row";

export interface BuildConsoleProps {
  build: BuildConsoleVM;
  capability?: CapabilityTileVM | null;
  className?: string;
}

const BUILD_STATUS_LABEL: Record<BuildConsoleVM["status"], string> = {
  building: "Building",
  verifying: "Verifying",
  repairing: "Repairing",
  awaiting_approval: "Awaiting approval",
  failed: "Failed",
};

export function BuildConsole({ build, capability, className }: BuildConsoleProps) {
  const [outputOpen, setOutputOpen] = useState(false);
  const output = build.output;
  const showingLast = output.length >= 500;
  const lines = showingLast ? output.slice(-500) : output;

  const passed = build.gates.filter((g) => g.status === "passed").length;
  const failed = build.gates.filter((g) => g.status === "failed").length;
  const running = build.gates.some((g) => g.status === "running");

  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col gap-4 lg:flex-row", className)}
      data-build-status={build.status}
      data-build-slug={build.slug}
      data-build-attempt={build.attempt}
    >
      <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-[11.5rem]">
        {capability ? (
          <CapabilityTile
            id={capability.id}
            name={capability.name}
            kind={capability.kind}
            state={capability.state}
            {...(capability.progress ? { progress: capability.progress } : {})}
            {...(capability.version ? { version: capability.version } : {})}
            {...(capability.failingGate ? { failingGate: capability.failingGate } : {})}
          />
        ) : (
          <div className="rounded-[var(--radius-md)] border border-dashed border-border p-3.5">
            <p className="font-mono text-xs text-muted-foreground">{build.slug}</p>
            <CapabilityStateBadge
              state={
                build.status === "awaiting_approval"
                  ? "awaiting_approval"
                  : build.status === "repairing"
                    ? "repairing"
                    : build.status === "failed"
                      ? "failed"
                      : build.status === "verifying"
                        ? "testing"
                        : "building"
              }
              className="mt-2"
            />
          </div>
        )}
        <div className="space-y-1 px-0.5">
          <p className="truncate font-mono text-[11px] text-muted-foreground">{build.slug}</p>
          <p className="text-xs text-muted-foreground">
            Attempt <span className="font-mono tabular-nums text-foreground">{build.attempt}</span>{" "}
            of <span className="font-mono tabular-nums text-foreground">{build.maxAttempts}</span>
          </p>
          {build.status === "repairing" ? (
            <p className="text-xs text-[color:var(--status-repairing)]">
              ⟳ repairing (attempt {build.attempt} of {build.maxAttempts})…
            </p>
          ) : null}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-medium">
            {BUILD_STATUS_LABEL[build.status]}
          </Badge>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {passed} passed
            {failed > 0 ? ` · ${failed} failed` : ""}
            {running ? " · running" : ""}
            {build.gates.length > 0 ? ` · ${build.gates.length} gates` : ""}
          </span>
        </div>

        <ol
          className="min-h-0 flex-1 space-y-0.5 overflow-auto overscroll-contain pr-1"
          aria-label="Verification gates"
          data-gate-list
        >
          {build.gates.length === 0 ? (
            <li className="px-2.5 py-4 text-sm text-muted-foreground">
              Waiting for the first gate…
            </li>
          ) : (
            build.gates.map((gate) => <GateRow key={gate.id} gate={gate} />)
          )}
        </ol>

        <Collapsible
          open={outputOpen}
          onOpenChange={setOutputOpen}
          className="mt-3 border-t border-border/80 pt-3"
        >
          <div className="flex items-center justify-between gap-2">
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-9 px-2 text-xs"
                data-build-output-toggle
              >
                {outputOpen ? "Hide" : "Show"} build output
                {output.length > 0 ? (
                  <span className="ml-1.5 font-mono tabular-nums text-muted-foreground">
                    ({output.length})
                  </span>
                ) : null}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="mt-2">
            {showingLast ? (
              <p className="mb-1.5 text-[11px] text-muted-foreground">Showing last 500 lines</p>
            ) : null}
            <pre
              className="max-h-48 overflow-auto rounded-md border border-border/80 bg-muted/30 p-3 font-mono text-[11px] leading-5 text-muted-foreground"
              data-build-output
            >
              {lines.length === 0 ? "No sanitised Codex output yet." : lines.join("\n")}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
