import type { ReactNode } from "react";
import { DextworkSidebar } from "@/components/cockpit/dextwork-sidebar";

/**
 * Outputs live inside the universal Dextwork rail (76px) — same shell family as the cockpit.
 * Content is a single panel-body scroll; pages must not add a second nested scroll or a second sidebar.
 */
export default function OutputsLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="cockpit-grid cockpit-desktop min-h-dvh"
      data-dextwork-shell="true"
      data-outputs-shell="true"
    >
      <DextworkSidebar />
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-background">
        <div className="panel-body flex-1 px-5 py-6 sm:px-8 lg:px-10">{children}</div>
      </div>
    </div>
  );
}
