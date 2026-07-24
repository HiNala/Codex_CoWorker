"use client";

import type { TraceDensity } from "@/hooks/run-state";
import { cn } from "@/lib/utils";

const OPTIONS: { value: TraceDensity; label: string; hint: string }[] = [
  { value: "narrative", label: "Narrative", hint: "Messages and decisions" },
  { value: "detailed", label: "Detailed", hint: "Plus collapsed traces" },
  { value: "everything", label: "Everything", hint: "Expanded tool detail" },
];

export interface DensityControlProps {
  value: TraceDensity;
  onChange: (value: TraceDensity) => void;
  className?: string;
}

export function DensityControl({ value, onChange, className }: DensityControlProps) {
  return (
    <div
      role="group"
      aria-label="Trace density"
      className={cn("flex rounded-md border border-border p-0.5", className)}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={opt.hint}
          onClick={() => onChange(opt.value)}
          className={cn(
            "min-h-9 rounded px-2.5 text-xs font-medium capitalize outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            value === opt.value
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
