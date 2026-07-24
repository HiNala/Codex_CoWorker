import { cn } from "../cn";

export interface OdometerProps {
  value: string;
  className?: string;
}

/**
 * Displays updating numeric strings with tabular figures.
 * Digit-roll animation is CSS-only when the value string changes; no timer owns the value.
 */
export function Odometer({ value, className }: OdometerProps) {
  return (
    <span
      className={cn("inline-block font-mono tabular-nums tracking-tight", className)}
      data-odometer={value}
    >
      {value}
    </span>
  );
}
