import { getReadiness } from "@/server/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const report = await getReadiness();
    return Response.json(report, { status: report.status === "ready" ? 200 : 503 });
  } catch (error) {
    return Response.json(
      {
        status: "not_ready",
        reason: error instanceof Error ? error.message : "invalid service configuration",
      },
      { status: 503 },
    );
  }
}
