"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { RunState } from "@/hooks/run-state";
import { cn } from "@/lib/utils";
import { BuildConsole } from "./build-console";
import { CapabilityToolbelt } from "./capability-toolbelt";

export interface FoundryPanelProps {
  state: RunState;
  className?: string;
}

/**
 * Rail bottom: Capabilities. ONE panel-body scroller.
 * Binding model: actionable approval lives ONLY in chat.
 * Foundry shows a non-interactive status row when install is pending.
 */
export function FoundryPanel({ state, className }: FoundryPanelProps) {
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

  // Console only while building; pending install does not own the whole panel
  const showConsole = Boolean(build) && !installApproval;

  const badgeLabel = installApproval
    ? "Awaiting approval"
    : showConsole
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
            {installApproval
              ? "Awaiting approval · review in chat"
              : showConsole
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

      <div
        className="panel-body space-y-3 p-3"
        data-foundry-mode={
          installApproval ? "awaiting_chat" : showConsole ? "console" : "toolbelt"
        }
      >
        {state.status === "paused" ? (
          <p className="rounded-lg bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
            Run paused — resume from the chat header.
          </p>
        ) : null}

        {/* Non-interactive status only — never Hold to approve here */}
        {installApproval ? (
          <div
            className="rounded-xl border border-[color:var(--ops-amber)]/40 bg-[color:var(--ops-amber)]/10 px-3 py-2.5"
            data-awaiting-approval-status
            data-approval-id={installApproval.id}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--ops-amber)]">
              Awaiting approval · review in chat
            </p>
            <p className="mt-1 break-words text-[13px] font-medium text-foreground">
              {installApproval.title}
            </p>
            <p className="mt-0.5 break-words text-[12px] text-muted-foreground">
              Use the approval card in Conversation to Hold to approve or Deny.
            </p>
          </div>
        ) : null}

        {showConsole && build ? (
          <BuildConsole build={build} {...(buildingCap ? { capability: buildingCap } : {})} />
        ) : (
          <CapabilityToolbelt capabilities={capabilities} />
        )}
      </div>
    </section>
  );
}
