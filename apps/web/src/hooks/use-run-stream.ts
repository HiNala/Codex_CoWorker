"use client";

import { useEffect, useReducer, useRef } from "react";
import type { RunEvent } from "@forge/contracts";
import { buildDemoRunState } from "./demo-run-fixture";
import { runReducer } from "./run-reducer";
import { initialRunState, type RunState } from "./run-state";

export interface UseRunStreamOptions {
  /** When true (default in local demo), hydrate from scripted fixture instead of SSE. */
  useDemoFixture?: boolean;
}

/**
 * Event stream hook. Reducer is the single source of UI truth.
 * No setTimeout drives visible status — only events and connection state.
 */
export function useRunStream(
  runId: string,
  options: UseRunStreamOptions = {},
): RunState {
  const useDemo = options.useDemoFixture ?? true;
  const [state, dispatch] = useReducer(
    runReducer,
    initialRunState,
    (init) => (useDemo ? buildDemoRunState() : init),
  );
  const lastSeqRef = useRef(state.lastSeq);
  lastSeqRef.current = state.lastSeq;

  useEffect(() => {
    if (useDemo) {
      dispatch({ type: "connected" });
      return;
    }

    if (!runId) return;

    const after = lastSeqRef.current;
    const es = new EventSource(`/api/runs/${runId}/stream?after=${after}`);

    es.addEventListener("run.event", (e) => {
      try {
        const event = JSON.parse((e as MessageEvent).data) as RunEvent;
        dispatch({ type: "event", event });
      } catch {
        // ignore malformed frames
      }
    });
    es.onerror = () => dispatch({ type: "disconnected" });
    es.onopen = () => dispatch({ type: "connected" });

    return () => es.close();
  }, [runId, useDemo]);

  return state;
}

export { runReducer } from "./run-reducer";
export { buildDemoRunState, buildDemoEvents } from "./demo-run-fixture";
export type { RunState } from "./run-state";
