/**
 * POST /api/approvals/:approvalId/decide
 * Browser proxy → worker POST /approvals/:id/decide (Cael INTERFACES.md).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ approvalId: string }> },
) {
  const { approvalId } = await context.params;
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const workerBase =
    process.env.WORKER_PUBLIC_URL?.replace(/\/$/, "") ||
    process.env.WORKER_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3001";

  const idempotency = request.headers.get("Idempotency-Key");

  try {
    const upstream = await fetch(`${workerBase}/approvals/${approvalId}/decide`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(idempotency ? { "Idempotency-Key": idempotency } : {}),
      },
      body: JSON.stringify(body),
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
