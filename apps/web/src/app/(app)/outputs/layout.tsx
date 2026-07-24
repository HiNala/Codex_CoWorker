import type { ReactNode } from "react";

/**
 * Content scroller only — sidebar lives solely in (app)/layout.
 * Parent .dextwork-main is overflow:hidden; this provides the one panel-body scroll.
 */
export default function OutputsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="panel-body flex-1">{children}</div>
    </div>
  );
}
