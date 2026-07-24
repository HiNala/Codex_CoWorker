/**
 * POST /api/approvals/:approvalId/decide
 * Same-origin browser proxy → worker POST /approvals/:id/decide.
 * Validates decision approved|denied; uses path ID only (fixed path contract).
 */
import { resolveWorkerBase } from "../../../_lib/worker-base";
import { isSameOriginRequest, rejectCrossOrigin } from "../../../_lib/same-origin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseDecision(raw: unknown): "approved" | "denied" | null {
  if (raw === "approved" || raw === "approve") return "approved";
  if (raw === "denied" || raw === "deny") return "denied";
  return null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ approvalId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return rejectCrossOrigin();
  }

  const { approvalId: rawId } = await context.params;
  const approvalId = typeof rawId === "string" ? rawId.trim() : "";
  if (!approvalId || !UUID_RE.test(approvalId)) {
    return Response.json(
      {
        ok: false,
        code: "invalid_approval_id",
        message: "approvalId path must be a UUID.",
      },
      { status: 400 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  const decision = parseDecision(body.decision);
  if (!decision) {
    return Response.json(
      {
        ok: false,
        code: "invalid_decision",
        message: 'Body.decision must be "approved" or "denied".',
      },
      { status: 400 },
    );
  }

  // Forward only known fields — never passthrough arbitrary secrets.
  const upstreamBody: Record<string, unknown> = { decision };
  if (typeof body.reason === "string") upstreamBody.reason = body.reason.slice(0, 500);
  if (typeof body.runId === "string") upstreamBody.runId = body.runId;
  if (typeof body.assignmentId === "string") upstreamBody.assignmentId = body.assignmentId;
  if (typeof body.orgId === "string") upstreamBody.orgId = body.orgId;

  const workerBase = resolveWorkerBase(process.env);
  const idempotency = request.headers.get("Idempotency-Key");

  try {
    const upstream = await fetch(`${workerBase}/approvals/${encodeURIComponent(approvalId)}/decide`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(idempotency ? { "Idempotency-Key": idempotency } : {}),
      },
      body: JSON.stringify(upstreamBody),
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") ?? "application/json";
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": contentType },
    });
  } catch (error) {
    return Response.json(
      {
        type: "about:blank",
        title: "Worker unreachable",
        status: 503,
        code: "not_configured",
        detail: error instanceof Error ? error.message : "Worker fetch failed",
        stream: false,
      },
      { status: 503 },
    );
  }
}
