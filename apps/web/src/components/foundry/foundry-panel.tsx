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
 * Rail bottom: Capabilities. Exactly one scroll (.panel-body).
 * Install is INLINE document flow — never absolute overlay, never stacked on tiles.
 * Cut #4: only checkout-error-log-analyzer is executable; inventory tiles are display-only.
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

  // Mutually exclusive modes — never install card + console/toolbelt at once
  const mode: "install" | "console" | "toolbelt" = installApproval
    ? "install"
    : build
      ? "console"
      : "toolbelt";

  const badgeLabel =
    mode === "install"
      ? "Awaiting approval"
      : mode === "console"
        ? build!.status === "repairing"
          ? "Repairing"
          : build!.status === "verifying"
            ? "Verifying"
            : build!.status === "failed"
              ? "Failed"
              : "Building"
        : capabilities.length > 0
          ? `${capabilities.length} tools`
          : null;

  return (
    <section
      aria-label="The foundry"
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-[color:var(--ops-panel)]",
        className,
      )}
    >
      <header className="panel-head flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <h2 className="ops-panel-title text-foreground">Capabilities</h2>
          <p className="mt-0.5 break-words text-[12px] leading-snug text-muted-foreground">
            {mode === "install"
              ? "Install requires your approval — review the card in this panel."
              : mode === "console"
                ? `Live build · ${build!.slug}`
                : "Installed inventory (display). One live path: checkout analyzer."}
          </p>
        </div>
        {badgeLabel ? (
          <Badge variant="outline" data-foundry-badge className="shrink-0">
            {badgeLabel}
          </Badge>
        ) : null}
      </header>

      <div className="panel-body space-y-3 p-3" data-foundry-mode={mode}>
        {state.status === "paused" ? (
          <p className="rounded-lg bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
            Run paused — resume from the chat header.
          </p>
        ) : null}

        {mode === "install" && installApproval ? (
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

        {mode === "console" && build ? (
          <BuildConsole build={build} {...(buildingCap ? { capability: buildingCap } : {})} />
        ) : null}

        {mode === "toolbelt" ? (
          <CapabilityToolbelt
            capabilities={capabilities}
            {...(onOpenCapability ? { onOpen: onOpenCapability } : {})}
          />
        ) : null}
      </div>
    </section>
  );
}
