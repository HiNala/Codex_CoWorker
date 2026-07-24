import type { CSSProperties } from "react";
import { cn } from "../cn";

export interface RingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label: string;
  /** Optional centre content */
  children?: React.ReactNode;
}

/**
 * Budget / progress arc. Stroke driven by real value/max — never a timer.
 * Colour thresholds: green <60%, amber ≥80%, red ≥95% of ceiling.
 */
export function Ring({
  value,
  max,
  size = 40,
  strokeWidth = 3.5,
  className,
  label,
  children,
}: RingProps) {
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.min(1, Math.max(0, value / safeMax));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - ratio);

  let stroke = "var(--status-success)";
  if (ratio >= 0.95) stroke = "var(--status-danger)";
  else if (ratio >= 0.8) stroke = "var(--status-warning)";
  else if (ratio >= 0.6) stroke = "var(--status-active)";

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={
            {
              transition: "stroke-dashoffset var(--dur-slow) var(--ease-out)",
            } as CSSProperties
          }
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      ) : null}
    </div>
  );
}
