import type { ReactNode } from "react";
import { cn } from "../cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  headline: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, headline, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? <div className="mb-4 text-muted-foreground">{icon}</div> : null}
      <h3 className="text-base font-semibold tracking-tight">{headline}</h3>
      <p className="mt-2 max-w-[42ch] text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
