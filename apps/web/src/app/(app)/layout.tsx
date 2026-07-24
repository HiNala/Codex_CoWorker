import type { ReactNode } from "react";
import { DextworkSidebar } from "@/components/cockpit/dextwork-sidebar";

/**
 * Product shell: universal 76px Dextwork rail on every (app) route.
 * Marketing routes live under (marketing) and do not use this layout.
 */
export default function AppSegmentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dextwork-app" data-dextwork-shell data-product-shell>
      <DextworkSidebar />
      <div className="dextwork-main" id="main">
        {children}
      </div>
    </div>
  );
}
