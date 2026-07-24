import { getSession } from "@/server/session";
import { listSeedArtifactItems } from "./seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/artifacts — list artifacts for the Outputs Library.
 * Session-gated stub; data is in-memory seed until ArtifactService is injected.
 */
export async function GET(request: Request) {
  const session = await getSession(request);
  // Session stub: deny when unauthenticated. Dev auth always returns DEV_SESSION.
  // Parent: ArtifactService.list(session, filters) — enforce org scope there.
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

  let items = listSeedArtifactItems();

  if (type) {
    items = items.filter((item) => item.type === type);
  }
  if (status) {
    items = items.filter((item) => item.status === status);
  }
  if (q) {
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q),
    );
  }

  return Response.json({
    items,
    total: items.length,
    source: "seed",
    orgId: session.orgId,
  });
}
