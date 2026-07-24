"use client";

import { useEffect, useReducer, useRef } from "react";
import { serializeRunEvent } from "@forge/events";
import { buildDemoEvents } from "./demo-run-fixture";
import { extractSseDataPayload, parseSseRunEventData } from "./parse-sse-run-event";
import { runReducer } from "./run-reducer";
import { initialRunState, type RunState } from "./run-state";

export interface UseRunStreamOptions {
  /**
   * When true (default), feed the scripted golden-path events through the same
   * SSE parse → reducer path as a live EventSource (Cael wire format via
   * @forge/events serializeRunEvent). When false, open GET /api/runs/:id/stream.
   */
  useDemoFixture?: boolean;
}

/**
 * Event stream hook. Reducer is the single source of UI truth.
 * No setTimeout drives visible status — only events and connection state.
 */
export function useRunStream(runId: string, options: UseRunStreamOptions = {}): RunState {
  const useDemo = options.useDemoFixture ?? true;
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

    if (!runId) return;

    const after = lastSeqRef.current;
    const es = new EventSource(`/api/runs/${runId}/stream?after=${after}`);

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
  }, [runId, useDemo]);

  return state;
}

/**
 * Fake SSE feeder: encode demo events with Cael's serializeRunEvent, then parse
 * through the same handler used by browser EventSource `run.event` frames.
 */
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
export type { RunState } from "./run-state";
