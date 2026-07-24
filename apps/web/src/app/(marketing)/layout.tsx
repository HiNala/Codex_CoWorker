import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import "./marketing.css";

export const metadata: Metadata = {
  title: {
    default: "FORGE",
    template: "%s · FORGE",
  },
  description:
    "Build the coworker the work demands. Give it a job and a budget — when something is missing, it builds the tool, verifies it, and finishes the work.",
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="marketing-root min-h-dvh text-foreground">
      <MarketingNav />
      {children}
      <MarketingFooter />
    </div>
  );
}
