import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface WorkspacePanelProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

export function WorkspacePanel({
  title,
  description,
  badge,
  actions,
  className,
  bodyClassName,
  children,
}: WorkspacePanelProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "panel-glass flex min-h-0 flex-col border-border/80 bg-card/70 backdrop-blur-xl",
        className,
      )}
    >
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border/80 px-5 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-tight">{title}</h2>
            {badge}
          </div>
          {description ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        ) : null}
      </header>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-auto overscroll-contain",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
