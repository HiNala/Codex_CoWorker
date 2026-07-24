import type { Metadata } from "next";
import { DemoControlPanel } from "./demo-control-panel";

export const metadata: Metadata = {
  title: "Demo control",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return <DemoControlPanel />;
}
