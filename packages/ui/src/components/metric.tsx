import { cn } from "../cn";

export interface MetricProps {
  label: string;
  value: string | number;
  delta?: string;
  className?: string;
}

export function Metric({ label, value, delta, className }: MetricProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {delta ? <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{delta}</p> : null}
    </div>
  );
}
