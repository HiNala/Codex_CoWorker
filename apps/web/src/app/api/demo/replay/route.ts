import {
  startReplayFromTranscript,
  updateReplayState,
} from "@forge/demo";
import { authorizeDemoRequest, deny, jsonError, jsonOk } from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/demo/replay
 * Validates access and loads packages/demo/transcripts/golden-path.jsonl.
 * Full event-pipeline emission is Gate 2; Gate 1 returns the loaded transcript summary.
 */
export async function POST(request: Request) {
  const auth = authorizeDemoRequest(request);
  if (!auth.ok) return deny(auth);

  try {
    const startedAt = new Date().toISOString();
    const result = startReplayFromTranscript(undefined, startedAt);

    updateReplayState({
      active: true,
      transcriptId: result.transcriptId,
      startedAt: result.startedAt,
      eventCount: result.eventCount,
      error: null,
    });

    return jsonOk({
      ok: true,
      transcriptId: result.transcriptId,
      eventCount: result.eventCount,
      startedAt: result.startedAt,
      // Include a short preview only — not full payload spam, no secrets.
      preview: result.events.slice(0, 5).map((event) => ({
        seq: event.seq,
        type: event.type,
        channel: event.channel,
        summary: event.summary,
      })),
      message:
        "Transcript loaded. Event re-emission through the live pipeline is available at Gate 2.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load transcript";
    updateReplayState({
      active: false,
      error: message,
    });
    return jsonError("transcript_error", message, 500);
  }
}
