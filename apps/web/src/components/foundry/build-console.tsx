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

/**
 * Single-column build view. NO nested overflow-auto — parent .panel-body scrolls.
 * Gate timings stay in a fixed grid track on each row (no detached column).
 */
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
      className={cn("flex min-w-0 flex-col gap-3", className)}
      data-build-status={build.status}
      data-build-slug={build.slug}
      data-build-attempt={build.attempt}
    >
      <div className="flex flex-wrap items-start gap-3">
        {capability ? (
          <div className="w-[9.5rem] shrink-0">
            <CapabilityTile
              id={capability.id}
              name={capability.name}
              kind={capability.kind}
              state={capability.state}
              {...(capability.progress ? { progress: capability.progress } : {})}
              {...(capability.version ? { version: capability.version } : {})}
              {...(capability.failingGate ? { failingGate: capability.failingGate } : {})}
            />
          </div>
        ) : (
          <div className="w-[9.5rem] shrink-0 rounded-lg border border-dashed border-border p-3">
            <p className="ops-mono text-[11px] text-muted-foreground">{build.slug}</p>
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
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{BUILD_STATUS_LABEL[build.status]}</Badge>
            <span className="ops-mono text-[11px] tabular-nums text-muted-foreground">
              {passed} passed
              {failed > 0 ? ` · ${failed} failed` : ""}
              {running ? " · running" : ""}
            </span>
          </div>
          <p className="ops-mono break-all text-[11px] text-muted-foreground">{build.slug}</p>
          <p className="text-[12px] text-muted-foreground">
            Attempt{" "}
            <span className="tabular-nums text-foreground">{build.attempt}</span> of{" "}
            <span className="tabular-nums text-foreground">{build.maxAttempts}</span>
          </p>
        </div>
      </div>

      {/* Gates — no overflow-auto; parent panel-body is the only scroller */}
      <ol className="space-y-0.5" aria-label="Verification gates" data-gate-list>
        {build.gates.length === 0 ? (
          <li className="px-1 py-3 text-sm text-muted-foreground">Waiting for the first gate…</li>
        ) : (
          build.gates.map((gate) => <GateRow key={gate.id} gate={gate} />)
        )}
      </ol>

      <Collapsible open={outputOpen} onOpenChange={setOutputOpen} className="border-t border-border pt-2">
        <div className="flex items-center justify-between gap-2">
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="min-h-8 px-2 text-[12px]">
              {outputOpen ? "Hide" : "Show"} build output
            </Button>
          </CollapsibleTrigger>
          {showingLast ? (
            <span className="text-[11px] text-muted-foreground">last 500 lines</span>
          ) : null}
        </div>
        <CollapsibleContent>
          <pre className="ops-mono mt-2 max-h-none whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground">
            {lines.length === 0 ? "No output yet." : lines.join("\n")}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
