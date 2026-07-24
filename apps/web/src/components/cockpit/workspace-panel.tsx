import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface WorkspacePanelProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Hide description by default for dense ops UI */
  showDescription?: boolean;
  children: ReactNode;
}

export function WorkspacePanel({
  title,
  description,
  badge,
  actions,
  className,
  bodyClassName,
  showDescription = false,
  children,
}: WorkspacePanelProps) {
  return (
    <section
      aria-label={title}
      className={cn("flex min-h-0 flex-col bg-[color:var(--ops-panel)]", className)}
    >
      <header className="panel-head flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="ops-panel-title truncate text-foreground">{title}</h2>
            {badge}
          </div>
          {showDescription && description ? (
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </header>
      <div className={cn("panel-body", bodyClassName)}>{children}</div>
    </section>
  );
}
