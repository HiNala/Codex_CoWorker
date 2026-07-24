import type { Metadata } from "next";
import { CockpitShell } from "@/components/cockpit/cockpit-shell";

export const metadata: Metadata = {
  title: "Cockpit",
};

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  return <CockpitShell assignmentId={assignmentId} />;
}
