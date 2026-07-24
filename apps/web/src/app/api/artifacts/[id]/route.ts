import { getSession } from "@/server/session";
import { getSeedArtifact } from "../seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/artifacts/:id — single artifact with versions, evidence, provenance.
 * 404 when missing (cross-tenant ids also 404 once service is wired).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession(request);
  // Session stub — parent injects ArtifactService.get(session, id).
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const detail = getSeedArtifact(id);

  if (!detail) {
    // Cross-tenant ids must also 404 once service is wired (never 403).
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json({
    artifact: detail.artifact,
    versions: detail.versions,
    evidence: detail.evidence,
    provenance: detail.provenance,
    summary: detail.summary,
    source: "seed",
    orgId: session.orgId,
  });
}
