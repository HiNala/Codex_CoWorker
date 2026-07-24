/**
 * POST /api/demo/start
 * Fixed DEMO_MODE same-origin action → worker POST /v1/golden-path/run with body {}.
 * No DEMO_ACCESS_CODE (assignment cockpit Start has none). Reset/panic stay gated.
 * Does not expose secrets. Ignores caller body.
 */
import { resolveWorkerBase } from "../../_lib/worker-base";
import { isSameOriginRequest, rejectCrossOrigin } from "../../_lib/same-origin";
import { gateDemoStart } from "../../_lib/demo-start-gate";
import { jsonError, jsonOk } from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Fixed golden-path IDs (Cael INTERFACES.md). */
const FIXED_ASSIGNMENT_ID = "0198206f-5f53-7000-8000-000000000005";
const FIXED_RUN_ID = "0198206f-5f53-7000-8000-000000000006";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return rejectCrossOrigin();
  }

  const gate = gateDemoStart(process.env);
  if (!gate.ok) {
    return Response.json(
      { ok: false, code: gate.code, message: gate.message },
      { status: gate.status },
    );
  }

  // Ignore caller body entirely — always exact empty object upstream.
  const base = resolveWorkerBase(process.env);
  const upstreamUrl = `${base}/v1/golden-path/run`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

    const text = await upstream.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = { raw: text.slice(0, 500) };
    }

    if (!upstream.ok) {
      return Response.json(
        {
          ok: false,
          code: upstream.status === 404 ? "worker.route_missing" : "worker.golden_path_failed",
          message:
            typeof parsed.error === "string"
              ? parsed.error
              : typeof parsed.message === "string"
                ? parsed.message
                : `Worker golden-path returned HTTP ${upstream.status}`,
          status: upstream.status,
        },
        { status: upstream.status === 404 ? 503 : upstream.status >= 500 ? 503 : upstream.status },
      );
    }

    return jsonOk({
      ok: true,
      assignmentId: (parsed.assignmentId as string) ?? FIXED_ASSIGNMENT_ID,
      runId: (parsed.runId as string) ?? FIXED_RUN_ID,
      lastSeq: parsed.lastSeq ?? null,
      eventCountInDb: parsed.eventCountInDb ?? null,
      streamPath:
        (parsed.streamPath as string) ?? `/api/runs/${FIXED_RUN_ID}/stream?after=0`,
      workerStreamPath: parsed.streamPath ?? null,
      distinctCount: parsed.distinctCount ?? null,
      attempt1FailureMessage: parsed.attempt1FailureMessage ?? null,
      artifactTitle: parsed.artifactTitle ?? null,
      runFinished: parsed.runFinished ?? null,
      mode: parsed.mode ?? "postgres",
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
