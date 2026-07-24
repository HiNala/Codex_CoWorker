"use client";

import { useMemo } from "react";
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
 * Column-3 bottom: Capabilities.
 * Install/approval is an INLINE card in the same scroll — never a modal overlay.
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
        if (["building", "testing", "repairing", "specifying"].includes(s)) return 0;
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
      state.approvals.find((a) => a.status === "pending" && a.risk === "capability_install") ??
      null,
    [state.approvals],
  );

  const showConsole = Boolean(build) && !installApproval;

  const badgeLabel = installApproval
    ? "Awaiting approval"
    : build
      ? build.status === "repairing"
        ? "Repairing"
        : build.status === "verifying"
          ? "Verifying"
          : build.status === "failed"
            ? "Failed"
            : "Building"
      : capabilities.length > 0
        ? `${capabilities.length} tools`
        : null;

  return (
    <section
      aria-label="The foundry"
      className={cn("flex min-h-0 flex-col bg-[color:var(--ops-panel)]", className)}
    >
      <header className="panel-head flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="ops-panel-title text-foreground">Capabilities</h2>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
            {installApproval
              ? "Install requires your approval — review the card below."
              : showConsole
                ? `Live build · ${build!.slug}`
                : "Tools Nala can use on this assignment."}
          </p>
        </div>
        {badgeLabel ? (
          <Badge variant="outline" data-foundry-badge className="shrink-0">
            {badgeLabel}
          </Badge>
        ) : null}
      </header>

      {/* ONE scroll region: toolbelt / console / inline install card */}
      <div className="panel-body space-y-3 p-3" data-foundry-mode={installApproval ? "approval" : showConsole ? "console" : "toolbelt"}>
        {state.status === "paused" ? (
          <p className="rounded-lg bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
            Run paused — resume from the chat header.
          </p>
        ) : null}

        {installApproval ? (
          <CapabilityInstallApproval
            approval={installApproval}
            capability={
              buildingCap ??
              Object.values(state.capabilities).find((c) => c.state === "awaiting_approval") ??
              null
            }
            onApprove={() => onApprove?.(installApproval.id)}
            onDeny={() => onDeny?.(installApproval.id)}
            className="w-full max-w-none"
          />
        ) : null}

        {showConsole && build ? (
          <BuildConsole build={build} {...(buildingCap ? { capability: buildingCap } : {})} />
        ) : (
          <CapabilityToolbelt
            capabilities={capabilities}
            {...(onOpenCapability ? { onOpen: onOpenCapability } : {})}
          />
        )}
      </div>
    </section>
  );
}
