import type { CSSProperties, ReactNode } from "react";
import { cn } from "../cn";
import {
  CAPABILITY_STATE_META,
  PLAN_STEP_STATUS_META,
  type CapabilityState,
  type PlanStepStatusUi,
} from "../status-meta";

export interface StatusBadgeProps {
  label: string;
  icon?: ReactNode | undefined;
  token?: string | undefined;
  className?: string | undefined;
}

/** Icon + text label. Never colour alone. */
export function StatusBadge({ label, icon, token, className }: StatusBadgeProps) {
  const style = token ? ({ color: `var(--${token})` } as CSSProperties) : undefined;

  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 text-xs font-medium",
        className,
      )}
      style={style}
      data-status-label={label}
    >
      {icon ? (
        <span aria-hidden className="inline-flex shrink-0">
          {icon}
        </span>
      ) : null}
      <span>{label}</span>
    </span>
  );
}

export function CapabilityStateBadge({
  state,
  className,
}: {
  state: CapabilityState;
  className?: string;
}) {
  const meta = CAPABILITY_STATE_META[state];
  return (
    <StatusBadge
      label={meta.label}
      token={meta.token}
      {...(className ? { className } : {})}
      icon={<StatusGlyph name={meta.icon} />}
    />
  );
}

export function PlanStepStatusBadge({
  status,
  className,
}: {
  status: PlanStepStatusUi;
  className?: string;
}) {
  const meta = PLAN_STEP_STATUS_META[status];
  return (
    <StatusBadge
      label={meta.label}
      token={meta.token}
      {...(className ? { className } : {})}
      icon={<StatusGlyph name={meta.icon} />}
    />
  );
}

/** Minimal inline glyphs so @forge/ui has no icon package dependency. */
export function StatusGlyph({ name, className }: { name: string; className?: string }) {
  const common = cn("size-3.5", className);
  switch (name) {
    case "check":
    case "check-circle":
      return (
        <svg viewBox="0 0 16 16" className={common} fill="none" aria-hidden>
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M5 8.2 7 10.2 11 5.8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "x":
    case "x-circle":
      return (
        <svg viewBox="0 0 16 16" className={common} fill="none" aria-hidden>
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5.5 5.5 10.5 10.5M10.5 5.5 5.5 10.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "play":
      return (
        <svg viewBox="0 0 16 16" className={common} fill="currentColor" aria-hidden>
          <path d="M5 3.5v9l8-4.5-8-4.5Z" />
        </svg>
      );
    case "lock":
      return (
        <svg viewBox="0 0 16 16" className={common} fill="none" aria-hidden>
          <rect
            x="3.5"
            y="7"
            width="9"
            height="6.5"
            rx="1.2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "plus":
      return (
        <svg viewBox="0 0 16 16" className={common} fill="none" aria-hidden>
          <path
            d="M8 3.5v9M3.5 8h9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "hammer":
    case "wrench":
      return (
        <svg viewBox="0 0 16 16" className={common} fill="none" aria-hidden>
          <path
            d="M3 13 8.5 7.5M9 4l3 3M10.5 2.5a3 3 0 0 1 3 3L11 8 8 5l2.5-2.5Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "flask-conical":
      return (
        <svg viewBox="0 0 16 16" className={common} fill="none" aria-hidden>
          <path
            d="M6 2h4M7 2v4.2L3.8 12.2A1.6 1.6 0 0 0 5.2 14.5h5.6a1.6 1.6 0 0 0 1.4-2.3L9 6.2V2"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "ban":
      return (
        <svg viewBox="0 0 16 16" className={common} fill="none" aria-hidden>
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 12 12 4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "rotate-cw":
      return (
        <svg viewBox="0 0 16 16" className={common} fill="none" aria-hidden>
          <path
            d="M13 8a5 5 0 1 1-1.4-3.4M13 3v3.2H9.8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "skip-forward":
      return (
        <svg viewBox="0 0 16 16" className={common} fill="currentColor" aria-hidden>
          <path d="M3 3.5v9l6.5-4.5L3 3.5Zm8.5 0v9h1.5v-9H11.5Z" />
        </svg>
      );
    case "octagon":
      return (
        <svg viewBox="0 0 16 16" className={common} fill="none" aria-hidden>
          <path
            d="M5.2 2.2h5.6L13.8 5.2v5.6l-2.9 3H5.2L2.2 10.8V5.2l3-3Z"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
      );
    case "puzzle":
    case "file-text":
    case "circle-dot":
    case "circle":
    default:
      return (
        <svg viewBox="0 0 16 16" className={common} fill="none" aria-hidden>
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          {name === "circle-dot" ? <circle cx="8" cy="8" r="2" fill="currentColor" /> : null}
        </svg>
      );
  }
}

export function StatusDot({
  token = "status-active",
  label,
  className,
}: {
  token?: string;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs", className)} title={label}>
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ background: `var(--${token})` }}
        aria-hidden
      />
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
