"use client";

import { useMemo } from "react";
import { WorkspacePanel } from "@/components/cockpit/workspace-panel";
import { Badge } from "@/components/ui/badge";
import type { RunState } from "@/hooks/run-state";
import { cn } from "@/lib/utils";
import { BuildConsole } from "./build-console";
import { CapabilityInstallApproval } from "./capability-install-approval";
import { CapabilityToolbelt } from "./capability-toolbelt";

export interface FoundryPanelProps {
  state: RunState;
  onApprove?: (approvalId: string) => void;
  onDeny?: (approvalId: string) => void;
  onOpenCapability?: (id: string) => void;
  className?: string;
}

/**
 * The Foundry panel — toolbelt grid of CapabilityTiles, live build console
 * when a capability is building/verifying/repairing, and capability-install
 * approval takeover when risk === capability_install.
 */
export function FoundryPanel({
  state,
  onApprove,
  onDeny,
  onOpenCapability,
  className,
}: FoundryPanelProps) {
  const capabilities = useMemo(() => {
    return Object.values(state.capabilities).sort((a, b) => {
      const rank = (s: string) => {
        if (
          s === "building" ||
          s === "testing" ||
          s === "repairing" ||
          s === "specifying"
        )
          return 0;
        if (s === "awaiting_approval") return 1;
        if (s === "missing" || s === "failed") return 2;
        if (s === "active") return 3;
        if (s === "installed") return 4;
        return 5;
      };
      const d = rank(a.state) - rank(b.state);
      if (d !== 0) return d;
      return a.name.localeCompare(b.name);
    });
  }, [state.capabilities]);

  const build = state.build;
  const buildingCap = build ? state.capabilities[build.capabilityId] : null;

  const installApproval = useMemo(
    () =>
      state.approvals.find(
        (a) => a.status === "pending" && a.risk === "capability_install",
      ) ?? null,
    [state.approvals],
  );

  const showConsole = Boolean(build);
  const showApproval = Boolean(installApproval);

  const liveCount = capabilities.filter((c) =>
    [
      "building",
      "testing",
      "repairing",
      "specifying",
      "awaiting_approval",
    ].includes(c.state),
  ).length;

  const description = showApproval
    ? "Capability install requires your approval"
    : showConsole
      ? `Live build · ${build!.slug}`
      : "Capability gap, build, verify, approve";

  const badgeLabel = showApproval
    ? "Awaiting approval"
    : build
      ? build.status === "repairing"
        ? "Repairing"
        : build.status === "verifying"
          ? "Verifying"
          : build.status === "failed"
            ? "Failed"
            : "Building"
      : liveCount > 0
        ? `${liveCount} live`
        : capabilities.length > 0
          ? `${capabilities.length} tools`
          : null;

  return (
    <WorkspacePanel
      title="The foundry"
      description={description}
      badge={
        badgeLabel ? (
          <Badge variant="outline" data-foundry-badge>
            {badgeLabel}
          </Badge>
        ) : null
      }
      className={cn("h-full", className)}
      bodyClassName="relative flex flex-col p-0"
    >
      {state.status === "paused" ? (
        <div
          className="border-b border-border/80 bg-muted/30 px-5 py-2 text-xs text-muted-foreground"
          data-foundry-paused
        >
          Run paused — resume from the assignment bar.
        </div>
      ) : null}

      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col p-5 transition-[filter,opacity] duration-[var(--dur-base)] ease-[var(--ease-out)]",
          showApproval && "pointer-events-none opacity-40",
          state.status === "paused" && !showApproval && "opacity-70 saturate-[0.7]",
        )}
        data-foundry-mode={
          showApproval ? "approval" : showConsole ? "console" : "toolbelt"
        }
        aria-hidden={showApproval || undefined}
      >
        {showConsole && build ? (
          <BuildConsole
            build={build}
            {...(buildingCap ? { capability: buildingCap } : {})}
          />
        ) : (
          <CapabilityToolbelt
            capabilities={capabilities}
            {...(onOpenCapability ? { onOpen: onOpenCapability } : {})}
          />
        )}
      </div>

      {showApproval && installApproval ? (
        <div
          className="absolute inset-0 z-20 flex flex-col overflow-auto bg-background/10 p-4 sm:p-5"
          data-foundry-approval-layer
        >
          <CapabilityInstallApproval
            approval={installApproval}
            capability={
              buildingCap ??
              Object.values(state.capabilities).find(
                (c) => c.state === "awaiting_approval",
              ) ??
              null
            }
            onApprove={() => onApprove?.(installApproval.id)}
            onDeny={() => onDeny?.(installApproval.id)}
            className="mx-auto my-auto w-full max-w-xl scale-100 opacity-100 transition-[opacity,transform] duration-[var(--dur-base)] ease-[var(--ease-out)] motion-reduce:transition-none"
          />
        </div>
      ) : null}
    </WorkspacePanel>
  );
}
