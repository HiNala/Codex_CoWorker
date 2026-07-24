"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PressAndHold, useReducedMotion } from "@forge/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ApprovalVM } from "@/hooks/run-state";
import { cn } from "@/lib/utils";

export type ApprovalRisk = ApprovalVM["risk"];
export type ApprovalStatus = ApprovalVM["status"];

export type ApprovalCardProps = {
  title: string;
  summary: string;
  risk: ApprovalRisk;
  payloadPreview: string;
  /** Optional; when granted/denied/expired actions are locked */
  status?: ApprovalStatus;
  onApprove: () => void;
  onDeny: () => void;
  className?: string;
  /** Optional reason shown under summary */
  reason?: string;
};

const RISK_META: Record<
  ApprovalRisk,
  { label: string; badge: "default" | "secondary" | "destructive" | "outline"; hint: string }
> = {
  low: {
    label: "Low risk",
    badge: "secondary",
    hint: "Routine confirmation",
  },
  customer_facing: {
    label: "Customer facing",
    badge: "outline",
    hint: "Visible to a customer",
  },
  irreversible: {
    label: "Irreversible",
    badge: "destructive",
    hint: "Cannot be undone",
  },
  capability_install: {
    label: "Capability install",
    badge: "destructive",
    hint: "Installs a new capability",
  },
};

function requiresHold(risk: ApprovalRisk): boolean {
  return risk === "capability_install" || risk === "irreversible";
}

/**
 * Inline approval card: title, summary, risk badge, payload preview,
 * Approve (PressAndHold for capability_install / irreversible; keyboard two-step),
 * Deny, with no double-submit.
 */
export function ApprovalCard({
  title,
  summary,
  risk,
  payloadPreview,
  status = "pending",
  onApprove,
  onDeny,
  className,
  reason,
}: ApprovalCardProps) {
  const reduced = useReducedMotion();
  const [submitted, setSubmitted] = useState<"approve" | "deny" | null>(null);
  // Double-submit guard only — never read during render
  const committed = useRef(false);
  const riskMeta = RISK_META[risk] ?? RISK_META.low;
  const hold = requiresHold(risk);
  // Render-safe lock: state only (ref is handler-only)
  const locked = status !== "pending" || submitted !== null;
  const resolvedLabel =
    status === "granted"
      ? "Approved"
      : status === "denied"
        ? "Denied"
        : status === "expired"
          ? "Expired"
          : submitted === "approve"
            ? "Approving…"
            : submitted === "deny"
              ? "Denying…"
              : null;

  // Sync local submit UI when parent resolves status (prevents stuck "Approving…")
  useEffect(() => {
    if (status !== "pending") {
      committed.current = false;
      setSubmitted(null);
    }
  }, [status]);

  const handleApprove = useCallback(() => {
    if (status !== "pending" || committed.current) return;
    committed.current = true;
    setSubmitted("approve");
    try {
      onApprove();
    } catch {
      committed.current = false;
      setSubmitted(null);
    }
  }, [status, onApprove]);

  const handleDeny = useCallback(() => {
    if (status !== "pending" || committed.current) return;
    committed.current = true;
    setSubmitted("deny");
    try {
      onDeny();
    } catch {
      committed.current = false;
      setSubmitted(null);
    }
  }, [status, onDeny]);

  const customerFacing = risk === "customer_facing";

  return (
    <article
      role="group"
      aria-label={`Approval: ${title}`}
      className={cn(
        "w-full rounded-lg border border-border bg-card p-4 shadow-sm",
        "transition-[opacity,transform] duration-[var(--dur-base,240ms)] ease-[var(--ease-out,cubic-bezier(0.16,1,0.3,1))]",
        !reduced && status === "pending" && submitted === null && "scale-100",
        locked && status !== "pending" && "opacity-90",
        className,
      )}
      data-approval-risk={risk}
      data-approval-status={status}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Approval required
          </p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-foreground">{title}</h3>
        </div>
        <Badge
          variant={riskMeta.badge}
          className="shrink-0"
          title={riskMeta.hint}
          aria-label={`Risk: ${riskMeta.label}`}
        >
          {riskMeta.label}
        </Badge>
      </header>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">{summary}</p>
      {reason ? <p className="mt-1 text-sm text-muted-foreground">{reason}</p> : null}

      <div
        className={cn(
          "mt-3 rounded-md border border-border/70 bg-muted/40 p-3",
          customerFacing && "border-[color:var(--status-warning,oklch(0.75_0.15_85))]/40",
        )}
      >
        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {customerFacing ? "Message (verbatim)" : "Payload"}
        </p>
        <pre
          className={cn(
            "mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-sm leading-5 text-foreground",
            customerFacing && "text-[15px] leading-6",
          )}
        >
          {payloadPreview}
        </pre>
      </div>

      {resolvedLabel ? (
        <p
          className="mt-4 text-sm font-medium text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {resolvedLabel}
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {hold ? (
            <PressAndHold
              onComplete={handleApprove}
              disabled={locked}
              label={`Hold to approve: ${title}`}
              keyboardConfirmLabel="Press again to confirm approve"
              className="min-h-11"
            >
              Hold to approve
            </PressAndHold>
          ) : (
            <TwoStepApproveButton
              disabled={locked}
              onConfirm={handleApprove}
              label="Approve"
              confirmLabel="Press again to confirm"
            />
          )}
          <Button
            type="button"
            variant="outline"
            disabled={locked}
            onClick={handleDeny}
            className="min-h-11 min-w-11 px-5"
            aria-label={`Deny approval: ${title}`}
          >
            Deny
          </Button>
        </div>
      )}
    </article>
  );
}

function TwoStepApproveButton({
  disabled,
  onConfirm,
  label,
  confirmLabel,
}: {
  disabled?: boolean;
  onConfirm: () => void;
  label: string;
  confirmLabel: string;
}) {
  const [armed, setArmed] = useState(false);
  const skipClick = useRef(false);

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform duration-[var(--dur-instant,90ms)] active:scale-[0.98] disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        armed && "ring-2 ring-ring ring-offset-2 ring-offset-background",
      )}
      aria-label={armed ? confirmLabel : label}
      title={armed ? confirmLabel : undefined}
      onPointerDown={() => {
        skipClick.current = false;
        setArmed(false);
      }}
      onClick={() => {
        if (disabled) return;
        if (skipClick.current) {
          skipClick.current = false;
          return;
        }
        onConfirm();
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        skipClick.current = true;
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        onConfirm();
      }}
      onBlur={() => setArmed(false)}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
