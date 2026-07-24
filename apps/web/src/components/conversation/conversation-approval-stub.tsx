"use client";

import { useState } from "react";
import { PressAndHold, StatusBadge } from "@forge/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConversationApprovalStubProps {
  title: string;
  summary: string;
  risk: "low" | "customer_facing" | "irreversible" | "capability_install";
  payloadPreview: string;
  onApprove?: () => void;
  onDeny?: () => void;
  className?: string;
}

const RISK_LABEL: Record<ConversationApprovalStubProps["risk"], string> = {
  low: "Low risk",
  customer_facing: "Customer-facing",
  irreversible: "Irreversible",
  capability_install: "Capability install",
};

/**
 * Local stand-in used only until `@/components/approvals` ships.
 * Prefer importing ApprovalCard from approvals when that path exists.
 */
export function ConversationApprovalStub({
  title,
  summary,
  risk,
  payloadPreview,
  onApprove,
  onDeny,
  className,
}: ConversationApprovalStubProps) {
  const [submitted, setSubmitted] = useState<"none" | "approved" | "denied">("none");
  const hold = risk === "capability_install" || risk === "irreversible";
  const disabled = submitted !== "none";

  const approve = () => {
    if (disabled) return;
    setSubmitted("approved");
    onApprove?.();
  };

  const deny = () => {
    if (disabled) return;
    setSubmitted("denied");
    onDeny?.();
  };

  return (
    <div
      role="region"
      aria-label={`Approval required: ${title}`}
      className={cn(
        "w-full rounded-xl border border-border bg-card/90 p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Approval needed
          </p>
          <h3 className="mt-1 text-base font-semibold leading-snug">{title}</h3>
        </div>
        <StatusBadge
          label={RISK_LABEL[risk]}
          token={
            risk === "low"
              ? "status-ready"
              : risk === "customer_facing"
                ? "status-warning"
                : "status-danger"
          }
        />
      </div>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">{summary}</p>

      {risk === "customer_facing" ? (
        <div className="mt-3 rounded-lg border border-border/80 bg-muted/40 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Exact message
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[15px] leading-6">{payloadPreview}</p>
        </div>
      ) : (
        <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-border/70 bg-muted/30 p-3 font-mono text-xs leading-5 text-muted-foreground">
          {payloadPreview}
        </pre>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {hold ? (
          <PressAndHold
            onComplete={approve}
            disabled={disabled}
            label={`Hold to approve: ${title}`}
          >
            Hold to approve
          </PressAndHold>
        ) : (
          <Button
            type="button"
            size="lg"
            className="min-h-11 px-5"
            disabled={disabled}
            onClick={approve}
          >
            Approve
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="min-h-11 px-5"
          disabled={disabled}
          onClick={deny}
        >
          Deny
        </Button>
        {submitted !== "none" ? (
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {submitted === "approved" ? "Approved" : "Denied"}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Alias so callers can swap to the real ApprovalCard with a single import change. */
export { ConversationApprovalStub as ApprovalCard };
