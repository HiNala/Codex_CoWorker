/**
 * POST /api/demo/start
 * Browser proxy → worker POST /v1/golden-path/run
 * Starts the fixed Broken Checkout assignment/run (…005 / …006) live.
 * Aria owns the Start button; this route is the control plane.
 */
import { authorizeDemoRequest, deny, jsonError, jsonOk } from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function workerBase(): string {
  return (
    process.env.WORKER_INTERNAL_URL?.replace(/\/$/, "") ||
    process.env.WORKER_PUBLIC_URL?.replace(/\/$/, "") ||
    process.env.WORKER_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3001"
  );
}

export async function POST(request: Request) {
  const auth = authorizeDemoRequest(request);
  if (!auth.ok) return deny(auth);

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const base = workerBase();
  try {
    const upstream = await fetch(`${base}/v1/golden-path/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });

    const text = await upstream.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = { raw: text };
    }

    if (!upstream.ok) {
      return Response.json(
        {
          ok: false,
          code: upstream.status === 404 ? "worker.route_missing" : "worker.golden_path_failed",
          message:
            typeof parsed.error === "string"
              ? parsed.error
              : `Worker golden-path returned HTTP ${upstream.status}`,
          status: upstream.status,
          worker: parsed,
        },
        { status: upstream.status === 404 ? 503 : upstream.status },
      );
    }

    // Normalize for Aria Start button (fixed ids always).
    return jsonOk({
      ok: true,
      assignmentId:
        (parsed.assignmentId as string) ?? "0198206f-5f53-7000-8000-000000000005",
      runId: (parsed.runId as string) ?? "0198206f-5f53-7000-8000-000000000006",
      lastSeq: parsed.lastSeq ?? null,
      eventCountInDb: parsed.eventCountInDb ?? null,
      streamPath:
        (parsed.streamPath as string) ??
        "/api/runs/0198206f-5f53-7000-8000-000000000006/stream?after=0",
      workerStreamPath: parsed.streamPath ?? null,
      distinctCount: parsed.distinctCount ?? null,
      attempt1FailureMessage: parsed.attempt1FailureMessage ?? null,
      artifactTitle: parsed.artifactTitle ?? null,
      runFinished: parsed.runFinished ?? null,
      mode: parsed.mode ?? "postgres",
      worker: parsed,
    });
  } catch (error) {
    return jsonError(
      "not_configured",
      error instanceof Error ? error.message : "Worker unreachable for golden-path start",
      503,
      { stream: false },
    );
  }
}
