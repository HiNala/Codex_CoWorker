"use client";

import { useEffect, useReducer, useRef } from "react";
import { serializeRunEvent } from "@forge/events";
import { buildDemoEvents } from "./demo-run-fixture";
import { extractSseDataPayload, parseSseRunEventData } from "./parse-sse-run-event";
import { resolveStreamRunId } from "./resolve-stream-run-id";
import { runReducer } from "./run-reducer";
import { initialRunState, type RunState } from "./run-state";

export interface UseRunStreamOptions {
  /**
   * When true, feed scripted demo events (same parse path as live SSE).
   * When false (default for IT RUNS / production cockpit), open
   * GET /api/runs/:runId/stream?after= (Cael).
   */
  useDemoFixture?: boolean;
  /** Explicit run id when the URL only carries assignmentId. */
  runId?: string | null;
}

/**
 * Event stream hook. Reducer is the single source of UI truth.
 * Visible status comes only from events and connection state — no timers.
 */
export function useRunStream(
  assignmentId: string,
  options: UseRunStreamOptions = {},
): RunState {
  // Live SSE is the default; tests/demos may opt into fixture.
  const useDemo = options.useDemoFixture ?? false;
  const streamRunId = resolveStreamRunId(assignmentId, options.runId);
  const [state, dispatch] = useReducer(runReducer, initialRunState);
  const lastSeqRef = useRef(0);

  useEffect(() => {
    lastSeqRef.current = state.lastSeq;
  }, [state.lastSeq]);

  useEffect(() => {
    const onFrameData = (data: string) => {
      const event = parseSseRunEventData(data);
      if (event) dispatch({ type: "event", event });
    };

    if (useDemo) {
      dispatch({ type: "connected" });
      ingestDemoAsSseFrames(onFrameData);
      return;
    }

    if (!streamRunId) return;

    const after = lastSeqRef.current;
    const es = new EventSource(`/api/runs/${streamRunId}/stream?after=${after}`);

    const onRunEvent = (e: Event) => {
      const me = e as MessageEvent;
      if (typeof me.data === "string") onFrameData(me.data);
    };

    es.addEventListener("run.event", onRunEvent);
    es.onerror = () => dispatch({ type: "disconnected" });
    es.onopen = () => dispatch({ type: "connected" });

    return () => {
      es.removeEventListener("run.event", onRunEvent);
      es.close();
    };
  }, [streamRunId, useDemo]);

  return state;
}

/** Demo feeder only — used when useDemoFixture is true. */
function ingestDemoAsSseFrames(onFrameData: (data: string) => void): void {
  const decoder = new TextDecoder();
  for (const event of buildDemoEvents()) {
    const frame = decoder.decode(serializeRunEvent(event));
    const data = extractSseDataPayload(frame);
    if (data) onFrameData(data);
  }
}

export { runReducer } from "./run-reducer";
export { buildDemoRunState, buildDemoEvents } from "./demo-run-fixture";
export { resolveStreamRunId } from "./resolve-stream-run-id";
export type { RunState } from "./run-state";
