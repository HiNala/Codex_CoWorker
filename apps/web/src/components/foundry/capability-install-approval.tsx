"use client";

import type { ApprovalVM, CapabilityTileVM } from "@/hooks/run-state";
import { cn } from "@/lib/utils";

export interface CapabilityInstallApprovalProps {
  approval: ApprovalVM;
  capability?: CapabilityTileVM | null;
  className?: string;
  /** @deprecated Foundry is status-only — props ignored if passed */
  onApprove?: () => void;
  onDeny?: () => void;
}

/**
 * STATUS-ONLY display for capability install.
 * NO Hold to approve, NO Deny — actionable controls live in chat only.
 */
export function CapabilityInstallApproval({
  approval,
  capability,
  className,
}: CapabilityInstallApprovalProps) {
  const slug = capability?.slug ?? capability?.name ?? "capability";
  const version = capability?.version;

  return (
    <div
      role="status"
      aria-label="Capability install awaiting approval"
      className={cn(
        "flex w-full flex-col rounded-xl border border-[color:var(--ops-amber)]/40 bg-[color:var(--ops-amber)]/10 p-4",
        className,
      )}
      data-approval-id={approval.id}
      data-approval-risk={approval.risk}
      data-capability-install
      data-status-only
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--ops-amber)]">
        Awaiting approval · review in chat
      </p>
      <h3 className="mt-1 break-words text-base font-semibold tracking-tight text-foreground">
        {approval.title}
      </h3>
      <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{approval.summary}</p>
      <p className="mt-2 ops-mono text-[11px] text-muted-foreground">
        {slug}
        {version ? ` · v${version}` : null}
      </p>
      <p className="mt-2 text-[12px] text-muted-foreground">
        Use the approval card in Conversation to approve or deny. This panel is display-only.
      </p>
    </div>
  );
}
